import { describe, expect, it } from "vitest";
import { LeaderboardNotReadyError } from "./leaderboard.errors.js";
import { leaderboardKey, parseLeaderboard } from "./leaderboard.service.js";

const sample = {
  fixtureId: 17926594,
  updatedAt: 1700,
  final: false,
  ranking: [
    {
      owner: "3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma",
      points: 3,
      earliestScoringLockMinute: 20,
      predictions: [{ kind: 2, points: 3 }],
    },
  ],
  winners: ["3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma", null, null],
};

describe("parseLeaderboard", () => {
  it("validates and returns a leaderboard", () => {
    const out = parseLeaderboard(JSON.stringify(sample), 17926594);
    expect(out.ranking[0]?.points).toBe(3);
    expect(out.winners[0]).toBe("3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma");
  });

  it("throws when no leaderboard is cached", () => {
    expect(() => parseLeaderboard(null, 17926594)).toThrow(LeaderboardNotReadyError);
  });
});

describe("leaderboardKey", () => {
  it("namespaces by fixtureId", () => {
    expect(leaderboardKey(17926594)).toBe("leaderboard:17926594");
  });
});
