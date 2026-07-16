"use client";

import type { Connection, SendOptions } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import type { Adapter } from "@solana/wallet-adapter-base";
import {
  preparePrediction,
  SOCCIT_SEED_FIXTURE_ID,
  type PreparePredictionInput,
  type PreparePredictionOutput,
} from "./api";

export interface SubmitPredictionRequest {
  connection: Connection;
  adapter: Adapter;
  input: PreparePredictionInput;
}

export interface SubmitPredictionResult {
  signature: string;
  prepare: PreparePredictionOutput;
  slot: number;
}

/**
 * Full client-side prediction submission flow:
 *
 *   1. POST /api/prediction/prepare  → unsigned base64 transaction
 *   2. deserialize → legacy Transaction
 *   3. wallet.signTransaction(tx)
 *   4. connection.sendRawTransaction(tx.serialize())
 *   5. confirmTransaction
 *
 * There is no backend `/api/prediction/submit`. The user signs and submits the
 * prepared Solana transaction directly to Devnet. Entry is paid separately;
 * prediction transactions must always report an entry fee of zero.
 */
export async function submitPrediction(
  req: SubmitPredictionRequest
): Promise<SubmitPredictionResult> {
  const { connection, adapter, input } = req;

  if (!adapter.publicKey) {
    throw new Error("Wallet not connected.");
  }

  if (!("signTransaction" in adapter) || typeof adapter.signTransaction !== "function") {
    throw new Error("Connected wallet does not support transaction signing.");
  }

  // 1. Prepare — ask the backend to build the unsigned Solana transaction.
  const prepare = await preparePrediction(input);

  // Never sign a prediction that could charge the user a second entry fee.
  if (prepare.entryFee !== "0") {
    throw new Error(
      "Prediction preparation returned a non-zero entry fee. Transaction blocked.",
    );
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

  return {
    signature,
    prepare,
    slot: confirmation.context.slot,
  };
}

export function seedPredictionInput(
  wallet: string,
  fixtureId: number,
  overrides: Partial<PreparePredictionInput> = {}
): PreparePredictionInput {
  return {
    wallet,
    fixtureId: fixtureId || SOCCIT_SEED_FIXTURE_ID,
    outPlayerId: 0,
    inPlayerId: 0,
    lockMinute: 0,
    side: 1,
    kind: 2,
    ...overrides,
  };
}
