import { describe, expect, it } from "vitest";
import type { LeaderboardOutput } from "../leaderboard/leaderboard.schema.js";
import { participationDocs } from "./leaderboard.js";

const out: LeaderboardOutput = {
  fixtureId: 555,
  updatedAt: 1,
  final: true,
  ranking: [
    {
      owner: "A",
      points: 3,
      earliestScoringLockMinute: 10,
      predictions: [{ kind: 2, points: 3, side: 1, outPlayerId: 100, inPlayerId: 200 }],
    },
    {
      owner: "B",
      points: 0,
      earliestScoringLockMinute: null,
      predictions: [{ kind: 0, points: 0, side: 1, outPlayerId: 999, inPlayerId: 0 }],
    },
  ],
  winners: ["A", null, null],
};

describe("participationDocs", () => {
  it("emits one doc per owner with fixtureId, points, final, and predictions", () => {
    const docs = participationDocs(out);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({ wallet: "A", fixtureId: 555, points: 3, final: true });
    expect(docs[0]?.predictions).toHaveLength(1);
  });

  it("assigns rank from the winners tuple, null when not a winner", () => {
    const docs = participationDocs(out);
    expect(docs.find((d) => d.wallet === "A")?.rank).toBe(1);
    expect(docs.find((d) => d.wallet === "B")?.rank).toBeNull();
  });
});
