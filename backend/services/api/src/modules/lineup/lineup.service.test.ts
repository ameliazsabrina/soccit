import { describe, expect, it } from "vitest";
import { LineupNotReadyError } from "./lineup.errors.js";
import { buildPlayerIndex, lineupKey, parseLineup } from "./lineup.service.js";

const sample = {
  fixtureId: 17588325,
  updatedAt: 1782610977399,
  teams: [
    {
      side: 1,
      teamId: 1149,
      teamName: "Jordan",
      players: [
        { id: 279394, name: "Abulaila, Yazeed", number: "1", starter: true, positionId: 34 },
        { id: 10282425, name: "Abu Dahab, Husam", number: "4", starter: true, positionId: 35 },
      ],
    },
    {
      side: 2,
      teamId: 1489,
      teamName: "Argentina",
      players: [{ id: 1072568, name: "Alvarez, Julian", number: "9", starter: true, positionId: 37 }],
    },
  ],
  names: { "279394": "Abulaila, Yazeed", "10282425": "Abu Dahab, Husam", "1072568": "Alvarez, Julian" },
};

describe("parseLineup", () => {
  it("validates and adds position labels", () => {
    const out = parseLineup(JSON.stringify(sample), 17588325);
    expect(out.teams).toHaveLength(2);
    const keeper = out.teams[0]?.players.find((p) => p.id === 279394);
    expect(keeper?.position).toBe("Goalkeeper");
    expect(out.teams[0]?.players.find((p) => p.id === 10282425)?.position).toBe("Defender");
    expect(out.teams[1]?.players[0]?.position).toBe("Forward");
  });

  it("labels an unknown positionId as null", () => {
    const weird = structuredClone(sample);
    weird.teams[0]!.players[0]!.positionId = 99;
    const out = parseLineup(JSON.stringify(weird), 17588325);
    expect(out.teams[0]?.players[0]?.position).toBeNull();
  });

  it("throws when no lineup is cached", () => {
    expect(() => parseLineup(null, 17588325)).toThrow(LineupNotReadyError);
  });
});

describe("buildPlayerIndex", () => {
  it("flattens players to a side-tagged lookup by id", () => {
    const index = buildPlayerIndex(parseLineup(JSON.stringify(sample), 17588325));
    expect(index.get(1072568)).toMatchObject({
      name: "Alvarez, Julian",
      number: "9",
      positionId: 37,
      position: "Forward",
      side: 2,
    });
    expect(index.get(279394)?.side).toBe(1);
  });
});

describe("lineupKey", () => {
  it("namespaces by fixtureId", () => {
    expect(lineupKey(17588325)).toBe("lineup:17588325");
  });
});
