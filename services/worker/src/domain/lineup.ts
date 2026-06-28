import type { RawEvent } from "../txline/types.js";

export interface LineupRosterPlayer {
  id: number;
  name: string;
  number: string | null;
  starter: boolean;
  positionId: number | null;
  onPitch?: boolean | null;
  warmingUp?: boolean | null;
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

function dataRecord(raw: RawEvent): Record<string, unknown> {
  return (raw.Data ?? {}) as Record<string, unknown>;
}

function idFromValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  for (const key of ["PlayerId", "playerId", "normativeId", "id", "Id"]) {
    if (typeof row[key] === "number") return row[key];
  }
  const player = row.player;
  if (player && typeof player === "object") {
    const nested = player as Record<string, unknown>;
    if (typeof nested.normativeId === "number") return nested.normativeId;
  }
  return null;
}

function playerIds(raw: RawEvent): number[] {
  const d = dataRecord(raw);
  const ids = new Set<number>();
  for (const key of ["PlayerId", "PlayerIds", "Players", "players", "PlayersOnThePitch", "WarmingUp"]) {
    const value = d[key];
    if (Array.isArray(value)) {
      for (const row of value) {
        const id = idFromValue(row);
        if (id != null) ids.add(id);
      }
    } else {
      const id = idFromValue(value);
      if (id != null) ids.add(id);
    }
  }
  return [...ids];
}

function jerseyNumber(raw: RawEvent): string | null {
  const d = dataRecord(raw);
  for (const key of ["JerseyNumber", "RosterNumber", "Number", "jerseyNumber", "rosterNumber"]) {
    const value = d[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
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
        onPitch: row.starter ?? false,
        warmingUp: false,
      });
      if (name) names[String(id)] = name;
    }

    teams.push({ side, teamId: team.normativeId, teamName: team.preferredName ?? null, players });
  }

  if (teams.length === 0) return null;

  return { fixtureId: raw.FixtureId, updatedAt: raw.Ts ?? Date.now(), teams, names };
}

export function applyPlayerData(snap: LineupSnapshot, raw: RawEvent): LineupSnapshot | null {
  if (!["players_on_the_pitch", "players_warming_up", "jersey"].includes(raw.Action ?? "")) return null;

  const ids = playerIds(raw);
  if (ids.length === 0) return null;

  const onPitch = raw.Action === "players_on_the_pitch" ? new Set(ids) : null;
  const warming = raw.Action === "players_warming_up" ? new Set(ids) : null;
  const jersey = raw.Action === "jersey" ? jerseyNumber(raw) : null;
  let changed = false;

  const teams = snap.teams.map((team) => ({
    ...team,
    players: team.players.map((player) => {
      if (!ids.includes(player.id)) return player;
      const next = { ...player };
      if (onPitch) next.onPitch = onPitch.has(player.id);
      if (warming) next.warmingUp = warming.has(player.id);
      if (jersey) next.number = jersey;
      changed = true;
      return next;
    }),
  }));

  return changed ? { ...snap, updatedAt: raw.Ts ?? Date.now(), teams } : null;
}
