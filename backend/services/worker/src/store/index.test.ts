import { describe, expect, it, vi } from "vitest";
import { Store } from "./index.js";
import type { RedisStore } from "./redis.js";
import type { MongoStore } from "./mongo.js";
import type { DomainEvent } from "../domain/events.js";
import type { LineupSnapshot } from "../domain/lineup.js";
import type { RawEvent } from "../txline/types.js";

const raw: RawEvent = { FixtureId: 17926593, Action: "substitution" };
const events: DomainEvent[] = [
  { type: "substitution", fixtureId: 17926593, side: 1, playerOutId: 100, playerInId: 200, minute: 60 },
];
const snap: LineupSnapshot = { fixtureId: 17926593, updatedAt: 1, teams: [], names: {} };

function fakeRedis(over: Partial<RedisStore> = {}): RedisStore {
  return {
    persist: vi.fn(async () => {}),
    writeLineup: vi.fn(async () => {}),
    ...over,
  } as unknown as RedisStore;
}

function fakeMongo(over: Partial<MongoStore> = {}): MongoStore {
  return {
    persist: vi.fn(async () => {}),
    writeLineup: vi.fn(async () => {}),
    ...over,
  } as unknown as MongoStore;
}

describe("Store failure isolation", () => {
  it("persist resolves even when the Mongo write throws (Redis still committed)", async () => {
    const redis = fakeRedis();
    const mongo = fakeMongo({ persist: vi.fn(async () => { throw new Error("mongo down"); }) });
    const store = new Store(redis, mongo);

    await expect(store.persist(raw, events)).resolves.toBeUndefined();
    expect(redis.persist).toHaveBeenCalledTimes(1);
    expect(mongo.persist).toHaveBeenCalledTimes(1);
  });

  it("writeLineup resolves even when the Mongo write throws", async () => {
    const redis = fakeRedis();
    const mongo = fakeMongo({ writeLineup: vi.fn(async () => { throw new Error("mongo down"); }) });
    const store = new Store(redis, mongo);

    await expect(store.writeLineup(snap)).resolves.toBeUndefined();
    expect(redis.writeLineup).toHaveBeenCalledTimes(1);
  });

  it("persist propagates a Redis failure and never reaches Mongo (event must be retried)", async () => {
    const redis = fakeRedis({ persist: vi.fn(async () => { throw new Error("redis down"); }) });
    const mongo = fakeMongo();
    const store = new Store(redis, mongo);

    await expect(store.persist(raw, events)).rejects.toThrow("redis down");
    expect(mongo.persist).not.toHaveBeenCalled();
  });

  it("writes through to both stores on the happy path", async () => {
    const redis = fakeRedis();
    const mongo = fakeMongo();
    const store = new Store(redis, mongo);

    await store.persist(raw, events);
    await store.writeLineup(snap);
    expect(redis.persist).toHaveBeenCalledTimes(1);
    expect(mongo.persist).toHaveBeenCalledTimes(1);
    expect(redis.writeLineup).toHaveBeenCalledTimes(1);
    expect(mongo.writeLineup).toHaveBeenCalledTimes(1);
  });

  it("works Redis-only when no Mongo store is injected", async () => {
    const redis = fakeRedis();
    const store = new Store(redis);

    await expect(store.persist(raw, events)).resolves.toBeUndefined();
    expect(redis.persist).toHaveBeenCalledTimes(1);
  });
});
