import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import {
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  associatedTokenAddress,
  buildPlacePredictionInstruction,
  fetchMatch,
  getConnection,
  getProgramId,
  matchPda,
  predictionPda,
} from "../../onchain/program.js";
import { MatchNotFoundError } from "../match/match.errors.js";
import { MatchNotOpenError } from "./prediction.errors.js";
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
 */
export function buildPreparePredictionTx(args: BuildPreparePredictionTxArgs): PreparePredictionOutput {
  const { programId, matchAccount, match, wallet, input, blockhash, lastValidBlockHeight } = args;

  // User wallets are on-curve, so the standard ATA derivation applies.
  const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
  const prediction = predictionPda(programId, matchAccount, wallet, input.slotIndex);

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
    slotIndex: input.slotIndex,
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
    entryFee: match.entryFee.toString(),
    blockhash,
    lastValidBlockHeight,
  });
}

export async function preparePrediction(input: PreparePredictionInput): Promise<PreparePredictionOutput> {
  const programId = getProgramId();
  const wallet = new PublicKey(input.wallet);
  const matchAccount = matchPda(programId, BigInt(input.fixtureId));

  const match = await fetchMatch(input.fixtureId);
  if (!match) throw new MatchNotFoundError(input.fixtureId);
  if (match.status !== STATUS_OPEN) {
    throw new MatchNotOpenError(input.fixtureId, statusLabel(match.status));
  }

  const { blockhash, lastValidBlockHeight } = await getConnection().getLatestBlockhash("confirmed");

  return buildPreparePredictionTx({
    programId,
    matchAccount,
    match,
    wallet,
    input,
    blockhash,
    lastValidBlockHeight,
  });
}
