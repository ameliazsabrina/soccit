import { Redis } from "ioredis";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LeaderboardOutput } from "../leaderboard/leaderboard.schema.js";
import type { LeaderboardStore } from "./leaderboard.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const MONGO_URL = process.env.MONGO_URL ?? "mongodb://127.0.0.1:27017";
const DB = "soccit-scoring-integration";
const FIXTURE = 990777;

// Gate on both stores being reachable so `pnpm test` stays green without infra.
// Run `docker compose up -d redis mongo` to exercise it.
async function reachable(): Promise<boolean> {
  const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null });
  let mongo: MongoClient | undefined;
  try {
    await redis.connect();
    await redis.ping();
    mongo = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 1000 });
    await mongo.connect();
    await mongo.db(DB).command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    redis.disconnect();
    await mongo?.close();
  }
}

const up = await reachable();
if (!up) console.warn(`[skip] Redis/Mongo not reachable — skipping scoring durability integration tests`);

const board = (over: Partial<LeaderboardOutput> = {}): LeaderboardOutput => ({
  fixtureId: FIXTURE,
  updatedAt: 1700,
  final: true,
  ranking: [
    { owner: "A", points: 3, earliestScoringLockMinute: 10, predictions: [{ kind: 2, points: 3, side: 1, outPlayerId: 100, inPlayerId: 200 }] },
    { owner: "B", points: 0, earliestScoringLockMinute: null, predictions: [{ kind: 0, points: 0, side: 1, outPlayerId: 9, inPlayerId: 0 }] },
  ],
  winners: ["A", null, null],
  ...over,
});

describe.skipIf(!up)("LeaderboardStore.write (live Redis + Mongo)", () => {
  let store: LeaderboardStore;
  let redis: Redis;
  let mongo: MongoClient;

  beforeAll(async () => {
    process.env.REDIS_URL = REDIS_URL;
    process.env.MONGO_URL = MONGO_URL;
    process.env.MONGO_DB = DB;
    mongo = new MongoClient(MONGO_URL);
    await mongo.connect();
    await mongo.db(DB).dropDatabase(); // clean slate BEFORE init creates indexes
    const mod = await import("./leaderboard.js");
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    store = new mod.LeaderboardStore(redis);
    await store.init();
  });

  afterAll(async () => {
    await mongo.db(DB).dropDatabase();
    await store.close();
    redis.disconnect();
    await mongo.close();
  });

  it("writes the validated leaderboard JSON to redis under leaderboard:<id>", async () => {
    await store.write(board());
    const json = await redis.get(`leaderboard:${FIXTURE}`);
    expect(JSON.parse(json!)).toMatchObject({ fixtureId: FIXTURE, final: true, winners: ["A", null, null] });
  });

  it("upserts one leaderboard doc and one participation doc per owner", async () => {
    await store.write(board());
    const db = mongo.db(DB);
    const lb = await db.collection("leaderboards").findOne({ fixtureId: FIXTURE });
    expect(lb).toMatchObject({ fixtureId: FIXTURE, final: true });

    const parts = await db.collection("participations").find({ fixtureId: FIXTURE }).toArray();
    expect(parts).toHaveLength(2);
    const a = parts.find((p) => p.wallet === "A");
    const b = parts.find((p) => p.wallet === "B");
    expect(a).toMatchObject({ points: 3, rank: 1, final: true });
    expect(b).toMatchObject({ points: 0, rank: null });
  });

  it("is idempotent: re-writing the same fixture does not duplicate docs (upsert)", async () => {
    await store.write(board());
    await store.write(board({ updatedAt: 1800 }));
    const db = mongo.db(DB);
    expect(await db.collection("leaderboards").countDocuments({ fixtureId: FIXTURE })).toBe(1);
    expect(await db.collection("participations").countDocuments({ fixtureId: FIXTURE })).toBe(2);
  });

  it("enforces the unique (wallet, fixtureId) participation index", async () => {
    const indexes = await mongo.db(DB).collection("participations").indexes();
    expect(indexes.some((i) => i.unique && i.key.wallet === 1 && i.key.fixtureId === 1)).toBe(true);
  });
});
