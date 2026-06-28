import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backfill, eventStreamKey } from "./events.service.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const FIXTURE = 991234;

// Gate on a reachable Redis so `pnpm test` stays green without infra.
// Run `docker compose up -d redis` to exercise it.
async function redisReachable(): Promise<boolean> {
  const probe = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
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
if (!up) console.warn(`[skip] Redis not reachable at ${REDIS_URL} — skipping backfill integration tests`);

describe.skipIf(!up)("backfill cursor semantics (live Redis stream)", () => {
  let redis: Redis;
  const ids: string[] = [];
  const key = eventStreamKey(FIXTURE);

  beforeAll(async () => {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    await redis.del(key);
    for (const [type, payload] of [
      ["goal", { side: 1, playerId: 7 }],
      ["substitution", { side: 1, playerOutId: 11, playerInId: 22, minute: 60 }],
      ["status", { action: "game_finalised", terminal: true }],
    ] as const) {
      const id = (await redis.xadd(key, "*", "type", type, "json", JSON.stringify(payload))) as string;
      ids.push(id);
    }
  });

  afterAll(async () => {
    await redis.del(key);
    redis.disconnect();
  });

  it("0-0 returns the full stream from the beginning (inclusive)", async () => {
    const rows = await backfill(redis, FIXTURE, "0-0");
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.type)).toEqual(["goal", "substitution", "status"]);
    expect(rows[1]?.payload).toMatchObject({ playerOutId: 11, playerInId: 22 });
  });

  it("a real id resumes exclusively (only events strictly after the cursor)", async () => {
    const rows = await backfill(redis, FIXTURE, ids[0]!);
    expect(rows.map((r) => r.id)).toEqual([ids[1], ids[2]]);
  });

  it("the last id yields an empty backfill (caller is already caught up)", async () => {
    const rows = await backfill(redis, FIXTURE, ids[2]!);
    expect(rows).toHaveLength(0);
  });

  it("returns an empty array for a fixture with no stream", async () => {
    expect(await backfill(redis, 424242, "0-0")).toEqual([]);
  });
});
