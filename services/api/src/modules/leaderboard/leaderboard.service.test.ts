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

const owner = "3FpiWa3QVb7iks17uMRKZR8EVmofyByzK5exXAzU6Pma";

describe("enrichLeaderboard", () => {
  it("attaches resolved players and the owner profile", () => {
    const board = parseLeaderboard(JSON.stringify(sample), 17926594);
    const index = new Map<number, ResolvedPlayer>([
      [100, player(100, "Player Out", 1)],
      [200, player(200, "Player In", 1)],
    ]);
    const users = new Map([[owner, { username: "amelia", avatar: "avatar-3" as const }]]);
    const enriched = enrichLeaderboard(board, index, users);
    expect(() => enrichedLeaderboardOutput.parse(enriched)).not.toThrow();
    expect(enriched.ranking[0]?.predictions[0]?.players.out?.name).toBe("Player Out");
    expect(enriched.ranking[0]?.user).toEqual({ username: "amelia", avatar: "avatar-3" });
  });

  it("emits null players and null user when indexes are empty", () => {
    const board = parseLeaderboard(JSON.stringify(sample), 17926594);
    const enriched = enrichLeaderboard(board, new Map(), new Map());
    expect(() => enrichedLeaderboardOutput.parse(enriched)).not.toThrow();
    expect(enriched.ranking[0]?.predictions[0]?.players).toEqual({ out: null, in: null });
    expect(enriched.ranking[0]?.user).toBeNull();
  });
});

describe("leaderboardKey", () => {
  it("namespaces by fixtureId", () => {
    expect(leaderboardKey(17926594)).toBe("leaderboard:17926594");
  });
});
