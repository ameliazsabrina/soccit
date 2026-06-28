import { type Collection, type Db, MongoClient } from "mongodb";
import { config } from "./config.js";
import { logger } from "./logger.js";
import type { ParticipationDoc } from "./modules/participation/participation.schema.js";
import type { UserDoc } from "./modules/user/user.schema.js";

let client: MongoClient | undefined;
let dbReady: Promise<Db> | undefined;
let usersReady: Promise<Collection<UserDoc>> | undefined;

function requireMongoUrl(): string {
  if (!config.mongo.url) throw new Error("MONGO_URL is required for user features");
  return config.mongo.url;
}

function getDb(): Promise<Db> {
  if (!dbReady) {
    dbReady = (async () => {
      client = new MongoClient(requireMongoUrl());
      await client.connect();
      logger.info("mongo connected");
      return client.db(config.mongo.db);
    })();
  }
  return dbReady;
}

export function getUsersCollection(): Promise<Collection<UserDoc>> {
  if (!usersReady) {
    usersReady = (async () => {
      const users = (await getDb()).collection<UserDoc>("users");
      await Promise.all([
        users.createIndex({ wallet: 1 }, { unique: true }),
        users.createIndex({ usernameLower: 1 }, { unique: true }),
      ]);
      return users;
    })();
  }
  return usersReady;
}

export async function getParticipationsCollection(): Promise<Collection<ParticipationDoc>> {
  return (await getDb()).collection<ParticipationDoc>("participations");
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    dbReady = undefined;
    usersReady = undefined;
  }
}
