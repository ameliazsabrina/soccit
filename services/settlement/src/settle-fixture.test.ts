import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { settleFixture, type KeeperDeps } from "./keeper.js";
import { MATCH_ACCOUNT_LEN, STATUS_OPEN, STATUS_RESOLVED, STATUS_SETTLED } from "./onchain/program.js";
import type { LeaderboardPayload } from "./leaderboard.js";

const MATCH_DISC = Buffer.from([236, 63, 169, 38, 15, 56, 196, 162]);
const RESOLVE_DISC = Buffer.from([246, 150, 236, 206, 108, 63, 58, 10]);
const SETTLE_DISC = Buffer.from([247, 163, 22, 141, 33, 169, 225, 56]);

const FIXTURE_ID = 17926593;

function encodeMatch(
  over: Partial<{
    status: number;
    settled: boolean;
    usdcMint: PublicKey;
    vault: PublicKey;
    winner1: PublicKey;
    winner2: PublicKey;
    winner3: PublicKey;
  }> = {},
): Buffer {
  const buf = Buffer.alloc(MATCH_ACCOUNT_LEN);
  MATCH_DISC.copy(buf, 0);
  buf.writeBigUInt64LE(BigInt(FIXTURE_ID), 8);
  buf.writeUInt32LE(11, 16);
  buf.writeUInt32LE(22, 20);
  buf.writeBigUInt64LE(1_000_000n, 24);
  buf.writeBigUInt64LE(5_000_000n, 32);
  buf.writeUInt8(over.status ?? STATUS_OPEN, 40);
  buf.writeUInt8(1, 41);
  buf.writeUInt8(over.settled ? 1 : 0, 42);
  PublicKey.unique().toBuffer().copy(buf, 43); // resolver
  (over.usdcMint ?? PublicKey.unique()).toBuffer().copy(buf, 75);
  (over.vault ?? PublicKey.unique()).toBuffer().copy(buf, 107);
  (over.winner1 ?? PublicKey.default).toBuffer().copy(buf, 139);
  (over.winner2 ?? PublicKey.default).toBuffer().copy(buf, 171);
  (over.winner3 ?? PublicKey.default).toBuffer().copy(buf, 203);
  buf.writeUInt8(254, 235);
  buf.writeUInt8(255, 236);
  buf.writeUInt32LE(3, 237);
  return buf;
}

function makeDeps(
  accountData: Buffer | null,
  capture: { tx?: Transaction } = {},
): { deps: KeeperDeps; sendTransaction: ReturnType<typeof vi.fn> } {
  const sendTransaction = vi.fn(async (tx: Transaction) => {
    capture.tx = tx;
    return "sig-settled";
  });
  const connection = {
    getAccountInfo: vi.fn(async () => (accountData ? { data: accountData } : null)),
    sendTransaction,
    confirmTransaction: vi.fn(async () => ({ value: { err: null } })),
  } as unknown as KeeperDeps["connection"];
  return {
    deps: {
      connection,
      programId: PublicKey.unique(),
      resolver: Keypair.generate(),
      platformWallet: Keypair.generate().publicKey,
      sendRetries: 1,
      sendRetryBaseMs: 0,
    },
    sendTransaction,
  };
}

const payload = (over: Partial<LeaderboardPayload> = {}): LeaderboardPayload => ({
  fixtureId: FIXTURE_ID,
  updatedAt: 1,
  final: true,
  winners: [null, null, null],
  ...over,
});

function hasIx(tx: Transaction, disc: Buffer): boolean {
  return tx.instructions.some((ix) => ix.data.subarray(0, 8).equals(disc));
}

describe("settleFixture — duplicate-payout & premature-settlement safety", () => {
  it("does not settle and does not retry when the match is already SETTLED", async () => {
    const { deps, sendTransaction } = makeDeps(encodeMatch({ status: STATUS_SETTLED }));
    const result = await settleFixture(deps, payload());
    expect(result).toEqual({ settled: false, retry: false });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("does not settle and does not retry when the settled flag is set (status still RESOLVED)", async () => {
    const { deps, sendTransaction } = makeDeps(encodeMatch({ status: STATUS_RESOLVED, settled: true }));
    const result = await settleFixture(deps, payload());
    expect(result).toEqual({ settled: false, retry: false });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("retries (does not send) when there is no Match account on-chain", async () => {
    const { deps, sendTransaction } = makeDeps(null);
    const result = await settleFixture(deps, payload());
    expect(result).toEqual({ settled: false, retry: true });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("retries (does not send) on an unexpected match status", async () => {
    const { deps, sendTransaction } = makeDeps(encodeMatch({ status: 7 }));
    const result = await settleFixture(deps, payload());
    expect(result).toEqual({ settled: false, retry: true });
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it("OPEN match: includes a resolve instruction using the leaderboard winners, then settles", async () => {
    const winner = Keypair.generate().publicKey;
    const capture: { tx?: Transaction } = {};
    const { deps } = makeDeps(encodeMatch({ status: STATUS_OPEN }), capture);
    const result = await settleFixture(deps, payload({ winners: [winner.toBase58(), null, null] }));
    expect(result).toMatchObject({ settled: true });
    expect(capture.tx).toBeDefined();
    expect(hasIx(capture.tx!, RESOLVE_DISC)).toBe(true);
    expect(hasIx(capture.tx!, SETTLE_DISC)).toBe(true);
    // resolve instruction must carry the leaderboard winner the keeper observed
    const resolveIx = capture.tx!.instructions.find((ix) => ix.data.subarray(0, 8).equals(RESOLVE_DISC))!;
    expect(new PublicKey(resolveIx.data.subarray(9, 41)).toBase58()).toBe(winner.toBase58());
  });

  it("RESOLVED match: settles WITHOUT re-resolving (winners already frozen on-chain)", async () => {
    const onchainWinner = Keypair.generate().publicKey;
    const capture: { tx?: Transaction } = {};
    const { deps } = makeDeps(encodeMatch({ status: STATUS_RESOLVED, winner1: onchainWinner }), capture);
    // A divergent leaderboard payload must NOT override the on-chain winners.
    const result = await settleFixture(deps, payload({ winners: [Keypair.generate().publicKey.toBase58(), null, null] }));
    expect(result).toMatchObject({ settled: true });
    expect(hasIx(capture.tx!, RESOLVE_DISC)).toBe(false);
    expect(hasIx(capture.tx!, SETTLE_DISC)).toBe(true);
  });
});
