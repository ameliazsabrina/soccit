import { describe, it, expect } from "vitest";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  MATCH_ACCOUNT_LEN,
  STATUS_RESOLVED,
  buildCreateMatchInstruction,
  buildPlacePredictionInstruction,
  buildResolveInstruction,
  buildSettleInstruction,
  decodeMatch,
  entryPda,
  matchPda,
  predictionPda,
  vaultAuthorityPda,
} from "./program.js";

const PROGRAM_ID = new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");

const RESOLVE_DISC = Buffer.from([246, 150, 236, 206, 108, 63, 58, 10]);
const SETTLE_DISC = Buffer.from([247, 163, 22, 141, 33, 169, 225, 56]);
const CREATE_DISC = Buffer.from([107, 2, 184, 145, 70, 142, 17, 165]);
const PLACE_DISC = Buffer.from([79, 46, 195, 197, 50, 91, 88, 229]);
const MATCH_DISC = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);

function encodeMatch(over: Partial<{
  matchId: bigint;
  status: number;
  settled: boolean;
  resolver: PublicKey;
  usdtMint: PublicKey;
  vault: PublicKey;
  winner1: PublicKey;
  winner2: PublicKey;
  winner3: PublicKey;
  participantCount: number;
}> = {}): Buffer {
  const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
  MATCH_DISC.copy(buf, 0);
  buf.writeBigUInt64LE(over.matchId ?? 17926593n, 8);
  buf.writeUInt32LE(11, 16);
  buf.writeUInt32LE(22, 20);
  buf.writeBigUInt64LE(1_000_000n, 24);
  buf.writeBigUInt64LE(5_000_000n, 32);
  buf.writeUInt8(over.status ?? STATUS_RESOLVED, 40);
  buf.writeUInt8(1, 41);
  buf.writeUInt8(over.settled ? 1 : 0, 42);
  (over.resolver ?? PublicKey.unique()).toBuffer().copy(buf, 43);
  (over.usdtMint ?? PublicKey.unique()).toBuffer().copy(buf, 75);
  (over.vault ?? PublicKey.unique()).toBuffer().copy(buf, 107);
  (over.winner1 ?? PublicKey.default).toBuffer().copy(buf, 139);
  (over.winner2 ?? PublicKey.default).toBuffer().copy(buf, 171);
  (over.winner3 ?? PublicKey.default).toBuffer().copy(buf, 203);
  buf.writeUInt8(254, 235);
  buf.writeUInt8(255, 236);
  buf.writeUInt32LE(over.participantCount ?? 3, 237);
  return buf;
}

describe("PDAs", () => {
  it("derives match PDA deterministically and vault authority from it", () => {
    const m = matchPda(PROGRAM_ID, 17926593n);
    const va = vaultAuthorityPda(PROGRAM_ID, m);
    expect(m.toBase58()).toBe(matchPda(PROGRAM_ID, 17926593n).toBase58());
    expect(va.toBase58()).not.toBe(m.toBase58());
  });
});

describe("decodeMatch", () => {
  it("round-trips key fields", () => {
    const resolver = PublicKey.unique();
    const mint = PublicKey.unique();
    const vault = PublicKey.unique();
    const w1 = PublicKey.unique();
    const decoded = decodeMatch(
      encodeMatch({ resolver, usdtMint: mint, vault, winner1: w1, status: STATUS_RESOLVED }),
    );
    expect(decoded.matchId).toBe(17926593n);
    expect(decoded.status).toBe(STATUS_RESOLVED);
    expect(decoded.resolver.toBase58()).toBe(resolver.toBase58());
    expect(decoded.usdtMint.toBase58()).toBe(mint.toBase58());
    expect(decoded.vault.toBase58()).toBe(vault.toBase58());
    expect(decoded.winner1.toBase58()).toBe(w1.toBase58());
    expect(decoded.winner2.equals(PublicKey.default)).toBe(true);
    expect(decoded.participantCount).toBe(3);
  });

  it("rejects a wrong discriminator", () => {
    const buf = encodeMatch();
    buf.writeUInt8(0, 0);
    expect(() => decodeMatch(buf)).toThrow();
  });
});

describe("buildResolveInstruction", () => {
  it("encodes discriminator, phase, and three winners", () => {
    const resolver = PublicKey.unique();
    const matchAccount = PublicKey.unique();
    const w1 = PublicKey.unique();
    const ix = buildResolveInstruction({
      programId: PROGRAM_ID,
      resolver,
      matchAccount,
      terminalPhase: 1,
      winner1: w1,
      winner2: PublicKey.default,
      winner3: PublicKey.default,
    });
    expect(ix.data.subarray(0, 8).equals(RESOLVE_DISC)).toBe(true);
    expect(ix.data.readUInt8(8)).toBe(1);
    expect(new PublicKey(ix.data.subarray(9, 41)).toBase58()).toBe(w1.toBase58());
    expect(ix.data.length).toBe(8 + 1 + 96);
    expect(ix.keys[0]).toMatchObject({ pubkey: resolver, isSigner: true, isWritable: false });
    expect(ix.keys[1]).toMatchObject({ pubkey: matchAccount, isWritable: true });
  });
});

