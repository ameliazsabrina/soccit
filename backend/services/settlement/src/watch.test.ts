import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import type { KeeperDeps, SettlementResult } from "./keeper.js";
import type { LeaderboardPayload } from "./leaderboard.js";
import {
  attemptSettlement,
  fixtureIdFromLeaderboardKey,
  isSettleable,
  recordOutcome,
  LEADERBOARD_PATTERN,
  type SettlementGuardState,
} from "./watch.js";

describe("leaderboard discovery", () => {
  it("uses a Redis pattern for all leaderboard channels", () => {
    expect(LEADERBOARD_PATTERN).toBe("leaderboard:*");
  });

  it("extracts fixture ids from leaderboard keys", () => {
    expect(fixtureIdFromLeaderboardKey("leaderboard:17926594")).toBe(17926594);
  });

  it("rejects non-leaderboard or invalid keys", () => {
    expect(fixtureIdFromLeaderboardKey("events:17926594")).toBeNull();
    expect(fixtureIdFromLeaderboardKey("leaderboard:not-a-number")).toBeNull();
    expect(fixtureIdFromLeaderboardKey("leaderboard:0")).toBeNull();
  });
});

const FIXTURE = 17926593;
const emptyState = (): SettlementGuardState => ({ completed: new Set(), inFlight: new Set() });
const payload = (over: Partial<LeaderboardPayload> = {}): LeaderboardPayload => ({
  fixtureId: FIXTURE,
  updatedAt: 1,
  final: true,
  winners: [null, null, null],
  ...over,
});

describe("isSettleable — premature & duplicate settlement guard", () => {
  it("blocks a non-final leaderboard (no premature settlement)", () => {
    expect(isSettleable(payload({ final: false }), emptyState())).toBe(false);
  });

  it("allows a final leaderboard for an untouched fixture", () => {
    expect(isSettleable(payload(), emptyState())).toBe(true);
  });

  it("blocks a fixture that already completed", () => {
    expect(isSettleable(payload(), { completed: new Set([FIXTURE]), inFlight: new Set() })).toBe(false);
  });

  it("blocks a fixture with an attempt already in flight", () => {
    expect(isSettleable(payload(), { completed: new Set(), inFlight: new Set([FIXTURE]) })).toBe(false);
  });
});

describe("recordOutcome", () => {
  it("marks completed when settled", () => {
    const completed = new Set<number>();
    recordOutcome(FIXTURE, { settled: true, sig: "s" }, completed);
    expect(completed.has(FIXTURE)).toBe(true);
  });

  it("marks completed on a non-retryable result (e.g. already settled on-chain)", () => {
    const completed = new Set<number>();
    recordOutcome(FIXTURE, { settled: false, retry: false }, completed);
    expect(completed.has(FIXTURE)).toBe(true);
  });

  it("leaves a retryable failure open for a later signal", () => {
    const completed = new Set<number>();
    recordOutcome(FIXTURE, { settled: false, retry: true }, completed);
    expect(completed.has(FIXTURE)).toBe(false);
  });
});

const fakeDeps = (): KeeperDeps =>
  ({ programId: PublicKey.unique(), platformWallet: PublicKey.unique() }) as unknown as KeeperDeps;

describe("attemptSettlement", () => {
  it("does not settle a non-final leaderboard", async () => {
    const settle = vi.fn();
    await attemptSettlement(settle, fakeDeps(), payload({ final: false }), emptyState());
    expect(settle).not.toHaveBeenCalled();
  });

  it("does not re-settle a completed fixture", async () => {
    const settle = vi.fn();
    const state: SettlementGuardState = { completed: new Set([FIXTURE]), inFlight: new Set() };
    await attemptSettlement(settle, fakeDeps(), payload(), state);
    expect(settle).not.toHaveBeenCalled();
  });

  it("settles once and records the outcome on success", async () => {
    const settle = vi.fn(async (): Promise<SettlementResult> => ({ settled: true, sig: "sig" }));
    const state = emptyState();
    await attemptSettlement(settle, fakeDeps(), payload(), state);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(state.completed.has(FIXTURE)).toBe(true);
    expect(state.inFlight.has(FIXTURE)).toBe(false);
  });

  it("two concurrent signals for the same fixture settle only once (in-flight guard)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const settle = vi.fn(async (): Promise<SettlementResult> => {
      await gate;
      return { settled: true, sig: "sig" };
    });
    const state = emptyState();
    const p = payload();
    const first = attemptSettlement(settle, fakeDeps(), p, state);
    const second = attemptSettlement(settle, fakeDeps(), p, state);
    release();
    await Promise.all([first, second]);
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("a retryable failure leaves the fixture open and clears in-flight", async () => {
    const settle = vi.fn(async (): Promise<SettlementResult> => ({ settled: false, retry: true }));
    const state = emptyState();
    await attemptSettlement(settle, fakeDeps(), payload(), state);
    expect(state.completed.has(FIXTURE)).toBe(false);
    expect(state.inFlight.has(FIXTURE)).toBe(false);
    // a later signal can try again
    await attemptSettlement(settle, fakeDeps(), payload(), state);
    expect(settle).toHaveBeenCalledTimes(2);
  });

  it("swallows a thrown error, clears in-flight, and stays retryable", async () => {
    const settle = vi.fn(async (): Promise<SettlementResult> => {
      throw new Error("rpc down");
    });
    const state = emptyState();
    await expect(attemptSettlement(settle, fakeDeps(), payload(), state)).resolves.toBeUndefined();
    expect(state.completed.has(FIXTURE)).toBe(false);
    expect(state.inFlight.has(FIXTURE)).toBe(false);
  });
});
