import { describe, expect, it } from "vitest";
import { score } from "./leaderboard.service.js";
import {
  KIND_COMBO,
  KIND_IN,
  KIND_OUT,
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
    const out = run([pred({ owner: "a", kind: KIND_OUT, outPlayerId: 100 })], [sub({ playerOutId: 100 })]);
    expect(out.ranking[0]).toMatchObject({ owner: "a", points: 1 });
  });

  it("carries side + player ids onto each prediction result", () => {
    const out = run(
      [pred({ owner: "a", side: 1, kind: KIND_OUT, outPlayerId: 100, inPlayerId: 200 })],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking[0]?.predictions[0]).toMatchObject({
      side: 1,
      outPlayerId: 100,
      inPlayerId: 200,
    });
  });

  it("OUT scores 0 when no sub matches", () => {
    const out = run([pred({ owner: "a", kind: KIND_OUT, outPlayerId: 999 })], [sub({ playerOutId: 100 })]);
    expect(out.ranking[0]?.points).toBe(0);
  });

  it("IN scores +1 on matching playerInId", () => {
    const out = run([pred({ owner: "a", kind: KIND_IN, inPlayerId: 200 })], [sub({ playerInId: 200 })]);
    expect(out.ranking[0]?.points).toBe(1);
  });

  it("COMBO scores 3 when both legs hit", () => {
    const out = run(
      [pred({ owner: "a", kind: KIND_COMBO, outPlayerId: 100, inPlayerId: 200 })],
      [sub({ playerOutId: 100, playerInId: 200 })],
    );
    expect(out.ranking[0]?.points).toBe(3);
  });

  it("COMBO scores 1 when only one leg hits", () => {
    const out = run(
      [pred({ owner: "a", kind: KIND_COMBO, outPlayerId: 100, inPlayerId: 999 })],
      [sub({ playerOutId: 100, playerInId: 200 })],
    );
    expect(out.ranking[0]?.points).toBe(1);
  });

  it("ignores subs on the other side", () => {
    const out = run([pred({ owner: "a", side: 1, outPlayerId: 100 })], [sub({ side: 2, playerOutId: 100 })]);
    expect(out.ranking[0]?.points).toBe(0);
  });

  describe("retroactive 5-minute validity", () => {
    it("counts a pick locked exactly 5 minutes before the sub", () => {
      const out = run([pred({ owner: "a", lockMinute: 55, outPlayerId: 100 })], [sub({ minute: 60, playerOutId: 100 })]);
      expect(out.ranking[0]?.points).toBe(1);
    });

    it("rejects a pick locked less than 5 minutes before the sub", () => {
      const out = run([pred({ owner: "a", lockMinute: 56, outPlayerId: 100 })], [sub({ minute: 60, playerOutId: 100 })]);
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
      [pred({ owner: "a", outPlayerId: 100 }), pred({ owner: "z", outPlayerId: 999 })],
      [sub({ playerOutId: 100 })],
    );
    expect(out.ranking).toHaveLength(2);
    expect(out.winners).toEqual(["a", null, null]);
  });
});
