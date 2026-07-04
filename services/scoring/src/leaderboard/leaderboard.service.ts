import {
  KIND_COMBO,
  KIND_IN,
  KIND_OUT,
  KIND_SCORE,
  type LeaderboardEntry,
  type LeaderboardOutput,
  type Prediction,
  type Substitution,
} from "./leaderboard.schema.js";

const VALIDITY_LEAD_MINUTES = 5;

/** Points for an exact scoreline vs a correct outcome only. */
const SCORE_EXACT_POINTS = 3;
const SCORE_OUTCOME_POINTS = 1;

/** Final scoreline: score1 = team1/Participant1 goals, score2 = team2. */
export interface FinalScore {
  score1: number;
  score2: number;
}

export interface ScoreInput {
  fixtureId: number;
  predictions: Prediction[];
  subs: Substitution[];
  final?: boolean;
  now?: number;
  /**
   * The 90-min full-time scoreline, known only once the match is terminal.
   * When absent, score predictions stay provisional (0 pts) — grading is
   * full-time only.
   */
  finalScore?: FinalScore;
}

function isValidPair(pred: Prediction, sub: Substitution): boolean {
  return sub.side === pred.side && pred.lockMinute <= sub.minute - VALIDITY_LEAD_MINUTES;
}

function outcome(a: number, b: number): number {
  return Math.sign(a - b);
}

/**
 * Tiered final-score grading: exact scoreline = 3 pts, correct outcome
 * (W/D/L) only = 1 pt, otherwise 0. Provisional (no final score yet) = 0.
 */
function scoreScorePrediction(pred: Prediction, finalScore: FinalScore | undefined): number {
  if (!finalScore) return 0;
  const pred1 = pred.outPlayerId;
  const pred2 = pred.inPlayerId;
  if (pred1 === finalScore.score1 && pred2 === finalScore.score2) return SCORE_EXACT_POINTS;
  if (outcome(pred1, pred2) === outcome(finalScore.score1, finalScore.score2)) {
    return SCORE_OUTCOME_POINTS;
  }
  return 0;
}

function scorePrediction(
  pred: Prediction,
  subs: Substitution[],
  finalScore: FinalScore | undefined,
): number {
  if (pred.kind === KIND_SCORE) return scoreScorePrediction(pred, finalScore);

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
  const { fixtureId, predictions, subs, finalScore } = input;

  const byOwner = new Map<string, LeaderboardEntry>();
  for (const pred of predictions) {
    const points = scorePrediction(pred, subs, finalScore);
    const entry = byOwner.get(pred.owner) ?? {
      owner: pred.owner,
      points: 0,
      earliestScoringLockMinute: null,
      predictions: [],
    };
    entry.points += points;
    entry.predictions.push({
      kind: pred.kind,
      points,
      side: pred.side,
      outPlayerId: pred.outPlayerId,
      inPlayerId: pred.inPlayerId,
    });
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
