import { describe, expect, it } from "vitest";
import { score } from "./leaderboard.service.js";
import { KIND_COMBO, KIND_OUT, type Prediction, type Substitution } from "./leaderboard.schema.js";

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

describe("score — edge cases & determinism", () => {
  it("returns an empty ranking and all-null winners for no predictions", () => {
    const out = run([], [sub({})]);
    expect(out.ranking).toEqual([]);
    expect(out.winners).toEqual([null, null, null]);
  });

  it("scores zero for all owners when there are no substitutions", () => {
    const out = run([pred({ owner: "a" }), pred({ owner: "b" })], []);
    expect(out.ranking.every((e) => e.points === 0)).toBe(true);
    expect(out.winners).toEqual([null, null, null]);
  });

  it("is unaffected by substitution order (out-of-order events)", () => {
    const preds = [pred({ owner: "a", kind: KIND_COMBO, outPlayerId: 100, inPlayerId: 200 })];
    const a = run(preds, [sub({ minute: 80, playerOutId: 100 }), sub({ minute: 60, playerInId: 200 })]);
    const b = run(preds, [sub({ minute: 60, playerInId: 200 }), sub({ minute: 80, playerOutId: 100 })]);
    expect(a.ranking).toEqual(b.ranking);
  });

  it("a duplicate substitution does not double-count a single prediction (idempotent matching)", () => {
    const dup = sub({ playerOutId: 100 });
    const out = run([pred({ owner: "a", kind: KIND_OUT, outPlayerId: 100 })], [dup, { ...dup }]);
    expect(out.ranking[0]?.points).toBe(1);
  });

  it("counts each duplicate prediction independently (two identical picks score twice)", () => {
    const p = pred({ owner: "a", kind: KIND_OUT, outPlayerId: 100 });
    const out = run([p, { ...p }], [sub({ playerOutId: 100 })]);
    expect(out.ranking[0]?.points).toBe(2);
    expect(out.ranking[0]?.predictions).toHaveLength(2);
  });

  it("is deterministic: equal points + equal lock minute breaks ties by owner string", () => {
    const out = run(
      [
        pred({ owner: "zeta", lockMinute: 10, outPlayerId: 100 }),
        pred({ owner: "alpha", lockMinute: 10, outPlayerId: 100 }),
      ],
      [sub({ minute: 60, playerOutId: 100 })],
    );
    expect(out.ranking.map((e) => e.owner)).toEqual(["alpha", "zeta"]);
  });

  it("caps the podium at three winners even when more than three owners score", () => {
    const out = run(
      [
        pred({ owner: "a", lockMinute: 10, outPlayerId: 100 }),
        pred({ owner: "b", lockMinute: 20, outPlayerId: 100 }),
        pred({ owner: "c", lockMinute: 30, outPlayerId: 100 }),
        pred({ owner: "d", lockMinute: 40, outPlayerId: 100 }),
      ],
      [sub({ minute: 60, playerOutId: 100 })],
    );
    expect(out.winners).toEqual(["a", "b", "c"]);
    expect(out.ranking).toHaveLength(4);
  });
});
