import { PublicKey, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import {
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  associatedTokenAddress,
  buildEnterMatchInstruction,
  fetchEntry,
  fetchMatch,
  fetchTokenBalance,
  getConnection,
  getProgramId,
  matchPda,
} from "../../onchain/program.js";
import { config } from "../../config.js";
import { MatchNotFoundError } from "../match/match.errors.js";
import { isEntryWindowOpen } from "../match/phase.js";
import { assertMatchMintSupported } from "../prediction/prediction.service.js";
import {
  EntryNotOpenYetError,
  InsufficientEntryBalanceError,
  MatchNotOpenError,
} from "../prediction/prediction.errors.js";
import { WalletAlreadyEnteredError } from "./entry.errors.js";
import {
  type EnterInput,
  type EnterOutput,
  type EntryStatusOutput,
  enterOutput,
  entryStatusOutput,
} from "./entry.schema.js";

function statusLabel(status: number): string {
  if (status === STATUS_OPEN) return "OPEN";
  if (status === STATUS_RESOLVED) return "RESOLVED";
  if (status === STATUS_SETTLED) return "SETTLED";
  return "UNKNOWN";
}

export interface BuildPrepareEnterTxArgs {
  programId: PublicKey;
  matchAccount: PublicKey;
  match: DecodedMatch;
  wallet: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
}

export function buildPrepareEnterTx(
  args: BuildPrepareEnterTxArgs,
): EnterOutput {
  const {
    programId,
    matchAccount,
    match,
    wallet,
    blockhash,
    lastValidBlockHeight,
  } = args;

  // User wallets are on-curve, so the standard ATA derivation applies. Create
  // it idempotently in case the wallet has never held this USDC before.
  const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    wallet, // payer
    userUsdcAta,
    wallet, // owner
    match.usdcMint,
  );

  const enterIx = buildEnterMatchInstruction({
    programId,
    user: wallet,
    matchAccount,
    userUsdcAta,
    vault: match.vault,
  });

  const tx = new Transaction();
  tx.feePayer = wallet;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.add(createAtaIx, enterIx);

  const serialized = tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  return enterOutput.parse({
    transaction: serialized,
    fixtureId: Number(match.matchId),
    matchAccount: matchAccount.toBase58(),
    userUsdcAta: userUsdcAta.toBase58(),
    entryFee: match.entryFee.toString(),
    blockhash,
    lastValidBlockHeight,
  });
}

export async function prepareEnter(input: EnterInput): Promise<EnterOutput> {
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

  // Enter-once: a wallet may only enter a match a single time. Anchor's `init`
  // enforces this on-chain; preflighting it here returns a clean 409.
  const existing = await fetchEntry(matchAccount, wallet);
  if (existing) {
    throw new WalletAlreadyEnteredError(input.fixtureId, wallet.toBase58());
  }

  // Preflight the entry-fee balance so the wallet fails with a clear 4xx instead
  // of a bare 0x1 at submit.
  const fee = match.entryFee;
  if (fee > 0n) {
    const userUsdcAta = associatedTokenAddress(match.usdcMint, wallet);
    const balance = await fetchTokenBalance(userUsdcAta);
    if (balance < fee) {
      throw new InsufficientEntryBalanceError(
        input.fixtureId,
        fee,
        balance,
        match.usdcMint.toBase58(),
      );
    }
  }

  const { blockhash, lastValidBlockHeight } =
    await getConnection().getLatestBlockhash("confirmed");

  return buildPrepareEnterTx({
    programId,
    matchAccount,
    match,
    wallet,
    blockhash,
    lastValidBlockHeight,
  });
}

/**
 * The wallet's entry status for a match, read from the on-chain Entry account
 * (the source of truth). `enteredAt` is unix milliseconds when entered.
 */
export async function getEntryStatus(
  fixtureId: number,
  wallet: string,
): Promise<EntryStatusOutput> {
  const programId = getProgramId();
  const matchAccount = matchPda(programId, BigInt(fixtureId));
  const entry = await fetchEntry(matchAccount, new PublicKey(wallet));

  return entryStatusOutput.parse({
    fixtureId,
    wallet,
    entered: entry != null,
    enteredAt: entry ? Number(entry.enteredAt) * 1000 : undefined,
  });
}
