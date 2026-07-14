"use client";

import type { Connection, SendOptions } from "@solana/web3.js";
import { VersionedTransaction } from "@solana/web3.js";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  prepareEnter,
  type EnterMatchInput,
  type EnterMatchOutput,
} from "./api";

export interface SubmitEnterRequest {
  connection: Connection;
  adapter: Adapter;
  input: EnterMatchInput;
}

export interface SubmitEnterResult {
  signature: string;
  prepare: EnterMatchOutput;
  slot: number;
}

/**
 * Full client-side entry fee payment flow:
 *
 *   1. POST /api/match/enter/prepare  → unsigned base64 transaction
 *   2. deserialize → VersionedTransaction
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
  const { connection, adapter, input } = req;

  if (!adapter.publicKey) {
    throw new Error("Wallet not connected.");
  }

  if (!("signTransaction" in adapter) || typeof adapter.signTransaction !== "function") {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  // 1. Prepare — ask the backend to build the unsigned Solana transaction.
  const prepare = await prepareEnter(input);

  // 2. Deserialize the base64 transaction.
  const txBytes = Buffer.from(prepare.transaction, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);

  // 3. Sign with the connected wallet.
  const signedTx = await (adapter.signTransaction as (t: VersionedTransaction) =>
    Promise<VersionedTransaction>)(tx);

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

  return {
    signature,
    prepare,
    slot: confirmation.context.slot,
  };
}