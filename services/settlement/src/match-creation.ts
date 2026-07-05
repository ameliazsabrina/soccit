/**
 * Pure helpers for the match-creation keeper: which upcoming fixtures should
 * have an on-chain game-room pre-created, so each room is entry-able 10 minutes
 * before kickoff (the on-chain gate does the actual opening).
 */

/** A fixture as returned by the API `GET /api/schedule`. `startTime` is epoch ms. */
export interface ScheduleFixture {
  fixtureId: number;
  startTime: number | null;
  team1: { id: number | null; name: string | null };
  team2: { id: number | null; name: string | null };
}

export interface UpcomingMatch {
  fixtureId: number;
  team1Id: number;
  team2Id: number;
  /** Kickoff time in unix SECONDS (converted from the feed's ms). */
  startTimeSecs: number;
}

/**
 * Fixtures whose room should exist now: kicking off within `lookaheadSecs`, and
 * not already well past kickoff. `nowSecs`/`lookaheadSecs` are unix seconds; the
 * feed's `startTime` is ms, so it is divided by 1000 here.
 *
 * A small grace of ENTRY_LEAD_SECS past kickoff is kept so a keeper that runs a
 * touch late still creates a room that is (correctly) already open in-play.
 */
export function selectUpcoming(
  fixtures: ScheduleFixture[],
  nowSecs: number,
  lookaheadSecs: number,
  graceSecs = 600,
): UpcomingMatch[] {
  const out: UpcomingMatch[] = [];
  for (const f of fixtures) {
    if (f.startTime == null || f.team1.id == null || f.team2.id == null) continue;
    const startTimeSecs = Math.floor(f.startTime / 1000);
    if (startTimeSecs < nowSecs - graceSecs) continue; // kicked off too long ago
    if (startTimeSecs > nowSecs + lookaheadSecs) continue; // too far out
    out.push({
      fixtureId: f.fixtureId,
      team1Id: f.team1.id,
      team2Id: f.team2.id,
      startTimeSecs,
    });
  }
  return out;
}
