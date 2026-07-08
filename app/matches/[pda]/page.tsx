"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Wallet,
  Target,
  ScrollText,
  Trophy,
  TrendingUp,
  Users,
  Sparkles,
  Zap,
  ArrowRight,
  X,
} from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { PageTransition } from "../../_components/page-transition";
import { ConnectWalletModal } from "../../_components/connect-wallet-modal";
import { OnboardingModal } from "../../_components/onboarding-modal";
import { TeamBadge } from "../../_components/team-badge";
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
      teamName: "Portugal",
      formation: "4-3-3",
      players: [
        { id: 1001, name: "Diogo Costa", number: "22", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: true },
        { id: 1002, name: "João Cancelo", number: "2", starter: true, positionId: 2, position: "Defender", positionCode: "RB", onPitch: true },
        { id: 1003, name: "Rúben Dias", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", onPitch: true },
        { id: 1004, name: "Gonçalo Inácio", number: "14", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", onPitch: true },
        { id: 1005, name: "Nuno Mendes", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", onPitch: true },
        { id: 1006, name: "João Neves", number: "6", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", onPitch: true },
        { id: 1007, name: "Bruno Fernandes", number: "8", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", onPitch: true },
        { id: 1008, name: "Vitinha", number: "23", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", onPitch: true },
        { id: 1009, name: "Bernardo Silva", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", onPitch: true },
        { id: 1010, name: "Cristiano Ronaldo", number: "7", starter: true, positionId: 4, position: "Forward", positionCode: "ST", onPitch: true },
        { id: 1011, name: "Rafael Leão", number: "17", starter: true, positionId: 4, position: "Forward", positionCode: "LW", onPitch: true },
        { id: 1101, name: "Rui Patrício", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 1102, name: "Pepe", number: "5", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 1103, name: "Danilo Pereira", number: "13", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1104, name: "Rúben Neves", number: "18", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1105, name: "Otávio", number: "15", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1106, name: "Gonçalo Ramos", number: "9", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
      ],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "Argentina",
      formation: "4-3-3",
      players: [
        { id: 2001, name: "Emiliano Martínez", number: "23", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: true },
        { id: 2002, name: "Nahuel Molina", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RB", onPitch: true },
        { id: 2003, name: "Cristian Romero", number: "13", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", onPitch: true },
        { id: 2004, name: "Nicolás Otamendi", number: "19", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", onPitch: true },
        { id: 2005, name: "Nicolás Tagliafico", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", onPitch: true },
        { id: 2006, name: "Rodrigo De Paul", number: "7", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", onPitch: true },
        { id: 2007, name: "Enzo Fernández", number: "24", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", onPitch: true },
        { id: 2008, name: "Alexis Mac Allister", number: "20", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", onPitch: true },
        { id: 2009, name: "Lionel Messi", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", onPitch: true },
        { id: 2010, name: "Julián Álvarez", number: "9", starter: true, positionId: 4, position: "Forward", positionCode: "ST", onPitch: true },
        { id: 2011, name: "Ángel Di María", number: "11", starter: true, positionId: 4, position: "Forward", positionCode: "LW", onPitch: true },
        { id: 2101, name: "Franco Armani", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 2102, name: "Lisandro Martínez", number: "25", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 2103, name: "Leandro Paredes", number: "5", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2104, name: "Giovani Lo Celso", number: "16", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2105, name: "Lautaro Martínez", number: "22", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
        { id: 2106, name: "Paulo Dybala", number: "21", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
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
  { id: "1", type: "goal", payload: { minute: 24, side: 1 }, players: { out: null, in: { id: 1010, name: "Cristiano Ronaldo", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "3", type: "goal", payload: { minute: 38, side: 2 }, players: { out: null, in: { id: 2009, name: "Lionel Messi", number: "10", positionId: 4, position: "Forward", side: 2 } } },
  { id: "4", type: "yellow_card", payload: { minute: 41, side: 1 }, players: { out: null, in: { id: 1003, name: "Rúben Dias", number: "4", positionId: 2, position: "Defender", side: 1 } } },
  { id: "5", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
  { id: "6", type: "goal", payload: { minute: 57, side: 1 }, players: { out: null, in: { id: 1009, name: "Bernardo Silva", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "7", type: "substitution", payload: { minute: 63, side: 1 }, players: { out: { id: 1010, name: "Cristiano Ronaldo", number: "7", positionId: 4, position: "Forward", side: 1 }, in: { id: 1106, name: "Gonçalo Ramos", number: "9", positionId: 4, position: "Forward", side: 1 } } },
  { id: "8", type: "prediction", payload: { user: "newbie", points: 3, kind: 3 } },
];

const DEMO_SETTLED_PDA = "demo-settled";

const DEMO_SETTLED_MATCH: MatchState = {
  fixtureId: 888888,
  onchain: {
    status: 2,
    statusLabel: "SETTLED",
    settled: true,
    entryFee: "1000000",
    poolTotal: "8000000",
    participantCount: 8,
    team1Id: 301,
    team2Id: 302,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt"],
  },
  live: { statusId: 0, minute: 90, goals: { team1: 2, team2: 1 }, ts: Date.now() },
  updatedAt: Date.now(),
};

const DEMO_SETTLED_LINEUP: Lineup = {
  fixtureId: 888888,
  updatedAt: Date.now(),
  teams: [
    { side: 1, teamId: 301, teamName: "France", formation: "4-3-3", players: [] },
    { side: 2, teamId: 302, teamName: "Spain", formation: "4-3-3", players: [] },
  ],
  names: {},
};

const DEMO_SETTLED_LEADERBOARD: Leaderboard = {
  fixtureId: 888888,
  updatedAt: Date.now(),
  final: true,
  winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt"],
  ranking: [
    { owner: "EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", points: 15, earliestScoringLockMinute: 18, user: { username: "demoking", avatar: "avatar-1" }, predictions: [] },
    { owner: "FgTRT58ktiDtXZZw5uZc3NhXgstPbPPTj9R8YVwhZFx7", points: 11, earliestScoringLockMinute: 25, user: { username: "rivalX", avatar: "avatar-3" }, predictions: [] },
    { owner: "24CHvVUj1WHDJo5mNNPTDA7iMtXtAojdND9DpWmqdFWt", points: 8, earliestScoringLockMinute: 42, user: null, predictions: [] },
  ],
};

const DEMO_SETTLED_EVENTS: EventEntry[] = [
  { id: "s1", type: "goal", payload: { minute: 18, side: 1 }, players: { out: null, in: { id: 3001, name: "Kylian Mbappé", number: "10", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s2", type: "prediction", payload: { user: "demoking", points: 3, kind: 2 } },
  { id: "s3", type: "goal", payload: { minute: 34, side: 2 }, players: { out: null, in: { id: 4001, name: "Lamine Yamal", number: "19", positionId: 4, position: "Forward", side: 2 } } },
  { id: "s4", type: "yellow_card", payload: { minute: 52, side: 1 }, players: { out: null, in: { id: 3002, name: "Aurélien Tchouaméni", number: "8", positionId: 3, position: "Midfielder", side: 1 } } },
  { id: "s5", type: "goal", payload: { minute: 67, side: 1 }, players: { out: null, in: { id: 3003, name: "Antoine Griezmann", number: "7", positionId: 4, position: "Forward", side: 1 } } },
  { id: "s6", type: "substitution", payload: { minute: 75, side: 2 }, players: { out: { id: 4002, name: "Álvaro Morata", number: "9", positionId: 4, position: "Forward", side: 2 }, in: { id: 4003, name: "Mikel Oyarzabal", number: "21", positionId: 4, position: "Forward", side: 2 } } },
  { id: "s7", type: "prediction", payload: { user: "rivalX", points: 1, kind: 0 } },
];

type ModeKey = "sub" | "score";

export default function MatchDetails() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const isSeed =
    rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const isDemoSettled = rawPda === DEMO_SETTLED_PDA;
  const pda = isDemo ? DEMO_PDA : isDemoSettled ? DEMO_SETTLED_PDA : rawPda;
  const { connected, publicKey } = useWallet();

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo ? DEMO_MATCH : isSeed ? SEED_MATCH_STATE : isDemoSettled ? DEMO_SETTLED_MATCH : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : isDemoSettled ? DEMO_SETTLED_LINEUP : null
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed && !isDemoSettled);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingMode, setPendingMode] = useState<ModeKey | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(
    isDemo ? DEMO_LEADERBOARD : isDemoSettled ? DEMO_SETTLED_LEADERBOARD : null
  );
  const [events, setEvents] = useState<EventEntry[]>(
    isDemo ? DEMO_EVENTS : isDemoSettled ? DEMO_SETTLED_EVENTS : []
  );

  useEffect(() => {
    if (isDemo || isSeed || isDemoSettled) return;
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
  const settled = match.onchain?.settled ?? false;

  return (
    <PageShell>
      <div className="flex flex-1 flex-col gap-6">
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

        {settled ? (
          /* Settled: 2 cards — logs preview + match results preview */
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <LogsPreviewCard events={events} pda={pda} />
            <ResultsPreviewCard
              leaderboard={leaderboard}
              prizes={prizes}
              pda={pda}
              team1Name={team1?.teamName ?? "Home"}
              team2Name={team2?.teamName ?? "Away"}
              score={score}
            />
          </div>
        ) : (
          /* Open/Live: 2 cards — vault details + enter match */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <VaultCard
              poolTotal={poolTotal}
              entryFee={entryFee}
              participantCount={participantCount}
              prizes={prizes}
              onClick={() => setShowVaultModal(true)}
            />
            <EnterCard
              isLive={isLive}
              isDemo={isDemo}
              onClick={() => handleSelectMode("score")}
            />
          </div>
        )}
      </div>

      <VaultModal
        open={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        poolTotal={poolTotal}
        entryFee={entryFee}
        participantCount={participantCount}
        prizes={prizes}
      />

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
            <TeamBadge name={team1?.teamName ?? "Home"} size="xl" />
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
            <TeamBadge name={team2?.teamName ?? "Away"} size="xl" />
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

function VaultCard({
  poolTotal,
  entryFee,
  participantCount,
  prizes,
  onClick,
}: {
  poolTotal: string;
  entryFee: string;
  participantCount: number;
  prizes: { total: number; first: number; second: number; third: number };
  onClick: () => void;
}) {
  return (
    <PageTransition
      delay={0.1}
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col gap-4 overflow-hidden bg-surface p-5 transition-all hover:bg-surface-elevated sm:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-gold/50 to-gold" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-background text-gold">
            <Wallet size={18} />
          </div>
          <h2 className="font-display text-lg text-foreground">Vault</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Details →</span>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Pool</span>
          <span className="font-mono font-bold text-cyan">${formatUsdc(poolTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Entry</span>
          <span className="font-mono font-bold text-foreground">${formatUsdc(entryFee)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Players</span>
          <span className="font-mono font-bold text-foreground">{participantCount}</span>
        </div>
        <div className="border-t border-surface pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">1st</span>
            <span className="font-mono font-bold text-gold">${formatUsdc(String(Math.round(prizes.first)))}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted">2nd</span>
            <span className="font-mono font-bold text-foreground">${formatUsdc(String(Math.round(prizes.second)))}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted">3rd</span>
            <span className="font-mono font-bold text-bronze">${formatUsdc(String(Math.round(prizes.third)))}</span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function EnterCard({
  isLive,
  isDemo,
  onClick,
}: {
  isLive: boolean;
  isDemo: boolean;
  onClick: () => void;
}) {
  return (
    <PageTransition
      delay={0.15}
      className="group relative flex flex-col items-center justify-center gap-6 overflow-hidden bg-surface p-5 sm:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center bg-background text-purple transition-colors group-hover:bg-purple group-hover:text-white">
          <Target size={24} />
        </div>
        <h2 className="font-display text-xl text-foreground">
          {isLive ? "Enter Live Match" : "Enter Match"}
        </h2>
        <p className="max-w-xs text-sm text-muted">
          {isLive
            ? "Predict the score, subs, and goalscorers as the match unfolds."
            : "Lock your predictions before kickoff."}
        </p>
      </div>
      <button
        onClick={onClick}
        className="btn-gradient flex h-12 items-center px-10 font-display text-sm uppercase tracking-[0.1em] text-white"
      >
        {isDemo ? "Try Demo" : "Enter"}
        <ArrowRight size={16} className="ml-2" />
      </button>
    </PageTransition>
  );
}

function VaultModal({
  open,
  onClose,
  poolTotal,
  entryFee,
  participantCount,
  prizes,
}: {
  open: boolean;
  onClose: () => void;
  poolTotal: string;
  entryFee: string;
  participantCount: number;
  prizes: { total: number; first: number; second: number; third: number };
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-foreground/60" />
          <motion.div
            layout
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="px-8 py-8">
              <h2 className="font-display text-2xl text-foreground">Vault Details</h2>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">Prize pool breakdown</p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Total Pool</span>
                  <span className="font-mono font-bold text-cyan">${formatUsdc(poolTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Entry Fee</span>
                  <span className="font-mono font-bold text-foreground">${formatUsdc(entryFee)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Participants</span>
                  <span className="font-mono font-bold text-foreground">{participantCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Platform Fee</span>
                  <span className="font-mono font-bold text-foreground">20%</span>
                </div>
                <div className="flex items-center justify-between border-t border-surface pt-3 text-sm">
                  <span className="text-muted">Net Prize Pool</span>
                  <span className="font-mono font-bold text-cyan">${formatUsdc(String(Math.round(prizes.total)))}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Prize Distribution</p>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-gold">
                    <span className="flex h-5 w-5 items-center justify-center bg-gold text-[10px] text-background">1</span>
                    1st Place
                  </span>
                  <span className="font-mono font-bold text-foreground">${formatUsdc(String(Math.round(prizes.first)))}</span>
                </div>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center bg-foreground text-[10px] text-background">2</span>
                    2nd Place
                  </span>
                  <span className="font-mono font-bold text-foreground">${formatUsdc(String(Math.round(prizes.second)))}</span>
                </div>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-bronze">
                    <span className="flex h-5 w-5 items-center justify-center bg-bronze text-[10px] text-background">3</span>
                    3rd Place
                  </span>
                  <span className="font-mono font-bold text-foreground">${formatUsdc(String(Math.round(prizes.third)))}</span>
                </div>
              </div>

              {participantCount < 3 && (
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-wider text-gold">
                  Winner Takes All (fewer than 3 participants)
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LogsPreviewCard({
  events,
  pda,
}: {
  events: EventEntry[];
  pda: string;
}) {
  return (
    <PageTransition
      delay={0.1}
      className="group relative flex min-h-0 flex-col gap-4 overflow-hidden bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-background text-foreground">
            <ScrollText size={18} />
          </div>
          <h2 className="font-display text-lg text-foreground">Match Logs</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {events.length} events
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {events.slice(0, 5).map((entry) => (
          <div key={entry.id} className="flex items-center justify-between bg-background/50 p-2 text-[10px]">
            <span className="font-bold uppercase tracking-wider text-foreground">{formatType(entry.type)}</span>
            <span className="truncate text-muted">{formatEventPayload(entry)}</span>
          </div>
        ))}
        {events.length === 0 && <p className="text-sm text-muted">No events recorded.</p>}
      </div>

      <Link
        href={`/matches/${pda}/logs`}
        className="mt-auto flex items-center justify-center gap-2 border border-surface bg-background py-3 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:border-purple hover:text-foreground"
      >
        View Full Logs <ArrowRight size={14} />
      </Link>
    </PageTransition>
  );
}

function ResultsPreviewCard({
  leaderboard,
  prizes,
  pda,
  team1Name,
  team2Name,
  score,
}: {
  leaderboard: Leaderboard | null;
  prizes: { total: number; first: number; second: number; third: number };
  pda: string;
  team1Name: string;
  team2Name: string;
  score: { team1: number; team2: number };
}) {
  const winner = score.team1 > score.team2 ? team1Name : score.team2 > score.team1 ? team2Name : "Draw";
  const topRanks = leaderboard?.ranking.slice(0, 3) ?? [];

  return (
    <PageTransition
      delay={0.15}
      className="group relative flex min-h-0 flex-col gap-4 overflow-hidden bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-background text-gold">
            <Trophy size={18} />
          </div>
          <h2 className="font-display text-lg text-foreground">Match Results</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Settled</span>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Final Score</span>
          <span className="font-display text-lg text-foreground">{score.team1} - {score.team2}</span>
        </div>
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Winner</span>
          <span className="font-bold text-cyan">{winner}</span>
        </div>
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Prize Pool</span>
          <span className="font-mono font-bold text-gold">${formatUsdc(String(Math.round(prizes.total)))}</span>
        </div>
        {topRanks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Top Winners</p>
            {topRanks.map((r, i) => (
              <div key={r.owner + i} className="flex items-center justify-between bg-background/50 p-2 text-xs">
                <span className="truncate font-bold text-foreground">
                  {r.user?.username ?? formatWallet(r.owner)}
                </span>
                <span className="font-mono font-bold text-cyan">{r.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href={`/matches/${pda}/settlement`}
        className="mt-auto flex items-center justify-center gap-2 border border-surface bg-background py-3 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:border-purple hover:text-foreground"
      >
        View Full Results <ArrowRight size={14} />
      </Link>
    </PageTransition>
  );
}

function formatEventPayload(entry: EventEntry): string {
  const p = entry.payload as Record<string, unknown> | null;
  if (!p) return "";
  if (p.user && typeof p.points === "number") {
    return `${p.user} +${p.points} pts`;
  }
  if (p.minute && (p.side || p.team)) {
    return `${p.minute}'`;
  }
  return Object.values(p).slice(0, 2).join(" ");
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
