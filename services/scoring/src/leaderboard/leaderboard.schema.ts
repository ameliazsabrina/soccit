import { z } from "zod";

export const KIND_OUT = 0;
export const KIND_IN = 1;
export const KIND_COMBO = 2;

export const sideSchema = z.union([z.literal(1), z.literal(2)]);

export const predictionSchema = z.object({
  owner: z.string(),
  side: sideSchema,
  kind: z.union([z.literal(KIND_OUT), z.literal(KIND_IN), z.literal(KIND_COMBO)]),
  outPlayerId: z.number().int().nonnegative(),
  inPlayerId: z.number().int().nonnegative(),
  lockMinute: z.number().int().nonnegative(),
});

export const substitutionSchema = z.object({
  side: sideSchema,
  playerOutId: z.number().int(),
  playerInId: z.number().int(),
  minute: z.number().int(),
});

export const predictionResultSchema = z.object({
  kind: predictionSchema.shape.kind,
  points: z.number().int().nonnegative(),
  side: sideSchema,
  outPlayerId: z.number().int().nonnegative(),
  inPlayerId: z.number().int().nonnegative(),
});

export const leaderboardEntrySchema = z.object({
  owner: z.string(),
  points: z.number().int().nonnegative(),
  earliestScoringLockMinute: z.number().int().nonnegative().nullable(),
  predictions: z.array(predictionResultSchema),
});

export const leaderboardOutput = z.object({
  fixtureId: z.number().int(),
  updatedAt: z.number().int(),
  final: z.boolean(),
  ranking: z.array(leaderboardEntrySchema),
  winners: z.tuple([z.string().nullable(), z.string().nullable(), z.string().nullable()]),
});

export type Side = z.infer<typeof sideSchema>;
export type Prediction = z.infer<typeof predictionSchema>;
export type Substitution = z.infer<typeof substitutionSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type LeaderboardOutput = z.infer<typeof leaderboardOutput>;
