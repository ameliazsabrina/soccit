import { Keypair, PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecodedEntry, DecodedMatch } from "../../onchain/program.js";
import { fetchEntriesByOwner, getConnection } from "../../onchain/program.js";
import { getRedis } from "../../redis.js";
import { config } from "../../config.js";
import { RpcUnavailableError } from "./portfolio.errors.js";
import { getPortfolio } from "./portfolio.service.js";

vi.mock("../../config.js", () => ({
  config: {
    solana: {
      cluster: "devnet",
      rpcUrl: "http://localhost",
      programId: "11111111111111111111111111111111",
      usdcMint: undefined as string | undefined,
    },
  },
}));

vi.mock("../../onchain/program.js", async (orig) => ({
  ...(await orig<typeof import("../../onchain/program.js")>()),
  fetchEntriesByOwner: vi.fn(),
  getConnection: vi.fn(),
  decodeMatch: vi.fn((d: unknown) => d),
}));

vi.mock("../../redis.js", () => ({
  getRedis: vi.fn(() => ({ hgetall: vi.fn().mockResolvedValue({}) })),
}));

// the real config type is readonly (`as const`); this alias lets tests set the mint.
const mutableConfig = config as { solana: { usdcMint: string | undefined } };

const WALLET = "3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const DEFAULT = PublicKey.default;

function fakeMatch(overrides: Partial<DecodedMatch> = {}): DecodedMatch {
  return {
    matchId: 100n,
    team1Id: 1,
    team2Id: 2,
    entryFee: 1_000_000n,
    poolTotal: 2_000_000n,
    status: 0,
    terminalPhase: 0,
    settled: false,
    resolver: DEFAULT,
    usdcMint: new PublicKey(DEVNET_USDC_MINT),
    vault: DEFAULT,
    winner1: DEFAULT,
    winner2: DEFAULT,
    winner3: DEFAULT,
    vaultAuthorityBump: 0,
    bump: 0,
    participantCount: 1,
    startTime: 0n,
    ...overrides,
  };
}

function fakeEntry(
  matchKey: PublicKey,
  overrides: Partial<DecodedEntry> = {},
): DecodedEntry {
  return {
    owner: new PublicKey(WALLET),
    matchKey,
    side: 0,
    slotsUsed: 1,
    playerCount: 0,
    bump: 0,
    ...overrides,
  };
}

/** Wire fetchEntriesByOwner + getConnection so entries[i] maps to matches[i]. */
function mockChain(
  pairs: { entry: DecodedEntry; match: DecodedMatch }[],
  balanceAmount?: string | Error,
) {
  vi.mocked(fetchEntriesByOwner).mockResolvedValue(pairs.map((p) => p.entry));
  const getTokenAccountBalance = vi.fn();
  if (balanceAmount instanceof Error)
    getTokenAccountBalance.mockRejectedValue(balanceAmount);
  else if (balanceAmount !== undefined)
    getTokenAccountBalance.mockResolvedValue({
      value: { amount: balanceAmount },
    });
  const conn = {
    getMultipleAccountsInfo: vi
      .fn()
      .mockResolvedValue(pairs.map((p) => ({ data: p.match }))),
    getTokenAccountBalance,
  };
  vi.mocked(getConnection).mockReturnValue(conn as never);
  return { conn, getTokenAccountBalance };
}

describe("getPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutableConfig.solana.usdcMint = undefined;
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({}),
    } as never);
  });

  it("filters out SETTLED entries and sums locked stake over active positions", async () => {
    mutableConfig.solana.usdcMint = DEVNET_USDC_MINT;
    const open = Keypair.generate().publicKey;
    const resolved = Keypair.generate().publicKey;
    const settled = Keypair.generate().publicKey;
    mockChain(
      [
        {
          entry: fakeEntry(open),
          match: fakeMatch({ matchId: 10n, status: 0, entryFee: 1_000_000n }),
        },
        {
          entry: fakeEntry(resolved),
          match: fakeMatch({ matchId: 11n, status: 1, entryFee: 2_000_000n }),
        },
        {
          entry: fakeEntry(settled),
          match: fakeMatch({
            matchId: 12n,
            status: 2,
            settled: true,
            entryFee: 5_000_000n,
          }),
        },
      ],
      "7000000",
    );

    const out = await getPortfolio(WALLET);
    expect(out.activeCount).toBe(2);
    expect(out.positions.map((p) => p.pda).sort()).toEqual(
      [open.toBase58(), resolved.toBase58()].sort(),
    );
    expect(out.lockedStake).toBe("3000000");
    expect(out.usdcBalance).toBe("7000000");
    expect(out.portfolioValue).toBe("10000000");
    expect(
      out.positions.find((p) => p.pda === resolved.toBase58())?.statusLabel,
    ).toBe("RESOLVED");
  });

  it("treats a missing/unfunded ATA as a zero balance", async () => {
    mutableConfig.solana.usdcMint = DEVNET_USDC_MINT;
    mockChain(
      [
        {
          entry: fakeEntry(Keypair.generate().publicKey),
          match: fakeMatch({ status: 0, entryFee: 1_000_000n }),
        },
      ],
      new Error("could not find account"),
    );

    const out = await getPortfolio(WALLET);
    expect(out.usdcBalance).toBe("0");
    expect(out.portfolioValue).toBe("1000000");
  });

  it("derives the USDC mint from a position when USDC_MINT is unset", async () => {
    const { getTokenAccountBalance } = mockChain(
      [
        {
          entry: fakeEntry(Keypair.generate().publicKey),
          match: fakeMatch({ status: 0 }),
        },
      ],
      "500000",
    );

    const out = await getPortfolio(WALLET);
    expect(out.usdcMint).toBe(DEVNET_USDC_MINT);
    expect(out.usdcBalance).toBe("500000");
    expect(getTokenAccountBalance).toHaveBeenCalledOnce();
  });

  it("reports a null mint and zero balance when unset and the wallet has no positions", async () => {
    const { conn } = mockChain([]);

    const out = await getPortfolio(WALLET);
    expect(out.usdcMint).toBeNull();
    expect(out.usdcBalance).toBe("0");
    expect(out.portfolioValue).toBe("0");
    expect(out.activeCount).toBe(0);
    expect(out.positions).toEqual([]);
    expect(conn.getTokenAccountBalance).not.toHaveBeenCalled();
  });

  it("maps an RPC failure to RpcUnavailableError", async () => {
    vi.mocked(fetchEntriesByOwner).mockRejectedValue(
      new Error("429 too many requests"),
    );
    await expect(getPortfolio(WALLET)).rejects.toBeInstanceOf(
      RpcUnavailableError,
    );
  });
});
