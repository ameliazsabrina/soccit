import { config } from "../config.js";
import { logger } from "../logger.js";
import type { DomainEvent } from "../domain/events.js";
import type { LineupSnapshot } from "../domain/lineup.js";
import type { RawEvent } from "../txline/types.js";
import { RedisStore } from "./redis.js";
import { MongoStore } from "./mongo.js";

export class Store {
  private mongo: MongoStore | undefined;

  // Collaborators are injectable so the failure-isolation policy below can be
  // unit-tested without a live Redis/Mongo. Production uses the defaults.
  constructor(readonly redis: RedisStore = new RedisStore(), mongo?: MongoStore) {
    this.mongo = mongo;
  }

  async init(): Promise<void> {
    await this.redis.init();
    if (this.mongo) return; // already injected (tests)
    if (config.mongo.url) {
      this.mongo = new MongoStore(config.mongo.url, config.mongo.db);
      await this.mongo.init();
    } else {
      logger.warn("MONGO_URL unset — durable persistence disabled (Redis-only)");
    }
  }

  async persist(raw: RawEvent, events: DomainEvent[]): Promise<void> {
    // Redis is the source of truth for downstream scoring — a Redis failure
    // must propagate (the event is not acked and will be retried). Mongo is
    // best-effort durability/history: never let it wedge live ingestion.
    await this.redis.persist(raw, events);
    if (this.mongo) {
      try {
        await this.mongo.persist(raw, events);
      } catch (err) {
        logger.warn(
          { err: String(err), fixtureId: raw.FixtureId },
          "mongo persist failed — durability degraded, continuing",
        );
      }
    }
  }

  async writeLineup(snap: LineupSnapshot): Promise<void> {
    await this.redis.writeLineup(snap);
    if (this.mongo) {
      try {
        await this.mongo.writeLineup(snap);
      } catch (err) {
        logger.warn(
          { err: String(err), fixtureId: snap.fixtureId },
          "mongo lineup write failed — durability degraded, continuing",
        );
      }
    }
  }

  getLastEventId(): Promise<string | undefined> {
    return this.redis.getLastEventId();
  }

  setLastEventId(id: string): Promise<void> {
    return this.redis.setLastEventId(id);
  }

  async close(): Promise<void> {
    await this.redis.close();
    if (this.mongo) await this.mongo.close();
  }
}
