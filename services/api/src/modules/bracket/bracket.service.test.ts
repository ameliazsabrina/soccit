import { describe, expect, it } from "vitest";
import {
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
} from "../../onchain/program.js";
import { deriveMatch } from "./bracket.service.js";
import type { StructureMatch } from "./bracket.structure.js";

const SLOT: StructureMatch = {
  id: "r32-1",
  fixtureId: 100,
  home: { name: "Netherlands", code: "nl" },
  away: { name: "United States", code: "us" },
};

const onchain = (status: number): DecodedMatch =>
  ({ status }) as unknown as DecodedMatch;

describe("deriveMatch", () => {
  it("is scheduled with null scores when there is no live hash", () => {
    const match = deriveMatch(SLOT, {}, null);
    expect(match).toMatchObject({
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      winner: null,
    });
    expect(match.home.advancing).toBe(false);
    expect(match.home.eliminated).toBe(false);
    expect(match.away.eliminated).toBe(false);
  });

  it("flags the current leader while live (not eliminated until final)", () => {
    const match = deriveMatch(
      SLOT,
      { goals1: "2", goals2: "1", statusId: "4" },
      null,
    );
    expect(match).toMatchObject({
      status: "live",
      homeScore: 2,
      awayScore: 1,
      winner: "home",
    });
    expect(match.home.advancing).toBe(true);
    expect(match.away.advancing).toBe(false);
    expect(match.away.eliminated).toBe(false);
  });

  it("leaves winner null on a level live score", () => {
    const match = deriveMatch(SLOT, { goals1: "1", goals2: "1" }, null);
    expect(match.winner).toBeNull();
    expect(match.home.advancing).toBe(false);
    expect(match.away.advancing).toBe(false);
  });

  it("marks final + eliminates the loser once resolved on-chain", () => {
    const match = deriveMatch(
      SLOT,
      { goals1: "1", goals2: "0" },
      onchain(STATUS_RESOLVED),
    );
    expect(match.status).toBe("final");
    expect(match.winner).toBe("home");
    expect(match.home.advancing).toBe(true);
    expect(match.home.eliminated).toBe(false);
    expect(match.away.eliminated).toBe(true);
  });

  it("stays live (not final) while the on-chain match is still OPEN", () => {
    const match = deriveMatch(
      SLOT,
      { goals1: "0", goals2: "0" },
      onchain(STATUS_OPEN),
    );
    expect(match.status).toBe("live");
    expect(match.away.eliminated).toBe(false);
  });
});
