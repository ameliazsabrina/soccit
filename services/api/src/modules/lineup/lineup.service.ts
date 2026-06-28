import { getRedis } from "../../redis.js";
import { LineupNotReadyError } from "./lineup.errors.js";
import { lineupOutput, type LineupOutput } from "./lineup.schema.js";

export const lineupKey = (fixtureId: number) => `lineup:${fixtureId}`;

export function parseLineup(raw: string | null, fixtureId: number): LineupOutput {
  if (!raw) throw new LineupNotReadyError(fixtureId);
  return lineupOutput.parse(JSON.parse(raw));
}

export async function getLineup(fixtureId: number): Promise<LineupOutput> {
  const raw = await getRedis().get(lineupKey(fixtureId));
  return parseLineup(raw, fixtureId);
}
