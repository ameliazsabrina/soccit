import { describe, expect, it } from "vitest";
import { selectUpcoming, type ScheduleFixture } from "./match-creation.js";

const NOW = 1_782_446_400; // unix seconds
const fx = (over: Partial<ScheduleFixture> & { fixtureId: number }): ScheduleFixture => ({
  startTime: NOW * 1000,
  team1: { id: 1, name: "A" },
  team2: { id: 2, name: "B" },
  ...over,
});

describe("selectUpcoming", () => {
  it("converts the feed's ms startTime to unix seconds", () => {
    const out = selectUpcoming([fx({ fixtureId: 1, startTime: (NOW + 3600) * 1000 })], NOW, 21_600);
    expect(out).toEqual([{ fixtureId: 1, team1Id: 1, team2Id: 2, startTimeSecs: NOW + 3600 }]);
  });

  it("includes fixtures kicking off within the lookahead", () => {
    const out = selectUpcoming([fx({ fixtureId: 1, startTime: (NOW + 1800) * 1000 })], NOW, 21_600);
    expect(out.map((m) => m.fixtureId)).toEqual([1]);
  });

  it("excludes fixtures beyond the lookahead", () => {
    const out = selectUpcoming([fx({ fixtureId: 1, startTime: (NOW + 30_000) * 1000 })], NOW, 21_600);
    expect(out).toHaveLength(0);
  });

  it("keeps a fixture just past kickoff (still open in-play) within the grace window", () => {
    const out = selectUpcoming([fx({ fixtureId: 1, startTime: (NOW - 300) * 1000 })], NOW, 21_600);
    expect(out.map((m) => m.fixtureId)).toEqual([1]);
  });

  it("drops a fixture kicked off long ago", () => {
    const out = selectUpcoming([fx({ fixtureId: 1, startTime: (NOW - 3600) * 1000 })], NOW, 21_600);
    expect(out).toHaveLength(0);
  });

  it("skips fixtures missing a start time or team ids", () => {
    const out = selectUpcoming(
      [
        fx({ fixtureId: 1, startTime: null }),
        fx({ fixtureId: 2, team1: { id: null, name: null } }),
      ],
      NOW,
      21_600,
    );
    expect(out).toHaveLength(0);
  });
});
