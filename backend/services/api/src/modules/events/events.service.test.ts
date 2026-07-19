import { describe, expect, it } from "vitest";
import type { ResolvedPlayer } from "../lineup/lineup.schema.js";
import { enrichEntry, eventStreamKey, parseFields } from "./events.service.js";

describe("parseFields", () => {
  it("extracts type and parsed json payload", () => {
    const { type, payload } = parseFields([
      "type",
      "substitution",
      "json",
      JSON.stringify({ side: 1, playerOutId: 11, playerInId: 22, minute: 67 }),
    ]);
    expect(type).toBe("substitution");
    expect(payload).toEqual({ side: 1, playerOutId: 11, playerInId: 22, minute: 67 });
  });

  it("tolerates malformed json", () => {
    const { type, payload } = parseFields(["type", "goal", "json", "{not json"]);
    expect(type).toBe("goal");
    expect(payload).toBeUndefined();
  });

  it("defaults type to empty string when absent", () => {
    expect(parseFields([]).type).toBe("");
  });
});

describe("eventStreamKey", () => {
  it("namespaces by fixtureId", () => {
    expect(eventStreamKey(17926594)).toBe("events:17926594");
  });
});

describe("enrichEntry", () => {
  const out: ResolvedPlayer = {
    id: 11,
    name: "Player Out",
    number: "5",
    positionId: 36,
    position: "Midfielder",
    side: 1,
  };
  const incoming: ResolvedPlayer = {
    id: 22,
    name: "Player In",
    number: "18",
    positionId: 37,
    position: "Forward",
    side: 1,
  };
  const index = new Map<number, ResolvedPlayer>([
    [11, out],
    [22, incoming],
  ]);

  it("resolves both players with name and position on a substitution", () => {
    const entry = {
      id: "1-0",
      type: "substitution",
      payload: { side: 1, playerOutId: 11, playerInId: 22, minute: 67 },
    };
    const enriched = enrichEntry(entry, index);
    expect(enriched.players?.out).toMatchObject({ name: "Player Out", position: "Midfielder" });
    expect(enriched.players?.in).toMatchObject({ name: "Player In", position: "Forward" });
  });

  it("yields null for a player absent from the lineup index", () => {
    const entry = {
      id: "2-0",
      type: "substitution",
      payload: { side: 1, playerOutId: 11, playerInId: 999, minute: 70 },
    };
    const enriched = enrichEntry(entry, index);
    expect(enriched.players?.out?.id).toBe(11);
    expect(enriched.players?.in).toBeNull();
  });

  it("leaves non-substitution events untouched", () => {
    const entry = { id: "3-0", type: "goal", payload: { side: 1, playerId: 11 } };
    expect(enrichEntry(entry, index).players).toBeUndefined();
  });
});
