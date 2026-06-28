import { config } from "./config.js";
import { logger } from "./logger.js";
import { normalize } from "./domain/normalize.js";
import { applyPlayerData, extractLineup, type LineupSnapshot } from "./domain/lineup.js";
import type { Store } from "./store/index.js";
import type { TokenManager } from "./txline/auth.js";
import { fetchSnapshot } from "./txline/snapshot.js";
import { streamScores } from "./txline/stream.js";

export interface IngestDeps {
  tokens: TokenManager;
  store: Store;
  signal: AbortSignal;
}

export async function runIngest({ tokens, store, signal }: IngestDeps): Promise<void> {
  const { fixtureId } = config.txline;
  const lineups = new Map<number, LineupSnapshot>();

  if (fixtureId != null) {
    try {
      const snap = await fetchSnapshot(tokens, fixtureId);
      for (const raw of snap) {
        await store.persist(raw, normalize(raw, { terminalActions: config.terminalActions }));
        const lineup = extractLineup(raw);
        if (lineup) {
          lineups.set(lineup.fixtureId, lineup);
          await store.writeLineup(lineup);
        } else {
          const current = lineups.get(raw.FixtureId);
          const updated = current ? applyPlayerData(current, raw) : null;
          if (updated) {
            lineups.set(updated.fixtureId, updated);
            await store.writeLineup(updated);
          }
        }
      }
      logger.info({ fixtureId, count: snap.length }, "backfilled from snapshot");
    } catch (err) {
      logger.warn({ err: String(err), fixtureId }, "snapshot backfill failed — continuing live");
    }
  }

  const lastEventId = await store.getLastEventId();

  for await (const raw of streamScores({ tokens, fixtureId, lastEventId, signal })) {
    const events = normalize(raw, { terminalActions: config.terminalActions });
    await store.persist(raw, events);

    const lineup = extractLineup(raw);
    if (lineup) {
      lineups.set(lineup.fixtureId, lineup);
      await store.writeLineup(lineup);
      logger.info(
        { fixtureId: lineup.fixtureId, teams: lineup.teams.length, players: Object.keys(lineup.names).length },
        "lineup cached",
      );
    } else {
      const current = lineups.get(raw.FixtureId);
      const updated = current ? applyPlayerData(current, raw) : null;
      if (updated) {
        lineups.set(updated.fixtureId, updated);
        await store.writeLineup(updated);
        logger.info({ fixtureId: updated.fixtureId, action: raw.Action }, "lineup player data updated");
      }
    }

    const cursor = raw.Seq ?? raw.Id;
    if (cursor != null) await store.setLastEventId(String(cursor));

    for (const e of events) {
      if (e.type === "substitution") {
        logger.info(
          { fixtureId: e.fixtureId, side: e.side, out: e.playerOutId, in: e.playerInId, minute: e.minute },
          "substitution",
        );
      } else if (e.type === "status" && e.terminal) {
        logger.info({ fixtureId: e.fixtureId, action: e.action }, "match terminal — settlement cue");
      }
    }
  }
}
