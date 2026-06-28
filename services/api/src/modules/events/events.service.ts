import type { Redis } from "ioredis";
import { config } from "../../config.js";
import { newRedisConnection } from "../../redis.js";
import type { EventEntry } from "./events.schema.js";

export const eventStreamKey = (fixtureId: number) => `events:${fixtureId}`;

export function parseFields(fields: string[]): { type: string; payload: unknown } {
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) map[fields[i] as string] = fields[i + 1] as string;
  let payload: unknown;
  try {
    payload = map.json ? JSON.parse(map.json) : undefined;
  } catch {
    payload = undefined;
  }
  return { type: map.type ?? "", payload };
}

export async function backfill(
  redis: Redis,
  fixtureId: number,
  fromId: string,
): Promise<EventEntry[]> {
  const start = fromId === "0-0" ? "-" : `(${fromId}`;
  const rows = (await redis.xrange(eventStreamKey(fixtureId), start, "+")) as [string, string[]][];
  return rows.map(([id, fields]) => ({ id, ...parseFields(fields) }));
}

export async function* tail(
  fixtureId: number,
  fromId: string,
  signal: AbortSignal,
): AsyncGenerator<EventEntry> {
  const reader = newRedisConnection();
  let cursor = fromId;
  try {
    while (!signal.aborted) {
      const res = (await reader.xread(
        "BLOCK",
        config.streamBlockMs,
        "STREAMS",
        eventStreamKey(fixtureId),
        cursor,
      )) as [string, [string, string[]][]][] | null;
      if (!res) continue;
      for (const [, rows] of res) {
        for (const [id, fields] of rows) {
          cursor = id;
          yield { id, ...parseFields(fields) };
        }
      }
    }
  } finally {
    reader.disconnect();
  }
}
