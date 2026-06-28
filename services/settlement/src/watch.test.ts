import { describe, expect, it } from "vitest";
import { fixtureIdFromLeaderboardKey, LEADERBOARD_PATTERN } from "./watch.js";

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
