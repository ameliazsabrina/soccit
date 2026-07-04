import { matchMinute, type RawEvent } from "../txline/types.js";
import type { DomainEvent, Side } from "./events.js";

export interface NormalizeOptions {
  terminalActions?: Set<string>;
}

const DEFAULT_TERMINAL = new Set(["game_finalised"]);

const STATUS_ACTIONS = new Set([
  "status",
  "halftime_finalised",
  "game_finalised",
]);

function toSide(participant: number | undefined): Side | undefined {
  if (participant === 1 || participant === 2) return participant;
  return undefined;
}

export function normalize(
  raw: RawEvent,
  opts: NormalizeOptions = {},
): DomainEvent[] {
  const terminal = opts.terminalActions ?? DEFAULT_TERMINAL;
  const events: DomainEvent[] = [];

  const base = {
    fixtureId: raw.FixtureId,
    eventId: raw.Id != null ? String(raw.Id) : undefined,
    ts: raw.Ts,
    seq: raw.Seq,
  };

  const action = raw.Action;
  const d = raw.Data;
  const side = toSide(d?.Participant);
  const minute = matchMinute(raw);

  switch (action) {
    case "substitution":
      if (side && d?.PlayerInId && d?.PlayerOutId) {
        events.push({
          type: "substitution",
          ...base,
          side,
          playerOutId: d.PlayerOutId,
          playerInId: d.PlayerInId,
          minute: minute ?? 0,
        });
      }
      break;

    case "goal":
      events.push({
        type: "goal",
        ...base,
        side: side ?? 1,
        playerId: d?.PlayerId,
        goalType: d?.GoalType,
        minute,
      });
      break;

    case "red_card":
      events.push({
        type: "red_card",
        ...base,
        side: side ?? 1,
        playerId: d?.PlayerId,
        minute,
      });
      break;
  }

  if (action && (STATUS_ACTIONS.has(action) || terminal.has(action))) {
    const stats = raw.Stats;
    events.push({
      type: "status",
      ...base,
      action,
      statusId: d?.StatusId ?? raw.StatusId,
      terminal: terminal.has(action),
      goals1: stats?.["1"],
      goals2: stats?.["2"],
    });
  }

  return events;
}

export function isTerminal(
  raw: RawEvent,
  terminalActions = DEFAULT_TERMINAL,
): boolean {
  return raw.Action != null && terminalActions.has(raw.Action);
}
