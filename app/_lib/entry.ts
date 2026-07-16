"use client";

import type { Connection, SendOptions } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  prepareEnter,
  getEntryStatus,
  type EnterMatchInput,
  type EnterMatchOutput,
  type EntryStatus,
} from "./api";

const ENTRY_CONFIRMATION_ATTEMPTS = 15;
const ENTRY_CONFIRMATION_INTERVAL_MS = 1_000;

export interface SubmitEnterRequest {
  connection: Connection;
  adapter: Adapter;
  input: EnterMatchInput;
  expectedMatchPda: string;
}

export interface SubmitEnterResult {
  signature: string;
  prepare: EnterMatchOutput;
  entry: EntryStatus;
  slot: number;
}

export class EntryConfirmationPendingError extends Error {
  constructor(public readonly signature: string) {
    super("Entry transaction was confirmed, but entry status is still updating.");
    this.name = "EntryConfirmationPendingError";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForEntryConfirmation(
  pda: string,
  wallet: string,
): Promise<EntryStatus | null> {
  for (let attempt = 0; attempt < ENTRY_CONFIRMATION_ATTEMPTS; attempt += 1) {
    try {
      const entry = await getEntryStatus(pda, wallet);
      if (entry.entered) return entry;
    } catch {
      // The entry index can briefly lag the confirmed transaction. Retry the
      // same read and let the caller surface a pending state after the timeout.
    }
    if (attempt < ENTRY_CONFIRMATION_ATTEMPTS - 1) {
      await delay(ENTRY_CONFIRMATION_INTERVAL_MS);
    }
  }
  return null;
}

/**
 * Full client-side entry fee payment flow:
 *
 *   1. POST /api/match/enter/prepare  → unsigned base64 transaction
 *   2. deserialize → legacy Transaction
 *   3. wallet.signTransaction(tx)
 *   4. connection.sendRawTransaction(tx.serialize())
 *   5. confirmTransaction
 *
 * There is no backend `/api/match/enter/submit`. The user signs and submits
 * the prepared Solana transaction directly to Devnet. The connected wallet
 * must hold at least `entryFee` of the match's USDC mint, plus SOL for fees.
 */
export async function submitEnter(
  req: SubmitEnterRequest
): Promise<SubmitEnterResult> {
  const { connection, adapter, input, expectedMatchPda } = req;

  if (!adapter.publicKey) {
    throw new Error("Wallet not connected.");
  }

  if (!("signTransaction" in adapter) || typeof adapter.signTransaction !== "function") {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  // 1. Prepare — ask the backend to build the unsigned Solana transaction.
  const prepare = await prepareEnter(input);

  if (prepare.matchAccount !== expectedMatchPda) {
    throw new Error("Entry transaction does not match the requested match.");
  }

  // 2. Deserialize the base64 transaction.
  const txBytes = Buffer.from(prepare.transaction, "base64");
  const tx = Transaction.from(txBytes);

  // 3. Sign with the connected wallet.
  const signedTx = await (adapter.signTransaction as (t: Transaction) =>
    Promise<Transaction>)(tx);

  // 4. Send the signed transaction to Devnet.
  const sendOptions: SendOptions = {
    skipPreflight: false,
    maxRetries: 3,
  };
  const signature = await connection.sendRawTransaction(
    signedTx.serialize(),
    sendOptions
  );

  // 5. Confirm.
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash: prepare.blockhash, lastValidBlockHeight: prepare.lastValidBlockHeight },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(
      `Transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`
    );
  }

  const entry = await waitForEntryConfirmation(
    prepare.matchAccount,
    input.wallet,
  );
  if (!entry) throw new EntryConfirmationPendingError(signature);

  return {
    signature,
    prepare,
    entry,
    slot: confirmation.context.slot,
  };
}
