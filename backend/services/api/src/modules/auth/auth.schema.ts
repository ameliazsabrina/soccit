import { z } from "zod";
import { walletSchema } from "../user/user.schema.js";

export const sessionInput = z.object({
  wallet: walletSchema,
  message: z.string(),
  signature: z.string(),
});

export const sessionOutput = z.object({
  token: z.string(),
  expiresAt: z.number().int(),
});

export type SessionInput = z.infer<typeof sessionInput>;
export type SessionOutput = z.infer<typeof sessionOutput>;

export interface SessionClaims {
  sub: string; // wallet
  iat: number; // issued-at (seconds)
  exp: number; // expiry (seconds)
}
