import { PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../config.js";
import type { DecodedMatch } from "../../onchain/program.js";
import { MatchNotFoundError } from "./match.errors.js";
import {
  assembleMatchState,
  listMatches,
  toLiveMatch,
  toOnchainMatch,
} from "./match.service.js";
import { fetchAllMatches } from "../../onchain/program.js";
import { loadTeamNames } from "../lineup/lineup.service.js";
import { getRedis } from "../../redis.js";

vi.mock("../../onchain/program.js", async (orig) => ({
  ...(await orig<typeof import("../../onchain/program.js")>()),
  fetchAllMatches: vi.fn(),
}));
vi.mock("../lineup/lineup.service.js", () => ({ loadTeamNames: vi.fn() }));
vi.mock("../../redis.js", () => ({
  getRedis: vi.fn(() => ({ hgetall: vi.fn().mockResolvedValue({}) })),
}));

const DEFAULT = PublicKey.default;
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function fakeMatch(overrides: Partial<DecodedMatch> = {}): DecodedMatch {
  return {
    matchId: 17926594n,
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

describe("toOnchainMatch", () => {
  it("serializes bigints to strings and labels status", () => {
    const out = toOnchainMatch(fakeMatch({ status: 2, settled: true }));
    expect(out.statusLabel).toBe("SETTLED");
    expect(out.entryFee).toBe("1000000");
    expect(out.poolTotal).toBe("2000000");
    expect(out.participantCount).toBe(1);
  });

  it("maps default-pubkey winners to null", () => {
    const winner = new PublicKey(
      "3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma",
    );
    const out = toOnchainMatch(fakeMatch({ winner1: winner }));
    expect(out.winners).toEqual([winner.toBase58(), null, null]);
  });

  it("labels open and resolved", () => {
    expect(toOnchainMatch(fakeMatch({ status: 0 })).statusLabel).toBe("OPEN");
    expect(toOnchainMatch(fakeMatch({ status: 1 })).statusLabel).toBe(
      "RESOLVED",
    );
  });
});

describe("toLiveMatch", () => {
  it("returns null for an empty hash", () => {
    expect(toLiveMatch({})).toBeNull();
  });

  it("parses numeric fields and defaults missing goals to 0", () => {
    const live = toLiveMatch({
      statusId: "4",
      minute: "67",
      goals1: "2",
      ts: "1700",
    });
    expect(live).toEqual({
      statusId: 4,
      minute: 67,
      goals: { team1: 2, team2: 0 },
      ts: 1700,
      terminal: false,
    });
  });

  it("flags terminal when the feed marked the hash game_finalised", () => {
    const live = toLiveMatch({
      statusId: "100",
      goals1: "1",
      goals2: "2",
      ts: "1700",
      terminal: "1",
    });
    expect(live?.terminal).toBe(true);
  });
});

describe("listMatches", () => {
  beforeEach(() => {
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({}),
    } as never);
    vi.mocked(loadTeamNames).mockResolvedValue(null);
  });

  it("maps each on-chain account to a summary with its PDA and fixtureId", async () => {
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "PdaOpen", match: fakeMatch({ matchId: 100n, status: 0 }) },
    ]);
    vi.mocked(loadTeamNames).mockResolvedValue({
      team1: "USA",
      team2: "Bosnia",
    });

    const rows = await listMatches();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toMatchObject({
      pda: "PdaOpen",
      fixtureId: 100,
      teamNames: { team1: "USA", team2: "Bosnia" },
    });
    expect(row?.onchain.statusLabel).toBe("OPEN");
  });

  it("orders OPEN before RESOLVED before SETTLED, newest fixture first", async () => {
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "s", match: fakeMatch({ matchId: 5n, status: 2 }) },
      { pda: "o1", match: fakeMatch({ matchId: 10n, status: 0 }) },
      { pda: "r", match: fakeMatch({ matchId: 8n, status: 1 }) },
      { pda: "o2", match: fakeMatch({ matchId: 20n, status: 0 }) },
    ]);

    const order = (await listMatches()).map((m) => m.pda);
    expect(order).toEqual(["o2", "o1", "r", "s"]);
  });

  it("drops matches whose PDA is in config.excludedMatchPdas", async () => {
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "keep", match: fakeMatch({ matchId: 1n, status: 0 }) },
      { pda: "drop", match: fakeMatch({ matchId: 2n, status: 0 }) },
    ]);
    config.excludedMatchPdas.add("drop");
    try {
      const pdas = (await listMatches()).map((m) => m.pda);
      expect(pdas).toEqual(["keep"]);
    } finally {
      config.excludedMatchPdas.delete("drop");
    }
  });

  it("features the soonest-upcoming OPEN match", async () => {
    const soon = Math.floor(Date.now() / 1000) + 3600;
    const later = soon + 3600;
    vi.mocked(fetchAllMatches).mockResolvedValue([
      {
        pda: "late",
        match: fakeMatch({ matchId: 30n, status: 0, startTime: BigInt(later) }),
      },
      {
        pda: "soon",
        match: fakeMatch({ matchId: 10n, status: 0, startTime: BigInt(soon) }),
      },
      {
        pda: "settled",
        match: fakeMatch({ matchId: 40n, status: 2, startTime: BigInt(soon) }),
      },
    ]);
    const rows = await listMatches();
    expect(rows.filter((m) => m.featured).map((m) => m.pda)).toEqual(["soon"]);
  });

  it("falls back to the newest OPEN match when none is upcoming", async () => {
    // All startTimes 0 (start-gate disabled) → newest fixtureId wins.
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "o1", match: fakeMatch({ matchId: 10n, status: 0 }) },
      { pda: "o2", match: fakeMatch({ matchId: 20n, status: 0 }) },
    ]);
    const rows = await listMatches();
    expect(rows.filter((m) => m.featured).map((m) => m.pda)).toEqual(["o2"]);
  });

  it("features nothing when there are no OPEN matches", async () => {
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "s", match: fakeMatch({ matchId: 5n, status: 2 }) },
    ]);
    const rows = await listMatches();
    expect(rows.some((m) => m.featured)).toBe(false);
  });

  it("labels a pre-kickoff OPEN match UPCOMING and nulls its stale live hash", async () => {
    const ko = Math.floor(Date.now() / 1000) + 6 * 3600; // ~6h out
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({
        statusId: "",
        minute: "",
        goals1: "0",
        goals2: "0",
        ts: "1783465737802",
      }),
    } as never);
    vi.mocked(fetchAllMatches).mockResolvedValue([
      {
        pda: "o",
        match: fakeMatch({ matchId: 10n, status: 0, startTime: BigInt(ko) }),
      },
    ]);
    const [row] = await listMatches();
    expect(row?.phase).toBe("UPCOMING");
    expect(row?.live).toBeNull();
  });

  it("exposes finalScore on a SETTLED row whose stale live hash is nulled", async () => {
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({
        statusId: "",
        minute: "",
        goals1: "3",
        goals2: "1",
        ts: "1783465737802",
      }),
    } as never);
    vi.mocked(fetchAllMatches).mockResolvedValue([
      {
        pda: "s",
        match: fakeMatch({ matchId: 10n, status: 2, settled: true }),
      },
    ]);
    const [row] = await listMatches();
    expect(row?.phase).toBe("SETTLED");
    expect(row?.live).toBeNull();
    expect(row?.finalScore).toEqual({ team1: 3, team2: 1 });
  });

  it("leaves finalScore null for a LIVE row (score lives in live.goals)", async () => {
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({
        statusId: "4",
        minute: "67",
        goals1: "2",
        goals2: "1",
        ts: "1783465737802",
      }),
    } as never);
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "o", match: fakeMatch({ matchId: 10n, status: 0 }) },
    ]);
    const [row] = await listMatches();
    expect(row?.phase).toBe("LIVE");
    expect(row?.finalScore).toBeNull();
  });

  it("labels an in-play match LIVE with a populated live payload", async () => {
    vi.mocked(getRedis).mockReturnValue({
      hgetall: vi.fn().mockResolvedValue({
        statusId: "4",
        minute: "67",
        goals1: "2",
        goals2: "1",
        ts: "1783465737802",
      }),
    } as never);
    vi.mocked(fetchAllMatches).mockResolvedValue([
      { pda: "o", match: fakeMatch({ matchId: 10n, status: 0 }) },
    ]);
    const [row] = await listMatches();
    expect(row?.phase).toBe("LIVE");
    expect(row?.live).toMatchObject({ statusId: 4, minute: 67 });
  });
});

