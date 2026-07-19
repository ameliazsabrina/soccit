import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { MATCH_ACCOUNT_LEN, decodeMatch, matchPda } from "./program.js";

const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);
const PROGRAM_ID = new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function encodeMatch(): Buffer {
  const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
  MATCH_DISCRIMINATOR.copy(buf, 0);
  buf.writeBigUInt64LE(17926594n, 8);
  buf.writeUInt32LE(1, 16);
  buf.writeUInt32LE(2, 20);
  buf.writeBigUInt64LE(1_000_000n, 24);
  buf.writeBigUInt64LE(2_000_000n, 32);
  buf.writeUInt8(2, 40);
  buf.writeUInt8(3, 41);
  buf.writeUInt8(1, 42);
  PublicKey.default.toBuffer().copy(buf, 43);
  new PublicKey(DEVNET_USDC_MINT).toBuffer().copy(buf, 75);
  PublicKey.default.toBuffer().copy(buf, 107);
  PublicKey.default.toBuffer().copy(buf, 139);
  PublicKey.default.toBuffer().copy(buf, 171);
  PublicKey.default.toBuffer().copy(buf, 203);
  buf.writeUInt8(254, 235);
  buf.writeUInt8(255, 236);
  buf.writeUInt32LE(3, 237);
  return buf;
}

describe("decodeMatch", () => {
  it("round-trips an encoded Match", () => {
    const m = decodeMatch(encodeMatch());
    expect(m.matchId).toBe(17926594n);
    expect(m.entryFee).toBe(1_000_000n);
    expect(m.poolTotal).toBe(2_000_000n);
    expect(m.status).toBe(2);
    expect(m.settled).toBe(true);
    expect(m.participantCount).toBe(3);
    expect(m.usdcMint.toBase58()).toBe(DEVNET_USDC_MINT);
  });

  it("rejects a bad discriminator", () => {
    const buf = encodeMatch();
    buf.writeUInt8(0, 0);
    expect(() => decodeMatch(buf)).toThrow(/discriminator/);
  });

  it("rejects a too-short buffer", () => {
    expect(() => decodeMatch(Buffer.alloc(10))).toThrow(/too short/);
  });
});

describe("matchPda", () => {
  it("is deterministic for a fixtureId", () => {
    const a = matchPda(PROGRAM_ID, 17926594n);
    const b = matchPda(PROGRAM_ID, 17926594n);
    expect(a.toBase58()).toBe(b.toBase58());
  });
});
