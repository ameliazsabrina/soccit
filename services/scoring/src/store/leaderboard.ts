import type { Redis } from "ioredis";
import { type Collection, MongoClient } from "mongodb";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { leaderboardOutput, type LeaderboardOutput } from "../leaderboard/leaderboard.schema.js";

const leaderboardKey = (id: number) => `leaderboard:${id}`;

export class LeaderboardStore {
  private mongoClient: MongoClient | undefined;
  private leaderboards: Collection | undefined;

  constructor(private readonly redis: Redis) {}

  async init(): Promise<void> {
    if (!config.mongo.url) {
      logger.warn("MONGO_URL unset — leaderboard durability disabled (Redis-only)");
      return;
    }
    this.mongoClient = new MongoClient(config.mongo.url);
    await this.mongoClient.connect();
    this.leaderboards = this.mongoClient.db(config.mongo.db).collection("leaderboards");
    await this.leaderboards.createIndex({ fixtureId: 1 }, { unique: true });
    logger.info("mongo connected");
  }

  async write(out: LeaderboardOutput): Promise<void> {
    const validated = leaderboardOutput.parse(out);
    const key = leaderboardKey(validated.fixtureId);
    const json = JSON.stringify(validated);
    await this.redis.set(key, json);
    await this.redis.publish(key, json);
    if (this.leaderboards) {
      await this.leaderboards.updateOne(
        { fixtureId: validated.fixtureId },
        { $set: { ...validated, _updatedAt: Date.now() } },
        { upsert: true },
      );
    }
  }

  async close(): Promise<void> {
    if (this.mongoClient) await this.mongoClient.close();
  }
}
