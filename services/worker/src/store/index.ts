import { config } from "../config.js";
import { logger } from "../logger.js";
import type { DomainEvent } from "../domain/events.js";
import type { RawEvent } from "../txline/types.js";
import { RedisStore } from "./redis.js";
import { MongoStore } from "./mongo.js";

export class Store {
  readonly redis = new RedisStore();
  private mongo: MongoStore | undefined;

  async init(): Promise<void> {
    await this.redis.init();
    if (config.mongo.url) {
      this.mongo = new MongoStore(config.mongo.url, config.mongo.db);
      await this.mongo.init();
    } else {
      logger.warn("MONGO_URL unset — durable persistence disabled (Redis-only)");
    }
  }

  async persist(raw: RawEvent, events: DomainEvent[]): Promise<void> {
    await this.redis.persist(raw, events);
    if (this.mongo) await this.mongo.persist(raw, events);
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
