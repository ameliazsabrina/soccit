import { z } from "zod";

export const AVATARS = [
  "avatar-0",
  "avatar-1",
  "avatar-2",
  "avatar-3",
  "avatar-4",
  "avatar-5",
  "avatar-6",
  "avatar-7",
  "avatar-8",
  "avatar-9",
  "avatar-10",
  "avatar-11",
] as const;

export const avatarSchema = z.enum(AVATARS);

export const avatarDescriptor = z.object({
  id: avatarSchema,
  src: z.string(),
});

export const avatarsOutput = z.array(avatarDescriptor);

export const profileSummary = z.object({
  username: z.string(),
  avatar: avatarSchema.nullable(),
});

export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/);

export const walletSchema = z.string().min(32).max(44);

export const registerInput = z.object({
  wallet: walletSchema,
  username: usernameSchema,
  avatar: avatarSchema.optional(),
  message: z.string(),
  signature: z.string(),
});

export const setAvatarInput = z.object({
  wallet: walletSchema,
  avatar: avatarSchema,
});

export const setUsernameInput = z.object({
  wallet: walletSchema,
  username: usernameSchema,
});

export const walletInput = z.object({
  wallet: walletSchema,
});

export const userProfile = z.object({
  wallet: z.string(),
  username: z.string(),
  avatar: avatarSchema.nullable(),
  createdAt: z.number().int(),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type SetAvatarInput = z.infer<typeof setAvatarInput>;
export type SetUsernameInput = z.infer<typeof setUsernameInput>;
export type WalletInput = z.infer<typeof walletInput>;
export type UserProfile = z.infer<typeof userProfile>;
export type Avatar = z.infer<typeof avatarSchema>;
export type AvatarDescriptor = z.infer<typeof avatarDescriptor>;
export type ProfileSummary = z.infer<typeof profileSummary>;

export interface UserDoc {
  wallet: string;
  username: string;
  usernameLower: string;
  avatar: Avatar | null;
  createdAt: number;
}
