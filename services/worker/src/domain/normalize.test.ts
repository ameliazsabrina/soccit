import { describe, expect, it } from "vitest";
import { normalize, isTerminal } from "./normalize.js";
import { RawEvent } from "../txline/types.js";
import realEvents from "./__fixtures__/real-events.json";

const fx = (name: keyof typeof realEvents): RawEvent =>
  RawEvent.parse(realEvents[name]);

describe("normalize (real TxLINE wire format)", () => {
  it("detects a substitution from the complete beat (side, players, clock minute)", () => {
    const events = normalize(fx("sub_complete"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "substitution",
      fixtureId: 17926593,
      side: 2,
      playerOutId: 941505,
      playerInId: 614467,
      minute: 57,
    });
  });

  it("skips the preliminary substitution beat that has no players yet", () => {
    expect(normalize(fx("sub_preliminary"))).toHaveLength(0);
  });

  it("treats a red card as its own internal event, never a substitution", () => {
    const raw: RawEvent = {
      FixtureId: 1,
      Action: "red_card",
      Clock: { Seconds: 4800 },
      Data: { Participant: 1, PlayerId: 22 },
    };
    const events = normalize(raw);
    expect(events.map((e) => e.type)).toEqual(["red_card"]);
    expect(events[0]).toMatchObject({ type: "red_card", side: 1, playerId: 22, minute: 80 });
  });

  it("detects a goal", () => {
    const events = normalize(fx("goal"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "goal", minute: 2 });
  });

  it("does not emit a domain event for a yellow card", () => {
    expect(normalize(fx("yellow_card"))).toHaveLength(0);
  });

  it("emits a non-terminal status for the half-time whistle", () => {
    const events = normalize(fx("halftime_finalised"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "status",
      action: "halftime_finalised",
      statusId: 3,
      terminal: false,
    });
  });

  it("emits a TERMINAL status for game_finalised (the settlement cue)", () => {
    const events = normalize(fx("game_finalised"));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "status",
      action: "game_finalised",
      terminal: true,
    });
  });

  it("attaches the rolling scoreline (goals1/goals2) to a terminal status from Stats", () => {
    const raw: RawEvent = {
      FixtureId: 1,
      Action: "game_finalised",
      Clock: { Seconds: 5700 },
      Stats: { "1": 2, "2": 1 },
    };
    const events = normalize(raw);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "status",
      action: "game_finalised",
      terminal: true,
      goals1: 2,
      goals2: 1,
    });
  });

  it("leaves goals undefined on a status beat with no Stats", () => {
    const events = normalize(fx("game_finalised"));
    expect(events[0]).toMatchObject({ type: "status", terminal: true });
    expect((events[0] as { goals1?: number }).goals1).toBeUndefined();
  });

  it("emits a status event for an explicit status action", () => {
    const events = normalize(fx("status"));
    expect(events[0]).toMatchObject({ type: "status", action: "status", statusId: 2, terminal: false });
  });

  it("does not emit any domain event for an ignored action (kickoff)", () => {
    expect(normalize(fx("kickoff"))).toHaveLength(0);
  });

  it("ignores a substitution with an unknown side", () => {
    const raw: RawEvent = {
      FixtureId: 1,
      Action: "substitution",
      Data: { Participant: 0, PlayerInId: 7, PlayerOutId: 14 },
    };
    expect(normalize(raw)).toHaveLength(0);
  });

  it("defaults a substitution minute to 0 when there is no clock", () => {
    const raw: RawEvent = {
      FixtureId: 1,
      Action: "substitution",
      Data: { Participant: 1, PlayerInId: 11, PlayerOutId: 3 },
    };
    expect(normalize(raw)[0]).toMatchObject({ type: "substitution", minute: 0 });
  });

  it("emits a TERMINAL status for a custom terminal action outside the built-in status set", () => {
    const raw: RawEvent = { FixtureId: 1, Action: "abandoned" };
    const events = normalize(raw, { terminalActions: new Set(["abandoned", "game_finalised"]) });
    expect(isTerminal(raw, new Set(["abandoned"]))).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "status", action: "abandoned", terminal: true });
  });

  it("still emits nothing for an unconfigured non-status action (kickoff stays ignored)", () => {
    const raw: RawEvent = { FixtureId: 1, Action: "abandoned" };
    // not in the terminal set this time → no status event
    expect(normalize(raw, { terminalActions: new Set(["game_finalised"]) })).toHaveLength(0);
  });
});

describe("isTerminal", () => {
  it("is true only for the game_finalised action", () => {
    expect(isTerminal(fx("game_finalised"))).toBe(true);
    expect(isTerminal(fx("halftime_finalised"))).toBe(false);
    expect(isTerminal(fx("kickoff"))).toBe(false);
  });
});
