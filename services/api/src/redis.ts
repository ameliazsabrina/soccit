import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, { lazyConnect: false, maxRetriesPerRequest: null });
    client.on("error", (err) => logger.warn({ err: String(err) }, "redis error"));
  }
  return client;
}

export function newRedisConnection(): Redis {
  const conn = new Redis(config.redis.url, { lazyConnect: false, maxRetriesPerRequest: null });
  conn.on("error", (err) => logger.warn({ err: String(err) }, "redis error"));
  return conn;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = undefined;
  }
}
