import { z } from "zod";

export const matchInput = z.object({
  fixtureId: z.number().int().positive(),
});

export const onchainMatchSchema = z.object({
  status: z.number().int(),
  statusLabel: z.enum(["OPEN", "RESOLVED", "SETTLED", "UNKNOWN"]),
  settled: z.boolean(),
  entryFee: z.string(),
  poolTotal: z.string(),
  participantCount: z.number().int().nonnegative(),
  team1Id: z.number().int(),
  team2Id: z.number().int(),
  usdcMint: z.string(),
  winners: z.tuple([z.string().nullable(), z.string().nullable(), z.string().nullable()]),
});

export const liveMatchSchema = z.object({
  statusId: z.number().int().nullable(),
  minute: z.number().int().nullable(),
  goals: z.object({ team1: z.number().int(), team2: z.number().int() }),
  ts: z.number().int().nullable(),
});

export const matchStateOutput = z.object({
  fixtureId: z.number().int(),
  onchain: onchainMatchSchema.nullable(),
  live: liveMatchSchema.nullable(),
  updatedAt: z.number().int(),
});

export type MatchInput = z.infer<typeof matchInput>;
export type OnchainMatch = z.infer<typeof onchainMatchSchema>;
export type LiveMatch = z.infer<typeof liveMatchSchema>;
export type MatchState = z.infer<typeof matchStateOutput>;
