import {
  leaderboardEntrySchema,
  leaderboardOutput,
  predictionResultSchema,
} from "@soccit/scoring/leaderboard/schema";
import { z } from "zod";
import { resolvedPlayerSchema } from "../lineup/lineup.schema.js";
import { profileSummary } from "../user/user.schema.js";

export const enrichedPredictionResult = predictionResultSchema.extend({
  players: z.object({
    out: resolvedPlayerSchema.nullable(),
    in: resolvedPlayerSchema.nullable(),
  }),
});

export const enrichedEntrySchema = leaderboardEntrySchema.extend({
  user: profileSummary.nullable(),
  predictions: z.array(enrichedPredictionResult),
});

export const enrichedLeaderboardOutput = leaderboardOutput.extend({
  ranking: z.array(enrichedEntrySchema),
});

export type EnrichedLeaderboard = z.infer<typeof enrichedLeaderboardOutput>;
