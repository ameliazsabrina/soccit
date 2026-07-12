import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runProjector } from "./projector.js";
import type {
  LeaderboardOutput,
  Prediction,
} from "./leaderboard/leaderboard.schema.js";
import type { LeaderboardStore } from "./store/leaderboard.js";
import type { PredictionSource } from "./onchain/predictions.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const FIXTURE = 990888;
const key = `events:${FIXTURE}`;

// The projector tails a live Redis stream (blocking XREAD), so this can only be
// driven against a real Redis. Gated + skipped when absent.
// Run `docker compose up -d redis` to exercise it.
async function redisReachable(): Promise<boolean> {
  const probe = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

const up = await redisReachable();
if (!up)
  console.warn(
    `[skip] Redis not reachable at ${REDIS_URL} — skipping projector integration tests`,
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const xaddSub = (redis: Redis, payload: object) =>
  redis.xadd(key, "*", "type", "substitution", "json", JSON.stringify(payload));
const xaddTerminal = (redis: Redis) =>
  redis.xadd(
    key,
    "*",
    "type",
    "status",
    "json",
    JSON.stringify({ action: "game_finalised", terminal: true }),
  );

// owner "a" predicts player 100 goes off on side 1, locked at minute 10.
const preds: Prediction[] = [
  {
    owner: "a",
    side: 1,
    kind: 0,
    outPlayerId: 100,
    inPlayerId: 200,
    lockMinute: 10,
  },
];

describe.skipIf(!up)("runProjector (live Redis event stream)", () => {
  let redis: Redis;
  const writes: LeaderboardOutput[] = [];
  const store = {
    write: async (o: LeaderboardOutput) => void writes.push(structuredClone(o)),
  } as unknown as LeaderboardStore;
  const source: PredictionSource = { load: async () => preds };

  beforeAll(async () => {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    await redis.del(key);
  });

  afterAll(async () => {
    await redis.del(key);
    redis.disconnect();
  });

  it("projects an initial board, scores a tailed substitution, and freezes on the terminal cue", async () => {
    const controller = new AbortController();
    const run = runProjector({
      redis,
      store,
      predictions: source,
      fixtureId: FIXTURE,
      signal: controller.signal,
    });

    await sleep(250); // let it project the initial (empty) board and start tailing
    expect(writes.length).toBeGreaterThanOrEqual(1);
    expect(writes[0]).toMatchObject({ final: false });
    expect(writes[0]?.ranking[0]?.points).toBe(0); // no subs yet

    // a substitution that satisfies the prediction (100 off, lockMinute 10 <= 60-5)
    await xaddSub(redis, {
      side: 1,
      playerOutId: 100,
      playerInId: 200,
      minute: 60,
    });
    await sleep(250);
    const afterSub = writes.at(-1)!;
    expect(afterSub.final).toBe(false);
    expect(afterSub.ranking[0]).toMatchObject({ owner: "a", points: 1 });

    // terminal cue → final projection, then the projector returns
    await xaddTerminal(redis);
    await run; // resolves when the projector observes the terminal status

    const last = writes.at(-1)!;
    expect(last.final).toBe(true);
    expect(last.ranking[0]?.points).toBe(1);
    expect(last.winners[0]).toBe("a");
  }, 15_000);

  it("freezes the final leaderboard at startup when the terminal event is already in the stream", async () => {
    await redis.del(key);
    writes.length = 0;
    await xaddSub(redis, {
      side: 1,
      playerOutId: 100,
      playerInId: 200,
      minute: 60,
    });
    await xaddTerminal(redis);

    const controller = new AbortController();
    // No live push after start — this resolves only via the startup self-heal.
    await runProjector({
      redis,
      store,
      predictions: source,
      fixtureId: FIXTURE,
      signal: controller.signal,
    });

    const last = writes.at(-1)!;
    expect(last.final).toBe(true);
    expect(last.ranking[0]).toMatchObject({ owner: "a", points: 1 });
    expect(last.winners[0]).toBe("a");
  }, 15_000);

  it("a duplicate substitution does not double-count the prediction", async () => {
    await redis.del(key);
    writes.length = 0;
    const controller = new AbortController();
    const run = runProjector({
      redis,
      store,
      predictions: source,
      fixtureId: FIXTURE,
      signal: controller.signal,
    });
    await sleep(200);

    const dup = { side: 1, playerOutId: 100, playerInId: 200, minute: 60 };
    await xaddSub(redis, dup);
    await xaddSub(redis, dup);
    await sleep(250);
    await xaddTerminal(redis);
    await run;

    expect(writes.at(-1)?.ranking[0]?.points).toBe(1); // idempotent matching, not 2
  }, 15_000);
});
