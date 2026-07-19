import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

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

// Enter-once: a wallet pays the entry fee a single time via enter_match. This is
// the input to build that (unsigned) transaction.
export const enterInput = z.object({
  wallet: walletSchema,
  fixtureId: z.number().int().positive(),
});

export const enterOutput = z.object({
  // Unsigned, fully-serialized legacy transaction, base64-encoded. The wallet
  // adds its signature (feePayer = wallet) and submits it — the API never signs.
  transaction: z.string(),
  fixtureId: z.number().int(),
  matchAccount: z.string(),
  userUsdcAta: z.string(),
  // The entry fee charged by this transaction, in USDC base units.
  entryFee: z.string(),
  blockhash: z.string(),
  lastValidBlockHeight: z.number().int(),
});

export const entryStatusInput = z.object({
  pda: z.string(),
  wallet: walletSchema,
});

export const entryStatusOutput = z.object({
  fixtureId: z.number().int(),
  wallet: z.string(),
  entered: z.boolean(),
  // Unix milliseconds the wallet entered; omitted when it has not entered.
  enteredAt: z.number().int().optional(),
});

export type EnterInput = z.infer<typeof enterInput>;
export type EnterOutput = z.infer<typeof enterOutput>;
export type EntryStatusInput = z.infer<typeof entryStatusInput>;
export type EntryStatusOutput = z.infer<typeof entryStatusOutput>;
