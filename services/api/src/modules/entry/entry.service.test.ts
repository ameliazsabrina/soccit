import { PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import {
  type DecodedEntry,
  type DecodedMatch,
  MATCH_ACCOUNT_LEN,
  STATUS_OPEN,
  associatedTokenAddress,
  decodeMatch,
  entryPda,
  matchPda,
} from "../../onchain/program.js";

const PROGRAM_ID = new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v");
const DEVNET_USDC_MINT = new PublicKey(
  "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
);
const MATCH_DISCRIMINATOR = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);
const ENTER_DISC = Buffer.from([25, 72, 131, 252, 111, 231, 207, 149]);

const FIXTURE_ID = 900001n;
const WALLET = new PublicKey("3PV3YdqwC7RzivKDkTi6JpCe5b8bjm8C7sRLKNvqLfzr");
const matchAccount = matchPda(PROGRAM_ID, FIXTURE_ID);
const vault = associatedTokenAddress(DEVNET_USDC_MINT, PublicKey.unique(), true);

// fetchEntry / getProgramId are the only network-bound calls getEntryStatus makes;
// mock them so the status path is exercised offline. Everything else is real.
const fetchEntryMock = vi.fn();
vi.mock("../../onchain/program.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../onchain/program.js")>();
  return {
    ...actual,
    getProgramId: () => new PublicKey("TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v"),
    fetchEntry: (...args: unknown[]) => fetchEntryMock(...args),
  };
});

const { buildPrepareEnterTx, getEntryStatus } = await import("./entry.service.js");

function encodeMatch(opts: {
  matchId: bigint;
  status: number;
  mint: PublicKey;
  vault: PublicKey;
}): Buffer {
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

const match: DecodedMatch = decodeMatch(
  encodeMatch({
    matchId: FIXTURE_ID,
    status: STATUS_OPEN,
    mint: DEVNET_USDC_MINT,
    vault,
  }),
);

const BLOCKHASH = "11111111111111111111111111111111";

describe("buildPrepareEnterTx", () => {
  const out = buildPrepareEnterTx({
    programId: PROGRAM_ID,
    matchAccount,
    match,
    wallet: WALLET,
    blockhash: BLOCKHASH,
    lastValidBlockHeight: 1234,
  });

  it("returns an unsigned legacy tx with the wallet as feePayer and the match entry fee", () => {
    const tx = Transaction.from(Buffer.from(out.transaction, "base64"));
    expect(tx.feePayer!.toBase58()).toBe(WALLET.toBase58());
    expect(tx.signatures[0]!.signature).toBeNull();
    expect(out.entryFee).toBe("5000000");
    expect(out.fixtureId).toBe(Number(FIXTURE_ID));
    expect(out.matchAccount).toBe(matchAccount.toBase58());
    expect(out.userUsdcAta).toBe(
      associatedTokenAddress(DEVNET_USDC_MINT, WALLET).toBase58(),
    );
  });

  it("prepends an idempotent create-ATA ix then the enter_match ix", () => {
    const tx = Transaction.from(Buffer.from(out.transaction, "base64"));
    expect(tx.instructions).toHaveLength(2);
    const enter = tx.instructions[1]!;
    expect(enter.programId.toBase58()).toBe(PROGRAM_ID.toBase58());
    expect(enter.data.subarray(0, 8).equals(ENTER_DISC)).toBe(true);
    expect(enter.data.length).toBe(8); // discriminator only

    // user → match → entry → user_usdc_ata → vault → token program → system.
    expect(enter.keys[0]!.pubkey.toBase58()).toBe(WALLET.toBase58());
    expect(enter.keys[1]!.pubkey.toBase58()).toBe(matchAccount.toBase58());
    expect(enter.keys[2]!.pubkey.toBase58()).toBe(
      entryPda(PROGRAM_ID, matchAccount, WALLET).toBase58(),
    );
    expect(enter.keys[4]!.pubkey.toBase58()).toBe(vault.toBase58());
  });
});

describe("getEntryStatus", () => {
  it("reports entered=true with an ms timestamp when the Entry exists", async () => {
    const entry: DecodedEntry = {
      owner: WALLET,
      matchKey: matchAccount,
      side: 0,
      slotsUsed: 1,
      playerCount: 0,
      bump: 255,
      enteredAt: 1_782_446_400n,
    };
    fetchEntryMock.mockResolvedValueOnce(entry);

    const status = await getEntryStatus(Number(FIXTURE_ID), WALLET.toBase58());
    expect(status).toEqual({
      fixtureId: Number(FIXTURE_ID),
      wallet: WALLET.toBase58(),
      entered: true,
      enteredAt: 1_782_446_400_000,
    });
  });

  it("reports entered=false with no timestamp when the wallet has not entered", async () => {
    fetchEntryMock.mockResolvedValueOnce(null);

    const status = await getEntryStatus(Number(FIXTURE_ID), WALLET.toBase58());
    expect(status.entered).toBe(false);
    expect(status.enteredAt).toBeUndefined();
  });
});
