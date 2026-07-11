import { describe, expect, it, vi } from "vitest";
import { latestRaw, reconcileFinalScores } from "./reconcile.js";
import type { Store } from "./store/index.js";
import type { TokenManager } from "./txline/auth.js";
import type { RawEvent } from "./txline/types.js";

function beat(fixtureId: number, goals1: number, goals2: number, ts: number): RawEvent {
  return { FixtureId: fixtureId, Ts: ts, Stats: { "1": goals1, "2": goals2 } };
}

function fakeStore(present: Set<number> = new Set()) {
  const persist = vi.fn(async () => {});
  const hasFixture = vi.fn(async (id: number) => present.has(id));
  const store = { persist, hasFixture } as unknown as Store;
  return { store, persist, hasFixture };
}

const tokens = {} as TokenManager;

describe("latestRaw", () => {
  it("returns null for an empty snapshot", () => {
    expect(latestRaw([])).toBeNull();
  });

  it("picks the beat with the highest Ts (the terminal scoreline)", () => {
    const snap = [beat(1, 0, 0, 100), beat(1, 3, 1, 300), beat(1, 2, 1, 200)];
    expect(latestRaw(snap)?.Stats).toEqual({ "1": 3, "2": 1 });
  });

  it("falls back to document order when Ts is absent", () => {
    const snap: RawEvent[] = [
      { FixtureId: 1, Stats: { "1": 1, "2": 0 } },
      { FixtureId: 1, Stats: { "1": 4, "2": 2 } },
    ];
    expect(latestRaw(snap)?.Stats).toEqual({ "1": 4, "2": 2 });
  });
});

describe("reconcileFinalScores", () => {
  it("backfills the terminal beat for a settled fixture with an empty hash", async () => {
    const { store, persist } = fakeStore(); // nothing present → hash is empty
    const snapshot = vi.fn(async () => [beat(10, 0, 0, 1), beat(10, 3, 1, 2)]);

    const repaired = await reconcileFinalScores({
      tokens,
      store,
      fetchTerminalIds: async () => [10],
      snapshot,
    });

    expect(repaired).toBe(1);
    expect(snapshot).toHaveBeenCalledWith(tokens, 10);
    // Persisted the latest beat with an empty event list (no cursor/stream writes).
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ Stats: { "1": 3, "2": 1 } }),
      [],
    );
  });

  it("skips fixtures whose hash already exists (idempotent, one-shot per fixture)", async () => {
    const { store, persist } = fakeStore(new Set([10]));
    const snapshot = vi.fn(async () => [beat(10, 3, 1, 2)]);

    const repaired = await reconcileFinalScores({
      tokens,
      store,
      fetchTerminalIds: async () => [10],
      snapshot,
    });

    expect(repaired).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not persist when the snapshot has no beats to source a score from", async () => {
    const { store, persist } = fakeStore();
    const repaired = await reconcileFinalScores({
      tokens,
      store,
      fetchTerminalIds: async () => [10],
      snapshot: async () => [],
    });
    expect(repaired).toBe(0);
    expect(persist).not.toHaveBeenCalled();
  });

  it("continues past a fixture whose snapshot fetch throws", async () => {
    const { store, persist } = fakeStore();
    const snapshot = vi.fn(async (_t: TokenManager, id: number) => {
      if (id === 10) throw new Error("snapshot 10 failed: 502");
      return [beat(id, 2, 0, 5)];
    });

    const repaired = await reconcileFinalScores({
      tokens,
      store,
      fetchTerminalIds: async () => [10, 20],
      snapshot,
    });

    expect(repaired).toBe(1); // 10 failed, 20 repaired
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ FixtureId: 20, Stats: { "1": 2, "2": 0 } }),
      [],
    );
  });

  it("does nothing when there are no terminal matches", async () => {
    const { store, persist } = fakeStore();
    const snapshot = vi.fn();
    const repaired = await reconcileFinalScores({
      tokens,
      store,
      fetchTerminalIds: async () => [],
      snapshot,
    });
    expect(repaired).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
});
