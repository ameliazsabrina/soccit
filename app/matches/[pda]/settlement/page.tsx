"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Medal, AlertCircle, RefreshCw } from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import type { ArenaTab } from "../../../_components/top-nav";
import {
  getMatch,
  getLineup,
  getLeaderboard,
  isValidPda,
  formatUsdc,
  formatWallet,
  calculatePrizes,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
  type Leaderboard,
} from "../../../_lib/api";

const SEED_MATCH_STATE: MatchState = {
  fixtureId: SOCCIT_SEED_FIXTURE_ID,
  onchain: {
    status: 2,
    statusLabel: "SETTLED",
    settled: true,
    entryFee: "5000000",
    poolTotal: "5000000",
    participantCount: 1,
    team1Id: 101,
    team2Id: 202,
    usdcMint: SOCCIT_USDC_MINT,
    winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", null, null],
  },
  live: {
    statusId: 0,
    minute: 90,
    goals: { team1: 2, team2: 1 },
    ts: Date.now(),
  },
  updatedAt: Date.now(),
};

const DEMO_PDA = "demo";

const DEMO_MATCH: MatchState = {
  fixtureId: 999999,
  onchain: {
    status: 2,
    statusLabel: "SETTLED",
    settled: true,
    entryFee: "1000000",
    poolTotal: "5000000",
    participantCount: 12,
    team1Id: 101,
    team2Id: 202,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    winners: [
      "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
      "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7",
      "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt",
    ],
  },
  live: {
    statusId: 0,
    minute: 90,
    goals: { team1: 2, team2: 1 },
    ts: Date.now(),
  },
  updatedAt: Date.now(),
};

const DEMO_LINEUP: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    { side: 1, teamId: 101, teamName: "Portugal", formation: "4-3-3", players: [] },
    { side: 2, teamId: 202, teamName: "Argentina", formation: "4-3-3", players: [] },
  ],
  names: {},
};

const DEMO_LEADERBOARD: Leaderboard = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  final: true,
  winners: [
    "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
    "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7",
    "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt",
  ],
  ranking: [
    {
      owner: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ",
      points: 12,
      earliestScoringLockMinute: 23,
      user: { username: "demoking", avatar: "avatar-1" },
      predictions: [],
    },
    {
      owner: "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7",
      points: 9,
      earliestScoringLockMinute: 31,
      user: { username: "rivalX", avatar: "avatar-3" },
      predictions: [],
    },
    {
      owner: "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt",
      points: 6,
      earliestScoringLockMinute: 44,
      user: null,
      predictions: [],
    },
  ],
};

