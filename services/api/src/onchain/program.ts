import { Connection, PublicKey } from "@solana/web3.js";
import {
  type DecodedEntry,
  type DecodedMatch,
  ENTRY_ACCOUNT_LEN,
  MATCH_ACCOUNT_LEN,
  decodeEntry,
  decodeMatch,
  entryPda,
  matchPda,
} from "@soccit/onchain/program";
import { config } from "../config.js";

// Re-export the shared on-chain bindings so existing API imports
// (`../../onchain/program.js`) keep resolving while the single source of
// truth lives in @soccit/onchain — used by both the API and settlement.
export {
  type DecodedEntry,
  type DecodedMatch,
  ENTRY_ACCOUNT_LEN,
  MATCH_ACCOUNT_LEN,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  KIND_OUT,
  KIND_IN,
  KIND_COMBO,
  KIND_SCORE,
  associatedTokenAddress,
  buildPlacePredictionInstruction,
  decodeEntry,
  decodeMatch,
  entryPda,
  matchIdToLe,
  matchPda,
  predictionPda,
  vaultAuthorityPda,
} from "@soccit/onchain/program";

let connection: Connection | undefined;
let programId: PublicKey | undefined;

export function getConnection(): Connection {
  if (!connection)
    connection = new Connection(config.solana.rpcUrl, "confirmed");
  return connection;
}

export function getProgramId(): PublicKey {
  if (!programId) programId = new PublicKey(config.solana.programId);
  return programId;
}

export async function fetchMatch(
  fixtureId: number,
): Promise<DecodedMatch | null> {
  const pda = matchPda(getProgramId(), BigInt(fixtureId));
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  return decodeMatch(info.data);
}

/**
 * The caller's Entry for a match, or null if they have not picked yet. Used to
 * report the pay-per-match fee (0 once an entry exists) and the next free slot.
 */
export async function fetchEntry(
  matchAccount: PublicKey,
  wallet: PublicKey,
): Promise<DecodedEntry | null> {
  const pda = entryPda(getProgramId(), matchAccount, wallet);
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  return decodeEntry(info.data);
}

export async function fetchEntriesByOwner(
  wallet: PublicKey,
): Promise<DecodedEntry[]> {
  const accounts = await getConnection().getProgramAccounts(getProgramId(), {
    filters: [
      { dataSize: ENTRY_ACCOUNT_LEN },
      { memcmp: { offset: 8, bytes: wallet.toBase58() } },
    ],
  });
  const out: DecodedEntry[] = [];
  for (const { account } of accounts) {
    try {
      out.push(decodeEntry(account.data));
    } catch {
      // not an Entry account (discriminator mismatch) — skip
    }
  }
  return out;
}

export async function fetchAllMatches(): Promise<
  { pda: string; match: DecodedMatch }[]
> {
  const accounts = await getConnection().getProgramAccounts(getProgramId(), {
    filters: [{ dataSize: MATCH_ACCOUNT_LEN }],
  });
  const out: { pda: string; match: DecodedMatch }[] = [];
  for (const { pubkey, account } of accounts) {
    try {
      out.push({ pda: pubkey.toBase58(), match: decodeMatch(account.data) });
    } catch {
      // not a Match account (discriminator mismatch) — skip
    }
  }
  return out;
}
