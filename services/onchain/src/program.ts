import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const STATUS_OPEN = 0;
export const STATUS_RESOLVED = 1;
export const STATUS_SETTLED = 2;

const MATCH_SEED = Buffer.from("match");
const VAULT_SEED = Buffer.from("vault");
const PRED_SEED = Buffer.from("pred");
const ENTRY_SEED = Buffer.from("entry");

const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);
const ENTRY_DISCRIMINATOR = Buffer.from([63, 18, 152, 113, 215, 246, 221, 250]);
const CREATE_MATCH_DISCRIMINATOR = Buffer.from([107, 2, 184, 145, 70, 142, 17, 165]);
const PLACE_PREDICTION_DISCRIMINATOR = Buffer.from([79, 46, 195, 197, 50, 91, 88, 229]);
const RESOLVE_DISCRIMINATOR = Buffer.from([246, 150, 236, 206, 108, 63, 58, 10]);
const SETTLE_DISCRIMINATOR = Buffer.from([247, 163, 22, 141, 33, 169, 225, 56]);

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

export function matchIdToLe(matchId: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(matchId);
  return buf;
}

export function matchPda(programId: PublicKey, matchId: bigint): PublicKey {
  return PublicKey.findProgramAddressSync([MATCH_SEED, matchIdToLe(matchId)], programId)[0];
}

export function vaultAuthorityPda(programId: PublicKey, matchAccount: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_SEED, matchAccount.toBuffer()], programId)[0];
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

export interface CreateMatchParams {
  programId: PublicKey;
  admin: PublicKey;
  usdcMint: PublicKey;
  matchId: bigint;
  team1Id: number;
  team2Id: number;
  entryFee: bigint;
  resolver: PublicKey;
}

export function buildCreateMatchInstruction(params: CreateMatchParams): TransactionInstruction {
  const { programId, admin, usdcMint, matchId, team1Id, team2Id, entryFee, resolver } = params;
  const match = matchPda(programId, matchId);
  const vaultAuthority = vaultAuthorityPda(programId, match);
  const vault = associatedTokenAddress(usdcMint, vaultAuthority, true);

  const data = Buffer.alloc(8 + 8 + 4 + 4 + 8 + 32);
  CREATE_MATCH_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(matchId, 8);
  data.writeUInt32LE(team1Id, 16);
  data.writeUInt32LE(team2Id, 20);
  data.writeBigUInt64LE(entryFee, 24);
  resolver.toBuffer().copy(data, 32);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: match, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export const KIND_OUT = 0;
export const KIND_IN = 1;
export const KIND_COMBO = 2;
export const KIND_SCORE = 3;

/** One-per-(match, wallet) Entry account. `side` is 0 when unset (score-first). */
export interface DecodedEntry {
  owner: PublicKey;
  matchKey: PublicKey;
  side: number;
  slotsUsed: number;
  playerCount: number;
  bump: number;
}

// 8 disc + 32 owner + 32 match_key + 1 side + 1 slots_used + 40 players + 1 count + 1 bump
export const ENTRY_ACCOUNT_LEN = 116;

export function decodeEntry(buf: Buffer): DecodedEntry {
  if (buf.length < ENTRY_ACCOUNT_LEN) {
    throw new Error(`Entry account too short: ${buf.length} < ${ENTRY_ACCOUNT_LEN}`);
  }
  if (!buf.subarray(0, 8).equals(ENTRY_DISCRIMINATOR)) {
    throw new Error("not an Entry account (discriminator mismatch)");
  }
  return {
    owner: new PublicKey(buf.subarray(8, 40)),
    matchKey: new PublicKey(buf.subarray(40, 72)),
    side: buf.readUInt8(72),
    slotsUsed: buf.readUInt8(73),
    playerCount: buf.readUInt8(114),
    bump: buf.readUInt8(115),
  };
}

export function predictionPda(
  programId: PublicKey,
  matchAccount: PublicKey,
  owner: PublicKey,
  slotIndex: number,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [PRED_SEED, matchAccount.toBuffer(), owner.toBuffer(), Buffer.from([slotIndex])],
    programId,
  )[0];
}

