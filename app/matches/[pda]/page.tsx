"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Wallet,
  Target,
  BarChart3,
  ScrollText,
  Trophy,
  TrendingUp,
  Users,
  Radio,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { PageTransition } from "../../_components/page-transition";
import { ConnectWalletModal } from "../../_components/connect-wallet-modal";
import { OnboardingModal } from "../../_components/onboarding-modal";
import {
  getMatch,
  getLineup,
  getUser,
  getLeaderboard,
  isValidPda,
  formatUsdc,
  formatWallet,
  calculatePrizes,
  openMatchEventsStream,
  openLeaderboardStream,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
  type UserProfile,
  type Leaderboard,
  type EventEntry,
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
      teamName: "Demo City",
      players: [
        { id: 1001, name: "A. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper" },
        { id: 1002, name: "B. Right Back", number: "2", starter: true, positionId: 2, position: "Defender" },
        { id: 1003, name: "C. Center Back", number: "4", starter: true, positionId: 2, position: "Defender" },
        { id: 1004, name: "D. Center Back", number: "5", starter: true, positionId: 2, position: "Defender" },
        { id: 1005, name: "E. Left Back", number: "3", starter: true, positionId: 2, position: "Defender" },
        { id: 1006, name: "F. Midfielder", number: "6", starter: true, positionId: 3, position: "Midfielder" },
        { id: 1007, name: "G. Midfielder", number: "8", starter: true, positionId: 3, position: "Midfielder" },
        { id: 1008, name: "H. Winger", number: "7", starter: true, positionId: 3, position: "Midfielder" },
        { id: 1009, name: "I. Winger", number: "11", starter: true, positionId: 3, position: "Midfielder" },
        { id: 1010, name: "J. Forward", number: "9", starter: true, positionId: 4, position: "Forward" },
        { id: 1011, name: "K. Forward", number: "10", starter: true, positionId: 4, position: "Forward" },
        { id: 1012, name: "L. Sub GK", number: "21", starter: false, positionId: 1, position: "Goalkeeper" },
        { id: 1013, name: "M. Sub DF", number: "22", starter: false, positionId: 2, position: "Defender" },
        { id: 1014, name: "N. Sub MF", number: "23", starter: false, positionId: 3, position: "Midfielder" },
        { id: 1015, name: "O. Sub FW", number: "24", starter: false, positionId: 4, position: "Forward" },
      ],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "Practice Town",
      players: [
        { id: 2001, name: "P. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper" },
        { id: 2002, name: "Q. Right Back", number: "2", starter: true, positionId: 2, position: "Defender" },
        { id: 2003, name: "R. Center Back", number: "4", starter: true, positionId: 2, position: "Defender" },
        { id: 2004, name: "S. Center Back", number: "5", starter: true, positionId: 2, position: "Defender" },
        { id: 2005, name: "T. Left Back", number: "3", starter: true, positionId: 2, position: "Defender" },
        { id: 2006, name: "U. Midfielder", number: "6", starter: true, positionId: 3, position: "Midfielder" },
        { id: 2007, name: "V. Midfielder", number: "8", starter: true, positionId: 3, position: "Midfielder" },
        { id: 2008, name: "W. Winger", number: "7", starter: true, positionId: 3, position: "Midfielder" },
        { id: 2009, name: "X. Winger", number: "11", starter: true, positionId: 3, position: "Midfielder" },
        { id: 2010, name: "Y. Forward", number: "9", starter: true, positionId: 4, position: "Forward" },
        { id: 2011, name: "Z. Forward", number: "10", starter: true, positionId: 4, position: "Forward" },
        { id: 2012, name: "AA. Sub GK", number: "21", starter: false, positionId: 1, position: "Goalkeeper" },
        { id: 2013, name: "AB. Sub DF", number: "22", starter: false, positionId: 2, position: "Defender" },
        { id: 2014, name: "AC. Sub MF", number: "23", starter: false, positionId: 3, position: "Midfielder" },
        { id: 2015, name: "AD. Sub FW", number: "24", starter: false, positionId: 4, position: "Forward" },
      ],
    },
  ],
  names: {},
};

