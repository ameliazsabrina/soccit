import { Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "../logger.js";
import type { DomainEvent } from "../domain/events.js";
import { matchMinute, type RawEvent } from "../txline/types.js";

const LAST_EVENT_ID_KEY = "txline:scores:lastEventId";
const fixtureKey = (id: number) => `fixture:${id}`;
const eventStreamKey = (id: number) => `events:${id}`;

export class RedisStore {
  private redis: Redis;

  constructor(url = config.redis.url) {
    this.redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.redis.on("error", (err) => logger.warn({ err: String(err) }, "redis error"));
  }

  async init(): Promise<void> {
    await this.redis.connect();
    logger.info("redis connected");
  }

  async getLastEventId(): Promise<string | undefined> {
    return (await this.redis.get(LAST_EVENT_ID_KEY)) ?? undefined;
  }

  async setLastEventId(id: string): Promise<void> {
    await this.redis.set(LAST_EVENT_ID_KEY, id);
  }

  async persist(raw: RawEvent, events: DomainEvent[]): Promise<void> {
    const pipe = this.redis.pipeline();

    const stats = raw.Stats ?? {};
    pipe.hset(fixtureKey(raw.FixtureId), {
      fixtureId: String(raw.FixtureId),
      statusId: String(raw.StatusId ?? ""),
      minute: String(matchMinute(raw) ?? ""),
      goals1: String(stats["1"] ?? 0),
      goals2: String(stats["2"] ?? 0),
      ts: String(raw.Ts ?? Date.now()),
    });

    for (const e of events) {
      pipe.xadd(
        eventStreamKey(raw.FixtureId),
        "MAXLEN",
        "~",
        "5000",
        "*",
        "type",
        e.type,
        "json",
        JSON.stringify(e),
      );
    }

    await pipe.exec();
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
