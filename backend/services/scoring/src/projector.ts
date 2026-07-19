import type { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { score } from "./leaderboard/leaderboard.service.js";
import type {
  Prediction,
  Substitution,
} from "./leaderboard/leaderboard.schema.js";
import type { PredictionSource } from "./onchain/predictions.js";
import {
  finalScoreFromStatus,
  isTerminalStatus,
  readAll,
  tail,
  toSubstitution,
} from "./store/events.js";
import type { FinalScore } from "./leaderboard/leaderboard.service.js";
import type { LeaderboardStore } from "./store/leaderboard.js";

export interface ProjectorDeps {
  redis: Redis;
  store: LeaderboardStore;
  predictions: PredictionSource;
  fixtureId: number;
  signal: AbortSignal;
}

export async function runProjector({
  redis,
  store,
  predictions,
  fixtureId,
  signal,
}: ProjectorDeps): Promise<void> {
  let preds: Prediction[] = await predictions.load(fixtureId);
  logger.info({ fixtureId, predictions: preds.length }, "loaded predictions");

  const { entries, lastId } = await readAll(redis, fixtureId);
  const subs: Substitution[] = entries
    .map(toSubstitution)
    .filter((s): s is Substitution => s !== null);

  let lastRefresh = Date.now();
  const project = async (final: boolean, finalScore?: FinalScore) => {
    const out = score({
      fixtureId,
      predictions: preds,
      subs,
      final,
      finalScore,
    });
    await store.write(out);
    logger.info(
      {
        fixtureId,
        final,
        finalScore,
        winners: out.winners,
        owners: out.ranking.length,
      },
      "leaderboard projected",
    );
  };

  const terminal = entries.find(isTerminalStatus);
  if (terminal) {
    await project(true, finalScoreFromStatus(terminal));
    logger.info(
      { fixtureId },
      "terminal event already in stream — final leaderboard frozen at startup (settlement cue)",
    );
    return;
  }

  await project(false);

  for await (const entry of tail(redis, fixtureId, lastId, signal)) {
    const refreshDue = Date.now() - lastRefresh >= config.refreshIntervalMs;
    const sub = toSubstitution(entry);

    if (sub || refreshDue) {
      preds = await predictions.load(fixtureId);
      lastRefresh = Date.now();
    }
    if (sub) {
      subs.push(sub);
      await project(false);
    }
    if (isTerminalStatus(entry)) {
      await project(true, finalScoreFromStatus(entry));
      logger.info(
        { fixtureId },
        "match terminal — final leaderboard frozen (settlement cue)",
      );
      return;
    }
  }
}
