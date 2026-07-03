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
  type MatchSummary,
} from "../_lib/api";
import { cn } from "../_lib/utils";

const FWC_BANNER_BG = "/assets/events/fwc-banner-bg.webp";
const FWC_LOGO_BLACK = "/assets/events/fwc-logo-black.svg";
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
const TRANSITION_DURATION = 0.7;

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
    () => Math.max(1, Math.ceil(filteredMatches.length / 3)),
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
    const start = pageIndex * 3;
    return filteredMatches.slice(start, start + 3);
  }, [filteredMatches, pageIndex]);

  const previewMatch = filteredMatches[0];

  return (
    <>
      <Suspense>
        <EventExitTransition />
      </Suspense>
    <PageShell>
      <div
        className="relative flex-1 overflow-hidden"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={loadMatches} loading={loading} />
        ) : (
          <>
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
              animate={{
                y: mode === "featured" ? 320 : 0,
              }}
              transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
              className="absolute inset-x-0 top-[72px] z-20 px-8 lg:px-8"
            >
              <div className="flex flex-wrap gap-2 border-b border-surface pb-4">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFilter(f.key);
                      setMode("featured");
                      setPageIndex(0);
                    }}
                    className={cn(
                      "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                      filter === f.key
                        ? "border border-cyan bg-cyan/5 text-cyan"
                        : "border border-transparent text-muted hover:border-surface hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Featured mode content: preview match + grid line */}
            <AnimatePresence initial={false} mode="wait">
              {mode === "featured" && (
                <motion.div
                  key="featured-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.4, ease: MAGNETIC_EASE }}
                  className="absolute inset-x-0 top-[400px] px-8 lg:px-8"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-xl tracking-wide text-foreground">All Matches</h2>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      {filteredMatches.length} result{filteredMatches.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {previewMatch ? (
                    <>
                      <MatchCard match={previewMatch} />
                      <div className="mt-6 h-px w-full bg-surface" />
                    </>
                  ) : (
                    <EmptyMarketState filter={filter} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Matches mode content: 3 matches per page */}
            <AnimatePresence initial={false} mode="wait">
              {mode === "matches" && (
                <motion.div
                  key={`matches-${pageIndex}`}
                  initial={{ opacity: 0, y: direction > 0 ? 80 : -80 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: direction > 0 ? -80 : 80 }}
                  transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
                  className="absolute inset-x-0 top-[140px] px-8 lg:px-8"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-xl tracking-wide text-foreground">All Matches</h2>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Page {pageIndex + 1} / {totalMatchPages}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {currentMatches.map((match) => (
                      <MatchCard key={match.pda} match={match} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll hint */}
            <motion.div
              animate={{ opacity: mode === "featured" && filteredMatches.length > 1 ? 1 : 0 }}
              className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 text-center text-[10px] font-bold uppercase tracking-widest text-muted"
            >
              Scroll to explore matches
            </motion.div>
          </>
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
    href: "/matches/events",
    bg: FWC_BANNER_BG,
    logoBlack: FWC_LOGO_BLACK,
    logoWhite: FWC_LOGO_WHITE,
  },
  {
    id: "ucl",
    label: "UEFA Champions League",
    href: "/matches/events",
    bg: UCL_BANNER_BG,
    logoWhite: UCL_LOGO_WHITE,
  },
];

function FeaturedBanner() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % EVENTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const event = EVENTS[active];

  return (
    <Link
      href={event.href}
      className="group relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden border-b border-surface p-6 text-center transition-all hover:opacity-95 sm:min-h-[320px]"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url('${event.bg}')` }}
      />
      <div className="absolute inset-0 bg-slate-950/60 transition-colors duration-500 group-hover:bg-slate-950/50" />

      {/* EVENTS flag */}
      <div className="absolute left-6 top-6 z-20">
        <span className="border border-white/30 bg-white/10 px-4 py-2 font-tech text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
          Events
        </span>
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-5 h-20 w-20 sm:h-24 sm:w-24">
        {event.logoBlack ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.logoBlack}
              alt={event.label}
              className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500 group-hover:opacity-0"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.logoWhite}
              alt={event.label}
              className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          </>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={event.logoWhite}
            alt={event.label}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>

      {/* Title */}
      <h2 className="font-wc relative z-10 max-w-2xl text-2xl text-white transition-all duration-500 group-hover:scale-105 sm:text-3xl md:text-4xl">
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

function LoadingState() {
  return (
    <div className="flex h-full w-full animate-pulse flex-col items-center justify-center border border-surface bg-surface/30 p-6">
      <div className="mb-1 h-8 w-64 bg-surface" />
      <div className="mb-8 h-3 w-40 bg-surface" />
      <div className="mb-8 grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <div className="h-4 w-20 bg-surface" />
          <div className="h-14 w-14 bg-surface sm:h-16 sm:w-16" />
        </div>
        <div className="h-10 w-12 bg-surface" />
        <div className="flex items-center justify-start gap-3">
          <div className="h-14 w-14 bg-surface sm:h-16 sm:w-16" />
          <div className="h-4 w-20 bg-surface" />
        </div>
      </div>
      <div className="mb-5 h-3 w-60 bg-surface" />
      <div className="h-12 w-40 bg-surface" />
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
  loading,
}: {
  error: string;
  onRetry: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center border border-rose/30 bg-rose/5 p-8 text-center text-rose">
      <AlertCircle size={36} className="mb-4" />
      <p className="font-bold uppercase tracking-wider">Market data unavailable</p>
      <p className="mt-2 text-sm">{error}</p>
      <button
        onClick={onRetry}
        className="mt-6 flex items-center gap-2 border border-rose/30 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-rose/10"
      >
        <Loader2 size={14} className={cn(loading && "animate-spin")} />
        Retry
      </button>
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
      className="group relative flex flex-col gap-6 border border-surface bg-surface/40 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface/70 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center"
    >
      <div className="card-shine" />

      {/* Match info */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 pl-2">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose">
                {minute}&apos; Live
              </span>
            </>
          ) : status === "OPEN" ? (
            <span className="text-xs font-bold uppercase tracking-wider text-cyan">
              Open for Predictions
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {status}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 font-display text-2xl">
          <div className="flex items-center gap-3">
            <TeamBadge name={team1} />
            <span className="text-foreground">{team1}</span>
            <span className="ml-auto text-cyan">{score.team1}</span>
          </div>
          <div className="flex items-center gap-3">
            <TeamBadge name={team2} />
            <span className={cn(isLive ? "text-foreground" : "text-muted")}>
              {team2}
            </span>
            <span className={cn("ml-auto", isLive ? "text-cyan" : "text-muted")}>
              {score.team2}
            </span>
          </div>
        </div>
      </div>

      {/* Market snapshot */}
      <div className="relative z-10 flex w-full flex-col gap-3 border-t border-surface bg-background/50 p-4 sm:w-64 sm:border-l sm:border-t-0">
        <div className="flex items-center justify-between text-xs uppercase">
          <span className="text-muted">Entry</span>
          <span className="font-mono font-bold text-foreground">
            ${formatUsdc(match.onchain.entryFee)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs uppercase">
          <span className="text-muted">Pool</span>
          <span className="font-mono font-bold text-cyan">
            ${formatUsdc(match.onchain.poolTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs uppercase">
          <span className="text-muted">Players</span>
          <span className="font-mono font-bold text-foreground">
            {match.onchain.participantCount}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-surface pt-3">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan">
            Sub Market
          </span>
          <span className="pointer-events-none">
            <EnterButton className="px-4 py-2 text-[10px]" />
          </span>
        </div>
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
