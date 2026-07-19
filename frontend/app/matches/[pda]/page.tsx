"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  RefreshCw,
  Wallet,
  ScrollText,
  Trophy,
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
import { EnterMatchModal } from "../../_components/enter-match-modal";
import { TeamBadge } from "../../_components/team-badge";
import {
  getMatch,
  getLineup,
  getUser,
  getEntryStatus,
  getLeaderboard,
  isValidPda,
  formatUsdc,
  formatWallet,
  calculatePrizes,
  displayScore,
  isTerminalPhase,
  entryOpensAt,
  PHASE_LABEL,
  openMatchEventsStream,
  openLeaderboardStream,
  SOCCIT_SEED_MATCH_PDA,
  type MatchState,
  type Score,
  type Lineup,
  type UserProfile,
  type Leaderboard,
  type EventEntry,
} from "../../_lib/api";
import {
  DEMO_PDA,
  DEMO_SETTLED_PDA,
  DEMO_MATCH_STATE as DEMO_MATCH,
  DEMO_LINEUP,
  DEMO_LEADERBOARD,
  DEMO_EVENTS,
  DEMO_SETTLED_MATCH_STATE as DEMO_SETTLED_MATCH,
  DEMO_SETTLED_LINEUP,
  DEMO_SETTLED_LEADERBOARD,
  DEMO_SETTLED_EVENTS,
  SEED_MATCH_STATE,
} from "../../_lib/demo-data";
import { useWallet } from "@solana/wallet-adapter-react";