describe("assembleMatchState", () => {
  it("combines live and on-chain", () => {
    const state = assembleMatchState(17926594, { minute: "67" }, fakeMatch());
    expect(state.fixtureId).toBe(17926594);
    expect(state.live?.minute).toBe(67);
    expect(state.onchain?.statusLabel).toBe("OPEN");
  });

  it("throws when neither source has data", () => {
    expect(() => assembleMatchState(99, {}, null)).toThrow(MatchNotFoundError);
  });

  it("works with only on-chain data", () => {
    const state = assembleMatchState(17926594, {}, fakeMatch());
    expect(state.live).toBeNull();
    expect(state.onchain).not.toBeNull();
  });

  it("returns finalScore for a settled fixture whose live is nulled", () => {
    const state = assembleMatchState(
      17926594,
      {
        statusId: "",
        minute: "",
        goals1: "3",
        goals2: "1",
        ts: "1783465737802",
      },
      fakeMatch({ status: 2, settled: true }),
    );
    expect(state.phase).toBe("SETTLED");
    expect(state.live).toBeNull();
    expect(state.finalScore).toEqual({ team1: 3, team2: 1 });
  });

  it("has null finalScore for an open fixture", () => {
    const state = assembleMatchState(17926594, {}, fakeMatch());
    expect(state.finalScore).toBeNull();
  });
});
