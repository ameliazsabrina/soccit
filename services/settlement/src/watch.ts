import { Redis } from "ioredis";
import { logger } from "./logger.js";
import { leaderboardKey, leaderboardPayload, type LeaderboardPayload } from "./leaderboard.js";
import { settleFixture, type KeeperDeps } from "./keeper.js";

export interface WatchOptions {
  deps: KeeperDeps;
  redisUrl: string;
  fixtureId: number;
  pollIntervalMs: number;
  signal: AbortSignal;
}

function tryParse(raw: string | null): LeaderboardPayload | null {
  if (!raw) return null;
  const parsed = leaderboardPayload.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export async function watchFixture(opts: WatchOptions): Promise<void> {
  const { deps, redisUrl, fixtureId, pollIntervalMs, signal } = opts;
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
      await settleFixture(deps, payload);
      return true;
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
