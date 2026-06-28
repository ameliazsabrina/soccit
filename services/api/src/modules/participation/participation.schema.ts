import { predictionResultSchema } from "@soccit/scoring/leaderboard/schema";
import { z } from "zod";

export const participationOutput = z.object({
  wallet: z.string(),
  fixtureId: z.number().int(),
  points: z.number().int().nonnegative(),
  final: z.boolean(),
  rank: z.number().int().min(1).max(3).nullable(),
  predictions: z.array(predictionResultSchema),
});

export const userMatchesOutput = z.array(participationOutput);

export type Participation = z.infer<typeof participationOutput>;

export interface ParticipationDoc {
  wallet: string;
  fixtureId: number;
  points: number;
  final: boolean;
  rank: number | null;
  predictions: unknown;
}
