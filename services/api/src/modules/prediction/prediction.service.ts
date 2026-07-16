import { PublicKey, Transaction } from "@solana/web3.js";
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
import { config } from "../../config.js";
import { MatchNotFoundError } from "../match/match.errors.js";

import { ENTRY_LEAD_SECS, isEntryWindowOpen } from "../match/phase.js";
import {
  EntryNotOpenYetError,
  MatchMintMismatchError,
  MatchNotEnteredError,
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
  /** The caller's existing Entry — required under enter-once. */
  entry: DecodedEntry;
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

  // Enter-once: the wallet has already entered, so this pick fills the next free
  // slot and is always free (the fee was paid in enter_match).
  const slotIndex = entry.slotsUsed;

  // The wallet's ATA already exists (created on enter); we surface it in the
  // output but the place_prediction tx no longer touches it.
  const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
  const prediction = predictionPda(programId, matchAccount, wallet, slotIndex);

  const placeIx = buildPlacePredictionInstruction({
    programId,
    user: wallet,
    matchAccount,
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
  tx.add(placeIx);

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
    // Enter-once: predictions are always free.
    entryFee: "0",
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

  // Enter-once: the wallet must have entered (paid the fee) first. Without an
  // Entry account the on-chain place_prediction would fail; return a clean 403.
  const entry = await fetchEntry(matchAccount, wallet);
  if (!entry) {
    throw new MatchNotEnteredError(input.fixtureId, wallet.toBase58());
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
