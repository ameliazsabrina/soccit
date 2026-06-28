import { leaderboardOutput, type LeaderboardOutput } from "@soccit/scoring/leaderboard/schema";
import { getRedis } from "../../redis.js";
import { LeaderboardNotReadyError } from "./leaderboard.errors.js";

export const leaderboardKey = (fixtureId: number) => `leaderboard:${fixtureId}`;

export function parseLeaderboard(raw: string | null, fixtureId: number): LeaderboardOutput {
  if (!raw) throw new LeaderboardNotReadyError(fixtureId);
  return leaderboardOutput.parse(JSON.parse(raw));
}

export async function getLeaderboard(fixtureId: number): Promise<LeaderboardOutput> {
  const raw = await getRedis().get(leaderboardKey(fixtureId));
  return parseLeaderboard(raw, fixtureId);
}
