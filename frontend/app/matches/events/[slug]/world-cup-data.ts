import type {
  MatchSummary,
  WorldCupBracket as ApiWorldCupBracket,
  WorldCupMatch,
} from "../../../_lib/api";

export type BracketRoundKey =
  | "round_of_32"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "third_place"
  | "final";

export type BracketTeam = {
  name: string;
  code?: string;
};

export type BracketMatch = {
  id: string;
  matchNumber: number;
  round: BracketRoundKey;
  home: BracketTeam;
  away: BracketTeam;
  homeScore: number | null;
  awayScore: number | null;
  date: string | null;
  venue: string | null;
  pda?: string;
  status?: string;
};

export type BracketRounds = Record<BracketRoundKey, BracketMatch[]>;

export const ROUND_META: Array<{
  key: BracketRoundKey;
  shortLabel: string;
  label: string;
}> = [
  { key: "round_of_32", shortLabel: "R32", label: "Round of 32" },
  { key: "round_of_16", shortLabel: "R16", label: "Round of 16" },
  { key: "quarter", shortLabel: "QF", label: "Quarter-finals" },
  { key: "semi", shortLabel: "SF", label: "Semi-finals" },
  { key: "third_place", shortLabel: "Bronze", label: "Bronze final" },
  { key: "final", shortLabel: "Final", label: "Final" },
];

const SPAIN_ARGENTINA_PDA = "3APNEZMud1boavyxTyHyAAaoEkyxPKXuj5pr17b3yb8e";

function slot(name: string): BracketTeam {
  return { name };
}

function scheduledMatch(
  matchNumber: number,
  round: BracketRoundKey,
  home: string,
  away: string,
): BracketMatch {
  return {
    id: `match-${matchNumber}`,
    matchNumber,
    round,
    home: slot(home),
    away: slot(away),
    homeScore: null,
    awayScore: null,
    date: null,
    venue: null,
    status: "UPCOMING",
  };
}

// Official FIFA match numbering and progression. The R32 ordering is arranged
// by bracket branch rather than chronology so every pair feeds the card beside it.
export const FALLBACK_BRACKET: BracketRounds = {
  round_of_32: [
    scheduledMatch(74, "round_of_32", "Group E winner", "Best third-place team"),
    scheduledMatch(77, "round_of_32", "Group I winner", "Best third-place team"),
    scheduledMatch(73, "round_of_32", "Group A runner-up", "Group B runner-up"),
    scheduledMatch(75, "round_of_32", "Group F winner", "Group C runner-up"),
    scheduledMatch(83, "round_of_32", "Group K runner-up", "Group L runner-up"),
    scheduledMatch(84, "round_of_32", "Group H winner", "Group J runner-up"),
    scheduledMatch(81, "round_of_32", "Group D winner", "Best third-place team"),
    scheduledMatch(82, "round_of_32", "Group G winner", "Best third-place team"),
    scheduledMatch(76, "round_of_32", "Group C winner", "Group F runner-up"),
    scheduledMatch(78, "round_of_32", "Group E runner-up", "Group I runner-up"),
    scheduledMatch(79, "round_of_32", "Group A winner", "Best third-place team"),
    scheduledMatch(80, "round_of_32", "Group L winner", "Best third-place team"),
    scheduledMatch(86, "round_of_32", "Group J winner", "Group H runner-up"),
    scheduledMatch(88, "round_of_32", "Group D runner-up", "Group G runner-up"),
    scheduledMatch(85, "round_of_32", "Group B winner", "Best third-place team"),
    scheduledMatch(87, "round_of_32", "Group K winner", "Best third-place team"),
  ],
  round_of_16: [
    scheduledMatch(89, "round_of_16", "Winner match 74", "Winner match 77"),
    scheduledMatch(90, "round_of_16", "Winner match 73", "Winner match 75"),
    scheduledMatch(93, "round_of_16", "Winner match 83", "Winner match 84"),
    scheduledMatch(94, "round_of_16", "Winner match 81", "Winner match 82"),
    scheduledMatch(91, "round_of_16", "Winner match 76", "Winner match 78"),
    scheduledMatch(92, "round_of_16", "Winner match 79", "Winner match 80"),
    scheduledMatch(95, "round_of_16", "Winner match 86", "Winner match 88"),
    scheduledMatch(96, "round_of_16", "Winner match 85", "Winner match 87"),
  ],
  quarter: [
    scheduledMatch(97, "quarter", "Winner match 89", "Winner match 90"),
    scheduledMatch(98, "quarter", "Winner match 93", "Winner match 94"),
    scheduledMatch(99, "quarter", "Winner match 91", "Winner match 92"),
    scheduledMatch(100, "quarter", "Winner match 95", "Winner match 96"),
  ],
  semi: [
    scheduledMatch(101, "semi", "Winner match 97", "Winner match 98"),
    scheduledMatch(102, "semi", "Winner match 99", "Winner match 100"),
  ],
  third_place: [
    scheduledMatch(103, "third_place", "Loser match 101", "Loser match 102"),
  ],
  final: [
    {
      ...scheduledMatch(104, "final", "Spain", "Argentina"),
      home: { name: "Spain", code: "es" },
      away: { name: "Argentina", code: "ar" },
      date: "2026-07-19T19:00:00.000Z",
      venue: "New York New Jersey Stadium",
      pda: SPAIN_ARGENTINA_PDA,
      status: "OPEN",
    },
  ],
};

