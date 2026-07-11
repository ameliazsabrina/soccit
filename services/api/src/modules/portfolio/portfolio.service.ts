import { PublicKey } from "@solana/web3.js";
import { config } from "../../config.js";
import { getRedis } from "../../redis.js";
import {
  type DecodedEntry,
  type DecodedMatch,
  STATUS_OPEN,
  STATUS_RESOLVED,
  associatedTokenAddress,
  decodeMatch,
  fetchEntriesByOwner,
  getConnection,
} from "../../onchain/program.js";
import { derivePhase, liveForOutput } from "../match/phase.js";
import { toLiveMatch, toOnchainMatch } from "../match/match.service.js";
import { RpcUnavailableError } from "./portfolio.errors.js";
import { portfolioOutput, type Portfolio } from "./portfolio.schema.js";

const USDC_DECIMALS = 6;

interface ActivePosition {
  pda: string;
  entry: DecodedEntry;
  match: DecodedMatch;
}

function statusLabel(status: number): "OPEN" | "RESOLVED" {
  return status === STATUS_RESOLVED ? "RESOLVED" : "OPEN";
}

async function readUsdcBalance(mint: string, owner: PublicKey): Promise<bigint> {
  try {
    const ata = associatedTokenAddress(new PublicKey(mint), owner);
    const bal = await getConnection().getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    // an unfunded / never-created ATA is the normal zero-balance case
    return 0n;
  }
}

export async function getPortfolio(wallet: string): Promise<Portfolio> {
  const owner = new PublicKey(wallet);

  let entries: DecodedEntry[];
  let infos: Awaited<ReturnType<ReturnType<typeof getConnection>["getMultipleAccountsInfo"]>>;
  try {
    entries = await fetchEntriesByOwner(owner);
    infos = entries.length
      ? await getConnection().getMultipleAccountsInfo(entries.map((e) => e.matchKey))
      : [];
  } catch (err) {
    throw new RpcUnavailableError(err instanceof Error ? err.message : undefined);
  }

  const active: ActivePosition[] = [];
  entries.forEach((entry, i) => {
    const info = infos[i];
    if (!info) return;
    let match: DecodedMatch;
    try {
      match = decodeMatch(info.data);
    } catch {
      return; // not a Match account
    }
    if (match.status !== STATUS_OPEN && match.status !== STATUS_RESOLVED) return;
    active.push({ pda: entry.matchKey.toBase58(), entry, match });
  });

  const mint = config.solana.usdcMint ?? active[0]?.match.usdcMint.toBase58() ?? null;
  const usdcBalance = mint ? await readUsdcBalance(mint, owner) : 0n;

  const redis = getRedis();
  const nowSecs = Math.floor(Date.now() / 1000);
  const positions = await Promise.all(
    active.map(async ({ pda, entry, match }) => {
      const fixtureId = Number(match.matchId);
      const live = toLiveMatch(await redis.hgetall(`fixture:${fixtureId}`));
      const onchain = toOnchainMatch(match);
      const phase = derivePhase(onchain, live, nowSecs);
      return {
        pda,
        fixtureId,
        status: match.status,
        statusLabel: statusLabel(match.status),
        entryFee: match.entryFee.toString(),
        side: entry.side,
        slotsUsed: entry.slotsUsed,
        team1Id: match.team1Id,
        team2Id: match.team2Id,
        startTime: Number(match.startTime),
        phase,
        // null unless genuinely in-play, matching /api/matches summary semantics
        live: liveForOutput(live),
      };
    }),
  );

  const lockedStake = active.reduce((sum, a) => sum + a.match.entryFee, 0n);

  return portfolioOutput.parse({
    wallet,
    usdcMint: mint,
    usdcBalance: usdcBalance.toString(),
    lockedStake: lockedStake.toString(),
    portfolioValue: (usdcBalance + lockedStake).toString(),
    usdcDecimals: USDC_DECIMALS,
    activeCount: positions.length,
    positions,
    updatedAt: Date.now(),
  });
}
