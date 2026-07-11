import { z } from "zod";
import { liveMatchSchema, matchPhaseSchema } from "../match/match.schema.js";

export const portfolioPositionSchema = z
  .object({
    pda: z.string(),
    fixtureId: z.number().int(),
    status: z.number().int(),
    statusLabel: z.enum(["OPEN", "RESOLVED"]),
    entryFee: z.string(),
    side: z.number().int(),
    slotsUsed: z.number().int(),
    team1Id: z.number().int(),
    team2Id: z.number().int(),
    startTime: z.number().int(),
    phase: matchPhaseSchema,
    live: liveMatchSchema.nullable(),
  })
  .strict();

export const portfolioOutput = z
  .object({
    wallet: z.string(),
    // null when no mint is configured and the wallet has no positions to derive one from.
    usdcMint: z.string().nullable(),
    usdcBalance: z.string(),
    // Σ entry fees locked in active (unsettled) positions.
    lockedStake: z.string(),
    // usdcBalance + lockedStake — the headline "portfolio value".
    portfolioValue: z.string(),
    usdcDecimals: z.literal(6),
    activeCount: z.number().int(),
    positions: z.array(portfolioPositionSchema),
    updatedAt: z.number().int(),
  })
  .strict();

export type PortfolioPosition = z.infer<typeof portfolioPositionSchema>;
export type Portfolio = z.infer<typeof portfolioOutput>;
