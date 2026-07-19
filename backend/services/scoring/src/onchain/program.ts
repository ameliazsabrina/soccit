import { PublicKey, type Connection } from "@solana/web3.js";
import { config } from "../config.js";
import type { Prediction } from "../leaderboard/leaderboard.schema.js";
import { MATCH_ACCOUNT_LEN, selectActiveFixtureIds } from "./matches.js";

export const PROGRAM_ID = new PublicKey(config.solana.programId);

const MATCH_SEED = Buffer.from("match");
const PRED_DISCRIMINATOR = Buffer.from([98, 127, 141, 187, 218, 33, 8, 14]);
const MATCH_KEY_OFFSET = 40;

export function matchPda(fixtureId: number): PublicKey {
  const idLe = Buffer.alloc(8);
  idLe.writeBigUInt64LE(BigInt(fixtureId));
  return PublicKey.findProgramAddressSync([MATCH_SEED, idLe], PROGRAM_ID)[0];
}

export function decodePrediction(buf: Buffer): Omit<
  Prediction,
  "side" | "kind"
> & {
  side: number;
  kind: number;
} {
  return {
    owner: new PublicKey(buf.subarray(8, 40)).toBase58(),
    side: buf.readUInt8(72),
    kind: buf.readUInt8(73),
    outPlayerId: buf.readUInt32LE(74),
    inPlayerId: buf.readUInt32LE(78),
    lockMinute: buf.readUInt16LE(82),
  };
}

export async function fetchActiveFixtureIds(
  conn: Connection,
  excluded: ReadonlySet<string> = new Set(),
): Promise<number[]> {
  const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: MATCH_ACCOUNT_LEN }],
  });
  return selectActiveFixtureIds(
    accounts.map((a) => ({
      pubkey: a.pubkey.toBase58(),
      data: a.account.data as Buffer,
    })),
    excluded,
  );
}

export async function fetchPredictionAccounts(
  conn: Connection,
  fixtureId: number,
): Promise<Buffer[]> {
  const matchKey = matchPda(fixtureId);
  const accounts = await conn.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: MATCH_KEY_OFFSET, bytes: matchKey.toBase58() } },
    ],
  });
  return accounts
    .map((a) => a.account.data as Buffer)
    .filter(
      (data) =>
        data.length >= 84 && data.subarray(0, 8).equals(PRED_DISCRIMINATOR),
    );
}
