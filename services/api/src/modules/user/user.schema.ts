import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/);

export const walletSchema = z.string().min(32).max(44);

export const registerInput = z.object({
  wallet: walletSchema,
  username: usernameSchema,
  message: z.string(),
  signature: z.string(),
});

export const walletInput = z.object({
  wallet: walletSchema,
});

export const userProfile = z.object({
  wallet: z.string(),
  username: z.string(),
  createdAt: z.number().int(),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type WalletInput = z.infer<typeof walletInput>;
export type UserProfile = z.infer<typeof userProfile>;

export interface UserDoc {
  wallet: string;
  username: string;
  usernameLower: string;
  createdAt: number;
}
