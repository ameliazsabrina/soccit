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
  fetchTokenBalance,
  getConnection,
  getProgramId,
  matchPda,
  predictionPda,
} from "../../onchain/program.js";
import { config } from "../../config.js";
import { MatchNotFoundError } from "../match/match.errors.js";

import { ENTRY_LEAD_SECS, isEntryWindowOpen } from "../match/phase.js";
import {
  EntryNotOpenYetError,
  InsufficientEntryBalanceError,
  MatchMintMismatchError,
  MatchNotOpenError,
} from "./prediction.errors.js";

export { ENTRY_LEAD_SECS, isEntryWindowOpen };
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

export function assertMatchMintSupported(
  fixtureId: number,
  match: DecodedMatch,
  expectedMint: string,
): void {
  const actual = match.usdcMint.toBase58();
  if (actual !== expectedMint) {
    throw new MatchMintMismatchError(fixtureId, expectedMint, actual);
  }
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

  // The match's mint must be the canonical USDC mint, else the entry-fee ATA we
  // derive below is the wrong (empty) one and the tx would fail with 0x1.
  assertMatchMintSupported(input.fixtureId, match, config.solana.usdcMint);

  const startTime = Number(match.startTime);
  if (!isEntryWindowOpen(startTime, Math.floor(Date.now() / 1000))) {
    throw new EntryNotOpenYetError(input.fixtureId, startTime);
  }

  const entry = await fetchEntry(matchAccount, wallet);

  // Preflight the entry-fee balance on the paying (first) pick — later picks are
  // free (pay-per-match). Fail with a clear 4xx instead of a bare 0x1 at submit.
  const feeCharged = entry ? 0n : match.entryFee;
  if (feeCharged > 0n) {
    const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
    const balance = await fetchTokenBalance(userUsdcAta);
    if (balance < feeCharged) {
      throw new InsufficientEntryBalanceError(
        input.fixtureId,
        feeCharged,
        balance,
        match.usdcMint.toBase58(),
      );
    }
  }

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
