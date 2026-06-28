import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";
import { InvalidSignatureError } from "./user.errors.js";
import { avatarSchema, registerInput, usernameSchema } from "./user.schema.js";
import { onboardingMessage, verifyOnboarding } from "./user.service.js";

function sign(kp: Keypair, message: string): string {
  return bs58.encode(
    nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey),
  );
}

describe("verifyOnboarding", () => {
  it("accepts a valid signature over the canonical message", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = onboardingMessage(wallet);
    expect(() =>
      verifyOnboarding(wallet, message, sign(kp, message)),
    ).not.toThrow();
  });
  it("rejects a signature from a different wallet", () => {
    const kp = Keypair.generate();
    const other = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = onboardingMessage(wallet);
    expect(() =>
      verifyOnboarding(wallet, message, sign(other, message)),
    ).toThrow(InvalidSignatureError);
  });

  it("rejects a non-canonical message even if validly signed", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = "Soccit onboarding: someone-else";
    expect(() => verifyOnboarding(wallet, message, sign(kp, message))).toThrow(
      InvalidSignatureError,
    );
  });

  it("rejects garbage signatures", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = onboardingMessage(wallet);
    expect(() => verifyOnboarding(wallet, message, "not-base58!!!")).toThrow(
      InvalidSignatureError,
    );
  });
});

describe("usernameSchema", () => {
  it("accepts valid usernames", () => {
    expect(usernameSchema.safeParse("abc").success).toBe(true);
    expect(usernameSchema.safeParse("Player_99").success).toBe(true);
  });

  it("rejects too short, too long, and bad characters", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
    expect(usernameSchema.safeParse("dash-no").success).toBe(false);
  });
});

describe("registerInput", () => {
  it("requires wallet, username, message, signature; avatar optional", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = onboardingMessage(wallet);
    const parsed = registerInput.safeParse({
      wallet,
      username: "tester",
      message,
      signature: sign(kp, message),
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid avatar and rejects an unknown one", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = onboardingMessage(wallet);
    const base = { wallet, username: "tester", message, signature: sign(kp, message) };
    expect(registerInput.safeParse({ ...base, avatar: "avatar-3" }).success).toBe(true);
    expect(registerInput.safeParse({ ...base, avatar: "avatar-99" }).success).toBe(false);
  });
});

describe("avatarSchema", () => {
  it("accepts provided ids only", () => {
    expect(avatarSchema.safeParse("avatar-1").success).toBe(true);
    expect(avatarSchema.safeParse("avatar-8").success).toBe(true);
    expect(avatarSchema.safeParse("avatar-0").success).toBe(false);
    expect(avatarSchema.safeParse("custom.png").success).toBe(false);
  });
});
