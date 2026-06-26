import type { Redis } from "ioredis";
import { substitutionSchema, type Substitution } from "../leaderboard/leaderboard.schema.js";

const eventStreamKey = (id: number) => `events:${id}`;

export interface StreamEntry {
  id: string;
  type: string;
  payload: unknown;
}

function parseFields(fields: string[]): { type: string; payload: unknown } {
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) map[fields[i] as string] = fields[i + 1] as string;
  let payload: unknown = undefined;
  try {
    payload = map.json ? JSON.parse(map.json) : undefined;
  } catch {
    payload = undefined;
  }
  return { type: map.type ?? "", payload };
}

export async function readAll(redis: Redis, fixtureId: number): Promise<{ entries: StreamEntry[]; lastId: string }> {
  const rows = (await redis.xrange(eventStreamKey(fixtureId), "-", "+")) as [string, string[]][];
  const entries = rows.map(([id, fields]) => ({ id, ...parseFields(fields) }));
  const lastId = entries.length > 0 ? (entries[entries.length - 1] as StreamEntry).id : "0-0";
  return { entries, lastId };
}

export async function* tail(
  redis: Redis,
  fixtureId: number,
  fromId: string,
  signal: AbortSignal,
  blockMs = 5000,
): AsyncGenerator<StreamEntry> {
  const reader = redis.duplicate();
  let cursor = fromId;
  try {
    while (!signal.aborted) {
      const res = (await reader.xread("BLOCK", blockMs, "STREAMS", eventStreamKey(fixtureId), cursor)) as
        | [string, [string, string[]][]][]
        | null;
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

export function toSubstitution(entry: StreamEntry): Substitution | null {
  if (entry.type !== "substitution") return null;
  const parsed = substitutionSchema.safeParse(entry.payload);
  return parsed.success ? parsed.data : null;
}

export function isTerminalStatus(entry: StreamEntry): boolean {
  if (entry.type !== "status") return false;
  const p = entry.payload as { terminal?: unknown } | undefined;
  return Boolean(p && p.terminal === true);
}
