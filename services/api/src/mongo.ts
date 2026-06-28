import { MongoClient, type Collection } from "mongodb";
import { config } from "./config.js";
import { logger } from "./logger.js";
import type { UserDoc } from "./modules/user/user.schema.js";

let client: MongoClient | undefined;
let usersReady: Promise<Collection<UserDoc>> | undefined;

function requireMongoUrl(): string {
  if (!config.mongo.url) throw new Error("MONGO_URL is required for user features");
  return config.mongo.url;
}

async function connect(): Promise<Collection<UserDoc>> {
  client = new MongoClient(requireMongoUrl());
  await client.connect();
  const users = client.db(config.mongo.db).collection<UserDoc>("users");
  await Promise.all([
    users.createIndex({ wallet: 1 }, { unique: true }),
    users.createIndex({ usernameLower: 1 }, { unique: true }),
  ]);
  logger.info("mongo connected");
  return users;
}

export function getUsersCollection(): Promise<Collection<UserDoc>> {
  if (!usersReady) usersReady = connect();
  return usersReady;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
    usersReady = undefined;
  }
}
