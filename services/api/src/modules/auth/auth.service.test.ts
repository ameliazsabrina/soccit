import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { beforeAll, describe, expect, it } from "vitest";

// The auth service reads config.session.secret at call time via the config
// module; ensure a secret is present before importing it.
process.env.SESSION_JWT_SECRET ??= "test-session-secret";
process.env.NODE_ENV = "test";

let auth: typeof import("./auth.service.js");
let errors: typeof import("./auth.errors.js");

beforeAll(async () => {
  auth = await import("./auth.service.js");
  errors = await import("./auth.errors.js");
});

function sign(kp: Keypair, message: string): string {
  return bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey));
}

function freshRequest(kp: Keypair) {
  const wallet = kp.publicKey.toBase58();
  const message = auth.sessionMessage(wallet, Date.now());
  return { wallet, message, signature: sign(kp, message) };
}

describe("createSession + verifyToken", () => {
  it("issues a token for a fresh, valid signature and verifies it", () => {
    const kp = Keypair.generate();
    const req = freshRequest(kp);
    const { token, expiresAt } = auth.createSession(req);
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(auth.verifyToken(token).sub).toBe(req.wallet);
  });

  it("rejects a signature from a different wallet", () => {
    const kp = Keypair.generate();
    const other = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = auth.sessionMessage(wallet, Date.now());
    expect(() =>
      auth.createSession({ wallet, message, signature: sign(other, message) }),
    ).toThrow(errors.InvalidSessionRequestError);
  });

  it("rejects a stale message (replay protection)", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = auth.sessionMessage(wallet, Date.now() - 10 * 60 * 1000);
    expect(() =>
      auth.createSession({ wallet, message, signature: sign(kp, message) }),
    ).toThrow(errors.InvalidSessionRequestError);
  });

  it("rejects a malformed message", () => {
    const kp = Keypair.generate();
    const wallet = kp.publicKey.toBase58();
    const message = `hello ${wallet}`;
    expect(() =>
      auth.createSession({ wallet, message, signature: sign(kp, message) }),
    ).toThrow(errors.InvalidSessionRequestError);
  });

  it("rejects a tampered token", () => {
    const kp = Keypair.generate();
    const { token } = auth.createSession(freshRequest(kp));
    const tampered = `${token}x`;
    expect(() => auth.verifyToken(tampered)).toThrow(errors.UnauthorizedError);
  });

  it("rejects a malformed token", () => {
    expect(() => auth.verifyToken("not.a.jwt.at.all")).toThrow(errors.UnauthorizedError);
    expect(() => auth.verifyToken("onlyonepart")).toThrow(errors.UnauthorizedError);
  });
});
