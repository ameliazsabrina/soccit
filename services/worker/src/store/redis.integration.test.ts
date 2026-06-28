import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RedisStore } from "./redis.js";
import type { DomainEvent } from "../domain/events.js";
import type { RawEvent } from "../txline/types.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// Gate the suite on a reachable Redis so `pnpm test` stays green without infra.
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
if (!up) console.warn(`[skip] Redis not reachable at ${REDIS_URL} — skipping redis integration tests`);

const FIXTURE = 990001;
const fixtureKey = `fixture:${FIXTURE}`;
const eventStreamKey = `events:${FIXTURE}`;

describe.skipIf(!up)("RedisStore (live Redis)", () => {
  let store: RedisStore;
  let raw: Redis;

  beforeAll(async () => {
    store = new RedisStore(REDIS_URL);
    await store.init();
    raw = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    await raw.del(fixtureKey, eventStreamKey, "txline:scores:lastEventId");
  });

  afterAll(async () => {
    await raw.del(fixtureKey, eventStreamKey, "txline:scores:lastEventId");
    await store.close();
    raw.disconnect();
  });

  const rawEvent = (over: Partial<RawEvent> = {}): RawEvent => ({
    FixtureId: FIXTURE,
    StatusId: 2,
    Clock: { Seconds: 3_600 },
    Stats: { "1": 2, "2": 1 },
    Ts: 1_700,
    ...over,
  });

  const sub: DomainEvent = {
    type: "substitution",
    fixtureId: FIXTURE,
    side: 1,
    playerOutId: 100,
    playerInId: 200,
    minute: 60,
  };

  it("writes the fixture hash with status, minute, and goals", async () => {
    await store.persist(rawEvent(), []);
    const hash = await raw.hgetall(fixtureKey);
    expect(hash).toMatchObject({
      fixtureId: String(FIXTURE),
      statusId: "2",
      minute: "60", // 3600s / 60
      goals1: "2",
      goals2: "1",
    });
  });

  it("appends one stream entry per domain event with type + json fields", async () => {
    await raw.del(eventStreamKey);
    await store.persist(rawEvent(), [sub]);
    const rows = (await raw.xrange(eventStreamKey, "-", "+")) as [string, string[]][];
    expect(rows).toHaveLength(1);
    const fields = rows[0]![1];
    const map: Record<string, string> = {};
    for (let i = 0; i + 1 < fields.length; i += 2) map[fields[i]!] = fields[i + 1]!;
    expect(map.type).toBe("substitution");
    expect(JSON.parse(map.json!)).toMatchObject({ playerOutId: 100, playerInId: 200, minute: 60 });
  });

  it("persists with auto-ids (re-ingesting the same event appends, not overwrites)", async () => {
    await raw.del(eventStreamKey);
    await store.persist(rawEvent(), [sub]);
    await store.persist(rawEvent(), [sub]);
    const rows = (await raw.xrange(eventStreamKey, "-", "+")) as [string, string[]][];
    // Documents the intentionally non-idempotent append-log behavior (Finding #5).
    expect(rows).toHaveLength(2);
  });

  it("round-trips the last-event-id cursor", async () => {
    await store.setLastEventId("4242");
    expect(await store.getLastEventId()).toBe("4242");
  });

  it("stores a lineup snapshot as JSON under lineup:<id>", async () => {
    await store.writeLineup({ fixtureId: FIXTURE, updatedAt: 1, teams: [], names: { "1": "Player" } });
    const json = await raw.get(`lineup:${FIXTURE}`);
    expect(JSON.parse(json!)).toMatchObject({ fixtureId: FIXTURE, names: { "1": "Player" } });
    await raw.del(`lineup:${FIXTURE}`);
  });
});
