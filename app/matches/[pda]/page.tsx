"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Wallet,
  Target,
  BarChart3,
  Users,
  Sparkles,
  Zap,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Lock,
  Activity,
  ChevronRight,
  Radio,
} from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { ConnectWalletModal } from "../../_components/connect-wallet-modal";
import { OnboardingModal } from "../../_components/onboarding-modal";
import { LiveMatchFeed } from "../../_components/live-match-feed";
import {
  getMatch,
  getLineup,
  getUser,
  isValidPda,
  formatUsdc,
  calculatePrizes,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
  type UserProfile,
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

function getCountryCode(name: string): string | null {
  const map: Record<string, string> = {
    "USA": "us", "United States": "us", "Canada": "ca", "Mexico": "mx",
    "Argentina": "ar", "Brazil": "br", "Uruguay": "uy", "Colombia": "co",
    "Ecuador": "ec", "Paraguay": "py", "Chile": "cl", "Venezuela": "ve",
    "Bolivia": "bo", "Peru": "pe",
    "England": "gb-eng", "France": "fr", "Germany": "de", "Spain": "es",
    "Portugal": "pt", "Netherlands": "nl", "Italy": "it", "Belgium": "be",
    "Croatia": "hr", "Denmark": "dk", "Switzerland": "ch", "Austria": "at",
    "Poland": "pl", "Ukraine": "ua", "Turkey": "tr", "Serbia": "rs",
    "Scotland": "gb-sct", "Wales": "gb-wls", "Norway": "no", "Sweden": "se",
    "Czech Republic": "cz", "Hungary": "hu", "Slovenia": "si", "Slovakia": "sk",
    "Bosnia & Herzegovina": "ba", "Bosnia and Herzegovina": "ba", "Romania": "ro",
    "Bulgaria": "bg", "Finland": "fi", "Ireland": "ie", "Northern Ireland": "gb-nir",
    "Iceland": "is", "Albania": "al", "North Macedonia": "mk", "Montenegro": "me",
    "Kosovo": "xk", "Greece": "gr", "Israel": "il",
    "Japan": "jp", "South Korea": "kr", "Australia": "au", "Iran": "ir",
    "Saudi Arabia": "sa", "Uzbekistan": "uz", "Jordan": "jo", "UAE": "ae",
    "United Arab Emirates": "ae", "Qatar": "qa", "Iraq": "iq", "Oman": "om",
    "Bahrain": "bh", "China": "cn", "India": "in",
    "Morocco": "ma", "Senegal": "sn", "Egypt": "eg", "Nigeria": "ng",
    "Tunisia": "tn", "Algeria": "dz", "Cameroon": "cm", "Ghana": "gh",
    "Ivory Coast": "ci", "Côte d'Ivoire": "ci", "Mali": "ml", "Burkina Faso": "bf",
    "South Africa": "za", "DR Congo": "cd", "Guinea": "gn", "Zambia": "zm",
    "Kenya": "ke", "Tanzania": "tz", "Uganda": "ug", "Rwanda": "rw",
    "New Zealand": "nz", "Costa Rica": "cr", "Panama": "pa", "Honduras": "hn",
    "Jamaica": "jm", "Guatemala": "gt", "El Salvador": "sv", "Trinidad and Tobago": "tt",
    "Haiti": "ht", "Dominican Republic": "do",
  };
  return map[name] ?? null;
}

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

type PredictionMode = "sub" | "score" | "goalscorer";

interface ModeConfig {
  key: PredictionMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  points: string;
  status: "live" | "locked";
}

export default function MatchDetails() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const isSeed =
    rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const pda = isDemo ? DEMO_PDA : rawPda;
  const { connected, publicKey } = useWallet();

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo ? DEMO_MATCH : isSeed ? SEED_MATCH_STATE : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : null
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed);
  const [error, setError] = useState<string | null>(isDemo ? null : null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingMode, setPendingMode] = useState<PredictionMode | null>(null);

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

  useEffect(() => {
    if (!connected || !publicKey || isDemo) {
      setProfile(null);
      return;
    }
    getUser(publicKey.toBase58())
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [connected, publicKey, isDemo]);

  useEffect(() => {
    if (connected && publicKey && pendingMode && !profile) {
      setShowWalletModal(false);
      setShowOnboarding(true);
    }
  }, [connected, publicKey, pendingMode, profile]);

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

  function handleSelectMode(mode: PredictionMode) {
    if (mode === "goalscorer") return; // locked
    if (isDemo) {
      router.push(`/matches/${pda}/arena?model=${mode}`);
      return;
    }
    if (!connected) {
      setPendingMode(mode);
      setShowWalletModal(true);
      return;
    }
    if (!profile) {
      setPendingMode(mode);
      setShowOnboarding(true);
      return;
    }
    router.push(`/matches/${pda}/arena?model=${mode}`);
  }

  function handleOnboardingSuccess() {
    setShowOnboarding(false);
    if (pendingMode) {
      router.push(`/matches/${pda}/arena?model=${pendingMode}`);
      setPendingMode(null);
    }
  }

  function handleCloseOnboarding() {
    setShowOnboarding(false);
    setPendingMode(null);
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Loading Match Arena
          </div>
          <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
            <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
          </div>
          <div className="font-tech text-[10px] uppercase tracking-widest text-muted/60">
            Please wait
          </div>
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
  const poolTotal = match.onchain?.poolTotal ?? "0";
  const entryFee = match.onchain?.entryFee ?? "0";
  const participantCount = match.onchain?.participantCount ?? 0;
  const prizes = calculatePrizes(poolTotal);

  return (
    <PageShell>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Top control bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 border border-surface bg-surface/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isDemo && (
              <span className="inline-flex items-center gap-2 border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                <Sparkles size={14} />
                <span className="hidden sm:inline">Demo Mode</span>
                <span className="sm:hidden">Demo</span>
              </span>
            )}
            {isSeed && !isDemo && (
              <span className="inline-flex items-center gap-2 border border-cyan/30 bg-cyan/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan">
                <Zap size={14} />
                <span className="hidden sm:inline">Devnet Practice</span>
                <span className="sm:hidden">Devnet</span>
              </span>
            )}
            {!isDemo && !connected && (
              <span className="inline-flex items-center gap-2 border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                <Wallet size={14} />
                <span className="hidden sm:inline">Connect wallet to enter</span>
                <span className="sm:hidden">Connect</span>
              </span>
            )}
          </div>
        </div>

        {/* Hero scoreboard */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border-2 border-surface bg-surface/10 p-4 md:p-6"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8 lg:gap-12">
            <div className="flex flex-col items-center gap-2 md:gap-3">
              <TeamFlagBadge name={team1?.teamName ?? "Team 1"} side={1} size="lg" />
              <span className="max-w-[180px] text-center font-display text-sm uppercase tracking-wider text-foreground md:text-base">
                {team1?.teamName ?? "Home"}
              </span>
            </div>

            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
                {isLive && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose" />
                  </span>
                )}
                <span>{isLive ? `${minute}' LIVE` : formatStatus(status)}</span>
              </div>
              <div className="flex items-center gap-4 font-display text-5xl text-foreground md:text-6xl lg:text-7xl">
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

            <div className="flex flex-col items-center gap-2 md:gap-3">
              <TeamFlagBadge name={team2?.teamName ?? "Team 2"} side={2} size="lg" />
              <span className="max-w-[180px] text-center font-display text-sm uppercase tracking-wider text-foreground md:text-base">
                {team2?.teamName ?? "Away"}
              </span>
            </div>
          </div>

          {/* Ticker strip */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-surface pt-4 text-[10px] font-bold uppercase tracking-wider text-muted md:gap-8 md:text-xs">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-purple" />
              Entry ${formatUsdc(entryFee)}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-cyan" />
              Pool ${formatUsdc(poolTotal)}
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-rose" />
              {participantCount} Player{participantCount !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {/* Main 3-column layout */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 lg:grid-cols-12">
          {/* Left column - Match Preview + Live Activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-4 lg:col-span-4"
          >
            <MatchPreviewPanel team1={team1} team2={team2} />
            <LiveMatchFeed
              pda={pda}
              isDemo={isDemo}
              title="Live Activity"
              showViewLogsLink
              className="min-h-[280px] flex-1"
              poolTotal={poolTotal}
            />
          </motion.div>

          {/* Center column - Action cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col gap-3 lg:col-span-3"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Choose Action
            </p>
            <ActionCard
              icon={<Target size={24} />}
              title="Substitute Manager"
              description="Predict who comes in and who goes out."
              meta="1 pt · 3 pts"
              color="purple"
              delay={0.2}
              onClick={() => handleSelectMode("sub")}
            />
            <ActionCard
              icon={<BarChart3 size={24} />}
              title="Final Score"
              description="Call the exact scoreline or winning side."
              meta="3 pts · 5 pts"
              color="cyan"
              delay={0.25}
              onClick={() => handleSelectMode("score")}
            />
            <ActionCard
              icon={<Users size={24} />}
              title="Goalscorer"
              description="Pick the players who will find the net."
              meta="2 pts each"
              color="muted"
              delay={0.3}
              locked
            />
            <Link href={`/matches/${pda}/logs`} className="block">
              <ActionCard
                icon={<Radio size={24} />}
                title="Match Stream"
                description="Live timeline and match events."
                meta="Real-time"
                color="foreground"
                delay={0.35}
                asRow
              />
            </Link>
            <Link href="#prize-vault" className="block">
              <ActionCard
                icon={<Trophy size={24} />}
                title="Leaderboard"
                description="Current ranks and prize estimates."
                meta="Top 3 podium"
                color="gold"
                delay={0.4}
                asRow
              />
            </Link>
          </motion.div>

          {/* Right column - Prize Vault */}
          <motion.div
            id="prize-vault"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4 lg:col-span-5"
          >
            <div className="relative flex flex-col overflow-hidden border border-surface bg-surface/10 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-cyan" />
                <h2 className="font-display text-xl text-foreground">Prize Vault</h2>
              </div>

              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Pool</p>
                <p className="font-display text-3xl text-foreground">${formatUsdc(poolTotal)}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                <div className="border border-surface bg-background/50 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Platform Fee</p>
                  <p className="font-mono font-bold text-foreground">20%</p>
                </div>
                <div className="border border-surface bg-background/50 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">Net Prize Pool</p>
                  <p className="font-mono font-bold text-cyan">${formatUsdc(String(Math.round(prizes.total)))}</p>
                </div>
              </div>

              {participantCount < 3 ? (
                <div className="border border-gold/30 bg-gold/5 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
                    <TrendingUp size={14} />
                    Winner Takes All
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    Fewer than 3 players joined. The top ranked wallet wins the entire net pool.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <PrizeRow rank={1} pct={50} amount={prizes.first} />
                  <PrizeRow rank={2} pct={30} amount={prizes.second} />
                  <PrizeRow rank={3} pct={20} amount={prizes.third} />
                </div>
              )}

              <button
                onClick={() => handleSelectMode("sub")}
                className="mt-5 flex w-full items-center justify-center gap-2 border border-purple bg-purple py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple/90 hover:shadow-[0_0_24px_rgba(3,70,148,0.35)]"
              >
                <Zap size={16} />
                Enter Arena
              </button>
            </div>

            <LiveMatchFeed
              pda={pda}
              isDemo={isDemo}
              defaultTab="leaderboard"
              title="Leaderboard"
              className="min-h-[280px] flex-1"
              poolTotal={poolTotal}
            />
          </motion.div>
        </div>
      </div>

      <ConnectWalletModal
        open={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
        onSuccess={handleOnboardingSuccess}
      />
    </PageShell>
  );
}

function PrizeRow({ rank, pct, amount }: { rank: number; pct: number; amount: number }) {
  const colors =
    rank === 1
      ? "border-gold/30 bg-gold/5 text-gold"
      : rank === 2
      ? "border-surface bg-surface/30 text-foreground"
      : "border-bronze/30 bg-bronze/5 text-bronze";

  return (
    <div className={cn("flex items-center justify-between border p-2.5", colors)}>
      <div className="flex items-center gap-2">
        <span className="font-display text-sm">#{rank}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider">{pct}%</span>
      </div>
      <span className="font-mono font-bold">${formatUsdc(String(Math.round(amount)))}</span>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  meta,
  color,
  delay,
  onClick,
  locked,
  asRow,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  color: "purple" | "cyan" | "gold" | "foreground" | "muted";
  delay: number;
  onClick?: () => void;
  locked?: boolean;
  asRow?: boolean;
}) {
  const colorStyles = {
    purple: "border-purple bg-purple text-white hover:shadow-[0_0_24px_rgba(3,70,148,0.35)]",
    cyan: "border-cyan bg-cyan text-background hover:shadow-[0_0_24px_rgba(6,182,212,0.3)]",
    gold: "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20",
    foreground: "border-foreground bg-foreground text-background hover:bg-foreground/90",
    muted: "cursor-not-allowed border-surface bg-surface/20 opacity-60",
  };

  const iconStyles = {
    purple: "bg-white/10 text-white",
    cyan: "bg-background/20 text-background",
    gold: "bg-gold/20 text-gold",
    foreground: "bg-background/20 text-background",
    muted: "bg-surface text-muted",
  };

  const textStyles = {
    purple: "text-white",
    cyan: "text-background",
    gold: "text-gold",
    foreground: "text-background",
    muted: "text-foreground",
  };

  const subTextStyles = {
    purple: "text-white/80",
    cyan: "text-background/80",
    gold: "text-gold/80",
    foreground: "text-background/80",
    muted: "text-muted",
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden border p-4 text-left transition-all",
        colorStyles[color],
        asRow ? "justify-between" : "flex-col items-start"
      )}
    >
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center transition-colors",
          asRow ? "h-10 w-10" : "h-11 w-11",
          iconStyles[color]
        )}
      >
        {icon}
      </div>
      <div className={cn("relative z-10 min-w-0 flex-1", asRow && "flex flex-col")}>
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn("font-display text-base", textStyles[color])}>{title}</h3>
          {asRow && <ChevronRight size={16} className={cn("flex-shrink-0 transition-transform group-hover:translate-x-1", textStyles[color])} />}
        </div>
        <p className={cn("mt-0.5 text-xs", subTextStyles[color])}>{description}</p>
        <p className={cn("mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider", subTextStyles[color])}>
          {locked ? <Lock size={12} /> : <TrendingUp size={12} />}
          {meta}
        </p>
      </div>
      {locked && (
        <span className="absolute -right-6 top-3 rotate-45 border border-foreground/10 bg-foreground px-8 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background shadow-sm">
          Soon
        </span>
      )}
    </motion.div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} disabled={locked} className="block w-full text-left">
        {content}
      </button>
    );
  }
  return content;
}

