import type { EventEntry, ResolvedPlayer } from "./api";

export type MatchEventPayload = {
  action?: string;
  eventId?: string | number;
  fixtureId?: number;
  goalType?: string;
  goals1?: number;
  goals2?: number;
  minute?: number;
  playerId?: number;
  playerInId?: number;
  playerOutId?: number;
  seq?: number;
  side?: 1 | 2;
  statusId?: number;
  terminal?: boolean;
  ts?: number;
  type?: string;
};

export type MatchEventContext = {
  homeTeamName: string;
  awayTeamName: string;
  players: Array<Pick<ResolvedPlayer, "id" | "name" | "side">>;
};

export type MatchEventPresentation = {
  detail: string | null;
  headline: string;
  minute: number | null;
  side: 1 | 2 | null;
  teamName: string | null;
  title: string;
};

export function eventPayload(entry: EventEntry): MatchEventPayload {
  return (entry.payload ?? {}) as MatchEventPayload;
}

export function formatPlayerName(name: string): string {
  const [lastName, ...givenNames] = name.split(",").map((part) => part.trim());
  if (givenNames.length === 0) return name;
  return `${givenNames.join(" ")} ${lastName}`.trim();
}

function eventRichness(entry: EventEntry): number {
  const payload = eventPayload(entry);
  const populatedPayloadFields = Object.values(payload).filter(
    (value) => value !== null && value !== undefined && value !== "",
  ).length;
  const resolvedPlayers = Number(Boolean(entry.players?.in)) + Number(Boolean(entry.players?.out));
  return populatedPayloadFields + resolvedPlayers * 4;
}

function eventOrder(entry: EventEntry): number {
  const payload = eventPayload(entry);
  return payload.seq ?? payload.ts ?? (Number.parseInt(entry.id, 10) || 0);
}

/**
 * TxLINE emits progressive updates for the same sports event. Collapse those
 * records by eventId and keep the richest/latest version so one goal or card is
 * not rendered multiple times.
 */
export function normalizeMatchEvents(
  events: EventEntry[],
  options: { terminal?: boolean } = {},
): EventEntry[] {
  const byStableId = new Map<string, EventEntry>();

  for (const entry of events) {
    const payload = eventPayload(entry);
    const stableId = payload.eventId
      ? `${entry.type}:${payload.eventId}`
      : `${entry.type}:${entry.id}`;
    const current = byStableId.get(stableId);
    if (
      !current ||
      eventRichness(entry) > eventRichness(current) ||
      (eventRichness(entry) === eventRichness(current) &&
        eventOrder(entry) > eventOrder(current))
    ) {
      byStableId.set(stableId, entry);
    }
  }

  return [...byStableId.values()]
    .filter((entry) => {
      if (!options.terminal || entry.type !== "goal") return true;
      const payload = eventPayload(entry);
      // Settled feeds occasionally retain a bare goal snapshot that never
      // receives scorer details (for example, a subsequently disallowed goal).
      return payload.playerId != null || entry.players?.in != null;
    })
    .sort((a, b) => eventOrder(b) - eventOrder(a));
}

function statusTitle(payload: MatchEventPayload): string {
  if (payload.action === "halftime_finalised") return "Half-time confirmed";
  if (payload.action === "game_finalised" || payload.terminal) return "Result confirmed";

  switch (payload.statusId) {
    case 2:
      return "Match started";
    case 3:
      return "Half-time";
    case 4:
      return "Second half started";
    case 6:
      return "Regulation ended";
    case 7:
      return "Extra time started";
    case 8:
      return "Extra-time interval";
    case 9:
      return "Extra time resumed";
    case 10:
      return "Extra time ended";
    case 100:
      return "Result confirmed";
    default:
      return "Match update";
  }
}

function scoreLine(payload: MatchEventPayload, context: MatchEventContext): string | null {
  if (payload.goals1 == null || payload.goals2 == null) return null;
  return `${context.homeTeamName} ${payload.goals1}–${payload.goals2} ${context.awayTeamName}`;
}

function teamForSide(side: 1 | 2 | null, context: MatchEventContext): string | null {
  if (side === 1) return context.homeTeamName;
  if (side === 2) return context.awayTeamName;
  return null;
}

export function describeMatchEvent(
  entry: EventEntry,
  context: MatchEventContext,
): MatchEventPresentation {
  const payload = eventPayload(entry);
  const payloadPlayer = payload.playerId == null
    ? null
    : context.players.find((player) => player.id === payload.playerId) ?? null;
  const resolvedPlayer = payloadPlayer ?? entry.players?.in ?? entry.players?.out ?? null;
  // Player membership is more reliable than payload.side for the sampled goal
  // feeds, where the side value can disagree with the scorer's lineup team.
  const side = resolvedPlayer?.side ?? payload.side ?? null;
  const teamName = teamForSide(side, context);
  const minute = payload.minute ?? null;

  if (entry.type === "goal") {
    const scorer = resolvedPlayer ? formatPlayerName(resolvedPlayer.name) : null;
    return {
      title: "Goal",
      headline: scorer ?? (teamName ? `${teamName} score` : "Goal recorded"),
      detail: [teamName, payload.goalType].filter(Boolean).join(" · ") || null,
      minute,
      side,
      teamName,
    };
  }

  if (entry.type === "substitution") {
    const playerOut = entry.players?.out
      ? formatPlayerName(entry.players.out.name)
      : "Player out";
    const playerIn = entry.players?.in
      ? formatPlayerName(entry.players.in.name)
      : "Player in";
    return {
      title: "Substitution",
      headline: `${playerOut} → ${playerIn}`,
      detail: teamName,
      minute,
      side,
      teamName,
    };
  }

  if (entry.type === "red_card" || entry.type === "yellow_card") {
    return {
      title: entry.type === "red_card" ? "Red card" : "Yellow card",
      headline: resolvedPlayer
        ? formatPlayerName(resolvedPlayer.name)
        : teamName
          ? `${teamName} player`
          : "Player unavailable",
      detail: teamName,
      minute,
      side,
      teamName,
    };
  }

  if (entry.type === "status") {
    const title = statusTitle(payload);
    const score = scoreLine(payload, context);
    return {
      title,
      headline: score ?? `${context.homeTeamName} vs ${context.awayTeamName}`,
      detail: null,
      minute,
      side: null,
      teamName: null,
    };
  }

  const fallbackTitle = entry.type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    title: fallbackTitle,
    headline: teamName ? `${teamName} update` : "Match update",
    detail: null,
    minute,
    side,
    teamName,
  };
}
