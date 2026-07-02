import { getRedis } from "../../redis.js";
import { LineupNotReadyError } from "./lineup.errors.js";
import {
  lineupOutput,
  storedLineupSchema,
  type LineupOutput,
  type ResolvedPlayer,
} from "./lineup.schema.js";
import { positionLabel } from "./positions.js";

export const lineupKey = (fixtureId: number) => `lineup:${fixtureId}`;

export function parseLineup(
  raw: string | null,
  fixtureId: number,
): LineupOutput {
  if (!raw) throw new LineupNotReadyError(fixtureId);
  const stored = storedLineupSchema.parse(JSON.parse(raw));
  return lineupOutput.parse({
    ...stored,
    teams: stored.teams.map((team) => ({
      ...team,
      players: team.players.map((p) => ({
        ...p,
        position: positionLabel(p.positionId),
      })),
    })),
  });
}

export async function getLineup(fixtureId: number): Promise<LineupOutput> {
  const raw = await getRedis().get(lineupKey(fixtureId));
  return parseLineup(raw, fixtureId);
}

export async function loadTeamNames(
  fixtureId: number,
): Promise<{ team1: string | null; team2: string | null } | null> {
  const raw = await getRedis().get(lineupKey(fixtureId));
  if (!raw) return null;
  const parsed = storedLineupSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return null;
  const nameFor = (side: number) =>
    parsed.data.teams.find((t) => t.side === side)?.teamName ?? null;
  return { team1: nameFor(1), team2: nameFor(2) };
}

export function buildPlayerIndex(
  lineup: LineupOutput,
): Map<number, ResolvedPlayer> {
  const index = new Map<number, ResolvedPlayer>();
  for (const team of lineup.teams) {
    for (const p of team.players) {
      index.set(p.id, {
        id: p.id,
        name: p.name,
        number: p.number,
        positionId: p.positionId,
        position: p.position,
        side: team.side,
      });
    }
  }
  return index;
}

export async function loadPlayerIndex(
  fixtureId: number,
): Promise<Map<number, ResolvedPlayer>> {
  try {
    return buildPlayerIndex(await getLineup(fixtureId));
  } catch {
    return new Map();
  }
}