function cloneFallback(): BracketRounds {
  return Object.fromEntries(
    Object.entries(FALLBACK_BRACKET).map(([round, matches]) => [
      round,
      matches.map((match) => ({
        ...match,
        home: { ...match.home },
        away: { ...match.away },
      })),
    ]),
  ) as BracketRounds;
}

function cloneRounds(rounds: BracketRounds): BracketRounds {
  return Object.fromEntries(
    Object.entries(rounds).map(([round, matches]) => [
      round,
      matches.map((match) => ({
        ...match,
        home: { ...match.home },
        away: { ...match.away },
      })),
    ]),
  ) as BracketRounds;
}

function apiRound(round: WorldCupMatch["round"]): BracketRoundKey | null {
  if (round === "round_of_32") return "round_of_32";
  if (round === "round_of_16") return "round_of_16";
  if (round === "quarter") return "quarter";
  if (round === "semi") return "semi";
  if (round === "third_place") return "third_place";
  if (round === "final") return "final";
  return null;
}

export function mergeApiBracket(payload: ApiWorldCupBracket): BracketRounds {
  if (!Array.isArray(payload.knockout) || payload.knockout.length === 0) {
    throw new Error("The live bracket is not available yet.");
  }

  const merged = cloneFallback();
  const roundOffsets: Partial<Record<BracketRoundKey, number>> = {};

  for (const liveMatch of payload.knockout) {
    const round = apiRound(liveMatch.round);
    if (!round) continue;

    const candidates = merged[round];
    const fallbackIndex = roundOffsets[round] ?? 0;
    const matchNumber = liveMatch.matchNumber;
    const targetIndex = matchNumber
      ? candidates.findIndex((candidate) => candidate.matchNumber === matchNumber)
      : fallbackIndex;

    if (targetIndex < 0 || targetIndex >= candidates.length) continue;
    roundOffsets[round] = fallbackIndex + 1;

    const current = candidates[targetIndex];
    candidates[targetIndex] = {
      ...current,
      id: liveMatch.id || current.id,
      home: liveMatch.homeTeam
        ? { name: liveMatch.homeTeam, code: liveMatch.homeCode ?? undefined }
        : current.home,
      away: liveMatch.awayTeam
        ? { name: liveMatch.awayTeam, code: liveMatch.awayCode ?? undefined }
        : current.away,
      homeScore: liveMatch.homeScore,
      awayScore: liveMatch.awayScore,
      date: liveMatch.date ?? current.date,
      venue: liveMatch.venue ?? current.venue,
      pda: liveMatch.pda ?? current.pda,
      status: liveMatch.status ?? current.status,
    };
  }

  return merged;
}

const LIVE_FIXTURE_SLOTS: Record<
  number,
  { round: BracketRoundKey; matchNumber: number }
> = {
  18222446: { round: "quarter", matchNumber: 97 },
  18213979: { round: "quarter", matchNumber: 98 },
  18241006: { round: "semi", matchNumber: 101 },
  18237038: { round: "semi", matchNumber: 102 },
  18257865: { round: "third_place", matchNumber: 103 },
  18257739: { round: "final", matchNumber: 104 },
};

const COUNTRY_CODES: Record<string, string> = {
  Argentina: "ar",
  England: "gb-eng",
  France: "fr",
  Norway: "no",
  Spain: "es",
  Switzerland: "ch",
};

function summaryTeam(name: string): BracketTeam {
  return { name, code: COUNTRY_CODES[name] };
}

export function mergeMatchSummaries(
  rounds: BracketRounds,
  summaries: MatchSummary[],
): { rounds: BracketRounds; mergedCount: number } {
  const merged = cloneRounds(rounds);
  let mergedCount = 0;

  for (const summary of summaries) {
    const slot = LIVE_FIXTURE_SLOTS[summary.fixtureId];
    const team1 = summary.teamNames?.team1;
    const team2 = summary.teamNames?.team2;
    if (!slot || !team1 || !team2) continue;

    const targetIndex = merged[slot.round].findIndex(
      (match) => match.matchNumber === slot.matchNumber,
    );
    if (targetIndex < 0) continue;

    const current = merged[slot.round][targetIndex];
    const score = summary.finalScore ?? summary.live?.goals ?? null;
    merged[slot.round][targetIndex] = {
      ...current,
      id: `fixture-${summary.fixtureId}`,
      home: summaryTeam(team1),
      away: summaryTeam(team2),
      homeScore: score?.team1 ?? null,
      awayScore: score?.team2 ?? null,
      date:
        summary.onchain.startTime > 0
          ? new Date(summary.onchain.startTime * 1000).toISOString()
          : current.date,
      pda: summary.pda,
      status: summary.phase,
    };
    mergedCount += 1;
  }

  return { rounds: merged, mergedCount };
}
