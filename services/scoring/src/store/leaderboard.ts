import type { Redis } from "ioredis";
import { type Collection, MongoClient } from "mongodb";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { leaderboardOutput, type LeaderboardOutput } from "../leaderboard/leaderboard.schema.js";

const leaderboardKey = (id: number) => `leaderboard:${id}`;

export interface ParticipationDoc {
  wallet: string;
  fixtureId: number;
  points: number;
  final: boolean;
  rank: number | null;
  predictions: LeaderboardOutput["ranking"][number]["predictions"];
}

export function participationDocs(out: LeaderboardOutput): ParticipationDoc[] {
  return out.ranking.map((entry) => {
    const idx = out.winners.findIndex((w) => w === entry.owner);
    return {
      wallet: entry.owner,
      fixtureId: out.fixtureId,
      points: entry.points,
      final: out.final,
      rank: idx >= 0 ? idx + 1 : null,
      predictions: entry.predictions,
    };
  });
}

export class LeaderboardStore {
  private mongoClient: MongoClient | undefined;
  private leaderboards: Collection | undefined;
  private participations: Collection | undefined;

  constructor(private readonly redis: Redis) {}

  async init(): Promise<void> {
    if (!config.mongo.url) {
      logger.warn("MONGO_URL unset — leaderboard durability disabled (Redis-only)");
      return;
    }
    this.mongoClient = new MongoClient(config.mongo.url);
    await this.mongoClient.connect();
    const db = this.mongoClient.db(config.mongo.db);
    this.leaderboards = db.collection("leaderboards");
    this.participations = db.collection("participations");
    await this.leaderboards.createIndex({ fixtureId: 1 }, { unique: true });
    await this.participations.createIndex({ wallet: 1, fixtureId: 1 }, { unique: true });
    await this.participations.createIndex({ wallet: 1 });
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
    if (this.participations) {
      const now = Date.now();
      await Promise.all(
        participationDocs(validated).map((doc) =>
          this.participations!.updateOne(
            { wallet: doc.wallet, fixtureId: doc.fixtureId },
            { $set: { ...doc, _updatedAt: now } },
            { upsert: true },
          ),
        ),
      );
    }
  }

  async close(): Promise<void> {
    if (this.mongoClient) await this.mongoClient.close();
  }
}