const DEMO_LEADERBOARD: Leaderboard = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  final: false,
  winners: [null, null, null],
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
    {
      owner: "9ycQEcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR",
      points: 3,
      earliestScoringLockMinute: 58,
      user: { username: "newbie", avatar: "avatar-6" },
      predictions: [],
    },
  ],
};

const DEMO_EVENTS: EventEntry[] = [
  { id: "1", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "2", type: "goal", payload: { team: "Demo City", minute: 34 } },
  { id: "3", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
  { id: "4", type: "substitution", payload: { team: "Practice Town", minute: 56 } },
  { id: "5", type: "prediction", payload: { user: "newbie", points: 3, kind: 3 } },
];

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

type ModeKey = "sub" | "score";

const MODES: {
  key: ModeKey | "result";
  title: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
  color: "purple" | "cyan" | "foreground";
}[] = [
  {
    key: "sub",
    icon: <Target size={28} />,
    title: "Substitute Manager",
    description: "Predict who comes in and who goes out.",
    meta: "1 pt · 3 pts",
    color: "purple",
  },
  {
    key: "score",
    icon: <BarChart3 size={28} />,
    title: "Final Score",
    description: "Call the exact scoreline or winning side.",
    meta: "3 pts · 5 pts",
    color: "cyan",
  },
  {
    key: "result",
    icon: <ScrollText size={28} />,
    title: "Match Results",
    description: "Final score, winners, and prize breakdown.",
    meta: "Settlement",
    color: "foreground",
  },
];

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
  const [pendingMode, setPendingMode] = useState<ModeKey | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(
    isDemo ? DEMO_LEADERBOARD : null
  );
  const [events, setEvents] = useState<EventEntry[]>(isDemo ? DEMO_EVENTS : []);

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

  useEffect(() => {
    if (isDemo || isSeed) return;
    let source: EventSource | null = null;
    getLeaderboard(pda)
      .then(setLeaderboard)
      .catch(() => setLeaderboard(null));
    source = openLeaderboardStream(pda, {
      onUpdate: (data) => setLeaderboard(data),
      onError: () => {},
    });
    return () => source?.close();
  }, [pda, isDemo, isSeed]);

  useEffect(() => {
    if (isDemo || isSeed) return;
    let source: EventSource | null = null;
    source = openMatchEventsStream(pda, {
      onEvent: (entry) => {
        setEvents((prev) => {
          if (prev.some((e) => e.id === entry.id)) return prev;
          return [entry, ...prev].slice(0, 20);
        });
      },
    });
    return () => source?.close();
  }, [pda, isDemo, isSeed]);

  async function loadMatch() {
    setLoading(true);
    setError(null);
    try {
      // Lineup can lag match ingestion — treat it as optional so a missing
      // lineup doesn't blank out an otherwise-loadable match.
      const [m, l] = await Promise.all([
        getMatch(pda),
        getLineup(pda).catch(() => null),
      ]);
      setMatch(m);
      setLineup(l);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to load match.";
      // The read API 404s for matches whose fixture hasn't been ingested into
      // the live feed yet — show a friendly explanation instead of the raw error.
      setError(
        /no match found/i.test(raw)
          ? "This match isn't live yet. It becomes available once the fixture is ingested near kickoff."
          : raw
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectMode(mode: ModeKey | "result") {
    if (mode === "result") {
      router.push(`/matches/${pda}/settlement`);
      return;
    }
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

  if (error || !match) {
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

  // Match loaded but lineups haven't been published yet — distinct, non-error state.
  if (!lineup) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <Users className="mb-4 text-muted" size={48} />
          <h2 className="font-display text-2xl text-foreground">Lineups Not Out Yet</h2>
          <p className="mt-2 text-muted">
            Team sheets are usually published close to kickoff. Check back soon to make your picks.
          </p>
          <button
            onClick={loadMatch}
            className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            <RefreshCw size={16} /> Refresh
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
        <MatchHero
          team1={team1}
          team2={team2}
          score={score}
          minute={minute}
          isLive={isLive}
          status={status}
          isDemo={isDemo}
          isSeed={isSeed}
          connected={connected}
          poolTotal={poolTotal}
          entryFee={entryFee}
          participantCount={participantCount}
          prizes={prizes}
        />

        {/* Mode selector */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MODES.map((mode, i) => (
            <ModeCard
              key={mode.key}
              mode={mode}
              delay={i * 0.05}
              onClick={() => handleSelectMode(mode.key)}
            />
          ))}
        </div>

        {/* Info cards */}
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <LeaderboardCard leaderboard={leaderboard} poolTotal={poolTotal} />
          <EventsCard events={events} />
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

function MatchHero({
  team1,
  team2,
  score,
  minute,
  isLive,
  status,
  isDemo,
  isSeed,
  connected,
  poolTotal,
  entryFee,
  participantCount,
  prizes,
}: {
  team1?: Lineup["teams"][number];
  team2?: Lineup["teams"][number];
  score: { team1: number; team2: number };
  minute: number;
  isLive: boolean;
  status: string;
  isDemo: boolean;
  isSeed: boolean;
  connected: boolean;
  poolTotal: string;
  entryFee: string;
  participantCount: number;
  prizes: { total: number; first: number; second: number; third: number };
}) {
  return (
    <PageTransition
      className="group relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-surface p-6 sm:min-h-[300px] sm:p-8"
    >
      <div className="card-shine" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
          {isLive && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose" />
            </span>
          )}
          <span>{isLive ? `${minute}' LIVE` : formatStatus(status)}</span>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-12 lg:gap-16">
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamFlagBadge name={team1?.teamName ?? "Home"} side={1} size="lg" />
            <span className="max-w-[140px] text-center font-display text-xs uppercase tracking-wider text-foreground md:text-sm">
              {team1?.teamName ?? "Home"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-display text-5xl text-foreground md:text-6xl lg:text-7xl">
            <span>{score.team1}</span>
            <span className="text-muted">-</span>
            <span>{score.team2}</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2">
            <TeamFlagBadge name={team2?.teamName ?? "Away"} side={2} size="lg" />
            <span className="max-w-[140px] text-center font-display text-xs uppercase tracking-wider text-foreground md:text-sm">
              {team2?.teamName ?? "Away"}
            </span>
          </div>
        </div>
      </div>

      {/* Match details bar */}
      <div className="relative z-10 mt-4 border-t border-surface pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-muted">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={12} className="text-cyan" />
              Pool <span className="text-foreground">${formatUsdc(poolTotal)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet size={12} className="text-cyan" />
              Entry <span className="text-foreground">${formatUsdc(entryFee)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} className="text-cyan" />
              Players <span className="text-foreground">{participantCount}</span>
            </span>
            {participantCount < 3 ? (
              <span className="inline-flex items-center gap-1.5 text-gold">
                <TrendingUp size={12} />
                Winner Takes All
              </span>
            ) : (
              <span className="text-foreground">
                Net ${formatUsdc(String(Math.round(prizes.total)))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isDemo && (
              <span className="inline-flex items-center gap-1.5 text-gold">
                <Sparkles size={12} /> Demo
              </span>
            )}
            {isSeed && !isDemo && (
              <span className="inline-flex items-center gap-1.5 text-cyan">
                <Zap size={12} /> Devnet
              </span>
            )}
            {!isDemo && !connected && (
              <span className="inline-flex items-center gap-1.5 text-gold">
                <Wallet size={12} /> Connect
              </span>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function ModeCard({
  mode,
  delay,
  onClick,
}: {
  mode: (typeof MODES)[number];
  delay: number;
  onClick: () => void;
}) {
  const colorStyles = {
    purple: "border-purple/30 bg-surface text-foreground hover:border-purple hover:bg-purple hover:text-white",
    cyan: "border-cyan/30 bg-surface text-foreground hover:border-cyan hover:bg-cyan hover:text-background",
    foreground: "border-foreground/30 bg-surface text-foreground hover:border-foreground hover:bg-foreground hover:text-background",
  };

  const iconColors = {
    purple: "text-purple group-hover:text-white",
    cyan: "text-cyan group-hover:text-background",
    foreground: "text-foreground group-hover:text-background",
  };

  return (
    <PageTransition
      delay={delay}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-3 overflow-hidden border p-5 text-left transition-all sm:p-6",
        colorStyles[mode.color]
      )}
    >
      <div className="card-shine" />
      <div className={cn("transition-colors", iconColors[mode.color])}>{mode.icon}</div>
      <div className="relative z-10">
        <h3 className="font-display text-base uppercase tracking-wider">{mode.title}</h3>
        <p className="mt-1 text-xs text-muted group-hover:text-current/80">{mode.description}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-current/70">
          {mode.meta}
        </p>
      </div>
      <div className="mt-auto flex w-full items-center justify-end">
        <ArrowRight
          size={16}
          className="transition-transform group-hover:translate-x-1"
        />
      </div>
    </PageTransition>
  );
}

function LeaderboardCard({
  leaderboard,
  poolTotal,
}: {
  leaderboard: Leaderboard | null;
  poolTotal: string;
}) {
  const prizes = calculatePrizes(poolTotal);
  return (
    <PageTransition
      delay={0.2}
      className="group relative flex min-h-0 flex-col gap-4 overflow-hidden bg-surface p-5"
    >
      <div className="card-shine" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-background text-gold">
            <Users size={18} />
          </div>
          <h2 className="font-display text-lg text-foreground">Leaderboard</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Top {Math.min(5, leaderboard?.ranking.length ?? 0)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!leaderboard || leaderboard.ranking.length === 0 ? (
          <p className="text-sm text-muted">No rankings yet. Be the first to predict.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.ranking.slice(0, 5).map((r, i) => {
              const label = r.user?.username ?? formatWallet(r.owner);
              const prize =
                i === 0 ? prizes.first : i === 1 ? prizes.second : i === 2 ? prizes.third : 0;
              return (
                <div
                  key={r.owner + i}
                  className="flex items-center justify-between bg-background/50 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center text-[10px] font-bold",
                        i === 0
                          ? "bg-gold text-background"
                          : i === 1
                          ? "bg-foreground text-background"
                          : i === 2
                          ? "bg-bronze text-background"
                          : "bg-surface text-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate font-bold text-foreground">{label}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono font-bold text-cyan">{r.points} pts</span>
                    {prize > 0 && (
                      <span className="text-[10px] font-bold text-gold">
                        ${formatUsdc(String(Math.round(prize)))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function EventsCard({ events }: { events: EventEntry[] }) {
  return (
    <PageTransition
      delay={0.25}
      className="group relative flex min-h-0 flex-col gap-4 overflow-hidden bg-surface p-5"
    >
      <div className="card-shine" />
      <div className="relative flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center bg-background text-foreground">
          <Radio size={18} />
        </div>
        <h2 className="font-display text-lg text-foreground">Live Events</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {events.slice(0, 6).map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-background/50 p-2 text-[10px]"
                >
                  <span className="font-bold uppercase tracking-wider text-foreground">
                    {entry.type}
                  </span>
                  <span className="text-muted">{formatEventPayload(entry)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function formatEventPayload(entry: EventEntry): string {
  const p = entry.payload as Record<string, unknown> | null;
  if (!p) return "";
  if (p.user && typeof p.points === "number") {
    return `${p.user} +${p.points} pts`;
  }
  if (p.team && typeof p.minute === "number") {
    return `${p.team} ${p.minute}'`;
  }
  return Object.values(p).slice(0, 2).join(" ");
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
  const sizeClass = size === "lg" ? "h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20" : "h-12 w-12 md:h-14 md:w-14";
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
        "flex items-center justify-center border-2 text-lg font-bold md:text-xl",
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
