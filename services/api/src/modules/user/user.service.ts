import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { MongoServerError } from "mongodb";
import nacl from "tweetnacl";
import { getUsersCollection } from "../../mongo.js";
import {
  InvalidSignatureError,
  UsernameTakenError,
  UserNotFoundError,
  WalletAlreadyRegisteredError,
} from "./user.errors.js";
import type { RegisterInput, UserDoc, UserProfile } from "./user.schema.js";

export function onboardingMessage(wallet: string): string {
  return `Soccit onboarding: ${wallet}`;
}

function toProfile(doc: UserDoc): UserProfile {
  return { wallet: doc.wallet, username: doc.username, createdAt: doc.createdAt };
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
