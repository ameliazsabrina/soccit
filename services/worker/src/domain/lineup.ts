import type { RawEvent } from "../txline/types.js";

export interface LineupRosterPlayer {
  id: number;
  name: string;
  number: string | null;
  starter: boolean;
  positionId: number | null;
}

export interface LineupTeamRoster {
  side: 1 | 2;
  teamId: number;
  teamName: string | null;
  players: LineupRosterPlayer[];
}

export interface LineupSnapshot {
  fixtureId: number;
  updatedAt: number;
  teams: LineupTeamRoster[];
  names: Record<string, string>;
}

function sideForTeam(teamId: number, raw: RawEvent): 1 | 2 | null {
  if (teamId === raw.Participant1Id) return 1;
  if (teamId === raw.Participant2Id) return 2;
  return null;
}

export function extractLineup(raw: RawEvent): LineupSnapshot | null {
  if (raw.Action !== "lineups" || !raw.Lineups || raw.Lineups.length === 0) return null;

  const teams: LineupTeamRoster[] = [];
  const names: Record<string, string> = {};

  for (const team of raw.Lineups) {
    if (team.normativeId == null) continue;
    const side = sideForTeam(team.normativeId, raw);
    if (side === null) continue;

    const players: LineupRosterPlayer[] = [];
    for (const row of team.lineups ?? []) {
      const id = row.player?.normativeId;
      if (id == null) continue;
      const name = row.player?.preferredName ?? "";
      players.push({
        id,
        name,
        number: row.rosterNumber ?? null,
        starter: row.starter ?? false,
        positionId: row.positionId ?? null,
      });
      if (name) names[String(id)] = name;
    }

    teams.push({ side, teamId: team.normativeId, teamName: team.preferredName ?? null, players });
  }

  if (teams.length === 0) return null;

  return { fixtureId: raw.FixtureId, updatedAt: raw.Ts ?? Date.now(), teams, names };
}
