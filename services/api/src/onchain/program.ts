import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config.js";

export const STATUS_OPEN = 0;
export const STATUS_RESOLVED = 1;
export const STATUS_SETTLED = 2;

const MATCH_SEED = Buffer.from("match");
const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);

export const MATCH_ACCOUNT_LEN = 241;

export interface DecodedMatch {
  matchId: bigint;
  team1Id: number;
  team2Id: number;
  entryFee: bigint;
  poolTotal: bigint;
  status: number;
  terminalPhase: number;
  settled: boolean;
  resolver: PublicKey;
  usdcMint: PublicKey;
  vault: PublicKey;
  winner1: PublicKey;
  winner2: PublicKey;
  winner3: PublicKey;
  vaultAuthorityBump: number;
  bump: number;
  participantCount: number;
}

function matchIdToLe(matchId: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(matchId);
  return buf;
}

export function matchPda(programId: PublicKey, matchId: bigint): PublicKey {
  return PublicKey.findProgramAddressSync([MATCH_SEED, matchIdToLe(matchId)], programId)[0];
}

export function decodeMatch(buf: Buffer): DecodedMatch {
  if (buf.length < MATCH_ACCOUNT_LEN) {
    throw new Error(`Match account too short: ${buf.length} < ${MATCH_ACCOUNT_LEN}`);
  }
  if (!buf.subarray(0, 8).equals(MATCH_DISCRIMINATOR)) {
    throw new Error("not a Match account (discriminator mismatch)");
  }
  return {
    matchId: buf.readBigUInt64LE(8),
    team1Id: buf.readUInt32LE(16),
    team2Id: buf.readUInt32LE(20),
    entryFee: buf.readBigUInt64LE(24),
    poolTotal: buf.readBigUInt64LE(32),
    status: buf.readUInt8(40),
    terminalPhase: buf.readUInt8(41),
    settled: buf.readUInt8(42) === 1,
    resolver: new PublicKey(buf.subarray(43, 75)),
    usdcMint: new PublicKey(buf.subarray(75, 107)),
    vault: new PublicKey(buf.subarray(107, 139)),
    winner1: new PublicKey(buf.subarray(139, 171)),
    winner2: new PublicKey(buf.subarray(171, 203)),
    winner3: new PublicKey(buf.subarray(203, 235)),
    vaultAuthorityBump: buf.readUInt8(235),
    bump: buf.readUInt8(236),
    participantCount: buf.readUInt32LE(237),
  };
}

let connection: Connection | undefined;
let programId: PublicKey | undefined;

function getConnection(): Connection {
  if (!connection) connection = new Connection(config.solana.rpcUrl, "confirmed");
  return connection;
}

function getProgramId(): PublicKey {
  if (!programId) programId = new PublicKey(config.solana.programId);
  return programId;
}

export async function fetchMatch(fixtureId: number): Promise<DecodedMatch | null> {
  const pda = matchPda(getProgramId(), BigInt(fixtureId));
  const info = await getConnection().getAccountInfo(pda);
  if (!info) return null;
  return decodeMatch(info.data);
}
