import { describe, expect, it } from "vitest";
import { eventStreamKey, parseFields } from "./events.service.js";

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