type ModeKey = "sub" | "score";
type EntryState = "checking" | "entered" | "not-entered" | "error";

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
    isDemo
      ? DEMO_MATCH
      : isSeed
        ? SEED_MATCH_STATE
        : isDemoSettled
          ? DEMO_SETTLED_MATCH
          : null,
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : isDemoSettled ? DEMO_SETTLED_LINEUP : null,
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed && !isDemoSettled);
  const [error, setError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [entryState, setEntryState] = useState<EntryState>(
    isDemo ? "entered" : "not-entered",
  );
  const hasEntered = entryState === "entered";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingMode, setPendingMode] = useState<ModeKey | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(
    isDemo ? DEMO_LEADERBOARD : isDemoSettled ? DEMO_SETTLED_LEADERBOARD : null,
  );
  const [events, setEvents] = useState<EventEntry[]>(
    isDemo ? DEMO_EVENTS : isDemoSettled ? DEMO_SETTLED_EVENTS : [],
  );
  const [nowSecs, setNowSecs] = useState(() => Math.floor(Date.now() / 1000));

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
    if (isDemo) {
      setEntryState("entered");
      return;
    }
    if (!connected || !publicKey || !isValidPda(pda)) {
      setEntryState("not-entered");
      return;
    }

    let cancelled = false;
    setEntryState("checking");
    getEntryStatus(pda, publicKey.toBase58())
      .then((entry) => {
        if (!cancelled) setEntryState(entry.entered ? "entered" : "not-entered");
      })
      .catch(() => {
        if (!cancelled) setEntryState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, pda, isDemo]);

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

  const opensAt =
    !isDemo && !isSeed && !isDemoSettled && match?.phase === "UPCOMING"
      ? entryOpensAt(match.onchain?.startTime ?? 0)
      : null;
  const entriesPending = opensAt !== null && opensAt > nowSecs;
  useEffect(() => {
    if (!entriesPending) return;
    const id = setInterval(
      () => setNowSecs(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [entriesPending]);

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
          : raw,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectMode(mode: ModeKey | "result") {
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
    if (entryState === "checking") return;
    if (entryState === "error" && publicKey) {
      setEntryState("checking");
      try {
        const entry = await getEntryStatus(pda, publicKey.toBase58());
        if (entry.entered) {
          setEntryState("entered");
          router.push(`/matches/${pda}/arena?model=${mode}`);
          return;
        }
        setEntryState("not-entered");
      } catch {
        setEntryState("error");
        return;
      }
    }
    // Real match: open the Enter Match modal.
    // If already entered, route directly to the arena.
    if (hasEntered) {
      router.push(`/matches/${pda}/arena?model=${mode}`);
      return;
    }
    setPendingMode(mode);
    setShowEnterModal(true);
  }

  function handleEntered() {
    const mode = pendingMode ?? "score";
    setEntryState("entered");
    setShowEnterModal(false);
    setPendingMode(null);
    router.push(`/matches/${pda}/arena?model=${mode}`);
  }

  function handleOnboardingSuccess() {
    setShowOnboarding(false);
    if (pendingMode) {
      // After onboarding, open the Enter Match modal (user still needs to pay entry fee)
      setShowEnterModal(true);
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
          <h2 className="font-display text-2xl text-foreground">
            Match Not Available
          </h2>
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
          <h2 className="font-display text-2xl text-foreground">
            Lineups Not Out Yet
          </h2>
          <p className="mt-2 text-muted">
            Team sheets are usually published close to kickoff. Check back soon
            to make your picks.
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
  const score = displayScore(match);
  const minute = match.live?.minute ?? 0;
  const isLive = match.phase === "LIVE";
  const status = match.onchain?.statusLabel ?? "UNKNOWN";
  const poolTotal = match.onchain?.poolTotal ?? "0";
  const entryFee = match.onchain?.entryFee ?? "0";
  const participantCount = match.onchain?.participantCount ?? 0;
  const prizes = calculatePrizes(poolTotal);
  // Terminal = full-time reached (FINISHED/RESOLVED/SETTLED), not just on-chain
  // `settled`. A FINISHED match reports on-chain OPEN but must show the results
  // view, never the enter card. Fall back to `settled` for demo/seed states
  // that carry no phase.
  const isEnded = match.phase
    ? isTerminalPhase(match.phase)
    : (match.onchain?.settled ?? false);

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
          phase={match.phase ?? null}
          isDemo={isDemo}
          isSeed={isSeed}
          connected={connected}
        />

        {isEnded ? (
          /* Settled: 2 cards — logs preview + match results preview */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              hasEntered={hasEntered}
              entryChecking={entryState === "checking"}
              entryError={entryState === "error"}
              entriesPending={entriesPending}
              opensInSecs={entriesPending ? opensAt! - nowSecs : 0}
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

      <EnterMatchModal
        open={showEnterModal}
        onClose={() => {
          setShowEnterModal(false);
          setPendingMode(null);
        }}
        entryFee={entryFee}
        poolTotal={poolTotal}
        participantCount={participantCount}
        team1Name={team1?.teamName ?? "Home"}
        team2Name={team2?.teamName ?? "Away"}
        fixtureId={match?.fixtureId ?? 0}
        matchPda={pda}
        isDemo={isDemo}
        onEntered={handleEntered}
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
  phase,
  isDemo,
  isSeed,
  connected,
}: {
  team1?: Lineup["teams"][number];
  team2?: Lineup["teams"][number];
  score: Score | null;
  minute: number;
  isLive: boolean;
  status: string;
  phase: MatchState["phase"];
  isDemo: boolean;
  isSeed: boolean;
  connected: boolean;
}) {
  return (
    <PageTransition className="group relative flex min-h-[260px] flex-col justify-center overflow-hidden bg-surface p-6 sm:min-h-[300px] sm:p-8">
      <div className="card-shine" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
          {isLive && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose" />
            </span>
          )}
          <span>
            {isLive
              ? `${minute}' LIVE`
              : phase
                ? PHASE_LABEL[phase]
                : formatStatus(status)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-8 md:gap-16">
          <div className="flex flex-1 flex-col items-center gap-3">
            <TeamBadge
              name={team1?.teamName ?? "Home"}
              size="xl"
              className="h-20 w-20 md:h-24 md:w-24"
            />
            <span className="max-w-[160px] text-center font-display text-sm uppercase tracking-wider text-foreground md:text-base">
              {team1?.teamName ?? "Home"}
            </span>
          </div>
          <div className="flex items-center gap-2 font-display text-5xl text-foreground md:text-6xl lg:text-7xl">
            {score ? (
              <>
                <span>{score.team1}</span>
                <span className="text-muted">-</span>
                <span>{score.team2}</span>
              </>
            ) : (
              <span className="text-muted">vs</span>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-3">
            <TeamBadge
              name={team2?.teamName ?? "Away"}
              size="xl"
              className="h-20 w-20 md:h-24 md:w-24"
            />
            <span className="max-w-[160px] text-center font-display text-sm uppercase tracking-wider text-foreground md:text-base">
              {team2?.teamName ?? "Away"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isDemo && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
              <Sparkles size={12} /> Demo
            </span>
          )}
          {isSeed && !isDemo && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan">
              <Zap size={12} /> Devnet
            </span>
          )}
          {!isDemo && !connected && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
              <Wallet size={12} /> Connect
            </span>
          )}
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Details →
        </span>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Pool</span>
          <span className="font-mono font-bold text-cyan">
            ${formatUsdc(poolTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Entry</span>
          <span className="font-mono font-bold text-foreground">
            ${formatUsdc(entryFee)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Players</span>
          <span className="font-mono font-bold text-foreground">
            {participantCount}
          </span>
        </div>
        <div className="border-t border-surface pt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">1st</span>
            <span className="font-mono font-bold text-gold">
              ${formatUsdc(String(Math.round(prizes.first)))}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted">2nd</span>
            <span className="font-mono font-bold text-foreground">
              ${formatUsdc(String(Math.round(prizes.second)))}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted">3rd</span>
            <span className="font-mono font-bold text-bronze">
              ${formatUsdc(String(Math.round(prizes.third)))}
            </span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

// Compact countdown for the entry gate. Ticks to seconds in the final minute
// so it reads like a live countdown as entries approach.
function formatEntryCountdown(secs: number): string {
  if (secs <= 0) return "now";
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function EnterCard({
  isLive,
  isDemo,
  hasEntered,
  entryChecking,
  entryError,
  entriesPending,
  opensInSecs,
  onClick,
}: {
  isLive: boolean;
  isDemo: boolean;
  hasEntered: boolean;
  entryChecking: boolean;
  entryError: boolean;
  entriesPending: boolean;
  opensInSecs: number;
  onClick: () => void;
}) {
  // Entries not open yet (KO−10min gate): show a live countdown instead of an
  // Enter CTA that would be rejected on submit. Not clickable — nothing to do
  // until the window opens, at which point the parent flips this to the CTA.
  if (entriesPending) {
    return (
      <PageTransition
        delay={0.15}
        className="group relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-surface p-5 sm:p-6"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />
        <h2 className="font-display text-xl text-foreground">Entries Open In</h2>
        <span className="font-mono text-3xl font-bold tabular-nums text-purple">
          {formatEntryCountdown(opensInSecs)}
        </span>
        <p className="max-w-xs text-center text-sm text-muted">
          Predictions open 10 minutes before kickoff. Check back then to lock
          yours in.
        </p>
      </PageTransition>
    );
  }

  return (
    <PageTransition
      delay={0.15}
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden bg-surface p-5 transition-all hover:bg-surface-elevated sm:p-6"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />
      <h2 className="font-display text-xl text-foreground">
        {entryChecking
          ? "Checking Entry"
          : entryError
            ? "Retry Entry Check"
          : hasEntered
            ? "Enter Arena"
            : isLive
              ? "Enter Live Match"
              : "Enter Match"}
      </h2>
      <p className="max-w-xs text-center text-sm text-muted">
        {entryChecking
          ? "Verifying your wallet's entry status…"
          : entryError
            ? "Entry status is unavailable. Retry before entering or paying."
          : hasEntered
          ? "You're in! Jump back to the arena to lock more predictions."
          : isLive
            ? "Predict the score, subs, and goalscorers as the match unfolds."
            : "Lock your predictions before kickoff."}
      </p>
      <span className="btn-gradient flex h-12 items-center px-10 font-display text-sm uppercase tracking-[0.1em] text-white transition-transform group-hover:scale-105">
        {isDemo
          ? "Try Demo"
          : entryChecking
            ? "Checking…"
            : entryError
              ? "Retry"
              : hasEntered
                ? "Arena"
                : "Enter"}
        <ArrowRight size={16} className="ml-2" />
      </span>
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
              <h2 className="font-display text-2xl text-foreground">
                Vault Details
              </h2>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                Prize pool breakdown
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Total Pool</span>
                  <span className="font-mono font-bold text-cyan">
                    ${formatUsdc(poolTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Entry Fee</span>
                  <span className="font-mono font-bold text-foreground">
                    ${formatUsdc(entryFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Participants</span>
                  <span className="font-mono font-bold text-foreground">
                    {participantCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Platform Fee</span>
                  <span className="font-mono font-bold text-foreground">
                    20%
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-surface pt-3 text-sm">
                  <span className="text-muted">Net Prize Pool</span>
                  <span className="font-mono font-bold text-cyan">
                    ${formatUsdc(String(Math.round(prizes.total)))}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Prize Distribution
                </p>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-gold">
                    <span className="flex h-5 w-5 items-center justify-center bg-gold text-[10px] text-background">
                      1
                    </span>
                    1st Place
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    ${formatUsdc(String(Math.round(prizes.first)))}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center bg-foreground text-[10px] text-background">
                      2
                    </span>
                    2nd Place
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    ${formatUsdc(String(Math.round(prizes.second)))}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-surface p-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-bronze">
                    <span className="flex h-5 w-5 items-center justify-center bg-bronze text-[10px] text-background">
                      3
                    </span>
                    3rd Place
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    ${formatUsdc(String(Math.round(prizes.third)))}
                  </span>
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
      className="group relative flex flex-col gap-4 overflow-hidden bg-surface p-5"
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
          <div
            key={entry.id}
            className="flex items-center justify-between bg-background/50 p-2 text-[10px]"
          >
            <span className="font-bold uppercase tracking-wider text-foreground">
              {formatType(entry.type)}
            </span>
            <span className="truncate text-muted">
              {formatEventPayload(entry)}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted">No events recorded.</p>
        )}
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
  score: Score | null;
}) {
  const winner = !score
    ? "—"
    : score.team1 > score.team2
      ? team1Name
      : score.team2 > score.team1
        ? team2Name
        : "Draw";
  const topRanks = leaderboard?.ranking.slice(0, 3) ?? [];

  return (
    <PageTransition
      delay={0.15}
      className="group relative flex flex-col gap-4 overflow-hidden bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-background text-gold">
            <Trophy size={18} />
          </div>
          <h2 className="font-display text-lg text-foreground">
            Match Results
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Settled
        </span>
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Final Score</span>
          <span className="font-display text-lg text-foreground">
            {score ? `${score.team1} - ${score.team2}` : "— : —"}
          </span>
        </div>
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Winner</span>
          <span className="font-bold text-cyan">{winner}</span>
        </div>
        <div className="flex items-center justify-between bg-background/50 p-3 text-sm">
          <span className="text-muted">Prize Pool</span>
          <span className="font-mono font-bold text-gold">
            ${formatUsdc(String(Math.round(prizes.total)))}
          </span>
        </div>
        {topRanks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Top Winners
            </p>
            {topRanks.map((r, i) => (
              <div
                key={r.owner + i}
                className="flex items-center justify-between bg-background/50 p-2 text-xs"
              >
                <span className="truncate font-bold text-foreground">
                  {r.user?.username ?? formatWallet(r.owner)}
                </span>
                <span className="font-mono font-bold text-cyan">
                  {r.points} pts
                </span>
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
