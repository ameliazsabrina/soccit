import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { MongoServerError } from "mongodb";
import nacl from "tweetnacl";
import { config } from "../../config.js";
import { getUsersCollection } from "../../mongo.js";
import {
  InvalidSignatureError,
  UsernameTakenError,
  UserNotFoundError,
  WalletAlreadyRegisteredError,
} from "./user.errors.js";
import {
  AVATARS,
  type AvatarDescriptor,
  type ProfileSummary,
  type RegisterInput,
  type SetAvatarInput,
  type UserDoc,
  type UserProfile,
} from "./user.schema.js";

export function onboardingMessage(wallet: string): string {
  return `Soccit onboarding: ${wallet}`;
}

export function avatarSrc(id: string): string {
  return `/avatars/${id}.png`;
}

export function listAvatars(): AvatarDescriptor[] {
  return AVATARS.map((id) => ({ id, src: avatarSrc(id) }));
}

export async function loadUserProfiles(
  wallets: string[],
): Promise<Map<string, ProfileSummary>> {
  const index = new Map<string, ProfileSummary>();
  const unique = [...new Set(wallets)];
  if (!config.mongo.url || unique.length === 0) return index;
  const docs = await (await getUsersCollection())
    .find({ wallet: { $in: unique } })
    .toArray();
  for (const doc of docs) index.set(doc.wallet, { username: doc.username, avatar: doc.avatar });
  return index;
}

function toProfile(doc: UserDoc): UserProfile {
  return {
    wallet: doc.wallet,
    username: doc.username,
    avatar: doc.avatar,
    createdAt: doc.createdAt,
  };
}

export function verifyOnboarding(wallet: string, message: string, signature: string): void {
  if (message !== onboardingMessage(wallet)) throw new InvalidSignatureError();
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      bs58.decode(signature),
      new PublicKey(wallet).toBytes(),
    );
  } catch {
    throw new InvalidSignatureError();
  }
  if (!ok) throw new InvalidSignatureError();
}

export async function registerUser(input: RegisterInput): Promise<UserProfile> {
  verifyOnboarding(input.wallet, input.message, input.signature);
  const doc: UserDoc = {
    wallet: input.wallet,
    username: input.username,
    usernameLower: input.username.toLowerCase(),
    avatar: input.avatar ?? null,
    createdAt: Date.now(),
  };
  try {
    await (await getUsersCollection()).insertOne(doc);
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      if (err.keyPattern?.wallet) throw new WalletAlreadyRegisteredError(input.wallet);
      throw new UsernameTakenError(input.username);
    }
    throw err;
  }
  return toProfile(doc);
}

export async function getUser(wallet: string): Promise<UserProfile> {
  const doc = await (await getUsersCollection()).findOne({ wallet });
  if (!doc) throw new UserNotFoundError(wallet);
  return toProfile(doc);
}

export async function setAvatar(input: SetAvatarInput): Promise<UserProfile> {
  verifyOnboarding(input.wallet, input.message, input.signature);
  const doc = await (await getUsersCollection()).findOneAndUpdate(
    { wallet: input.wallet },
    { $set: { avatar: input.avatar } },
    { returnDocument: "after" },
  );
  if (!doc) throw new UserNotFoundError(input.wallet);
  return toProfile(doc);
}
