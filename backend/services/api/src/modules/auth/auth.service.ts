import { createHmac, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { config } from "../../config.js";
import {
  InvalidSessionRequestError,
  SessionConfigError,
  UnauthorizedError,
} from "./auth.errors.js";
import type { SessionClaims, SessionInput, SessionOutput } from "./auth.schema.js";

/** Signed once to prove wallet ownership before a session token is issued. */
export function sessionMessage(wallet: string, issuedAt: number): string {
  return `Soccit session: ${wallet} @ ${issuedAt}`;
}

/** Signed messages older than this are rejected (replay protection). */
const MESSAGE_FRESHNESS_MS = 5 * 60 * 1000;
const MESSAGE_RE = /^Soccit session: (?<wallet>[^ ]+) @ (?<issuedAt>\d+)$/;

function secret(): string {
  if (!config.session.secret) throw new SessionConfigError();
  return config.session.secret;
}

// ---- minimal HS256 JWT (no external dependency) --------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlJson(value: unknown): string {
  return b64url(JSON.stringify(value));
}

function signHs256(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

export function issueToken(wallet: string): SessionOutput {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + config.session.ttlSeconds;
  const claims: SessionClaims = { sub: wallet, iat, exp };
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const body = b64urlJson(claims);
  const token = `${header}.${body}.${signHs256(`${header}.${body}`)}`;
  return { token, expiresAt: exp * 1000 };
}

/** Verify a JWT and return its claims, or throw UnauthorizedError. */
export function verifyToken(token: string): SessionClaims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new UnauthorizedError("Malformed token");
  const [header, body, sig] = parts as [string, string, string];
  const expected = signHs256(`${header}.${body}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new UnauthorizedError("Bad token signature");
  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64").toString("utf8"));
  } catch {
    throw new UnauthorizedError("Malformed token payload");
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now())
    throw new UnauthorizedError("Token expired");
  if (typeof claims.sub !== "string" || !claims.sub)
    throw new UnauthorizedError("Token missing subject");
  return claims;
}

/** Verify the wallet's ed25519 signature over a fresh session message. */
export function createSession(input: SessionInput): SessionOutput {
  const match = MESSAGE_RE.exec(input.message);
  if (!match?.groups) throw new InvalidSessionRequestError("Malformed message");
  if (match.groups.wallet !== input.wallet)
    throw new InvalidSessionRequestError("Message wallet mismatch");

  const issuedAt = Number(match.groups.issuedAt);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < -MESSAGE_FRESHNESS_MS || age > MESSAGE_FRESHNESS_MS)
    throw new InvalidSessionRequestError("Message expired");

  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(input.message),
      bs58.decode(input.signature),
      new PublicKey(input.wallet).toBytes(),
    );
  } catch {
    throw new InvalidSessionRequestError("Invalid signature");
  }
  if (!ok) throw new InvalidSessionRequestError("Invalid signature");

  return issueToken(input.wallet);
}
