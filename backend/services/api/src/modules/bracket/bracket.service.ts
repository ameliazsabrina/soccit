import { getRedis } from "../../redis.js";
import {
  type DecodedMatch,
  STATUS_RESOLVED,
  STATUS_SETTLED,
  fetchMatch,
} from "../../onchain/program.js";
import { toLiveMatch } from "../match/match.service.js";
import { BracketNotFoundError } from "./bracket.errors.js";
import {
  type BracketMatch,
  type BracketOutput,
  bracketOutput,
} from "./bracket.schema.js";
import { type StructureMatch, getStructure } from "./bracket.structure.js";

export function deriveMatch(
  slot: StructureMatch,
  hash: Record<string, string>,
  onchain: DecodedMatch | null,
): BracketMatch {
  const live = toLiveMatch(hash);
  const homeScore = live ? live.goals.team1 : null;
  const awayScore = live ? live.goals.team2 : null;

  const final =
    onchain != null &&
    (onchain.status === STATUS_RESOLVED || onchain.status === STATUS_SETTLED);
  const status: BracketMatch["status"] = final
    ? "final"
    : live
      ? "live"
      : "scheduled";

  let winner: BracketMatch["winner"] = null;
  if (homeScore != null && awayScore != null && homeScore !== awayScore) {
    winner = homeScore > awayScore ? "home" : "away";
  }

  return {
    id: slot.id,
    fixtureId: slot.fixtureId,
    home: {
      ...slot.home,
      advancing: winner === "home",
      eliminated: final && winner === "away",
    },
    away: {
      ...slot.away,
      advancing: winner === "away",
      eliminated: final && winner === "home",
    },
    homeScore,
    awayScore,
    status,
    winner,
  };
}

async function loadSlotState(
  slot: StructureMatch,
): Promise<{ hash: Record<string, string>; onchain: DecodedMatch | null }> {
  if (slot.fixtureId == null) return { hash: {}, onchain: null };
  const [hash, onchain] = await Promise.all([
    getRedis().hgetall(`fixture:${slot.fixtureId}`),
    fetchMatch(slot.fixtureId),
  ]);
  return { hash, onchain };
}

export async function getBracket(slug: string): Promise<BracketOutput> {
  const structure = getStructure(slug);
  if (!structure) throw new BracketNotFoundError(slug);

  const rounds = await Promise.all(
    structure.map(async (round) => ({
      name: round.name,
      shortName: round.shortName,
      matches: await Promise.all(
        round.matches.map(async (slot) => {
          const { hash, onchain } = await loadSlotState(slot);
          return deriveMatch(slot, hash, onchain);
        }),
      ),
    })),
  );

  return bracketOutput.parse({ updatedAt: Date.now(), rounds });
}
