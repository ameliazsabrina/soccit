import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import {
  type DecodedEntry,
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  associatedTokenAddress,
  buildPlacePredictionInstruction,
  fetchEntry,
  fetchMatch,
  getConnection,
  getProgramId,
  matchPda,
  predictionPda,
} from "../../onchain/program.js";
import { MatchNotFoundError } from "../match/match.errors.js";
import {
  EntryNotOpenYetError,
  MatchNotOpenError,
} from "./prediction.errors.js";

const ENTRY_LEAD_SECS = 600;

export function isEntryWindowOpen(startTime: number, nowSecs: number): boolean {
  if (startTime === 0) return true;
  return nowSecs >= startTime - ENTRY_LEAD_SECS;
}
import {
  type PreparePredictionInput,
  type PreparePredictionOutput,
  preparePredictionOutput,
} from "./prediction.schema.js";

function statusLabel(status: number): string {
  if (status === STATUS_OPEN) return "OPEN";
  if (status === STATUS_RESOLVED) return "RESOLVED";
  if (status === STATUS_SETTLED) return "SETTLED";
  return "UNKNOWN";
}

export interface BuildPreparePredictionTxArgs {
  programId: PublicKey;
  matchAccount: PublicKey;
  match: DecodedMatch;
  /** The caller's existing Entry, or null if this is their first pick. */
  entry: DecodedEntry | null;
  wallet: PublicKey;
  input: PreparePredictionInput;
  blockhash: string;
  lastValidBlockHeight: number;
}

/**
 * Pure transaction assembly — no RPC. Builds an UNSIGNED legacy transaction
 * whose feePayer is the user's wallet, so the frontend wallet signs and submits
 * it. The API never holds a key or signs. We prepend an idempotent
 * create-ATA instruction so a first-time user (no USDC token account yet) does
 * not fail; it is a no-op when the ATA already exists.
 *
 * Pay-per-match: the slot and the fee are derived from the caller's Entry, not
 * supplied by the client. The next free slot is `entry.slotsUsed` (0 on the
 * first pick), and the fee is the match entry fee only on that first pick.
 */
export function buildPreparePredictionTx(
  args: BuildPreparePredictionTxArgs,
): PreparePredictionOutput {
  const {
    programId,
    matchAccount,
    match,
    entry,
    wallet,
    input,
    blockhash,
    lastValidBlockHeight,
  } = args;

  const slotIndex = entry ? entry.slotsUsed : 0;
  const feeCharged = entry ? 0n : match.entryFee;

  // User wallets are on-curve, so the standard ATA derivation applies.
  const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
  const prediction = predictionPda(programId, matchAccount, wallet, slotIndex);

  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    wallet, // payer
    userUsdcAta,
    wallet, // owner
    match.usdcMint,
  );

  const placeIx = buildPlacePredictionInstruction({
    programId,
    user: wallet,
    matchAccount,
    userUsdcAta,
    vault: match.vault,
    side: input.side,
    kind: input.kind,
    outId: input.outPlayerId,
    inId: input.inPlayerId,
    lockMinute: input.lockMinute,
    slotIndex,
  });

  const tx = new Transaction();
  tx.feePayer = wallet;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.add(createAtaIx, placeIx);

  const serialized = tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  return preparePredictionOutput.parse({
    transaction: serialized,
    fixtureId: Number(match.matchId),
    prediction: prediction.toBase58(),
    matchAccount: matchAccount.toBase58(),
    userUsdcAta: userUsdcAta.toBase58(),
    usdcMint: match.usdcMint.toBase58(),
    entryFee: feeCharged.toString(),
    slotIndex,
    startTime: Number(match.startTime),
    blockhash,
    lastValidBlockHeight,
  });
}

export async function preparePrediction(
  input: PreparePredictionInput,
): Promise<PreparePredictionOutput> {
  const programId = getProgramId();
  const wallet = new PublicKey(input.wallet);
  const matchAccount = matchPda(programId, BigInt(input.fixtureId));

  const match = await fetchMatch(input.fixtureId);
  if (!match) throw new MatchNotFoundError(input.fixtureId);
  if (match.status !== STATUS_OPEN) {
    throw new MatchNotOpenError(input.fixtureId, statusLabel(match.status));
  }

  // Entry window: mirror the on-chain gate so the frontend gets a clean error
  // (with the kickoff time for a countdown) instead of a doomed transaction.
  // The on-chain Clock remains the source of truth.
  const startTime = Number(match.startTime);
  if (!isEntryWindowOpen(startTime, Math.floor(Date.now() / 1000))) {
    throw new EntryNotOpenYetError(input.fixtureId, startTime);
  }

  // Pay-per-match: the caller's Entry tells us the next free slot and whether
  // the entry fee has already been paid.
  const entry = await fetchEntry(matchAccount, wallet);

  const { blockhash, lastValidBlockHeight } =
    await getConnection().getLatestBlockhash("confirmed");

  return buildPreparePredictionTx({
    programId,
    matchAccount,
    match,
    entry,
    wallet,
    input,
    blockhash,
    lastValidBlockHeight,
  });
}
