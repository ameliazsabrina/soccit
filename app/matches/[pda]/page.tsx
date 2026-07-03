"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Wallet,
  Target,
  BarChart3,
  Users,
  Sparkles,
  ScrollText,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { ConnectWalletModal } from "../../_components/connect-wallet-modal";
import { TeamPickerModal } from "../../_components/team-picker-modal";
import { LiveMatchFeed } from "../../_components/live-match-feed";
import {
  getMatch,
  getLineup,
  isValidPda,
  formatUsdc,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
} from "../../_lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "../../_lib/utils";

const SEED_MATCH_STATE: MatchState = {
  fixtureId: SOCCIT_SEED_FIXTURE_ID,
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "5000000",
    poolTotal: "0",
    participantCount: 0,
    team1Id: 101,
    team2Id: 202,
    usdcMint: SOCCIT_USDC_MINT,
    winners: [null, null, null],
  },
  live: null,
  updatedAt: Date.now(),
};

const DEMO_PDA = "demo";

const DEMO_MATCH: MatchState = {
  fixtureId: 999999,
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "1000000",
    poolTotal: "5000000",
    participantCount: 12,
    team1Id: 101,
    team2Id: 202,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    winners: [null, null, null],
  },
  live: {
    statusId: 1,
    minute: 63,
    goals: { team1: 2, team2: 1 },
    ts: Date.now(),
  },
  updatedAt: Date.now(),
};

const DEMO_LINEUP: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    {
      side: 1,
      teamId: 101,
      teamName: "Demo United",
      players: [
        { id: 1001, name: "A. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper", onPitch: true },
        { id: 1002, name: "B. Right Back", number: "2", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1003, name: "C. Center Back", number: "4", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1004, name: "D. Center Back", number: "5", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1005, name: "E. Left Back", number: "3", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1006, name: "F. CDM", number: "6", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1007, name: "G. Right Mid", number: "7", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1008, name: "H. Left Mid", number: "8", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1009, name: "I. Forward", number: "9", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1010, name: "J. Forward", number: "10", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1011, name: "K. Forward", number: "11", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1101, name: "Sub A", number: "12", starter: false, positionId: 1, position: "Goalkeeper", onPitch: false },
        { id: 1102, name: "Sub B", number: "13", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 1103, name: "Sub C", number: "14", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 1104, name: "Sub D", number: "15", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 1105, name: "Sub E", number: "16", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 1106, name: "Sub F", number: "17", starter: false, positionId: 4, position: "Forward", onPitch: false },
      ],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "Mock City",
      players: [
        { id: 2001, name: "M. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper", onPitch: true },
        { id: 2002, name: "N. Right Back", number: "2", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2003, name: "O. Center Back", number: "4", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2004, name: "P. Center Back", number: "5", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2005, name: "Q. Left Back", number: "3", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2006, name: "R. CDM", number: "6", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2007, name: "S. Right Mid", number: "7", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2008, name: "T. Left Mid", number: "8", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2009, name: "U. Forward", number: "9", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2010, name: "V. Forward", number: "10", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2011, name: "W. Forward", number: "11", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2101, name: "Sub G", number: "12", starter: false, positionId: 1, position: "Goalkeeper", onPitch: false },
        { id: 2102, name: "Sub H", number: "13", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 2103, name: "Sub I", number: "14", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 2104, name: "Sub J", number: "15", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 2105, name: "Sub K", number: "16", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 2106, name: "Sub L", number: "17", starter: false, positionId: 4, position: "Forward", onPitch: false },
      ],
    },
  ],
  names: {},
};

