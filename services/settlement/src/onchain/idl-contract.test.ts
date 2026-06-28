import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Keypair, PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  MATCH_ACCOUNT_LEN,
  buildCreateMatchInstruction,
  buildPlacePredictionInstruction,
  buildResolveInstruction,
  buildSettleInstruction,
  decodeMatch,
} from "./program.js";

/**
 * Contract test: the settlement service hand-rolls Anchor instruction data
 * (discriminators, account ordering, signer/writable flags) instead of using
 * a generated client. If the on-chain program changes, every unit test here
 * can still pass while production settlement silently builds invalid txs.
 *
 * This pins the hand-rolled builders to the authoritative generated IDL, so
 * discriminator/layout drift fails CI immediately.
 */
const idlPath = fileURLToPath(new URL("../../../../packages/idl/soccit.json", import.meta.url));
const idl = JSON.parse(readFileSync(idlPath, "utf8")) as {
  address: string;
  instructions: { name: string; discriminator: number[]; accounts: { name: string; signer?: boolean; writable?: boolean }[] }[];
  accounts: { name: string; discriminator: number[] }[];
};

const PROGRAM_ID = new PublicKey(idl.address);
const ixDef = (name: string) => idl.instructions.find((i) => i.name === name)!;
const acctDef = (name: string) => idl.accounts.find((a) => a.name === name)!;

const onCurve = () => Keypair.generate().publicKey;

describe("IDL contract — program address", () => {
  it("matches the program id the settlement keeper targets by default", () => {
    expect(idl.address).toBe("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");
  });
});

describe("IDL contract — instruction discriminators & account counts", () => {
  const cases: { name: string; ix: () => { data: Buffer; keys: unknown[] } }[] = [
    {
      name: "create_match",
      ix: () =>
        buildCreateMatchInstruction({
          programId: PROGRAM_ID,
          admin: onCurve(),
          usdcMint: onCurve(),
          matchId: 1n,
          team1Id: 1,
          team2Id: 2,
          entryFee: 1_000_000n,
          resolver: onCurve(),
        }),
    },
    {
      name: "place_prediction",
      ix: () =>
        buildPlacePredictionInstruction({
          programId: PROGRAM_ID,
          user: onCurve(),
          matchAccount: onCurve(),
          userUsdcAta: onCurve(),
          vault: onCurve(),
          side: 1,
          kind: 0,
          outId: 10,
          inId: 0,
          lockMinute: 20,
          slotIndex: 0,
        }),
    },
    {
      name: "resolve",
      ix: () =>
        buildResolveInstruction({
          programId: PROGRAM_ID,
          resolver: onCurve(),
          matchAccount: onCurve(),
          terminalPhase: 1,
          winner1: onCurve(),
          winner2: PublicKey.default,
          winner3: PublicKey.default,
        }),
    },
    {
      name: "settle_and_payout",
      ix: () =>
        buildSettleInstruction({
          programId: PROGRAM_ID,
          resolver: onCurve(),
          matchAccount: onCurve(),
          vaultAuthority: onCurve(),
          vault: onCurve(),
          winner1Ata: onCurve(),
          winner2Ata: onCurve(),
          winner3Ata: onCurve(),
          platformAta: onCurve(),
        }),
    },
  ];

  for (const { name, ix } of cases) {
    it(`${name}: discriminator matches the IDL`, () => {
      const built = ix();
      expect([...built.data.subarray(0, 8)]).toEqual(ixDef(name).discriminator);
    });

    it(`${name}: account count matches the IDL`, () => {
      const built = ix();
      expect(built.keys).toHaveLength(ixDef(name).accounts.length);
    });
  }
});

describe("IDL contract — settle account ordering, signer & writable flags", () => {
  it("resolver/match/vault/winner-ata/platform/token order and metas match the IDL exactly", () => {
    const ix = buildSettleInstruction({
      programId: PROGRAM_ID,
      resolver: onCurve(),
      matchAccount: onCurve(),
      vaultAuthority: onCurve(),
      vault: onCurve(),
      winner1Ata: onCurve(),
      winner2Ata: onCurve(),
      winner3Ata: onCurve(),
      platformAta: onCurve(),
    });
    const expected = ixDef("settle_and_payout").accounts;
    ix.keys.forEach((key, i) => {
      expect(key.isSigner).toBe(Boolean(expected[i]!.signer));
      expect(key.isWritable).toBe(Boolean(expected[i]!.writable));
    });
  });

  it("resolve resolver(signer)/match(writable) metas match the IDL", () => {
    const ix = buildResolveInstruction({
      programId: PROGRAM_ID,
      resolver: onCurve(),
      matchAccount: onCurve(),
      terminalPhase: 1,
      winner1: PublicKey.default,
      winner2: PublicKey.default,
      winner3: PublicKey.default,
    });
    const expected = ixDef("resolve").accounts;
    ix.keys.forEach((key, i) => {
      expect(key.isSigner).toBe(Boolean(expected[i]!.signer));
      expect(key.isWritable).toBe(Boolean(expected[i]!.writable));
    });
  });
});

describe("IDL contract — Match account decoder", () => {
  it("accepts a buffer carrying the IDL's Match discriminator", () => {
    const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
    Buffer.from(acctDef("Match").discriminator).copy(buf, 0);
    // Fill the pubkey regions with a valid key so PublicKey construction succeeds.
    const key = onCurve().toBuffer();
    for (const off of [43, 75, 107, 139, 171, 203]) key.copy(buf, off);
    expect(() => decodeMatch(buf)).not.toThrow();
  });

  it("rejects a buffer whose discriminator is not the IDL Match discriminator", () => {
    const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
    Buffer.from(acctDef("Entry").discriminator).copy(buf, 0); // wrong account type
    expect(() => decodeMatch(buf)).toThrow(/discriminator/);
  });
});
