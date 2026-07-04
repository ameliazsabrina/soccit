"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import { PageShell } from "../_components/page-shell";
import { EventExitTransition } from "../_components/event-exit-transition";
import { EnterButton } from "../_components/enter-button";
import {
  getMatches,
  formatUsdc,
  SOCCIT_SEED_MATCH_PDA,
  type MatchSummary,
} from "../_lib/api";
import { cn } from "../_lib/utils";

const FWC_BANNER_BG = "/assets/events/fwc-banner-bg.webp";
const FWC_LOGO_WHITE = "/assets/events/fwc-logo-white.svg";
const UCL_BANNER_BG = "/assets/events/ucl-banner-bg.webp";
const UCL_LOGO_WHITE = "/assets/events/ucl-logo-white.svg";

const FILTERS = [
  { key: "all", label: "All Markets" },
  { key: "live", label: "Live Now" },
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "SETTLED", label: "Settled" },
] as const;

const DEMO_PDA = "demo";

const DEMO_MATCHES: MatchSummary[] = [
  {
    pda: SOCCIT_SEED_MATCH_PDA,
    fixtureId: 900001,
    onchain: {
      status: 0,
      statusLabel: "OPEN",
      settled: false,
      entryFee: "5000000",
      poolTotal: "5000000",
      participantCount: 1,
      team1Id: 101,
      team2Id: 202,
      usdcMint: "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
      winners: [null, null, null],
    },
    live: { statusId: 1, minute: 34, goals: { team1: 1, team2: 0 }, ts: Date.now() },
    teamNames: { team1: "Soccit FC", team2: "Devnet United" },
  },
  {
    pda: DEMO_PDA,
    fixtureId: 999999,
    onchain: {
      status: 0,
      statusLabel: "OPEN",
      settled: false,
      entryFee: "1000000",
      poolTotal: "2500000",
      participantCount: 2,
      team1Id: 1,
      team2Id: 2,
      usdcMint: "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
      winners: [null, null, null],
    },
    live: null,
    teamNames: { team1: "Demo City", team2: "Practice Town" },
  },
];

type FilterKey = (typeof FILTERS)[number]["key"];

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

const MAGNETIC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TRANSITION_DURATION = 0.5;

