import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

/**
 * A match-account PDA: a base58 Solana address. Public endpoints key matches by
 * this PDA; it is resolved to the internal fixtureId via the Redis reverse
 * index (see modules/match/pda.ts).
 */
export const pdaString = z
  .string()
  .min(32)
  .max(44)
  .refine((v) => {
    try {
      // eslint-disable-next-line no-new
      new PublicKey(v);
      return true;
    } catch {
      return false;
    }
  }, "invalid match account");

export const matchInput = z.object({
  pda: pdaString,
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
  winners: z.tuple([
    z.string().nullable(),
    z.string().nullable(),
    z.string().nullable(),
  ]),
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

export const matchSummarySchema = z.object({
  pda: z.string(),
  fixtureId: z.number().int(),
  onchain: onchainMatchSchema,
  live: liveMatchSchema.nullable(),
  teamNames: z
    .object({ team1: z.string().nullable(), team2: z.string().nullable() })
    .nullable(),
});

export const matchListOutput = z.array(matchSummarySchema);

export type MatchInput = z.infer<typeof matchInput>;
export type OnchainMatch = z.infer<typeof onchainMatchSchema>;
export type LiveMatch = z.infer<typeof liveMatchSchema>;
export type MatchState = z.infer<typeof matchStateOutput>;
export type MatchSummary = z.infer<typeof matchSummarySchema>;
