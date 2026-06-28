import { describe, expect, it } from "vitest";
import { extractLineup } from "./lineup.js";
import { RawEvent } from "../txline/types.js";
import rawLineups from "./__fixtures__/lineups.json";

const lineupsEvent = (): RawEvent => RawEvent.parse(rawLineups);

describe("extractLineup (real TxLINE wire format)", () => {
  it("returns null for a non-lineups action", () => {
    expect(extractLineup({ FixtureId: 1, Action: "goal" })).toBeNull();
  });

  it("returns null when Lineups is absent", () => {
    expect(extractLineup({ FixtureId: 1, Action: "lineups" })).toBeNull();
  });

  it("maps both teams to the correct sides via participant ids", () => {
    const snap = extractLineup(lineupsEvent());
    expect(snap).not.toBeNull();
    expect(snap?.fixtureId).toBe(17588325);
    expect(snap?.teams).toHaveLength(2);
    const side1 = snap?.teams.find((t) => t.side === 1);
    const side2 = snap?.teams.find((t) => t.side === 2);
    expect(side1?.teamId).toBe(1149);
    expect(side1?.teamName).toBe("Jordan");
    expect(side2?.teamId).toBe(1489);
    expect(side2?.teamName).toBe("Argentina");
  });

  it("extracts players with number, starter flag, and position", () => {
    const snap = extractLineup(lineupsEvent());
    const jordan = snap?.teams.find((t) => t.side === 1);
    const starters = jordan?.players.filter((p) => p.starter) ?? [];
    expect(starters).toHaveLength(3);
    const keeper = jordan?.players.find((p) => p.id === 279394);
    expect(keeper).toMatchObject({ name: "Abulaila, Yazeed Moien Hasan", number: "1", positionId: 34 });
  });

  it("builds a flat normativeId -> name map across both teams", () => {
    const snap = extractLineup(lineupsEvent());
    expect(snap?.names["10282425"]).toBe("Abu Dahab, Husam");
    expect(snap?.names["1072568"]).toBe("Alvarez, Julian");
    expect(Object.keys(snap?.names ?? {})).toHaveLength(8);
  });

  it("skips teams whose normativeId matches neither participant", () => {
    const raw = lineupsEvent();
    raw.Participant2Id = 99999;
    const snap = extractLineup(raw);
    expect(snap?.teams).toHaveLength(1);
    expect(snap?.teams[0]?.side).toBe(1);
  });
});
