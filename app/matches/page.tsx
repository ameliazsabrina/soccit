"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, Trophy } from "lucide-react";
import { PageShell } from "../_components/page-shell";
import { EventExitTransition } from "../_components/event-exit-transition";
import { EnterButton } from "../_components/enter-button";
import { PageTransition } from "../_components/page-transition";
import { TeamBadge } from "../_components/team-badge";
import {
  getMatches,
  formatUsdc,
  displayScore,
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

type FilterKey = (typeof FILTERS)[number]["key"];

const MAGNETIC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TRANSITION_DURATION = 0.7;
const WHEEL_THRESHOLD = 40;
const TOUCH_THRESHOLD = 60;

export default function MatchEvents() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [bannerHidden, setBannerHidden] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lockedRef = useRef(false);
  const bannerHiddenRef = useRef(false);

  useEffect(() => {
    bannerHiddenRef.current = bannerHidden;
  }, [bannerHidden]);

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
      // Authoritative: the server tells us which matches are actually in-play.
      return matches.filter((m) => m.phase === "LIVE");
    }
    return matches.filter((m) => m.onchain.statusLabel === filter);
  }, [matches, filter]);

  function lock() {
    lockedRef.current = true;
    setTimeout(() => {
      lockedRef.current = false;
    }, TRANSITION_DURATION * 1000);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current == null || lockedRef.current) return;

    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    touchStartY.current = null;

    if (Math.abs(delta) < TOUCH_THRESHOLD) return;

    const atTop = (listRef.current?.scrollTop ?? 0) <= 0;

    if (!bannerHiddenRef.current && delta > 0) {
      setBannerHidden(true);
      lock();
    } else if (bannerHiddenRef.current && atTop && delta < 0) {
      setBannerHidden(false);
      lock();
    }
  }

  function handleFilterChange(key: FilterKey) {
    setFilter(key);
    if (listRef.current) listRef.current.scrollTop = 0;
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (lockedRef.current) return;

      const atTop = (listRef.current?.scrollTop ?? 0) <= 0;

      if (!bannerHiddenRef.current && e.deltaY > WHEEL_THRESHOLD) {
        e.preventDefault();
        setBannerHidden(true);
        lock();
      } else if (
        bannerHiddenRef.current &&
        atTop &&
        e.deltaY < -WHEEL_THRESHOLD
      ) {
        e.preventDefault();
        setBannerHidden(false);
        lock();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <>
      <Suspense>
        <EventExitTransition />
      </Suspense>
      <PageShell>
        <div
          ref={containerRef}
          className="relative flex flex-1 flex-col overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Featured banner — magnet hides on scroll down */}
          <motion.div
            initial={false}
            animate={{
              height: bannerHidden ? 0 : "auto",
              opacity: bannerHidden ? 0 : 1,
            }}
            transition={{ duration: TRANSITION_DURATION, ease: MAGNETIC_EASE }}
            className="flex-shrink-0 overflow-hidden"
          >
            <FeaturedBanner />
          </motion.div>

          {/* Scrollable content */}
          <div
            ref={listRef}
            className="flex flex-1 flex-col overflow-y-auto scroll-smooth"
          >
            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <ErrorState
                error={error}
                onRetry={loadMatches}
                loading={loading}
              />
            ) : (
              <>
                <FilterTabs
                  filter={filter}
                  onChange={handleFilterChange}
                  bannerHidden={bannerHidden}
                />

                <div className="flex-1">
                  {filteredMatches.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2">
                      {filteredMatches.map((match, i) => (
                        <MatchCard key={match.pda} match={match} index={i} />
                      ))}
                    </div>
                  ) : (
                    <EmptyMarketState filter={filter} />
                  )}
                </div>

                <motion.div
                  animate={{
                    opacity: bannerHidden
                      ? 0
                      : filteredMatches.length > 1
                        ? 1
                        : 0,
                  }}
                  className="pointer-events-none sticky bottom-4 mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted"
                >
                  Scroll to explore matches
                </motion.div>
              </>
            )}
          </div>
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
      className="group relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden border-b border-surface p-8 text-center transition-all sm:min-h-[300px]"
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
      <div className="absolute left-8 top-8 z-20">
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
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
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
              i === active ? "bg-white w-6" : "bg-white/40 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </Link>
  );
}

