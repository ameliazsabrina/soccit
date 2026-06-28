import { Redis } from "ioredis";
import { logger } from "./logger.js";
import { leaderboardKey, leaderboardPayload, type LeaderboardPayload } from "./leaderboard.js";
import { settleFixture, type KeeperDeps, type SettlementResult } from "./keeper.js";

export const LEADERBOARD_PATTERN = "leaderboard:*";

export interface WatchOptions {
  deps: KeeperDeps;
  redisUrl: string;
  fixtureId?: number;
  pollIntervalMs: number;
  signal: AbortSignal;
  settle?: (deps: KeeperDeps, payload: LeaderboardPayload) => Promise<SettlementResult>;
}

function tryParse(raw: string | null): LeaderboardPayload | null {
  if (!raw) return null;
  try {
    const parsed = leaderboardPayload.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function fixtureIdFromLeaderboardKey(key: string): number | null {
  const prefix = "leaderboard:";
  if (!key.startsWith(prefix)) return null;
  const id = Number(key.slice(prefix.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export interface SettlementGuardState {
  /** Fixtures that reached a terminal outcome (settled, or non-retryable). */
  completed: Set<number>;
  /** Fixtures with a settlement attempt in progress right now. */
  inFlight: Set<number>;
}

/**
 * Premature- and duplicate-settlement guard. Only a *final* leaderboard whose
 * fixture is neither already completed nor mid-attempt is eligible to settle.
 */
export function isSettleable(payload: LeaderboardPayload, state: SettlementGuardState): boolean {
  return (
    payload.final && !state.completed.has(payload.fixtureId) && !state.inFlight.has(payload.fixtureId)
  );
}

/**
 * Fold a settlement result into the completed set. A fixture is "done" when it
 * settled, or when it returned a non-retryable result (e.g. already settled
 * on-chain) — retryable failures are intentionally left open for a later signal.
 */
export function recordOutcome(fixtureId: number, result: SettlementResult, completed: Set<number>): void {
  if (result.settled || !result.retry) completed.add(fixtureId);
}

/**
 * Single guarded settlement attempt. Enforces the final-gate and dedup invariants
 * via {@link isSettleable}, marks the fixture in-flight for the duration of the
 * on-chain call so a concurrent signal cannot double-settle, and records the
 * outcome. Errors are swallowed (logged) so the watcher keeps running.
 */
export async function attemptSettlement(
  settle: (deps: KeeperDeps, payload: LeaderboardPayload) => Promise<SettlementResult>,
  deps: KeeperDeps,
  payload: LeaderboardPayload,
  state: SettlementGuardState,
): Promise<void> {
  if (!isSettleable(payload, state)) return;
  const { fixtureId } = payload;
  state.inFlight.add(fixtureId);
  logger.info({ fixtureId }, "final leaderboard observed — settling");
  try {
    const result = await settle(deps, payload);
    recordOutcome(fixtureId, result, state.completed);
  } catch (err) {
    logger.error({ fixtureId, err: String(err) }, "settlement failed — will retry on next signal");
  } finally {
    state.inFlight.delete(fixtureId);
  }
}

async function scanLeaderboardKeys(reader: Redis): Promise<string[]> {
  let cursor = "0";
  const keys: string[] = [];
  do {
    const [next, batch] = await reader.scan(cursor, "MATCH", LEADERBOARD_PATTERN, "COUNT", 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

export async function watchFixture(opts: WatchOptions): Promise<void> {
  const { deps, redisUrl, fixtureId, pollIntervalMs, signal } = opts;
  if (fixtureId == null) throw new Error("fixtureId is required for watchFixture");
  const key = leaderboardKey(fixtureId);

  const reader = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });

  let done = false;
  const finish = async () => {
    done = true;
    subscriber.disconnect();
    reader.disconnect();
  };

  const attempt = async (payload: LeaderboardPayload): Promise<boolean> => {
    if (!payload.final) return false;
    logger.info({ fixtureId }, "final leaderboard observed — settling");
    try {
      const result = await (opts.settle ?? settleFixture)(deps, payload);
      return result.settled || !result.retry;
    } catch (err) {
      logger.error({ fixtureId, err: String(err) }, "settlement failed — will retry on next signal");
      return false;
    }
  };

  signal.addEventListener("abort", () => void finish(), { once: true });

  await subscriber.subscribe(key);
  subscriber.on("message", async (_channel, raw) => {
    if (done) return;
    const payload = tryParse(raw);
    if (payload && (await attempt(payload))) await finish();
  });

  const initial = tryParse(await reader.get(key));
  if (initial && (await attempt(initial))) {
    await finish();
    return;
  }

  while (!done && !signal.aborted) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    if (done || signal.aborted) break;
    const payload = tryParse(await reader.get(key));
    if (payload && (await attempt(payload))) {
      await finish();
      return;
    }
  }
}

export async function watchLeaderboards(opts: WatchOptions): Promise<void> {
  const { deps, redisUrl, pollIntervalMs, signal } = opts;
  const settle = opts.settle ?? settleFixture;
  const reader = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const state: SettlementGuardState = { completed: new Set(), inFlight: new Set() };
  let done = false;

  const finish = async () => {
    done = true;
    subscriber.disconnect();
    reader.disconnect();
  };

  const attempt = (payload: LeaderboardPayload): Promise<void> =>
    attemptSettlement(settle, deps, payload, state);

  const readAndAttempt = async (key: string): Promise<void> => {
    const fixtureId = fixtureIdFromLeaderboardKey(key);
    if (fixtureId == null || state.completed.has(fixtureId)) return;
    const payload = tryParse(await reader.get(key));
    if (payload) await attempt(payload);
  };

  signal.addEventListener("abort", () => void finish(), { once: true });

  await subscriber.psubscribe(LEADERBOARD_PATTERN);
  subscriber.on("pmessage", async (_pattern, channel, raw) => {
    if (done) return;
    const fixtureId = fixtureIdFromLeaderboardKey(channel);
    if (fixtureId == null) return;
    const payload = tryParse(raw);
    if (payload) await attempt(payload);
  });

  for (const key of await scanLeaderboardKeys(reader)) {
    if (done || signal.aborted) break;
    await readAndAttempt(key);
  }

  while (!done && !signal.aborted) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    if (done || signal.aborted) break;
    for (const key of await scanLeaderboardKeys(reader)) {
      if (done || signal.aborted) break;
      await readAndAttempt(key);
    }
  }
}
