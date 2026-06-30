import { PublicKey } from "@solana/web3.js";
import { getRedis } from "../../redis.js";
import { MatchNotFoundError } from "./match.errors.js";

/**
 * Reverse index `matchpda:<base58> -> fixtureId`. The match PDA is a one-way
 * hash of (programId, fixtureId), so it cannot be inverted; the worker writes
 * this mapping on ingestion (see services/worker/src/store/redis.ts) and we
 * read it here to translate the public-facing PDA back to the internal id.
 */
export const matchPdaKey = (pda: string) => `matchpda:${pda}`;

/** True when `raw` is a syntactically valid base58 Solana address. */
export function isValidPda(raw: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a match-account PDA to its internal fixtureId via the Redis reverse
 * index. Throws MatchNotFoundError when the PDA is unknown to the system.
 */
export async function resolveFixtureId(pda: string): Promise<number> {
  const raw = await getRedis().get(matchPdaKey(pda));
  const fixtureId = raw === null ? Number.NaN : Number(raw);
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
    throw new MatchNotFoundError(pda);
  }
  return fixtureId;
}