function FilterTabs({
  filter,
  onChange,
  bannerHidden,
}: {
  filter: FilterKey;
  onChange: (key: FilterKey) => void;
  bannerHidden: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-surface pb-3",
        bannerHidden ? "pt-0" : "pt-3",
      )}
    >
      <div className="flex flex-nowrap gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              "flex-1 whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all sm:text-xs",
              filter === f.key
                ? "border border-purple bg-purple text-white"
                : "border border-transparent text-muted hover:border-purple hover:bg-purple hover:text-white",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
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
  loading,
}: {
  error: string;
  onRetry: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center border border-rose/30 bg-rose/5 p-8 text-center text-rose">
      <AlertCircle size={36} className="mb-4" />
      <p className="font-bold uppercase tracking-wider">
        Market data unavailable
      </p>
      <p className="mt-2 text-sm">{error}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 border border-rose/30 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-rose/10"
        >
          <Loader2 size={14} className={cn(loading && "animate-spin")} />
          Retry
        </button>
      </div>
    </div>
  );
}

function formatKickoff(startTimeSecs: number): string {
  const diff = startTimeSecs - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "kicking off";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  if (mins > 0) return `in ${mins}m`;
  return "kicking off soon";
}

function MatchCard({
  match,
  index = 0,
}: {
  match: MatchSummary;
  index?: number;
}) {
  const team1 = match.teamNames?.team1 ?? `Team ${match.onchain.team1Id}`;
  const team2 = match.teamNames?.team2 ?? `Team ${match.onchain.team2Id}`;
  const score = displayScore(match);
  const minute = match.live?.minute;
  const isLive = match.phase === "LIVE";
  const isUpcoming = match.phase === "UPCOMING";

  return (
    <PageTransition delay={index * 0.05} className="group">
      <Link
        href={`/matches/${match.pda}`}
        className="group-card relative flex flex-col gap-3 border border-surface bg-surface/40 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface/70 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:gap-4 sm:p-4"
      >
        <div className="card-shine" />

        {/* Match info */}
        <div className="relative z-10 flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose sm:text-xs">
                  {minute ? `${minute}' Live` : "Live"}
                </span>
              </>
            ) : isUpcoming ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple sm:text-xs">
                Upcoming
                {match.onchain.startTime > 0 && (
                  <span className="ml-2 font-normal text-muted">
                    {formatKickoff(match.onchain.startTime)}
                  </span>
                )}
              </span>
            ) : match.phase === "OPEN" ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan sm:text-xs">
                Open for Predictions
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted sm:text-xs">
                {match.phase}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 font-display text-lg sm:text-xl">
            <div className="flex items-center gap-3">
              <TeamBadge name={team1} size="lg" />
              <span className="truncate text-foreground">{team1}</span>
              <span className="ml-auto text-cyan">
                {score ? score.team1 : "–"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <TeamBadge name={team2} size="lg" />
              <span
                className={cn(
                  "truncate",
                  isLive ? "text-foreground" : "text-muted",
                )}
              >
                {team2}
              </span>
              <span
                className={cn("ml-auto", isLive ? "text-cyan" : "text-muted")}
              >
                {score ? score.team2 : "–"}
              </span>
            </div>
          </div>
        </div>

        {/* Market snapshot */}
        <div className="relative z-10 flex w-full flex-col gap-2 border-t border-surface bg-background/50 p-3 sm:w-48 sm:border-l sm:border-t-0 sm:p-3.5">
          <div className="flex items-center justify-between text-[10px] uppercase sm:text-xs">
            <span className="text-muted">Pool</span>
            <span className="font-mono font-bold text-cyan">
              ${formatUsdc(match.onchain.poolTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase sm:text-xs">
            <span className="text-muted">Entry</span>
            <span className="font-mono font-bold text-foreground">
              ${formatUsdc(match.onchain.entryFee)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase sm:text-xs">
            <span className="text-muted">Players</span>
            <span className="font-mono font-bold text-foreground">
              {match.onchain.participantCount}
            </span>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-surface pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
              Enter
            </span>
            <span className="pointer-events-none">
              <EnterButton className="px-3 py-1 text-[9px] sm:text-[10px]" />
            </span>
          </div>
        </div>
      </Link>
    </PageTransition>
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