export default function MatchEvents() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const [mode, setMode] = useState<"featured" | "matches">("featured");
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isLocked, setIsLocked] = useState(false);

  const touchStartY = useRef<number | null>(null);

  async function loadMatches() {
    setLoading(true);
    setError(null);
    try {
      const list = await getMatches();
      setMatches(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }

  function loadDemoMatches() {
    setError(null);
    setMatches(DEMO_MATCHES);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    if (filter === "all") return matches;
    if (filter === "live") {
      return matches.filter((m) => m.live?.statusId === 1);
    }
    return matches.filter((m) => m.onchain.statusLabel === filter);
  }, [matches, filter]);

  const totalMatchPages = useMemo(
    () => Math.max(1, filteredMatches.length - 3),
    [filteredMatches]
  );

  function lock() {
    setIsLocked(true);
    setTimeout(() => setIsLocked(false), TRANSITION_DURATION * 1000);
  }

  function goNext() {
    if (isLocked || loading) return;
    if (mode === "featured") {
      setDirection(1);
      setMode("matches");
      setPageIndex(0);
    } else {
      if (pageIndex < totalMatchPages - 1) {
        setDirection(1);
        setPageIndex((p) => p + 1);
      }
    }
    lock();
  }

  function goPrev(forceHeavy = false) {
    if (isLocked || loading) return;
    if (mode === "matches") {
      if (pageIndex > 0) {
        setDirection(-1);
        setPageIndex((p) => p - 1);
        lock();
      } else if (forceHeavy) {
        setDirection(-1);
        setMode("featured");
        setPageIndex(0);
        lock();
      }
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (isLocked) return;
    const delta = e.deltaY;
    if (delta > 40) goNext();
    else if (delta < -40) {
      // Heavy scroll threshold to return to featured banner.
      goPrev(delta < -120);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current == null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    touchStartY.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta > 0) goNext();
    else goPrev(Math.abs(delta) > 180);
  }

  const currentMatches = useMemo(() => {
    const start = pageIndex;
    return filteredMatches.slice(start, start + 4);
  }, [filteredMatches, pageIndex]);

  const previewMatch = filteredMatches[0];

  return (
    <>
      <Suspense>
        <EventExitTransition />
      </Suspense>
    <PageShell>
      <div
        className="relative -mt-6 flex-1 overflow-hidden"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState error={error} onRetry={loadMatches} onDemo={loadDemoMatches} loading={loading} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: MAGNETIC_EASE }}
            className="h-full"
          >
            {/* Featured banner */}
            <motion.div
              animate={{
                y: mode === "featured" ? 0 : "-100%",
                opacity: mode === "featured" ? 1 : 0,
              }}
              transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
              className="absolute inset-x-0 top-0 z-10"
            >
              <FeaturedBanner />
            </motion.div>

            {/* Filter tabs */}
            <motion.div
              initial={false}
              animate={{
                y: mode === "featured" ? 292 : 0,
              }}
              transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
              className="absolute inset-x-0 top-[8px] z-20 border-b border-surface"
            >
              <div className="flex flex-nowrap gap-2 overflow-x-auto px-6 pb-3 lg:px-6">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setPageIndex(0);
                    }}
                    className={cn(
                      "flex-1 whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:text-xs",
                      filter === f.key
                        ? "border border-purple bg-purple text-white"
                        : "border border-transparent text-muted hover:border-purple hover:bg-purple hover:text-white"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Featured mode content: preview match */}
            <AnimatePresence initial={false} mode="wait">
              {mode === "featured" && previewMatch && (
                <motion.div
                  key="featured-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.4, ease: MAGNETIC_EASE }}
                  className="absolute inset-x-0 top-[370px]"
                >
                  <div className="px-6 lg:px-6">
                    <MatchCard match={previewMatch} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Matches mode content: 4 visible cards, scroll shifts by 1 */}
            <AnimatePresence initial={false} mode="popLayout">
              {mode === "matches" && currentMatches.length > 0 && (
                <motion.div
                  key="matches-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
                  className="absolute inset-x-0 top-[80px]"
                >
                  <div className="flex flex-col gap-3 px-6 lg:px-6">
                    {currentMatches.map((match) => (
                      <motion.div
                        key={match.pda}
                        layout
                        layoutId={match.pda}
                        initial={{
                          opacity: 0,
                          y: direction > 0 ? 60 : -60,
                        }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          y: direction > 0 ? -60 : 60,
                        }}
                        transition={{ duration: 0.35, ease: MAGNETIC_EASE }}
                      >
                        <MatchCard match={match} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty market state: visible in both modes when no matches */}
            {!previewMatch && (
              <div className="absolute inset-x-0 top-[100px]">
                <div className="px-6 lg:px-6">
                  <EmptyMarketState filter={filter} />
                </div>
              </div>
            )}

            {/* Scroll hint */}
            <motion.div
              animate={{ opacity: mode === "featured" && filteredMatches.length > 1 ? 1 : 0 }}
              className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 text-center text-[10px] font-bold uppercase tracking-widest text-muted"
            >
              Scroll to explore match
            </motion.div>
          </motion.div>
        )}
      </div>
    </PageShell>
    </>
  );
}

const EVENTS = [
  {
    id: "fwc2026",
    label: "Predict World Cup 2026 Bracket",
    href: "/matches/events/worldcup",
    bg: FWC_BANNER_BG,
    logo: FWC_LOGO_WHITE,
  },
  {
    id: "ucl",
    label: "UEFA Champions League",
    href: "/matches/events/ucl",
    bg: UCL_BANNER_BG,
    logo: UCL_LOGO_WHITE,
  },
];

function FeaturedBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % EVENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused]);

  const event = EVENTS[active];

  return (
    <Link
      href={event.href}
      className="group relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden border-b border-surface p-6 text-center transition-all sm:min-h-[300px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
        style={{ backgroundImage: `url('${event.bg}')` }}
      />
      <div className="absolute inset-0 bg-slate-950/50 transition-colors duration-500 group-hover:bg-slate-950/40" />

      {/* EVENTS flag */}
      <div className="absolute left-6 top-6 z-20">
        <span className="border border-white/30 bg-white/10 px-4 py-2 font-tech text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          Events
        </span>
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-5 h-20 w-20 sm:h-24 sm:w-24">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.logo}
          alt={event.label}
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Title */}
      <h2 className="font-wc relative z-10 max-w-2xl text-2xl text-white transition-transform duration-500 group-hover:scale-105 sm:text-3xl md:text-4xl">
        {event.label}
      </h2>

      {/* Enter event button */}
      <div className="relative z-10 mt-5">
        <span className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm uppercase tracking-[0.1em] text-white">
          enter event
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </span>
      </div>

      {/* Carousel dots */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {EVENTS.map((_, i) => (
          <span
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActive(i);
            }}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              i === active ? "bg-white w-6" : "bg-white/40 hover:bg-white/70"
            )}
          />
        ))}
      </div>
    </Link>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Loading Markets
      </div>
      <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
        <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
      </div>
      <div className="font-tech text-[10px] uppercase tracking-widest text-muted/60">
        Please wait
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  onDemo,
  loading,
}: {
  error: string;
  onRetry: () => void;
  onDemo: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center border border-rose/30 bg-rose/5 p-8 text-center text-rose">
      <AlertCircle size={36} className="mb-4" />
      <p className="font-bold uppercase tracking-wider">Market data unavailable</p>
      <p className="mt-2 text-sm">{error}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 border border-rose/30 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-rose/10"
        >
          <Loader2 size={14} className={cn(loading && "animate-spin")} />
          Retry
        </button>
        <button
          onClick={onDemo}
          className="flex items-center gap-2 border border-cyan/30 px-6 py-3 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10"
        >
          Load Demo Markets
        </button>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: MatchSummary }) {
  const team1 = match.teamNames?.team1 ?? `Team ${match.onchain.team1Id}`;
  const team2 = match.teamNames?.team2 ?? `Team ${match.onchain.team2Id}`;
  const score = match.live?.goals ?? { team1: 0, team2: 0 };
  const minute = match.live?.minute;
  const isLive = match.live?.statusId === 1;
  const status = match.onchain.statusLabel;

  return (
    <Link
      href={`/matches/${match.pda}`}
      className="group relative flex flex-col gap-2 border border-surface bg-surface/40 p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-purple hover:bg-purple"
    >
      <div className="card-shine" />

      {/* Top row: status + pool */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose group-hover:bg-white" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose group-hover:text-white">
                {minute}&apos; Live
              </span>
            </>
          ) : status === "OPEN" ? (
            <span className="text-xs font-bold uppercase tracking-wider text-cyan group-hover:text-white">
              Open for Predictions
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-muted group-hover:text-white/80">
              {status}
            </span>
          )}
        </div>
        <span className="font-mono text-xs font-bold text-cyan group-hover:text-white">
          Pool ${formatUsdc(match.onchain.poolTotal)}
        </span>
      </div>

      {/* Teams */}
      <div className="relative z-10 flex flex-col gap-1 font-display text-xl">
        <div className="flex items-center gap-3">
          <TeamBadge name={team1} />
          <span className="flex-1 text-foreground group-hover:text-white">{team1}</span>
          <span className="text-cyan group-hover:text-white">{score.team1}</span>
        </div>
        <div className="flex items-center gap-3">
          <TeamBadge name={team2} />
          <span className={cn("flex-1", isLive ? "text-foreground group-hover:text-white" : "text-muted group-hover:text-white/80")}>
            {team2}
          </span>
          <span className={cn("group-hover:text-white", isLive ? "text-cyan" : "text-muted")}>
            {score.team2}
          </span>
        </div>
      </div>

      {/* Bottom row: entry + players + sub market */}
      <div className="relative z-10 flex items-center justify-between border-t border-surface pt-2 group-hover:border-white/20">
        <div className="flex items-center gap-4 text-[10px] uppercase sm:text-xs">
          <span className="text-muted group-hover:text-white/80">
            Entry <strong className="ml-1 text-foreground group-hover:text-white">${formatUsdc(match.onchain.entryFee)}</strong>
          </span>
          <span className="text-muted group-hover:text-white/80">
            Players <strong className="ml-1 text-foreground group-hover:text-white">{match.onchain.participantCount}</strong>
          </span>
        </div>
        <span className="pointer-events-none">
          <EnterButton className="px-3 py-1.5 text-[10px] group-hover:bg-none group-hover:bg-white group-hover:text-purple" />
        </span>
      </div>
    </Link>
  );
}

function TeamBadge({ name }: { name: string }) {
  const code = getCountryCode(name);
  if (code) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://flagcdn.com/${code}.svg`}
        alt={name}
        className="h-8 w-8 flex-shrink-0 object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-surface text-[10px] font-bold uppercase text-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function EmptyMarketState({ filter }: { filter: FilterKey }) {
  const label = FILTERS.find((f) => f.key === filter)?.label ?? filter;
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-surface py-16 text-center text-muted">
      <Trophy size={36} className="mb-4 opacity-30" />
      <p className="font-display text-xl tracking-wider">No {label} Markets</p>
      <p className="mt-2 max-w-sm text-sm">
        {filter === "all"
          ? "No on-chain matches found. Check back once matches are created."
          : `No matches match the "${label}" filter right now.`}
      </p>
    </div>
  );
}
