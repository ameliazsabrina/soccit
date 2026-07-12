import type { Redis } from "ioredis";
import { logger } from "./logger.js";
import { runProjector } from "./projector.js";
import type { LeaderboardStore } from "./store/leaderboard.js";
import type { PredictionSource } from "./onchain/predictions.js";

export interface SupervisorDeps {
  redis: Redis;
  store: LeaderboardStore;
  predictions: PredictionSource;
  discover: () => Promise<number[]>;
  pollIntervalMs: number;
  signal: AbortSignal;
  project?: (fixtureId: number, signal: AbortSignal) => Promise<void>;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runSupervisor(deps: SupervisorDeps): Promise<void> {
  const { redis, store, predictions, discover, pollIntervalMs, signal } = deps;
  const project =
    deps.project ??
    ((fixtureId, sig) =>
      runProjector({ redis, store, predictions, fixtureId, signal: sig }));
  const wait = deps.wait ?? sleep;

  const active = new Map<number, AbortController>();
  const completed = new Set<number>();

  const spawn = (fixtureId: number) => {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    active.set(fixtureId, ctrl);
    logger.info({ fixtureId }, "projector started");
    void project(fixtureId, ctrl.signal)
      .then(() => {
        if (!ctrl.signal.aborted) {
          completed.add(fixtureId);
          logger.info({ fixtureId }, "projector finished (terminal)");
        }
      })
      .catch((err) =>
        logger.error({ fixtureId, err: String(err) }, "projector crashed"),
      )
      .finally(() => {
        active.delete(fixtureId);
        signal.removeEventListener("abort", onAbort);
      });
  };

  const poll = async () => {
    let ids: number[];
    try {
      ids = await discover();
    } catch (err) {
      logger.error(
        { err: String(err) },
        "fixture discovery failed — retrying next tick",
      );
      return;
    }
    for (const fixtureId of ids) {
      if (active.has(fixtureId) || completed.has(fixtureId)) continue;
      spawn(fixtureId);
    }
  };

  logger.info({ pollIntervalMs }, "scoring supervisor started (multi-fixture)");
  await poll();
  while (!signal.aborted) {
    await wait(pollIntervalMs, signal);
    if (signal.aborted) break;
    await poll();
  }

  for (const ctrl of active.values()) ctrl.abort();
}
