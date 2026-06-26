import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  SUBSCRIBE_DISCRIMINATOR,
  TXLINE_PROGRAM_ID,
  buildSubscribeInstruction,
  deriveTxlinePdas,
  encodeSubscribeData,
} from "./program.js";

describe("subscribe discriminator", () => {
  it("matches the Anchor convention sha256('global:subscribe')[..8]", () => {
    const expected = createHash("sha256").update("global:subscribe").digest().subarray(0, 8);
    expect(Buffer.from(SUBSCRIBE_DISCRIMINATOR)).toEqual(expected);
  });
});

describe("encodeSubscribeData", () => {
  it("lays out discriminator + service_level(u16 LE) + weeks(u8)", () => {
    const data = encodeSubscribeData(12, 4);
    expect(data).toHaveLength(11);
    expect(Buffer.from(SUBSCRIBE_DISCRIMINATOR)).toEqual(data.subarray(0, 8));
    expect(data.readUInt16LE(8)).toBe(12);
    expect(data.readUInt8(10)).toBe(4);
  });

  it("encodes service level as little-endian u16", () => {
    const data = encodeSubscribeData(300, 4);
    expect(data[8]).toBe(0x2c);
    expect(data[9]).toBe(0x01);
  });
});

describe("deriveTxlinePdas", () => {
  it("derives stable on-curve-checked PDAs from the documented seeds", () => {
    const { pricingMatrix, tokenTreasuryPda } = deriveTxlinePdas();
    const [pm] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], TXLINE_PROGRAM_ID);
    const [tt] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_treasury_v2")],
      TXLINE_PROGRAM_ID,
    );
    expect(pricingMatrix.equals(pm)).toBe(true);
    expect(tokenTreasuryPda.equals(tt)).toBe(true);
  });
});

describe("buildSubscribeInstruction", () => {
  const user = Keypair.generate().publicKey;

  it("targets the TxLINE program with the IDL's 9 ordered accounts", () => {
    const ix = buildSubscribeInstruction({ user });
    expect(ix.programId.equals(TXLINE_PROGRAM_ID)).toBe(true);
    expect(ix.keys).toHaveLength(9);
    expect(ix.keys[0]!.pubkey.equals(user)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(true);
    expect(ix.keys[0]!.isWritable).toBe(true);
    expect(ix.keys[3]!.isWritable).toBe(true);
    expect(ix.keys[4]!.isWritable).toBe(true);
  });

  it("defaults to Service Level 12 for 4 weeks", () => {
    const ix = buildSubscribeInstruction({ user });
    expect(ix.data.readUInt16LE(8)).toBe(12);
    expect(ix.data.readUInt8(10)).toBe(4);
  });
});
