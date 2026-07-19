import {
  leaderboardEntrySchema,
  leaderboardOutput,
  predictionResultSchema,
} from "@soccit/scoring/leaderboard/schema";
import { z } from "zod";
import { resolvedPlayerSchema } from "../lineup/lineup.schema.js";
import { profileSummary } from "../user/user.schema.js";

export const enrichedPredictionResult = predictionResultSchema.extend({
  // Resolved for substitution picks (kind 0/1/2); both null for a score pick.
  players: z.object({
    out: resolvedPlayerSchema.nullable(),
    in: resolvedPlayerSchema.nullable(),
  }),
  // Populated only for a score pick (kind 3): the predicted scoreline
  // (score1 = team1, score2 = team2). null for substitution picks.
  score: z
    .object({ score1: z.number().int().nonnegative(), score2: z.number().int().nonnegative() })
    .nullable(),
});

export const enrichedEntrySchema = leaderboardEntrySchema.extend({
  user: profileSummary.nullable(),
  predictions: z.array(enrichedPredictionResult),
});

export const enrichedLeaderboardOutput = leaderboardOutput.extend({
  ranking: z.array(enrichedEntrySchema),
});

export type EnrichedLeaderboard = z.infer<typeof enrichedLeaderboardOutput>;