export function entryPda(programId: PublicKey, matchAccount: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [ENTRY_SEED, matchAccount.toBuffer(), owner.toBuffer()],
    programId,
  )[0];
}

export interface PlacePredictionParams {
  programId: PublicKey;
  user: PublicKey;
  matchAccount: PublicKey;
  userUsdcAta: PublicKey;
  vault: PublicKey;
  side: number;
  kind: number;
  outId: number;
  inId: number;
  lockMinute: number;
  slotIndex: number;
}

export function buildPlacePredictionInstruction(params: PlacePredictionParams): TransactionInstruction {
  const { programId, user, matchAccount, userUsdcAta, vault, side, kind, outId, inId, lockMinute, slotIndex } =
    params;
  const entry = entryPda(programId, matchAccount, user);
  const prediction = predictionPda(programId, matchAccount, user, slotIndex);

  const data = Buffer.alloc(8 + 1 + 1 + 4 + 4 + 2 + 1);
  PLACE_PREDICTION_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(side, 8);
  data.writeUInt8(kind, 9);
  data.writeUInt32LE(outId, 10);
  data.writeUInt32LE(inId, 14);
  data.writeUInt16LE(lockMinute, 18);
  data.writeUInt8(slotIndex, 20);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: matchAccount, isSigner: false, isWritable: true },
      { pubkey: entry, isSigner: false, isWritable: true },
      { pubkey: prediction, isSigner: false, isWritable: true },
      { pubkey: userUsdcAta, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export interface ResolveParams {
  programId: PublicKey;
  resolver: PublicKey;
  matchAccount: PublicKey;
  terminalPhase: number;
  winner1: PublicKey;
  winner2: PublicKey;
  winner3: PublicKey;
}

export function buildResolveInstruction(params: ResolveParams): TransactionInstruction {
  const { programId, resolver, matchAccount, terminalPhase, winner1, winner2, winner3 } = params;

  const data = Buffer.alloc(8 + 1 + 32 * 3);
  RESOLVE_DISCRIMINATOR.copy(data, 0);
  data.writeUInt8(terminalPhase, 8);
  winner1.toBuffer().copy(data, 9);
  winner2.toBuffer().copy(data, 41);
  winner3.toBuffer().copy(data, 73);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: resolver, isSigner: true, isWritable: false },
      { pubkey: matchAccount, isSigner: false, isWritable: true },
    ],
    data,
  });
}

export interface SettleParams {
  programId: PublicKey;
  resolver: PublicKey;
  matchAccount: PublicKey;
  vaultAuthority: PublicKey;
  vault: PublicKey;
  winner1Ata: PublicKey | null;
  winner2Ata: PublicKey | null;
  winner3Ata: PublicKey | null;
  platformAta: PublicKey;
}

export function buildSettleInstruction(params: SettleParams): TransactionInstruction {
  const {
    programId,
    resolver,
    matchAccount,
    vaultAuthority,
    vault,
    winner1Ata,
    winner2Ata,
    winner3Ata,
    platformAta,
  } = params;

  const optionalAta = (ata: PublicKey | null) => ({
    pubkey: ata ?? programId,
    isSigner: false,
    isWritable: ata != null,
  });

  const data = Buffer.alloc(8);
  SETTLE_DISCRIMINATOR.copy(data, 0);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: resolver, isSigner: true, isWritable: false },
      { pubkey: matchAccount, isSigner: false, isWritable: true },
      { pubkey: vaultAuthority, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      optionalAta(winner1Ata),
      optionalAta(winner2Ata),
      optionalAta(winner3Ata),
      { pubkey: platformAta, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function associatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
): PublicKey {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error(`owner ${owner.toBase58()} is off-curve; pass allowOwnerOffCurve=true for PDAs`);
  }
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}
