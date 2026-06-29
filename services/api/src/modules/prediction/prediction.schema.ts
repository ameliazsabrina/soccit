import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const U8_MAX = 255;
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

export const preparePredictionInput = z.object({
  wallet: walletSchema,
  fixtureId: z.number().int().positive(),
  side: z.union([z.literal(1), z.literal(2)]),
  kind: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  outPlayerId: z.number().int().min(0).max(U32_MAX),
  inPlayerId: z.number().int().min(0).max(U32_MAX),
  lockMinute: z.number().int().min(0).max(U16_MAX),
  slotIndex: z.number().int().min(0).max(U8_MAX),
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
  entryFee: z.string(),
  blockhash: z.string(),
  lastValidBlockHeight: z.number().int(),
});

export type PreparePredictionInput = z.infer<typeof preparePredictionInput>;
export type PreparePredictionOutput = z.infer<typeof preparePredictionOutput>;
