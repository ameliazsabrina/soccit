import { PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    const winner = new PublicKey("3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma");
    const out = toOnchainMatch(fakeMatch({ winner1: winner }));
    expect(out.winners).toEqual([winner.toBase58(), null, null]);
  });

  it("labels open and resolved", () => {
    expect(toOnchainMatch(fakeMatch({ status: 0 })).statusLabel).toBe("OPEN");
    expect(toOnchainMatch(fakeMatch({ status: 1 })).statusLabel).toBe("RESOLVED");
  });
});

describe("toLiveMatch", () => {
  it("returns null for an empty hash", () => {
    expect(toLiveMatch({})).toBeNull();
  });

  it("parses numeric fields and defaults missing goals to 0", () => {
    const live = toLiveMatch({ statusId: "4", minute: "67", goals1: "2", ts: "1700" });
    expect(live).toEqual({ statusId: 4, minute: 67, goals: { team1: 2, team2: 0 }, ts: 1700 });
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
    vi.mocked(loadTeamNames).mockResolvedValue({ team1: "USA", team2: "Bosnia" });

    const [row] = await listMatches();
    expect(row.pda).toBe("PdaOpen");
    expect(row.fixtureId).toBe(100);
    expect(row.onchain.statusLabel).toBe("OPEN");
    expect(row.teamNames).toEqual({ team1: "USA", team2: "Bosnia" });
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
});
