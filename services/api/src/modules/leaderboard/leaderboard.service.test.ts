import { describe, expect, it } from "vitest";
import type { ResolvedPlayer } from "../lineup/lineup.schema.js";
import { LeaderboardNotReadyError } from "./leaderboard.errors.js";
import { enrichedLeaderboardOutput } from "./leaderboard.schema.js";
import { enrichLeaderboard, leaderboardKey, parseLeaderboard } from "./leaderboard.service.js";

const sample = {
  fixtureId: 17926594,
  updatedAt: 1700,
  final: false,
  ranking: [
    {
      owner: "3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma",
      points: 3,
      earliestScoringLockMinute: 20,
      predictions: [{ kind: 2, points: 3, side: 1, outPlayerId: 100, inPlayerId: 200 }],
    },
  ],
  winners: ["3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma", null, null],
};

const player = (id: number, name: string, side: 1 | 2): ResolvedPlayer => ({
  id,
  name,
  number: null,
  positionId: 36,
  position: "Midfielder",
  side,
});

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

describe("enrichLeaderboard", () => {
  it("attaches resolved players to each prediction result", () => {
    const board = parseLeaderboard(JSON.stringify(sample), 17926594);
    const index = new Map<number, ResolvedPlayer>([
      [100, player(100, "Player Out", 1)],
      [200, player(200, "Player In", 1)],
    ]);
    const enriched = enrichLeaderboard(board, index);
    expect(() => enrichedLeaderboardOutput.parse(enriched)).not.toThrow();
    expect(enriched.ranking[0]?.predictions[0]?.players.out?.name).toBe("Player Out");
    expect(enriched.ranking[0]?.predictions[0]?.players.in?.name).toBe("Player In");
  });

  it("emits null players when the lineup index is empty", () => {
    const board = parseLeaderboard(JSON.stringify(sample), 17926594);
    const enriched = enrichLeaderboard(board, new Map());
    expect(() => enrichedLeaderboardOutput.parse(enriched)).not.toThrow();
    expect(enriched.ranking[0]?.predictions[0]?.players).toEqual({ out: null, in: null });
  });
});

describe("leaderboardKey", () => {
  it("namespaces by fixtureId", () => {
    expect(leaderboardKey(17926594)).toBe("leaderboard:17926594");
  });
});
