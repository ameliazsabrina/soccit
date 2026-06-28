import { leaderboardOutput, type LeaderboardOutput } from "@soccit/scoring/leaderboard/schema";
import { getRedis } from "../../redis.js";
import type { ResolvedPlayer } from "../lineup/lineup.schema.js";
import { loadPlayerIndex } from "../lineup/lineup.service.js";
import { LeaderboardNotReadyError } from "./leaderboard.errors.js";
import type { EnrichedLeaderboard } from "./leaderboard.schema.js";

export const leaderboardKey = (fixtureId: number) => `leaderboard:${fixtureId}`;

export function parseLeaderboard(raw: string | null, fixtureId: number): LeaderboardOutput {
  if (!raw) throw new LeaderboardNotReadyError(fixtureId);
  return leaderboardOutput.parse(JSON.parse(raw));
}

export function enrichLeaderboard(
  board: LeaderboardOutput,
  index: Map<number, ResolvedPlayer>,
): EnrichedLeaderboard {
  return {
    ...board,
    ranking: board.ranking.map((entry) => ({
      ...entry,
      predictions: entry.predictions.map((p) => ({
        ...p,
        players: {
          out: index.get(p.outPlayerId) ?? null,
          in: index.get(p.inPlayerId) ?? null,
        },
      })),
    })),
  };
}

export async function getLeaderboard(fixtureId: number): Promise<EnrichedLeaderboard> {
  const raw = await getRedis().get(leaderboardKey(fixtureId));
  const board = parseLeaderboard(raw, fixtureId);
  const index = await loadPlayerIndex(fixtureId);
  return enrichLeaderboard(board, index);
}
