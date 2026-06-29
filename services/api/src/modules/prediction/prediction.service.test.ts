import { PublicKey, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { describe, expect, it } from "vitest";
import {
  type DecodedMatch,
  MATCH_ACCOUNT_LEN,
  STATUS_OPEN,
  associatedTokenAddress,
  decodeMatch,
  entryPda,
  matchPda,
  predictionPda,
} from "../../onchain/program.js";
import { buildPreparePredictionTx } from "./prediction.service.js";
import type { PreparePredictionInput } from "./prediction.schema.js";

const PROGRAM_ID = new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");
const DEVNET_USDC_MINT = new PublicKey("2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac");
const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);
const PLACE_DISC = Buffer.from([79, 46, 195, 197, 50, 91, 88, 229]);

function encodeMatch(opts: { matchId: bigint; status: number; mint: PublicKey; vault: PublicKey }): Buffer {
  const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
  MATCH_DISCRIMINATOR.copy(buf, 0);
  buf.writeBigUInt64LE(opts.matchId, 8);
  buf.writeUInt32LE(1, 16);
  buf.writeUInt32LE(2, 20);
  buf.writeBigUInt64LE(5_000_000n, 24); // entryFee = 5 USDC
  buf.writeBigUInt64LE(0n, 32); // poolTotal
  buf.writeUInt8(opts.status, 40);
  buf.writeUInt8(0, 41);
  buf.writeUInt8(0, 42);
  PublicKey.default.toBuffer().copy(buf, 43);
  opts.mint.toBuffer().copy(buf, 75);
  opts.vault.toBuffer().copy(buf, 107);
  PublicKey.default.toBuffer().copy(buf, 139);
  PublicKey.default.toBuffer().copy(buf, 171);
  PublicKey.default.toBuffer().copy(buf, 203);
  buf.writeUInt8(254, 235);
  buf.writeUInt8(255, 236);
  buf.writeUInt32LE(0, 237);
  return buf;
}

const FIXTURE_ID = 900001n;
const WALLET = new PublicKey("3PV3YdqwC7RzivKDkTi6JpCe5b8bjm8C7sRLKNvqLfzr");
const matchAccount = matchPda(PROGRAM_ID, FIXTURE_ID);
const vault = associatedTokenAddress(DEVNET_USDC_MINT, PublicKey.unique(), true);
const match: DecodedMatch = decodeMatch(
  encodeMatch({ matchId: FIXTURE_ID, status: STATUS_OPEN, mint: DEVNET_USDC_MINT, vault }),
);

const input: PreparePredictionInput = {
  wallet: WALLET.toBase58(),
  fixtureId: Number(FIXTURE_ID),
  side: 1,
  kind: 2,
  outPlayerId: 10101970,
  inPlayerId: 908961,
  lockMinute: 20,
  slotIndex: 3,
};

const BLOCKHASH = "11111111111111111111111111111111";

function build() {
  return buildPreparePredictionTx({
    programId: PROGRAM_ID,
    matchAccount,
    match,
    wallet: WALLET,
    input,
    blockhash: BLOCKHASH,
    lastValidBlockHeight: 1234,
  });
}

describe("buildPreparePredictionTx", () => {
  it("returns an unsigned, base64 legacy transaction with the wallet as feePayer", () => {
    const out = build();
    const tx = Transaction.from(Buffer.from(out.transaction, "base64"));

    expect(tx.signatures).toHaveLength(1);
    expect(tx.signatures[0]!.publicKey.toBase58()).toBe(WALLET.toBase58());
    expect(tx.signatures[0]!.signature).toBeNull(); // unsigned
    expect(tx.feePayer!.toBase58()).toBe(WALLET.toBase58());
    expect(tx.recentBlockhash).toBe(BLOCKHASH);
  });

  it("prepends an idempotent create-ATA ix and then the place_prediction ix", () => {
    const out = build();
    const tx = Transaction.from(Buffer.from(out.transaction, "base64"));
    expect(tx.instructions).toHaveLength(2);

    // The place_prediction ix targets the program and carries the right discriminator/args.
    const place = tx.instructions[1]!;
    expect(place.programId.toBase58()).toBe(PROGRAM_ID.toBase58());
    expect(place.data.subarray(0, 8).equals(PLACE_DISC)).toBe(true);
    expect(place.data.readUInt8(8)).toBe(input.side);
    expect(place.data.readUInt8(9)).toBe(input.kind);
    expect(place.data.readUInt32LE(10)).toBe(input.outPlayerId);
    expect(place.data.readUInt32LE(14)).toBe(input.inPlayerId);
    expect(place.data.readUInt16LE(18)).toBe(input.lockMinute);
    expect(place.data.readUInt8(20)).toBe(input.slotIndex);

    // user(signer/writable) → match → entry → prediction → userAta → vault → tokenProgram → system
    expect(place.keys[0]).toMatchObject({ isSigner: true, isWritable: true });
    expect(place.keys[0]!.pubkey.toBase58()).toBe(WALLET.toBase58());
    expect(place.keys[1]!.pubkey.toBase58()).toBe(matchAccount.toBase58());
    expect(place.keys[2]!.pubkey.toBase58()).toBe(entryPda(PROGRAM_ID, matchAccount, WALLET).toBase58());
    expect(place.keys[3]!.pubkey.toBase58()).toBe(
      predictionPda(PROGRAM_ID, matchAccount, WALLET, input.slotIndex).toBase58(),
    );
    expect(place.keys[5]!.pubkey.toBase58()).toBe(vault.toBase58());
    expect(place.keys[6]!.pubkey.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58());
  });

  it("derives the user's USDC ATA for the match mint and reports it", () => {
    const out = build();
    const expectedAta = associatedTokenAddress(DEVNET_USDC_MINT, WALLET);
    expect(out.userUsdcAta).toBe(expectedAta.toBase58());
    expect(out.usdcMint).toBe(DEVNET_USDC_MINT.toBase58());
    expect(out.entryFee).toBe("5000000");
    expect(out.prediction).toBe(
      predictionPda(PROGRAM_ID, matchAccount, WALLET, input.slotIndex).toBase58(),
    );
    expect(out.matchAccount).toBe(matchAccount.toBase58());
  });
});