export default function SettlementPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const isDemoSettled = rawPda === "demo-settled";
  const isSeed = rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const pda = isDemo ? DEMO_PDA : isDemoSettled ? "demo-settled" : rawPda;

  const subNavTabs: ArenaTab[] = [
    { model: "logs", label: "Logs", href: `/matches/${pda}/logs`, active: false },
    { model: "settlement", label: "Settlement", href: `/matches/${pda}/settlement`, active: true },
  ];

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo || isDemoSettled ? DEMO_MATCH : isSeed ? SEED_MATCH_STATE : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() => (isDemo || isSeed || isDemoSettled ? DEMO_LINEUP : null));
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(() =>
    isDemo || isSeed || isDemoSettled ? DEMO_LEADERBOARD : null
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed && !isDemoSettled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo || isSeed || isDemoSettled) return;
    if (!isValidPda(pda)) {
      setError("Invalid match address.");
      setLoading(false);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo, isSeed]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [m, l, lb] = await Promise.all([
        getMatch(pda),
        getLineup(pda),
        getLeaderboard(pda).catch(() => null),
      ]);
      setMatch(m);
      setLineup(l);
      setLeaderboard(lb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settlement data.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageShell arenaTabs={subNavTabs}>
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Loading Settlement
          </div>
          <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
            <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !match || !lineup) {
    return (
      <PageShell arenaTabs={subNavTabs}>
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">Settlement Not Available</h2>
          <p className="mt-2 text-muted">{error ?? "Unknown error"}</p>
          <button
            onClick={loadData}
            className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </PageShell>
    );
  }

  const team1 = lineup.teams.find((t) => t.side === 1);
  const team2 = lineup.teams.find((t) => t.side === 2);
  const score = match.live?.goals ?? { team1: 0, team2: 0 };
  const poolTotal = match.onchain?.poolTotal ?? "0";
  const participantCount = match.onchain?.participantCount ?? 0;
  const prizes = calculatePrizes(poolTotal);
  const settled = match.onchain?.settled ?? false;
  const statusLabel = match.onchain?.statusLabel ?? "UNKNOWN";

  let winnerLabel = "Pending";
  if (score.team1 > score.team2) winnerLabel = team1?.teamName ?? "Home";
  else if (score.team2 > score.team1) winnerLabel = team2?.teamName ?? "Away";
  else if (match.live?.statusId !== null) winnerLabel = "Draw";

  const topRanks = leaderboard?.ranking.slice(0, 3) ?? [];

  return (
    <PageShell arenaTabs={subNavTabs}>
      <div className="flex flex-1 flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Match Settlement</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              {team1?.teamName ?? "Home"} vs {team2?.teamName ?? "Away"}
            </h1>
            <span className="font-mono text-xs text-muted">{settled ? "SETTLED" : statusLabel}</span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Final score */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <Trophy size={24} />
            </div>
            <div>
              <p className="font-display text-6xl text-foreground">
                {score.team1} - {score.team2}
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">Final Score</p>
            </div>
          </motion.div>

          {/* Winner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <Medal size={24} />
            </div>
            <div>
              <p className="font-display text-4xl text-foreground">{winnerLabel}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">Match Winner</p>
            </div>
          </motion.div>

          {/* Pool */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="font-display text-5xl text-foreground">${formatUsdc(poolTotal)}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
                Prize Pool · {participantCount} Players
              </p>
            </div>
          </motion.div>

          {/* Prize breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface p-8 md:col-span-2 lg:col-span-2"
          >
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center bg-background text-cyan">
                <Trophy size={20} />
              </div>
              <h2 className="font-display text-xl text-foreground">Prize Breakdown</h2>
            </div>
            <div className="space-y-3">
              <PrizeRow rank={1} pct={50} amount={prizes.first} />
              <PrizeRow rank={2} pct={30} amount={prizes.second} />
              <PrizeRow rank={3} pct={20} amount={prizes.third} />
            </div>
            <p className="mt-4 text-xs text-muted">
              Net pool after 20% platform fee: ${formatUsdc(String(Math.round(prizes.total)))}
            </p>
          </motion.div>

          {/* Top finishers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface p-8 md:col-span-2 lg:col-span-1"
          >
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center bg-background text-gold">
                <Medal size={20} />
              </div>
              <h2 className="font-display text-xl text-foreground">Top Finishers</h2>
            </div>
            {topRanks.length > 0 ? (
              <div className="space-y-3">
                {topRanks.map((r, i) => {
                  const label = r.user?.username ?? formatWallet(r.owner);
                  const prize =
                    i === 0 ? prizes.first : i === 1 ? prizes.second : i === 2 ? prizes.third : 0;
                  return (
                    <div key={r.owner + i} className="flex items-center justify-between bg-background/50 p-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            "flex h-6 w-6 items-center justify-center text-xs font-bold " +
                            (i === 0
                              ? "bg-gold text-background"
                              : i === 1
                              ? "bg-foreground text-background"
                              : "bg-bronze text-background")
                          }
                        >
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{label}</p>
                          <p className="text-[10px] text-muted">{r.points} pts</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-cyan">
                        ${formatUsdc(String(Math.round(prize)))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No rankings available for this match.</p>
            )}
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}

function PrizeRow({ rank, pct, amount }: { rank: number; pct: number; amount: number }) {
  const colors =
    rank === 1
      ? "bg-gold/10 text-gold"
      : rank === 2
      ? "bg-foreground/10 text-foreground"
      : "bg-bronze/10 text-bronze";

  return (
    <div className={"flex items-center justify-between p-3 " + colors}>
      <div className="flex items-center gap-2">
        <span className="font-display text-sm">#{rank}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{pct}%</span>
      </div>
      <span className="font-mono font-bold">${formatUsdc(String(Math.round(amount)))}</span>
    </div>
  );
}