describe("buildSettleInstruction", () => {
  it("passes programId for absent optional winner ATAs and orders accounts correctly", () => {
    const resolver = PublicKey.unique();
    const matchAccount = PublicKey.unique();
    const vaultAuthority = PublicKey.unique();
    const vault = PublicKey.unique();
    const w1Ata = PublicKey.unique();
    const platformAta = PublicKey.unique();
    const ix = buildSettleInstruction({
      programId: PROGRAM_ID,
      resolver,
      matchAccount,
      vaultAuthority,
      vault,
      winner1Ata: w1Ata,
      winner2Ata: null,
      winner3Ata: null,
      platformAta,
    });
    expect(ix.data.subarray(0, 8).equals(SETTLE_DISC)).toBe(true);
    expect(ix.data.length).toBe(8);
    expect(ix.keys[4]).toMatchObject({ pubkey: w1Ata, isWritable: true });
    expect(ix.keys[5]).toMatchObject({ pubkey: PROGRAM_ID, isWritable: false });
    expect(ix.keys[6]).toMatchObject({ pubkey: PROGRAM_ID, isWritable: false });
    expect(ix.keys[7]).toMatchObject({ pubkey: platformAta, isWritable: true });
    expect(ix.keys[8]).toMatchObject({ pubkey: TOKEN_PROGRAM_ID });
  });
});

describe("buildPlacePredictionInstruction", () => {
  it("encodes args and derives the prediction PDA", () => {
    const user = PublicKey.unique();
    const matchAccount = matchPda(PROGRAM_ID, 17926593n);
    const userUsdtAta = PublicKey.unique();
    const vault = PublicKey.unique();
    const ix = buildPlacePredictionInstruction({
      programId: PROGRAM_ID,
      user,
      matchAccount,
      userUsdtAta,
      vault,
      side: 1,
      kind: 2,
      outId: 10101970,
      inId: 908961,
      lockMinute: 20,
      slotIndex: 3,
    });
    expect(ix.data.subarray(0, 8).equals(PLACE_DISC)).toBe(true);
    expect(ix.data.readUInt8(8)).toBe(1);
    expect(ix.data.readUInt8(9)).toBe(2);
    expect(ix.data.readUInt32LE(10)).toBe(10101970);
    expect(ix.data.readUInt32LE(14)).toBe(908961);
    expect(ix.data.readUInt16LE(18)).toBe(20);
    expect(ix.data.readUInt8(20)).toBe(3);
    expect(ix.data.length).toBe(21);
    const entry = entryPda(PROGRAM_ID, matchAccount, user);
    const pred = predictionPda(PROGRAM_ID, matchAccount, user, 3);
    expect(ix.keys[2]!.pubkey.toBase58()).toBe(entry.toBase58());
    expect(ix.keys[3]!.pubkey.toBase58()).toBe(pred.toBase58());
    expect(ix.keys[0]).toMatchObject({ pubkey: user, isSigner: true, isWritable: true });
  });
});

describe("buildCreateMatchInstruction", () => {
  it("encodes args and derives match + vault accounts", () => {
    const admin = PublicKey.unique();
    const usdtMint = PublicKey.unique();
    const resolver = PublicKey.unique();
    const ix = buildCreateMatchInstruction({
      programId: PROGRAM_ID,
      admin,
      usdtMint,
      matchId: 17926593n,
      team1Id: 11,
      team2Id: 22,
      entryFee: 1_000_000n,
      resolver,
    });
    expect(ix.data.subarray(0, 8).equals(CREATE_DISC)).toBe(true);
    expect(ix.data.readBigUInt64LE(8)).toBe(17926593n);
    expect(ix.data.readUInt32LE(16)).toBe(11);
    expect(ix.data.readUInt32LE(20)).toBe(22);
    expect(ix.data.readBigUInt64LE(24)).toBe(1_000_000n);
    expect(new PublicKey(ix.data.subarray(32, 64)).toBase58()).toBe(resolver.toBase58());
    const m = matchPda(PROGRAM_ID, 17926593n);
    expect(ix.keys[1]!.pubkey.toBase58()).toBe(m.toBase58());
    expect(ix.keys[7]!.pubkey.toBase58()).toBe(SystemProgram.programId.toBase58());
  });
});
