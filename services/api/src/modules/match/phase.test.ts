import { describe, expect, it } from "vitest";
import type { LiveMatch, OnchainMatch } from "./match.schema.js";
import {
  ENTRY_LEAD_SECS,
  derivePhase,
  isEntryWindowOpen,
  isInPlay,
  liveForOutput,
} from "./phase.js";

const KO = 1_783_803_600; // a real kickoff time (unix SECONDS)

function onchain(overrides: Partial<OnchainMatch> = {}): OnchainMatch {
  return {
    status: 0, // STATUS_OPEN
    statusLabel: "OPEN",
    settled: false,
    entryFee: "1000000",
    poolTotal: "0",
    participantCount: 0,
    startTime: KO,
    team1Id: 1,
    team2Id: 2,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [null, null, null],
    ...overrides,
  };
}

function live(overrides: Partial<LiveMatch> = {}): LiveMatch {
  return {
    statusId: null,
    minute: null,
    goals: { team1: 0, team2: 0 },
    ts: null,
    ...overrides,
  };
}

describe("isInPlay", () => {
  it("false for null (no feed hash)", () => {
    expect(isInPlay(null)).toBe(false);
  });

  it.each([2, 3, 4])("true for in-play statusId %i", (statusId) => {
    expect(isInPlay(live({ statusId }))).toBe(true);
  });

  it("false for a pre-kickoff statusId with no clock", () => {
    // The landmine from the plan: a stale pre-KO feed write (statusId 1/null,
    // minute null, goals 0-0, stale ts) must NOT read as in-play.
    expect(isInPlay(live({ statusId: 1 }))).toBe(false);
    expect(isInPlay(live({ statusId: null, ts: 1_783_465_737_802 }))).toBe(
      false,
    );
  });

  it("true when the clock is running even without an in-play statusId", () => {
    expect(isInPlay(live({ statusId: null, minute: 12 }))).toBe(true);
  });

  it("false at minute 0 (kickoff not counted until it ticks)", () => {
    expect(isInPlay(live({ minute: 0 }))).toBe(false);
  });
});

describe("isEntryWindowOpen (shared KO−10min gate)", () => {
  it("open forever when startTime is 0 (gate disabled)", () => {
    expect(isEntryWindowOpen(0, 0)).toBe(true);
  });

  it("closed just before KO−10min", () => {
    expect(isEntryWindowOpen(KO, KO - ENTRY_LEAD_SECS - 1)).toBe(false);
  });

  it("opens exactly at KO−10min and stays open through KO", () => {
    expect(isEntryWindowOpen(KO, KO - ENTRY_LEAD_SECS)).toBe(true);
    expect(isEntryWindowOpen(KO, KO)).toBe(true);
  });
});

describe("derivePhase", () => {
  it("SETTLED when on-chain settled (even if the feed still shows in-play)", () => {
    expect(
      derivePhase(onchain({ settled: true, status: 2 }), live({ statusId: 4 }), KO),
    ).toBe("SETTLED");
  });

  it("RESOLVED when on-chain resolved but not settled", () => {
    expect(
      derivePhase(onchain({ status: 1, statusLabel: "RESOLVED" }), live({ statusId: 4 }), KO),
    ).toBe("RESOLVED");
  });

  it("LIVE when the feed shows in-play and on-chain is still OPEN", () => {
    expect(derivePhase(onchain(), live({ statusId: 2, minute: 5 }), KO)).toBe(
      "LIVE",
    );
  });

  it("UPCOMING before the entry window (announced early)", () => {
    // now is well before KO−10min → entries not open yet.
    expect(derivePhase(onchain(), null, KO - 6 * 3600)).toBe("UPCOMING");
  });

  it("OPEN once inside the entry window but not yet kicked off", () => {
    expect(derivePhase(onchain(), null, KO - ENTRY_LEAD_SECS)).toBe("OPEN");
    expect(derivePhase(onchain(), null, KO)).toBe("OPEN");
  });

  it("flips UPCOMING→OPEN at the exact same instant the entry gate opens", () => {
    const justBefore = KO - ENTRY_LEAD_SECS - 1;
    const atOpen = KO - ENTRY_LEAD_SECS;
    expect(derivePhase(onchain(), null, justBefore)).toBe("UPCOMING");
    expect(isEntryWindowOpen(KO, justBefore)).toBe(false);
    expect(derivePhase(onchain(), null, atOpen)).toBe("OPEN");
    expect(isEntryWindowOpen(KO, atOpen)).toBe(true);
  });

  it("OPEN whenever startTime is 0 (gate disabled)", () => {
    expect(derivePhase(onchain({ startTime: 0 }), null, 0)).toBe("OPEN");
  });

  it("returns null for a live-only fixture (no on-chain account) that is not in-play", () => {
    expect(derivePhase(null, live(), KO)).toBeNull();
  });

  it("LIVE for a live-only fixture that is in-play", () => {
    expect(derivePhase(null, live({ statusId: 4 }), KO)).toBe("LIVE");
  });

  it("does NOT confuse the ms `ts` with seconds `startTime` (the ~1000× trap)", () => {
    // Reproduces the reported live data: OPEN match kicking off ~6h out, with a
    // stale ms `ts` on the hash. Must be UPCOMING, never LIVE.
    const nowSecs = KO - 6 * 3600;
    const stale = live({ statusId: null, minute: null, ts: 1_783_465_737_802 });
    expect(derivePhase(onchain(), stale, nowSecs)).toBe("UPCOMING");
    expect(liveForOutput(stale)).toBeNull();
  });
});

describe("liveForOutput", () => {
  it("nulls a not-in-play live payload so it can't be misread", () => {
    expect(liveForOutput(live({ statusId: 1, ts: 1_783_465_737_802 }))).toBeNull();
    expect(liveForOutput(null)).toBeNull();
  });

  it("passes through a real in-play payload untouched", () => {
    const l = live({ statusId: 4, minute: 67, goals: { team1: 2, team2: 1 } });
    expect(liveForOutput(l)).toBe(l);
  });
});
