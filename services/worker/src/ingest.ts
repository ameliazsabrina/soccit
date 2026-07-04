import { config } from "./config.js";
import { logger } from "./logger.js";
import { normalize } from "./domain/normalize.js";
import {
  applyPlayerData,
  extractLineup,
  type LineupSnapshot,
} from "./domain/lineup.js";
import type { DomainEvent } from "./domain/events.js";
import type { RawEvent } from "./txline/types.js";
import type { Store } from "./store/index.js";
import type { TokenManager } from "./txline/auth.js";
import { fetchSnapshot } from "./txline/snapshot.js";
import { streamScores } from "./txline/stream.js";

export interface IngestDeps {
  tokens: TokenManager;
  store: Store;
  signal: AbortSignal;
}

const HEARTBEAT_MS = 10_000;

export function beatCursor(raw: RawEvent): string | undefined {
  if (raw.Seq != null) return String(raw.Seq);
  if (raw.Id != null) return String(raw.Id);
  return undefined;
}

export async function processRawEvent(
  raw: RawEvent,
  store: Store,
  lineups: Map<number, LineupSnapshot>,
  terminalActions: Set<string> = config.terminalActions,
): Promise<DomainEvent[]> {
  const events = normalize(raw, { terminalActions });
  await store.persist(raw, events);

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

  const cursor = beatCursor(raw);
  if (cursor != null) await store.setLastEventId(cursor);

  return events;
}

export async function runIngest({
  tokens,
  store,
  signal,
}: IngestDeps): Promise<void> {
  const { fixtureId } = config.txline;
  const lineups = new Map<number, LineupSnapshot>();

  if (fixtureId != null) {
    try {
      const snap = await fetchSnapshot(tokens, fixtureId);
      for (const raw of snap) {
        await processRawEvent(raw, store, lineups);
      }
      logger.info(
        { fixtureId, count: snap.length },
        "backfilled from snapshot",
      );
    } catch (err) {
      logger.warn(
        { err: String(err), fixtureId },
        "snapshot backfill failed — continuing live",
      );
    }
  }

  const lastEventId = await store.getLastEventId();

  await store.heartbeat().catch(() => {});
  const heartbeat = setInterval(
    () => void store.heartbeat().catch(() => {}),
    HEARTBEAT_MS,
  );

  try {
    for await (const raw of streamScores({
      tokens,
      fixtureId,
      lastEventId,
      signal,
    })) {
      let events;
      try {
        events = await processRawEvent(raw, store, lineups);
      } catch (err) {
        const cursor = beatCursor(raw);
        logger.error(
          { err: String(err), fixtureId: raw.FixtureId, cursor },
          "beat processing failed — skipping poison beat",
        );
        if (cursor != null) await store.setLastEventId(cursor).catch(() => {});
        continue;
      }

      await store.recordBeat().catch(() => {});

      for (const e of events) {
        if (e.type === "substitution") {
          logger.info(
            {
              fixtureId: e.fixtureId,
              side: e.side,
              out: e.playerOutId,
              in: e.playerInId,
              minute: e.minute,
            },
            "substitution",
          );
        } else if (e.type === "status" && e.terminal) {
          logger.info(
            { fixtureId: e.fixtureId, action: e.action },
            "match terminal — settlement cue",
          );
        }
      }
    }
  } finally {
    clearInterval(heartbeat);
  }
}
