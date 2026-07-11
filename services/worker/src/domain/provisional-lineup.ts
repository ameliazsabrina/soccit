import type { Fixture } from "../txline/fixtures.js";
import type { LineupSnapshot, LineupTeamRoster } from "./lineup.js";

export function provisionalLineup(f: Fixture): LineupSnapshot | null {
  const teams: LineupTeamRoster[] = [];
  if (f.Participant1Id != null) {
    teams.push({
      side: 1,
      teamId: f.Participant1Id,
      teamName: f.Participant1 ?? null,
      players: [],
    });
  }
  if (f.Participant2Id != null) {
    teams.push({
      side: 2,
      teamId: f.Participant2Id,
      teamName: f.Participant2 ?? null,
      players: [],
    });
  }
  if (teams.length === 0) return null;

  return {
    fixtureId: f.FixtureId,
    updatedAt: Date.now(),
    teams,
    names: {},
  };
}
