export type Side = 1 | 2;

interface Base {
  fixtureId: number;
  eventId?: string;
  ts?: number;
  seq?: number;
}

export interface SubstitutionEvent extends Base {
  type: "substitution";
  side: Side;
  playerOutId: number;
  playerInId: number;
  minute: number;
}

export interface GoalEvent extends Base {
  type: "goal";
  side: Side;
  playerId?: number;
  goalType?: string;
  minute?: number;
}

export interface StatusChangeEvent extends Base {
  type: "status";
  action: string;
  statusId?: number;
  terminal: boolean;
}

export interface RedCardEvent extends Base {
  type: "red_card";
  side: Side;
  playerId?: number;
  minute?: number;
}

export type DomainEvent =
  | SubstitutionEvent
  | GoalEvent
  | StatusChangeEvent
  | RedCardEvent;

export function isSubstitution(e: DomainEvent): e is SubstitutionEvent {
  return e.type === "substitution";
}
