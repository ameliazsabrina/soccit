import {
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
} from "../../onchain/program.js";
import type { LiveMatch, OnchainMatch } from "./match.schema.js";

export const MATCH_PHASES = [
  "UPCOMING",
  "OPEN",
  "LIVE",
  "FINISHED",
  "RESOLVED",
  "SETTLED",
] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];

export const ENTRY_LEAD_SECS = 600;

export function isEntryWindowOpen(startTime: number, nowSecs: number): boolean {
  if (startTime === 0) return true;
  return nowSecs >= startTime - ENTRY_LEAD_SECS;
}

export const IN_PLAY_STATUS_IDS = new Set<number>([2, 3, 4]);

export function isInPlay(live: LiveMatch | null): boolean {
  if (!live) return false;
  if (live.statusId != null && IN_PLAY_STATUS_IDS.has(live.statusId)) {
    return true;
  }
  return live.minute != null && live.minute > 0;
}

export function derivePhase(
  onchain: OnchainMatch,
  live: LiveMatch | null,
  nowSecs: number,
): MatchPhase;
export function derivePhase(
  onchain: OnchainMatch | null,
  live: LiveMatch | null,
  nowSecs: number,
): MatchPhase | null;
export function derivePhase(
  onchain: OnchainMatch | null,
  live: LiveMatch | null,
  nowSecs: number,
): MatchPhase | null {
  if (onchain?.settled || onchain?.status === STATUS_SETTLED) return "SETTLED";
  if (onchain?.status === STATUS_RESOLVED) return "RESOLVED";
  if (live?.terminal) return "FINISHED";
  if (isInPlay(live)) return "LIVE";
  if (!onchain) return null;
  if (onchain.status === STATUS_OPEN) {
    return isEntryWindowOpen(onchain.startTime, nowSecs) ? "OPEN" : "UPCOMING";
  }
  // Unknown on-chain status and not in play — treat as open-for-predictions.
  return "OPEN";
}

export function liveForOutput(live: LiveMatch | null): LiveMatch | null {
  return isInPlay(live) ? live : null;
}

const TERMINAL_PHASES = new Set<MatchPhase>([
  "FINISHED",
  "RESOLVED",
  "SETTLED",
]);

export function finalScoreForOutput(
  live: LiveMatch | null,
  phase: MatchPhase | null,
): { team1: number; team2: number } | null {
  if (phase == null || !TERMINAL_PHASES.has(phase)) return null;
  if (!live) return null;
  return { team1: live.goals.team1, team2: live.goals.team2 };
}
