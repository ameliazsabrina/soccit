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
  return matchStateOutput.parse({
    fixtureId,
    onchain: chain,
    live,
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

// Sort order for the discovery list: OPEN first, then RESOLVED, then SETTLED,
// and within a status the newest fixture (highest id) first.
const STATUS_RANK: Record<number, number> = {
  [STATUS_OPEN]: 0,
  [STATUS_RESOLVED]: 1,
  [STATUS_SETTLED]: 2,
};

/**
 * All matches created on-chain, each with the PDA the read endpoints key by,
 * enriched with live score + team names from the feed when available. This is
 * the discovery endpoint the frontend uses instead of hardcoding a PDA.
 */
export async function listMatches(): Promise<MatchSummary[]> {
  const matches = await fetchAllMatches();
  const redis = getRedis();
  const summaries = await Promise.all(
    matches.map(async ({ pda, match }): Promise<MatchSummary> => {
      const fixtureId = Number(match.matchId);
      const [hash, teamNames] = await Promise.all([
        redis.hgetall(`fixture:${fixtureId}`),
        loadTeamNames(fixtureId),
      ]);
      return {
        pda,
        fixtureId,
        onchain: toOnchainMatch(match),
        live: toLiveMatch(hash),
        teamNames,
      };
    }),
  );
  return summaries.sort(
    (a, b) =>
      (STATUS_RANK[a.onchain.status] ?? 9) - (STATUS_RANK[b.onchain.status] ?? 9) ||
      b.fixtureId - a.fixtureId,
  );
}
