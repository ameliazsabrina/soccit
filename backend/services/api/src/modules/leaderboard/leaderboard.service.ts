import {
  KIND_SCORE,
  leaderboardOutput,
  type LeaderboardOutput,
} from "@soccit/scoring/leaderboard/schema";
import { getRedis } from "../../redis.js";
import type { ResolvedPlayer } from "../lineup/lineup.schema.js";
import { loadPlayerIndex } from "../lineup/lineup.service.js";
import type { ProfileSummary } from "../user/user.schema.js";
import { loadUserProfiles } from "../user/user.service.js";
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
  users: Map<string, ProfileSummary>,
): EnrichedLeaderboard {
  return {
    ...board,
    ranking: board.ranking.map((entry) => ({
      ...entry,
      user: users.get(entry.owner) ?? null,
      predictions: entry.predictions.map((p) => {
        // A score pick stores score1/score2 in the out/in fields — they are not
        // player ids, so skip lineup resolution and surface the scoreline.
        if (p.kind === KIND_SCORE) {
          return {
            ...p,
            players: { out: null, in: null },
            score: { score1: p.outPlayerId, score2: p.inPlayerId },
          };
        }
        return {
          ...p,
          players: {
            out: index.get(p.outPlayerId) ?? null,
            in: index.get(p.inPlayerId) ?? null,
          },
          score: null,
        };
      }),
    })),
  };
}

export async function getLeaderboard(fixtureId: number): Promise<EnrichedLeaderboard> {
  const raw = await getRedis().get(leaderboardKey(fixtureId));
  const board = parseLeaderboard(raw, fixtureId);
  const [index, users] = await Promise.all([
    loadPlayerIndex(fixtureId),
    loadUserProfiles(board.ranking.map((e) => e.owner)),
  ]);
  return enrichLeaderboard(board, index, users);
}