function MatchPreviewPanel({
  team1,
  team2,
}: {
  team1?: { teamName: string | null; players: Array<{ id: number; name: string; position: string | null; starter: boolean; onPitch?: boolean }> };
  team2?: { teamName: string | null; players: Array<{ id: number; name: string; position: string | null; starter: boolean; onPitch?: boolean }> };
}) {
  return (
    <div className="relative flex flex-col overflow-hidden border border-surface bg-surface/10 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity size={18} className="text-cyan" />
        <h2 className="font-display text-xl text-foreground">Match Preview</h2>
      </div>

      <div className="mb-4 flex items-center justify-between border-b border-surface pb-3">
        <span className="max-w-[45%] truncate font-display text-sm uppercase text-foreground">
          {team1?.teamName ?? "Home"}
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">VS</span>
        <span className="max-w-[45%] truncate font-display text-sm uppercase text-foreground">
          {team2?.teamName ?? "Away"}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4 text-xs">
        <TeamLineup team={team1} side={1} />
        <TeamLineup team={team2} side={2} />
      </div>
    </div>
  );
}

function TeamLineup({
  team,
  side,
}: {
  team?: { teamName: string | null; players: Array<{ id: number; name: string; position: string | null; starter: boolean; onPitch?: boolean }> };
  side: 1 | 2;
}) {
  const starters = team?.players.filter((p) => p.starter) ?? [];
  const byPosition = {
    Goalkeeper: starters.filter((p) => p.position === "Goalkeeper"),
    Defender: starters.filter((p) => p.position === "Defender"),
    Midfielder: starters.filter((p) => p.position === "Midfielder"),
    Forward: starters.filter((p) => p.position === "Forward"),
  };

  return (
    <div className="space-y-3">
      <p className={cn("text-[10px] font-bold uppercase tracking-wider", side === 1 ? "text-purple" : "text-cyan")}>
        {side === 1 ? "Home XI" : "Away XI"}
      </p>
      {Object.entries(byPosition).map(([position, players]) =>
        players.length > 0 ? (
          <div key={position}>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">{position}s</p>
            <div className="space-y-1">
              {players.map((p) => (
                <p key={p.id} className="truncate text-foreground">
                  {p.name}
                </p>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
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

function TeamFlagBadge({
  name,
  side,
  size = "md",
}: {
  name: string;
  side: 1 | 2;
  size?: "md" | "lg";
}) {
  const code = getCountryCode(name);
  const sizeClass = size === "lg" ? "h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24" : "h-14 w-14 md:h-16 md:w-16";
  if (code) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://flagcdn.com/${code}.svg`}
        alt={name}
        className={cn(
          "object-cover shadow-lg",
          sizeClass,
          side === 1 ? "border-2 border-purple" : "border-2 border-cyan"
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center border-2 text-xl font-bold md:text-2xl",
        sizeClass,
        side === 1
          ? "border-purple/50 bg-purple/10 text-purple"
          : "border-cyan/50 bg-cyan/10 text-cyan"
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
