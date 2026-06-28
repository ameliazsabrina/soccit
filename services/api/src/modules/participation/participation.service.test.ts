import { describe, expect, it } from "vitest";
import { participationOutput, userMatchesOutput } from "./participation.schema.js";

const mongoDoc = {
  _id: "abc123",
  _updatedAt: 1782657339317,
  wallet: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
  fixtureId: 88776656,
  points: 1,
  final: true,
  rank: 1,
  predictions: [{ kind: 0, points: 1, side: 1, outPlayerId: 100, inPlayerId: 0 }],
};

describe("participationOutput", () => {
  it("parses a stored participation doc and strips mongo internals", () => {
    const out = participationOutput.parse(mongoDoc);
    expect(out).not.toHaveProperty("_id");
    expect(out).not.toHaveProperty("_updatedAt");
    expect(out).toMatchObject({ wallet: mongoDoc.wallet, fixtureId: 88776656, rank: 1 });
    expect(out.predictions[0]?.outPlayerId).toBe(100);
  });

  it("allows a null rank for non-winners", () => {
    const out = participationOutput.parse({ ...mongoDoc, rank: null, points: 0 });
    expect(out.rank).toBeNull();
  });

  it("validates an array of participations", () => {
    expect(() => userMatchesOutput.parse([mongoDoc])).not.toThrow();
  });
});
