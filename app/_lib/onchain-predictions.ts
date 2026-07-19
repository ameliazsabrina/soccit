import bs58 from "bs58";
import { PublicKey, type Connection } from "@solana/web3.js";
import { publicEnv } from "./env";

// Anchor account discriminator currently used by the deployed Prediction
// account. The confirmed Devnet layout is:
// discriminator[0..8], owner[8..40], match[40..72], side[72], kind[73],
// outPlayerId[74..78], inPlayerId[78..82], lockMinute[82..90].
const PREDICTION_DISCRIMINATOR = Uint8Array.from([
  0x62, 0x7f, 0x8d, 0xbb, 0xda, 0x21, 0x08, 0x0e,
]);
const PREDICTION_DISCRIMINATOR_BASE58 = bs58.encode(PREDICTION_DISCRIMINATOR);
const PROGRAM_ID = new PublicKey(publicEnv.programId);
const MIN_PREDICTION_ACCOUNT_SIZE = 94;
const PREDICTION_READ_TIMEOUT_MS = 12_000;

export type OnChainPrediction = {
  predictionAccount: string;
  owner: string;
  matchPda: string;
  side: 0 | 1 | 2;
  kind: 0 | 1 | 2 | 3;
  outPlayerId: number;
  inPlayerId: number;
  lockMinute: number;
};

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Confirmed prediction check timed out.")),
          PREDICTION_READ_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function decodePredictionAccount(
  predictionAccount: PublicKey,
  data: Buffer,
  expectedOwner: string,
  expectedMatch: string,
): OnChainPrediction {
  if (data.length < MIN_PREDICTION_ACCOUNT_SIZE) {
    throw new Error("Confirmed prediction account has an unsupported layout.");
  }

  const discriminatorMatches = PREDICTION_DISCRIMINATOR.every(
    (byte, index) => data[index] === byte,
  );
  if (!discriminatorMatches) {
    throw new Error("Confirmed prediction account has an unknown discriminator.");
  }

  const owner = new PublicKey(data.subarray(8, 40)).toBase58();
  const matchPda = new PublicKey(data.subarray(40, 72)).toBase58();
  if (owner !== expectedOwner || matchPda !== expectedMatch) {
    throw new Error("Confirmed prediction account does not match this wallet and match.");
  }

  const side = data[72];
  const kind = data[73];
  if ((side !== 0 && side !== 1 && side !== 2) || kind > 3) {
    throw new Error("Confirmed prediction account contains invalid prediction values.");
  }

  const lockMinuteValue = data.readBigUInt64LE(82);
  if (lockMinuteValue > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Confirmed prediction account contains an invalid lock minute.");
  }

  return {
    predictionAccount: predictionAccount.toBase58(),
    owner,
    matchPda,
    side,
    kind: kind as OnChainPrediction["kind"],
    outPlayerId: data.readUInt32LE(74),
    inPlayerId: data.readUInt32LE(78),
    lockMinute: Number(lockMinuteValue),
  };
}

/**
 * Read confirmed prediction accounts directly from the deployed program.
 * This is the frontend's authoritative reload source until the backend exposes
 * a dedicated wallet prediction-state endpoint.
 */
export async function getWalletMatchPredictionsOnChain(
  connection: Connection,
  wallet: string,
  matchPda: string,
): Promise<OnChainPrediction[]> {
  // Validate before sending RPC filters so malformed route/wallet values fail
  // closed instead of accidentally broad-scanning program accounts.
  const owner = new PublicKey(wallet).toBase58();
  const match = new PublicKey(matchPda).toBase58();

  const accounts = await withTimeout(
    connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        { memcmp: { offset: 0, bytes: PREDICTION_DISCRIMINATOR_BASE58 } },
        { memcmp: { offset: 8, bytes: owner } },
        { memcmp: { offset: 40, bytes: match } },
      ],
    }),
  );

  return accounts
    .map(({ pubkey, account }) =>
      decodePredictionAccount(pubkey, account.data, owner, match),
    )
    .sort((a, b) =>
      a.lockMinute - b.lockMinute ||
      a.predictionAccount.localeCompare(b.predictionAccount),
    );
}
