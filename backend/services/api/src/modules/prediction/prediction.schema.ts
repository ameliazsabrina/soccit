import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const U16_MAX = 65_535;
const U32_MAX = 4_294_967_295;

const walletSchema = z
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
  }, "invalid base58 wallet address");

export const KIND_OUT = 0;
export const KIND_IN = 1;
export const KIND_COMBO = 2;
export const KIND_SCORE = 3;

// Matches the on-chain MAX_GOALS bound for a score prediction.
const MAX_GOALS = 99;

export const preparePredictionInput = z
  .object({
    wallet: walletSchema,
    fixtureId: z.number().int().positive(),
    // 0 = no side (score picks); 1/2 = team side (substitution picks).
    side: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    kind: z.union([
      z.literal(KIND_OUT),
      z.literal(KIND_IN),
      z.literal(KIND_COMBO),
      z.literal(KIND_SCORE),
    ]),
    // For a score pick these carry score1 (out) and score2 (in), each 0..MAX_GOALS.
    outPlayerId: z.number().int().min(0).max(U32_MAX),
    inPlayerId: z.number().int().min(0).max(U32_MAX),
    lockMinute: z.number().int().min(0).max(U16_MAX),
    // slotIndex is NOT a client input: under pay-per-match the server derives
    // the next free slot from the caller's on-chain Entry.
  })
  .superRefine((v, ctx) => {
    if (v.kind === KIND_SCORE) {
      if (v.outPlayerId > MAX_GOALS || v.inPlayerId > MAX_GOALS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `score prediction goals must be 0..${MAX_GOALS}`,
          path: ["outPlayerId"],
        });
      }
    } else if (v.side !== 1 && v.side !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "substitution predictions require side 1 or 2",
        path: ["side"],
      });
    }
  });

export const preparePredictionOutput = z.object({
  // Unsigned, fully-serialized legacy transaction, base64-encoded. The wallet
  // adds its signature (feePayer = wallet) and submits it — the API never signs.
  transaction: z.string(),
  fixtureId: z.number().int(),
  prediction: z.string(),
  matchAccount: z.string(),
  userUsdcAta: z.string(),
  usdcMint: z.string(),
  // Enter-once: predictions are always free (the entry fee is paid separately via
  // enter_match), so this is always "0". Retained for output-shape stability.
  entryFee: z.string(),
  // The server-derived slot this pick occupies (0 for the first pick).
  slotIndex: z.number().int().min(0),
  // Kickoff time (unix seconds); 0 = no entry gate. Entries open 10 min before.
  startTime: z.number().int(),
  blockhash: z.string(),
  lastValidBlockHeight: z.number().int(),
});

export type PreparePredictionInput = z.infer<typeof preparePredictionInput>;
export type PreparePredictionOutput = z.infer<typeof preparePredictionOutput>;
