import { describe, expect, it, vi } from "vitest";
import { processRawEvent } from "./ingest.js";
import type { Store } from "./store/index.js";
import type { LineupSnapshot } from "./domain/lineup.js";
import type { RawEvent } from "./txline/types.js";
import rawLineups from "./domain/__fixtures__/lineups.json";

function fakeStore() {
  const persist = vi.fn(async () => {});
  const writeLineup = vi.fn(async () => {});
  const setLastEventId = vi.fn(async () => {});
  const store = { persist, writeLineup, setLastEventId } as unknown as Store;
  return { store, persist, writeLineup, setLastEventId };
}

const sub: RawEvent = {
  FixtureId: 17926593,
  Action: "substitution",
  Seq: 42,
  Data: { Participant: 1, PlayerInId: 11, PlayerOutId: 3 },
  Clock: { Seconds: 3600 },
};

describe("processRawEvent", () => {
  it("persists normalized events and advances the cursor from Seq", async () => {
    const { store, persist, setLastEventId } = fakeStore();
    const events = await processRawEvent(sub, store, new Map());
    expect(persist).toHaveBeenCalledTimes(1);
    expect(events[0]).toMatchObject({ type: "substitution", playerOutId: 3, playerInId: 11 });
    expect(setLastEventId).toHaveBeenCalledWith("42");
  });

  it("falls back to Id when Seq is absent", async () => {
    const { store, setLastEventId } = fakeStore();
    await processRawEvent({ ...sub, Seq: undefined, Id: 99 }, store, new Map());
    expect(setLastEventId).toHaveBeenCalledWith("99");
  });

  it("does not advance the cursor when neither Seq nor Id is present", async () => {
    const { store, setLastEventId } = fakeStore();
    await processRawEvent({ ...sub, Seq: undefined, Id: undefined }, store, new Map());
    expect(setLastEventId).not.toHaveBeenCalled();
  });

  it("caches a lineup snapshot on a lineups beat", async () => {
    const { store, writeLineup } = fakeStore();
    const lineups = new Map<number, LineupSnapshot>();
    await processRawEvent(rawLineups as RawEvent, store, lineups);
    expect(writeLineup).toHaveBeenCalledTimes(1);
    expect(lineups.get(17588325)).toBeDefined();
  });

  it("applies player-data updates against a previously cached lineup", async () => {
    const { store, writeLineup } = fakeStore();
    const lineups = new Map<number, LineupSnapshot>();
    await processRawEvent(rawLineups as RawEvent, store, lineups); // seed cache
    writeLineup.mockClear();
    await processRawEvent(
      { FixtureId: 17588325, Action: "players_on_the_pitch", Data: { Players: [{ PlayerId: 279394 }] } },
      store,
      lineups,
    );
    expect(writeLineup).toHaveBeenCalledTimes(1);
    const onPitch = lineups.get(17588325)?.teams.flatMap((t) => t.players).find((p) => p.id === 279394)?.onPitch;
    expect(onPitch).toBe(true);
  });

  it("surfaces a configured terminal action as a terminal status event (Finding #1)", async () => {
    const { store } = fakeStore();
    const events = await processRawEvent(
      { FixtureId: 1, Action: "abandoned" },
      store,
      new Map(),
      new Set(["abandoned", "game_finalised"]),
    );
    expect(events).toEqual([expect.objectContaining({ type: "status", action: "abandoned", terminal: true })]);
  });
});
