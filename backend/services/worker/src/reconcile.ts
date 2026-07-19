import { logger } from "./logger.js";
import type { Store } from "./store/index.js";
import type { TokenManager } from "./txline/auth.js";
import type { RawEvent } from "./txline/types.js";
import { fetchSnapshot } from "./txline/snapshot.js";
import { fetchTerminalFixtureIds } from "./onchain/matches.js";

export function latestRaw(snap: RawEvent[]): RawEvent | null {
  let best: RawEvent | null = null;
  for (const raw of snap) {
    if (best == null || (raw.Ts ?? 0) >= (best.Ts ?? 0)) best = raw;
  }
  return best;
}

export interface ReconcileDeps {
  tokens: TokenManager;
  store: Store;
  // Injectable for tests; default to the real on-chain / feed calls.
  fetchTerminalIds?: () => Promise<number[]>;
  snapshot?: (tokens: TokenManager, fixtureId: number) => Promise<RawEvent[]>;
}

export async function reconcileFinalScores(
  deps: ReconcileDeps,
): Promise<number> {
  const fetchTerminalIds = deps.fetchTerminalIds ?? fetchTerminalFixtureIds;
  const snapshot = deps.snapshot ?? fetchSnapshot;
  const { store, tokens } = deps;

  const fixtureIds = await fetchTerminalIds();
  let repaired = 0;
  for (const fixtureId of fixtureIds) {
    if (await store.hasFixture(fixtureId)) continue; // already ingested

    let snap: RawEvent[];
    try {
      snap = await snapshot(tokens, fixtureId);
    } catch (err) {
      logger.warn({ err: String(err), fixtureId }, "reconcile snapshot failed");
      continue;
    }

    const raw = latestRaw(snap);
    if (!raw) continue; // no feed data to source a score from

    await store.persist(raw, []);
    repaired += 1;
    logger.info({ fixtureId }, "reconciled final score from snapshot");
  }
  return repaired;
}
