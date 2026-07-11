import { describe, expect, it } from "vitest";
import { score } from "./leaderboard.service.js";
import {
  KIND_COMBO,
  KIND_IN,
  KIND_OUT,
  KIND_SCORE,
  leaderboardOutput,
  type Prediction,
  type Substitution,
} from "./leaderboard.schema.js";

const sub = (over: Partial<Substitution>): Substitution => ({
  side: 1,
  playerOutId: 100,
  playerInId: 200,
  minute: 60,
  ...over,
});

const pred = (over: Partial<Prediction>): Prediction => ({
  owner: "owner",
  side: 1,
  kind: KIND_OUT,
  outPlayerId: 100,
  inPlayerId: 200,
  lockMinute: 10,
  ...over,
});

const run = (predictions: Prediction[], subs: Substitution[]) =>
  score({ fixtureId: 1, predictions, subs, now: 0 });

describe("score", () => {
  it("emits a schema-valid output", () => {
    const out = run([pred({ owner: "a" })], [sub({})]);
    expect(() => leaderboardOutput.parse(out)).not.toThrow();
  });

  it("OUT scores +1 on matching playerOutId", () => {
    const out = run(
      [pred({ owner: "a", kind: KIND_OUT, outPlayerId: 100 })],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking[0]).toMatchObject({ owner: "a", points: 1 });
  });

  it("carries side + player ids onto each prediction result", () => {
    const out = run(
      [
        pred({
          owner: "a",
          side: 1,
          kind: KIND_OUT,
          outPlayerId: 100,
          inPlayerId: 200,
        }),
      ],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking[0]?.predictions[0]).toMatchObject({
      side: 1,
      outPlayerId: 100,
      inPlayerId: 200,
    });
  });

  it("OUT scores 0 when no sub matches", () => {
    const out = run(
      [pred({ owner: "a", kind: KIND_OUT, outPlayerId: 999 })],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking[0]?.points).toBe(0);
  });

  it("IN scores +1 on matching playerInId", () => {
    const out = run(
      [pred({ owner: "a", kind: KIND_IN, inPlayerId: 200 })],
      [sub({ playerInId: 200 })],
    );
    expect(out.ranking[0]?.points).toBe(1);
  });

  it("COMBO scores 3 when both legs hit", () => {
    const out = run(
      [
        pred({
          owner: "a",
          kind: KIND_COMBO,
          outPlayerId: 100,
          inPlayerId: 200,
        }),
      ],
      [sub({ playerOutId: 100, playerInId: 200 })],
    );
    expect(out.ranking[0]?.points).toBe(3);
  });

  it("COMBO scores 1 when only one leg hits", () => {
    const out = run(
      [
        pred({
          owner: "a",
          kind: KIND_COMBO,
          outPlayerId: 100,
          inPlayerId: 999,
        }),
      ],
      [sub({ playerOutId: 100, playerInId: 200 })],
    );
    expect(out.ranking[0]?.points).toBe(1);
  });

  it("ignores subs on the other side", () => {
    const out = run(
      [pred({ owner: "a", side: 1, outPlayerId: 100 })],
      [sub({ side: 2, playerOutId: 100 })],
    );
    expect(out.ranking[0]?.points).toBe(0);
  });

  describe("retroactive 5-minute validity", () => {
    it("counts a pick locked exactly 5 minutes before the sub", () => {
      const out = run(
        [pred({ owner: "a", lockMinute: 55, outPlayerId: 100 })],
        [sub({ minute: 60, playerOutId: 100 })],
      );
      expect(out.ranking[0]?.points).toBe(1);
    });

    it("rejects a pick locked less than 5 minutes before the sub", () => {
      const out = run(
        [pred({ owner: "a", lockMinute: 56, outPlayerId: 100 })],
        [sub({ minute: 60, playerOutId: 100 })],
      );
      expect(out.ranking[0]?.points).toBe(0);
    });
  });

  it("aggregates points per owner across multiple predictions", () => {
    const out = run(
      [
        pred({ owner: "a", kind: KIND_OUT, outPlayerId: 100 }),
        pred({ owner: "a", kind: KIND_IN, inPlayerId: 200 }),
      ],
      [sub({ playerOutId: 100, playerInId: 200 })],
    );
    expect(out.ranking[0]).toMatchObject({ owner: "a", points: 2 });
    expect(out.ranking[0]?.predictions).toHaveLength(2);
  });

  it("breaks ties by earliest scoring lock minute", () => {
    const out = run(
      [
        pred({ owner: "late", lockMinute: 40, outPlayerId: 100 }),
        pred({ owner: "early", lockMinute: 10, outPlayerId: 100 }),
      ],
      [sub({ minute: 60, playerOutId: 100 })],
    );
    expect(out.ranking.map((e) => e.owner)).toEqual(["early", "late"]);
    expect(out.winners).toEqual(["early", "late", null]);
  });

  it("pads winners with null when fewer than 3 owners score", () => {
    const out = run(
      [
        pred({ owner: "a", outPlayerId: 100 }),
        pred({ owner: "b", outPlayerId: 999 }),
      ],
      [sub({ playerOutId: 100 })],
    );
    expect(out.winners).toEqual(["a", null, null]);
  });

  it("excludes zero-point owners from winners but keeps them in ranking", () => {
    const out = run(
      [
        pred({ owner: "a", outPlayerId: 100 }),
        pred({ owner: "z", outPlayerId: 999 }),
      ],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking).toHaveLength(2);
    expect(out.winners).toEqual(["a", null, null]);
  });

  describe("score predictions (tiered: exact=5, outcome=3)", () => {
    const scorePred = (owner: string, s1: number, s2: number): Prediction =>
      pred({
        owner,
        side: 0,
        kind: KIND_SCORE,
        outPlayerId: s1,
        inPlayerId: s2,
      });

    const grade = (
      predictions: Prediction[],
      finalScore?: { score1: number; score2: number },
    ) =>
      score({
        fixtureId: 1,
        predictions,
        subs: [],
        finalScore,
        final: finalScore != null,
        now: 0,
      });

    it("awards 5 for an exact scoreline", () => {
      const out = grade([scorePred("a", 2, 1)], { score1: 2, score2: 1 });
      expect(out.ranking[0]).toMatchObject({ owner: "a", points: 5 });
    });

    it("awards 3 for a correct outcome with the wrong goals", () => {
      const out = grade([scorePred("a", 3, 1)], { score1: 2, score2: 1 });
      expect(out.ranking[0]?.points).toBe(3);
    });

    it("awards 3 for a correctly predicted draw with wrong goals", () => {
      const out = grade([scorePred("a", 1, 1)], { score1: 2, score2: 2 });
      expect(out.ranking[0]?.points).toBe(3);
    });

    it("awards 0 for the wrong outcome", () => {
      const out = grade([scorePred("a", 2, 1)], { score1: 0, score2: 3 });
      expect(out.ranking[0]?.points).toBe(0);
    });

    it("is provisional (0 pts) before full-time, when no final score is known", () => {
      const out = grade([scorePred("a", 2, 1)], undefined);
      expect(out.ranking[0]?.points).toBe(0);
    });

    it("surfaces the predicted scoreline on the result (out=score1, in=score2, side 0)", () => {
      const out = grade([scorePred("a", 2, 1)], { score1: 2, score2: 1 });
      expect(out.ranking[0]?.predictions[0]).toMatchObject({
        kind: KIND_SCORE,
        side: 0,
        outPlayerId: 2,
        inPlayerId: 1,
        points: 5,
      });
    });

    it("aggregates a sub pick and a score pick for the same owner at full-time", () => {
      const out = score({
        fixtureId: 1,
        predictions: [
          pred({
            owner: "a",
            side: 1,
            kind: KIND_OUT,
            outPlayerId: 100,
            lockMinute: 10,
          }),
          scorePred("a", 2, 1),
        ],
        subs: [sub({ side: 1, playerOutId: 100, minute: 60 })],
        final: true,
        finalScore: { score1: 2, score2: 1 },
        now: 0,
      });
      // +1 for the OUT hit, +5 for the exact score = 6
      expect(out.ranking[0]).toMatchObject({ owner: "a", points: 6 });
    });

    it("emits schema-valid output for a score pick", () => {
      const out = grade([scorePred("a", 2, 1)], { score1: 2, score2: 1 });
      expect(() => leaderboardOutput.parse(out)).not.toThrow();
    });
  });
});
