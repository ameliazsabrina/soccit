import {
  KIND_COMBO,
  KIND_IN,
  KIND_OUT,
  type LeaderboardEntry,
  type LeaderboardOutput,
  type Prediction,
  type Substitution,
} from "./leaderboard.schema.js";

const VALIDITY_LEAD_MINUTES = 5;

export interface ScoreInput {
  fixtureId: number;
  predictions: Prediction[];
  subs: Substitution[];
  final?: boolean;
  now?: number;
}

function isValidPair(pred: Prediction, sub: Substitution): boolean {
  return sub.side === pred.side && pred.lockMinute <= sub.minute - VALIDITY_LEAD_MINUTES;
}

function scorePrediction(pred: Prediction, subs: Substitution[]): number {
  const valid = subs.filter((s) => isValidPair(pred, s));
  const outHit = valid.some((s) => s.playerOutId === pred.outPlayerId);
  const inHit = valid.some((s) => s.playerInId === pred.inPlayerId);

  if (pred.kind === KIND_OUT) return outHit ? 1 : 0;
  if (pred.kind === KIND_IN) return inHit ? 1 : 0;
  if (pred.kind === KIND_COMBO) {
    return (outHit ? 1 : 0) + (inHit ? 1 : 0) + (outHit && inHit ? 1 : 0);
  }
  return 0;
}

function rankEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.points !== a.points) return b.points - a.points;
  const aMin = a.earliestScoringLockMinute ?? Number.POSITIVE_INFINITY;
  const bMin = b.earliestScoringLockMinute ?? Number.POSITIVE_INFINITY;
  if (aMin !== bMin) return aMin - bMin;
  return a.owner < b.owner ? -1 : a.owner > b.owner ? 1 : 0;
}

export function score(input: ScoreInput): LeaderboardOutput {
  const { fixtureId, predictions, subs } = input;

  const byOwner = new Map<string, LeaderboardEntry>();
  for (const pred of predictions) {
    const points = scorePrediction(pred, subs);
    const entry = byOwner.get(pred.owner) ?? {
      owner: pred.owner,
      points: 0,
      earliestScoringLockMinute: null,
      predictions: [],
    };
    entry.points += points;
    entry.predictions.push({ kind: pred.kind, points });
    if (points > 0) {
      entry.earliestScoringLockMinute =
        entry.earliestScoringLockMinute == null
          ? pred.lockMinute
          : Math.min(entry.earliestScoringLockMinute, pred.lockMinute);
    }
    byOwner.set(pred.owner, entry);
  }

  const ranking = [...byOwner.values()].sort(rankEntries);
  const podium = ranking.filter((e) => e.points > 0).slice(0, 3);
  const winners: LeaderboardOutput["winners"] = [
    podium[0]?.owner ?? null,
    podium[1]?.owner ?? null,
    podium[2]?.owner ?? null,
  ];

  return {
    fixtureId,
    updatedAt: input.now ?? Date.now(),
    final: input.final ?? false,
    ranking,
    winners,
  };
}
