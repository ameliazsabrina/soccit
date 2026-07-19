import { MongoClient, type Collection, type Db } from "mongodb";
import { logger } from "../logger.js";
import type { DomainEvent } from "../domain/events.js";
import type { LineupSnapshot } from "../domain/lineup.js";
import { matchMinute, type RawEvent } from "../txline/types.js";

export class MongoStore {
  private client: MongoClient;
  private db!: Db;
  private rawScores!: Collection;
  private events!: Collection;
  private fixtures!: Collection;
  private lineups!: Collection;

  constructor(url: string, private readonly dbName: string) {
    this.client = new MongoClient(url);
  }

  async init(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.rawScores = this.db.collection("raw_scores");
    this.events = this.db.collection("events");
    this.fixtures = this.db.collection("fixtures");
    this.lineups = this.db.collection("lineups");

    await Promise.all([
      this.rawScores.createIndex({ fixtureId: 1, ts: 1 }),
      this.events.createIndex({ fixtureId: 1, ts: 1 }),
      this.events.createIndex({ type: 1 }),
      this.fixtures.createIndex({ fixtureId: 1 }, { unique: true }),
      this.lineups.createIndex({ fixtureId: 1 }, { unique: true }),
    ]);
    logger.info("mongo connected");
  }

  async persist(raw: RawEvent, events: DomainEvent[]): Promise<void> {
    const ingestedAt = Date.now();
    await this.rawScores.insertOne({ ...raw, fixtureId: raw.FixtureId, _ingestedAt: ingestedAt });

    if (events.length > 0) {
      await this.events.insertMany(events.map((e) => ({ ...e, _ingestedAt: ingestedAt })));
    }

    await this.fixtures.updateOne(
      { fixtureId: raw.FixtureId },
      {
        $set: {
          fixtureId: raw.FixtureId,
          statusId: raw.StatusId,
          minute: matchMinute(raw),
          stats: raw.Stats,
          ts: raw.Ts,
          _updatedAt: ingestedAt,
        },
      },
      { upsert: true },
    );
  }

  async writeLineup(snap: LineupSnapshot): Promise<void> {
    await this.lineups.updateOne(
      { fixtureId: snap.fixtureId },
      { $set: { ...snap, _updatedAt: Date.now() } },
      { upsert: true },
    );
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
