import { getRedis } from "../../redis.js";
import {
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  fetchAllMatches,
  fetchMatch,
} from "../../onchain/program.js";
import { loadTeamNames } from "../lineup/lineup.service.js";
import { MatchNotFoundError } from "./match.errors.js";
import { derivePhase, finalScoreForOutput, liveForOutput } from "./phase.js";
import {
  type LiveMatch,
  type MatchState,
  type MatchSummary,
  type OnchainMatch,
  matchStateOutput,
} from "./match.schema.js";

const DEFAULT_PUBKEY = "11111111111111111111111111111111";

function statusLabel(status: number): OnchainMatch["statusLabel"] {
  if (status === STATUS_OPEN) return "OPEN";
  if (status === STATUS_RESOLVED) return "RESOLVED";
  if (status === STATUS_SETTLED) return "SETTLED";
  return "UNKNOWN";
}

function winnerOrNull(pubkey: string): string | null {
  return pubkey === DEFAULT_PUBKEY ? null : pubkey;
}

export function toOnchainMatch(m: DecodedMatch): OnchainMatch {
  return {
    status: m.status,
    statusLabel: statusLabel(m.status),
    settled: m.settled,
    entryFee: m.entryFee.toString(),
    poolTotal: m.poolTotal.toString(),
    participantCount: m.participantCount,
    startTime: Number(m.startTime),
    team1Id: m.team1Id,
    team2Id: m.team2Id,
    usdcMint: m.usdcMint.toBase58(),
    winners: [
      winnerOrNull(m.winner1.toBase58()),
      winnerOrNull(m.winner2.toBase58()),
      winnerOrNull(m.winner3.toBase58()),
    ],
  };
}

function num(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toLiveMatch(hash: Record<string, string>): LiveMatch | null {
  if (Object.keys(hash).length === 0) return null;
  return {
    statusId: num(hash.statusId),
    minute: num(hash.minute),
    goals: { team1: num(hash.goals1) ?? 0, team2: num(hash.goals2) ?? 0 },
    ts: num(hash.ts),
  };
}

export function assembleMatchState(
  fixtureId: number,
  hash: Record<string, string>,
  onchain: DecodedMatch | null,
): MatchState {
  const live = toLiveMatch(hash);
  const chain = onchain ? toOnchainMatch(onchain) : null;
  if (!live && !chain) throw new MatchNotFoundError(fixtureId);
  const nowSecs = Math.floor(Date.now() / 1000);
  const phase = derivePhase(chain, live, nowSecs);
  return matchStateOutput.parse({
    fixtureId,
    onchain: chain,
    live: liveForOutput(live),
    phase,
    finalScore: finalScoreForOutput(live, phase),
    updatedAt: Date.now(),
  });
}

export async function getMatchState(fixtureId: number): Promise<MatchState> {
  const [hash, onchain] = await Promise.all([
    getRedis().hgetall(`fixture:${fixtureId}`),
    fetchMatch(fixtureId),
  ]);
  return assembleMatchState(fixtureId, hash, onchain);
}

const STATUS_RANK: Record<number, number> = {
  [STATUS_OPEN]: 0,
  [STATUS_RESOLVED]: 1,
  [STATUS_SETTLED]: 2,
};

function pickFeaturedPda(
  summaries: MatchSummary[],
  nowSecs: number,
): string | null {
  const open = summaries.filter((s) => s.onchain.status === STATUS_OPEN);
  if (open.length === 0) return null;
  const upcoming = open
    .filter((s) => s.onchain.startTime > 0 && s.onchain.startTime >= nowSecs)
    .sort((a, b) => a.onchain.startTime - b.onchain.startTime);
  if (upcoming[0]) return upcoming[0].pda;
  const newest = [...open].sort((a, b) => b.fixtureId - a.fixtureId)[0];
  return newest ? newest.pda : null;
}

export async function listMatches(): Promise<MatchSummary[]> {
  const matches = await fetchAllMatches();
  const redis = getRedis();
  const nowSecs = Math.floor(Date.now() / 1000);
  const summaries = await Promise.all(
    matches.map(async ({ pda, match }): Promise<MatchSummary> => {
      const fixtureId = Number(match.matchId);
      const [hash, teamNames] = await Promise.all([
        redis.hgetall(`fixture:${fixtureId}`),
        loadTeamNames(fixtureId),
      ]);
      const onchain = toOnchainMatch(match);
      const live = toLiveMatch(hash);
      const phase = derivePhase(onchain, live, nowSecs);
      return {
        pda,
        fixtureId,
        onchain,
        live: liveForOutput(live),
        phase,
        finalScore: finalScoreForOutput(live, phase),
        teamNames,
        featured: false,
      };
    }),
  );
  const featuredPda = pickFeaturedPda(summaries, nowSecs);
  for (const s of summaries) s.featured = s.pda === featuredPda;
  return summaries.sort(
    (a, b) =>
      (STATUS_RANK[a.onchain.status] ?? 9) -
        (STATUS_RANK[b.onchain.status] ?? 9) || b.fixtureId - a.fixtureId,
  );
}