export default function MatchDetails() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  // The seed match is the single live (on-chain) Devnet fixture. Its backend
  // reads 404, so when ?seed=1 (or the canonical seed PDA is loaded) we render
  // a mock SEED_MATCH_STATE + the demo lineup instead of hitting the API.
  const isSeed =
    rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const pda = isDemo ? DEMO_PDA : rawPda;
  const { connected } = useWallet();

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo ? DEMO_MATCH : isSeed ? SEED_MATCH_STATE : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : null
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed);
  const [error, setError] = useState<string | null>(isDemo ? null : null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    if (isDemo || isSeed) return;
    if (!isValidPda(pda)) {
      setError("Invalid match address.");
      setLoading(false);
      return;
    }
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo, isSeed]);

  async function loadMatch() {
    setLoading(true);
    setError(null);
    try {
      const [m, l] = await Promise.all([getMatch(pda), getLineup(pda)]);
      setMatch(m);
      setLineup(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSubstituteModel() {
    if (!isDemo && !isSeed && !connected) {
      setShowWalletModal(true);
      return;
    }
    setShowTeamPicker(true);
  }

  function handleTeamSelected(side: 1 | 2) {
    setShowTeamPicker(false);
    const seedParams =
      isSeed ? `&seed=1&fixtureId=${SOCCIT_SEED_FIXTURE_ID}` : "";
    router.push(`/matches/${pda}/arena?side=${side}${seedParams}`);
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-purple" size={32} />
        </div>
      </PageShell>
    );
  }

  if (error || !match || !lineup) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">Match Not Available</h2>
          <p className="mt-2 text-muted">{error ?? "Unknown error"}</p>
          <button
            onClick={loadMatch}
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
  const minute = match.live?.minute ?? 0;
  const isLive = match.live?.statusId === 1;
  const status = match.onchain?.statusLabel ?? "UNKNOWN";

  return (
    <PageShell>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Back link + header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/matches"
              className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft size={14} />
              Back to Matches
            </Link>
            <h1 className="font-display text-3xl tracking-tight text-foreground lg:text-4xl">
              Prediction Models
            </h1>
          </div>
          {isDemo && (
            <div className="flex items-center gap-2 text-gold">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Demo Mode</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          {/* Glass scoreboard HUD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-6 glass border border-surface p-6 md:flex-row md:p-8"
          >
            <TeamBadge name={team1?.teamName ?? "Team 1"} color="purple" />
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
                {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />}
                <span>{isLive ? `${minute}' LIVE` : formatStatus(status)}</span>
              </div>
              <div className="flex items-center gap-4 font-display text-5xl text-foreground md:text-6xl">
                <span>{score.team1}</span>
                <span className="text-muted">-</span>
                <span>{score.team2}</span>
              </div>
              {!isLive && match.live?.statusId !== null && (
                <p className="mt-2 text-xs text-muted">
                  {match.live?.statusId === 0 ? "Not started" : `Status: ${match.live?.statusId}`}
                </p>
              )}
            </div>
            <TeamBadge name={team2?.teamName ?? "Team 2"} color="cyan" />
          </motion.div>

          {/* Pool info HUD */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HudStat label="Entry Fee" value={`$${match.onchain ? formatUsdc(match.onchain.entryFee) : "--"}`} />
            <HudStat label="Pool Total" value={`$${match.onchain ? formatUsdc(match.onchain.poolTotal) : "--"}`} />
            <HudStat label="Participants" value={`${match.onchain?.participantCount ?? 0}`} />
          </div>

          {/* Wallet gate for real matches */}
          {!isDemo && !connected && (
            <div className="flex items-center gap-3 border border-gold/30 bg-gold/5 p-4 text-gold">
              <Wallet size={20} />
              <p className="text-sm font-medium">
                Connect your wallet to enter real prediction markets. Demo match is free.
              </p>
            </div>
          )}

          {/* Seed (live Devnet) match banner */}
          {isSeed && !isDemo && (
            <div className="flex items-start gap-3 border border-cyan/30 bg-cyan/5 p-4 text-cyan">
              <Zap size={20} className="mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold uppercase tracking-wider">Live Devnet Seed Match</p>
                <p className="mt-1 text-muted">
                  This is the only fixture the backend currently accepts for{" "}
                  <span className="font-mono">/api/prediction/prepare</span>. The
                  read endpoints (score, lineup, events, leaderboard) return 404
                  because nothing has been ingested yet — so we render a placeholder
                  lineup. Lock a prediction to submit a real transaction on Devnet
                  (wallet needs the Soccit mock USDC to pay the ${formatUsdc(match.onchain?.entryFee ?? "0")} entry fee).
                </p>
              </div>
            </div>
          )}

          {/* Prediction model cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ModelCard
              icon={<Target size={28} />}
              title="Substitute Prediction"
              description="Predict which bench player will sub in and where."
              status="active"
              onClick={handleSelectSubstituteModel}
              disabled={!isDemo && !isSeed && !connected}
            />
            <ModelCard
              icon={<BarChart3 size={28} />}
              title="Guess the Score"
              description="Predict the final scoreline."
              status="coming-soon"
            />
            <ModelCard
              icon={<Users size={28} />}
              title="First Goalscorer"
              description="Pick the player who opens the scoring."
              status="coming-soon"
            />
          </div>

          {/* Live feed */}
          <div className="mt-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Real-Time Data</p>
                <h2 className="font-display text-2xl text-foreground">Match Stream</h2>
              </div>
              <Link
                href={`/matches/${pda}/logs`}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:text-foreground"
              >
                <ScrollText size={16} />
                Full Logs
              </Link>
            </div>
            <LiveMatchFeed
              pda={pda}
              isDemo={isDemo}
              showViewLogsLink
              className="min-h-[320px]"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTeamPicker && (
          <TeamPickerModal
            team1={team1?.teamName ?? "Team 1"}
            team2={team2?.teamName ?? "Team 2"}
            onSelect={handleTeamSelected}
            onClose={() => setShowTeamPicker(false)}
          />
        )}
      </AnimatePresence>

      <ConnectWalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </PageShell>
  );
}

function formatStatus(status: string) {
  switch (status) {
    case "OPEN":
      return "Open for Predictions";
    case "RESOLVED":
      return "Resolved";
    case "SETTLED":
      return "Settled";
    default:
      return status;
  }
}

function TeamBadge({ name, color }: { name: string; color: "purple" | "cyan" }) {
  return (
    <div
      className={cn(
        "flex h-16 w-16 items-center justify-center border-2 text-2xl font-bold",
        color === "purple"
          ? "border-purple/50 bg-purple/10 text-purple"
          : "border-cyan/50 bg-cyan/10 text-cyan"
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function HudStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-surface bg-surface/20 p-4 text-center transition-colors hover:bg-surface/40">
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="font-mono text-2xl text-foreground">{value}</p>
    </div>
  );
}

function ModelCard({
  icon,
  title,
  description,
  status,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "active" | "coming-soon";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isComingSoon = status === "coming-soon";
  return (
    <motion.button
      whileHover={!isComingSoon && !disabled ? { scale: 1.02 } : undefined}
      onClick={!isComingSoon ? onClick : undefined}
      disabled={disabled || isComingSoon}
      className={cn(
        "group relative flex flex-col items-start gap-4 border p-6 text-left transition-all",
        isComingSoon
          ? "border-surface bg-surface/20 opacity-60"
          : disabled
          ? "border-surface bg-surface/20 opacity-50 cursor-not-allowed"
          : "border-surface bg-surface/30 hover:border-cyan/50 hover:bg-surface/60"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center transition-colors",
          isComingSoon ? "bg-surface text-muted" : "bg-background text-purple group-hover:bg-purple group-hover:text-white"
        )}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-display text-2xl text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {isComingSoon && (
        <span className="absolute right-4 top-4 text-xs font-bold uppercase tracking-wider text-muted">
          Coming Soon
        </span>
      )}
    </motion.button>
  );
}
