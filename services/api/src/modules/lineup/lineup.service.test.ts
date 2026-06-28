import { describe, expect, it } from "vitest";
import { LineupNotReadyError } from "./lineup.errors.js";
import { lineupKey, parseLineup } from "./lineup.service.js";

const sample = {
  fixtureId: 17588325,
  updatedAt: 1782610977399,
  teams: [
    {
      side: 1,
      teamId: 1149,
      teamName: "Jordan",
      players: [{ id: 10282425, name: "Abu Dahab, Husam", number: "4", starter: true, positionId: 35 }],
    },
    {
      side: 2,
      teamId: 1489,
      teamName: "Argentina",
      players: [{ id: 1072568, name: "Alvarez, Julian", number: "9", starter: true, positionId: 37 }],
    },
  ],
  names: { "10282425": "Abu Dahab, Husam", "1072568": "Alvarez, Julian" },
};

describe("parseLineup", () => {
  it("validates and returns a lineup", () => {
    const out = parseLineup(JSON.stringify(sample), 17588325);
    expect(out.teams).toHaveLength(2);
    expect(out.teams[0]?.side).toBe(1);
    expect(out.names["1072568"]).toBe("Alvarez, Julian");
  });

  it("throws when no lineup is cached", () => {
    expect(() => parseLineup(null, 17588325)).toThrow(LineupNotReadyError);
  });
});

describe("lineupKey", () => {
  it("namespaces by fixtureId", () => {
    expect(lineupKey(17588325)).toBe("lineup:17588325");
  });
});
