import { beforeEach, describe, expect, it, vi } from "vitest";
import { txlineGet } from "../../txline.js";
import { listSchedule, toScheduleFixture } from "./schedule.service.js";

vi.mock("../../txline.js", () => ({ txlineGet: vi.fn() }));

const RAW = {
  FixtureId: 18172379,
  StartTime: 1_700_000_000,
  Competition: "World Cup",
  CompetitionId: 7,
  Participant1: "USA",
  Participant1Id: 1,
  Participant2: "Bosnia",
  Participant2Id: 2,
  Participant1IsHome: true,
};

describe("toScheduleFixture", () => {
  it("maps the PascalCase wire shape to the trimmed schedule shape", () => {
    expect(toScheduleFixture(RAW)).toEqual({
      fixtureId: 18172379,
      startTime: 1_700_000_000,
      competition: "World Cup",
      competitionId: 7,
      team1: { id: 1, name: "USA" },
      team2: { id: 2, name: "Bosnia" },
      team1IsHome: true,
    });
  });

  it("nulls out missing optional fields", () => {
    const out = toScheduleFixture({ FixtureId: 5 });
    expect(out).toEqual({
      fixtureId: 5,
      startTime: null,
      competition: null,
      competitionId: null,
      team1: { id: null, name: null },
      team2: { id: null, name: null },
      team1IsHome: null,
    });
  });
});

describe("listSchedule", () => {
  beforeEach(() => vi.mocked(txlineGet).mockReset());

  it("forwards query params, sorts by kickoff, and skips malformed rows", async () => {
    vi.mocked(txlineGet).mockResolvedValue([
      { ...RAW, FixtureId: 20, StartTime: 200 },
      { garbage: true },
      { ...RAW, FixtureId: 10, StartTime: 100 },
    ]);

    const out = await listSchedule({ startEpochDay: 20000, competitionId: 7 });

    expect(txlineGet).toHaveBeenCalledWith("/api/fixtures/snapshot", {
      startEpochDay: 20000,
      competitionId: 7,
    });
    expect(out.map((f) => f.fixtureId)).toEqual([10, 20]);
  });

  it("wraps a single-object response in an array", async () => {
    vi.mocked(txlineGet).mockResolvedValue(RAW);
    const out = await listSchedule();
    expect(out).toHaveLength(1);
    expect(out[0]?.fixtureId).toBe(18172379);
  });
});
