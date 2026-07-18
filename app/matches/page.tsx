"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
} from "lucide-react";
import { PageShell } from "../_components/page-shell";
import { EventExitTransition } from "../_components/event-exit-transition";
import { EnterButton } from "../_components/enter-button";
import { PageTransition } from "../_components/page-transition";
import { TeamBadge } from "../_components/team-badge";
import {
  getMatches,
  formatUsdc,
  displayScore,
  isTerminalPhase,
  entryOpensAt,
  PHASE_LABEL,
  type MatchPhase,
  type MatchSummary,
} from "../_lib/api";
import { cn } from "../_lib/utils";

const FWC_BANNER_BG = "/assets/events/fwc-banner-bg.webp";
const FWC_FINAL_BANNER_BG = "/assets/events/final-wc26-banner.webp";
const FWC_LOGO_WHITE = "/assets/events/fwc-logo-white.svg";
const UCL_BANNER_BG = "/assets/events/ucl-banner-bg.webp";
const UCL_LOGO_WHITE = "/assets/events/ucl-logo-white.svg";
const SPAIN_ARGENTINA_PDA = "3APNEZMud1boavyxTyHyAAaoEkyxPKXuj5pr17b3yb8e";

const FILTERS = [
  { key: "all", label: "All Markets" },
  { key: "live", label: "Live Now" },
  { key: "OPEN", label: "Open" },
  { key: "RESOLVED", label: "Resolving" },
  { key: "SETTLED", label: "Settled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const DEMO_PDA = "demo";

const DEMO_MATCH: MatchSummary = {
  pda: DEMO_PDA,
  fixtureId: 999999,
  featured: false,
  phase: "LIVE",
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "1000000",
    poolTotal: "5000000",
    participantCount: 12,
    startTime: 0,
    team1Id: 101,
    team2Id: 202,
    usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    winners: [null, null, null],
  },
  live: {
    statusId: 1,
    minute: 63,
    goals: { team1: 2, team2: 1 },
    ts: Date.now(),
  },
  finalScore: null,
  teamNames: { team1: "France", team2: "Argentina" },
};

function includeDemoMatch(matches: MatchSummary[]): MatchSummary[] {
  return [DEMO_MATCH, ...matches.filter((match) => match.pda !== DEMO_PDA)];
}

// Every phase must land in exactly one tab so no card is orphaned. FINISHED
// (full-time, settlement pending) buckets with RESOLVED under "Resolving";
// UPCOMING buckets with OPEN. Drive this off `phase`, never `statusLabel` —
// an ended-but-unsettled match still reports on-chain OPEN and would otherwise
// leak into the "Open" tab looking enterable.
function tabForPhase(phase: MatchPhase): Exclude<FilterKey, "all"> {
  switch (phase) {
    case "LIVE":
      return "live";
    case "UPCOMING":
    case "OPEN":
      return "OPEN";
    case "FINISHED":
    case "RESOLVED":
      return "RESOLVED";
    case "SETTLED":
      return "SETTLED";
    default:
      return "OPEN";
  }
}

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
      setMatches(includeDemoMatch(list));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }

  // Silent background refresh — no spinner flash, keeps the last good data on a
  // transient failure. The visible error state is reserved for the first load.
  const refreshMatches = useCallback(async () => {
    try {
      const list = await getMatches();
      setMatches(includeDemoMatch(list));
      setError(null);
    } catch {
      // Ignore poll failures; the next tick retries.
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, []);

  // Phase transitions happen server-side (no websocket yet), so poll to move
  // cards OPEN → LIVE → FINISHED → SETTLED without a manual refresh. Poll faster
  // while anything is in-play, and refetch on window focus.
  const hasLive = useMemo(
    () =>
      matches?.some((m) => m.pda !== DEMO_PDA && m.phase === "LIVE") ?? false,
    [matches],
  );

  useEffect(() => {
    const interval = hasLive ? 5000 : 12000;
    const id = setInterval(refreshMatches, interval);
    const onFocus = () => refreshMatches();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [hasLive, refreshMatches]);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    if (filter === "all") return matches;
    // Bucket by authoritative server phase, not the on-chain status label.
    return matches.filter((m) => tabForPhase(m.phase) === filter);
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

type FeaturedEvent = {
  id: string;
  eyebrow: string;
  label: string;
  cta: string;
  href: string;
  bg: string;
  logo: string;
  preserveAspect?: boolean;
};

const EVENTS: FeaturedEvent[] = [
  {
    id: "fwc2026-final",
    eyebrow: "World Cup 2026 · Final Match",
    label: "Spain vs Argentina",
    cta: "Enter Match",
    href: `/matches/${SPAIN_ARGENTINA_PDA}`,
    bg: FWC_FINAL_BANNER_BG,
    logo: FWC_LOGO_WHITE,
    preserveAspect: true,
  },
  {
    id: "fwc2026",
    eyebrow: "Events",
    label: "Predict World Cup 2026 Bracket",
    cta: "Enter Event",
    href: "/matches/events/worldcup",
    bg: FWC_BANNER_BG,
    logo: FWC_LOGO_WHITE,
  },
  {
    id: "ucl",
    eyebrow: "Events",
    label: "UEFA Champions League",
    cta: "Enter Event",
    href: "/matches/events/ucl",
    bg: UCL_BANNER_BG,
    logo: UCL_LOGO_WHITE,
  },
];

function FeaturedBanner() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const draggedRef = useRef(false);
  const pointerStartXRef = useRef<number | null>(null);
  const hoveredRef = useRef(false);
  const focusWithinRef = useRef(false);

  const step = useCallback((nextDirection: 1 | -1) => {
    setDirection(nextDirection);
    setActive((current) =>
      (current + nextDirection + EVENTS.length) % EVENTS.length,
    );
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index === active) return;
      setDirection(index > active ? 1 : -1);
      setActive(index);
    },
    [active],
  );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => step(1), 6000);
    return () => clearInterval(timer);
  }, [paused, step]);

  const event = EVENTS[active];

  function finishPointerGesture() {
    setTimeout(() => {
      draggedRef.current = false;
      setPaused(hoveredRef.current || focusWithinRef.current);
    }, 0);
  }

  function handlePointerUp(pointerEvent: React.PointerEvent) {
    const startX = pointerStartXRef.current;
    pointerStartXRef.current = null;
    if (startX !== null) {
      const distance = pointerEvent.clientX - startX;
      if (Math.abs(distance) >= 50) step(distance < 0 ? 1 : -1);
    }
    finishPointerGesture();
  }

  return (
    <section
      className="relative min-h-[260px] overflow-hidden border-b border-surface sm:min-h-[300px]"
      aria-label="Featured matches and events"
      aria-roledescription="carousel"
      onMouseEnter={() => {
        hoveredRef.current = true;
        setPaused(true);
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        setPaused(focusWithinRef.current);
      }}
      onFocus={() => {
        focusWithinRef.current = true;
        setPaused(true);
      }}
      onBlur={(blurEvent) => {
        if (!blurEvent.currentTarget.contains(blurEvent.relatedTarget)) {
          focusWithinRef.current = false;
          setPaused(hoveredRef.current);
        }
      }}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "ArrowLeft") {
          keyEvent.preventDefault();
          step(-1);
        } else if (keyEvent.key === "ArrowRight") {
          keyEvent.preventDefault();
          step(1);
        }
      }}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={event.id}
          custom={direction}
          variants={{
            enter: (slideDirection: number) => ({
              opacity: 0,
              x: reduceMotion ? 0 : slideDirection * 48,
              scale: reduceMotion ? 1 : 0.99,
            }),
            center: { opacity: 1, x: 0, scale: 1 },
            exit: (slideDirection: number) => ({
              opacity: 0,
              x: reduceMotion ? 0 : slideDirection * -48,
              scale: reduceMotion ? 1 : 0.99,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reduceMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1],
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          dragMomentum={false}
          onPointerDown={(pointerEvent) => {
            pointerStartXRef.current = pointerEvent.clientX;
          }}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            pointerStartXRef.current = null;
            finishPointerGesture();
          }}
          onDragStart={() => {
            draggedRef.current = true;
            setPaused(true);
          }}
          className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
        >
          <Link
            href={event.href}
            draggable={false}
            onClick={(clickEvent) => {
              if (draggedRef.current) clickEvent.preventDefault();
            }}
            className="group absolute inset-0 flex select-none flex-col items-center justify-center p-8 text-center focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
          >
            {/* Background */}
            <div
              className={cn(
                "absolute inset-0 bg-cover bg-center bg-no-repeat motion-safe:transition-[transform,filter] motion-safe:duration-150 motion-safe:ease-out group-hover:scale-[1.02] group-hover:brightness-105",
                event.preserveAspect && "md:scale-105 md:blur-sm",
              )}
              style={{ backgroundImage: `url('${event.bg}')` }}
            />
            {event.preserveAspect && (
              <div
                className="absolute inset-0 hidden bg-contain bg-center bg-no-repeat md:block motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out group-hover:scale-[1.01]"
                style={{ backgroundImage: `url('${event.bg}')` }}
              />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.32),rgba(2,6,23,0.68))] motion-safe:transition-opacity motion-safe:duration-100 group-hover:opacity-90" />

            <div className="absolute left-5 top-5 z-20 sm:left-8 sm:top-8">
              <span className="border border-white/30 bg-slate-950/30 px-3 py-2 font-tech text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm sm:px-4">
                {event.eyebrow}
              </span>
            </div>

            <div className="relative z-10 mb-5 h-20 w-20 sm:h-24 sm:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.logo}
                alt=""
                draggable={false}
                className="h-full w-full object-contain motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out group-hover:-translate-y-0.5"
              />
            </div>

            <h2 className="font-wc relative z-10 max-w-2xl text-2xl text-white sm:text-3xl md:text-4xl">
              {event.label}
            </h2>

            <div className="relative z-10 mt-5">
              <span className="btn-gradient inline-flex items-center gap-2 px-5 py-2.5 font-display text-sm uppercase tracking-[0.1em] text-white motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-out group-hover:-translate-y-0.5">
                {event.cta}
                <span
                  className="material-symbols-outlined text-base motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-out group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </span>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous featured event"
        className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/40 bg-slate-950/30 text-white backdrop-blur-sm transition-colors duration-100 hover:border-white hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:flex"
      >
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next featured event"
        className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-white/40 bg-slate-950/30 text-white backdrop-blur-sm transition-colors duration-100 hover:border-white hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:flex"
      >
        <ChevronRight size={22} aria-hidden="true" />
      </button>

      {/* Carousel dots */}
      <div className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 gap-1">
        {EVENTS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(i)}
            className="flex h-10 w-10 items-center justify-center focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Show ${item.label}`}
            aria-current={i === active ? "true" : undefined}
          >
            <span
              className={cn(
                "h-2 rounded-full transition-[width,background-color] duration-150 ease-out motion-reduce:transition-none",
                i === active ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70",
              )}
            />
          </button>
        ))}
      </div>
    </section>
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

// Compact countdown for the entry gate. Ticks down to seconds in the final
// minute so the card reads like a live countdown as entries approach.
function formatCountdown(secs: number): string {
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

// Phase-driven status badge. Every phase gets a visually distinct treatment;
// crucially FINISHED ("Full-Time") reads nothing like OPEN so an ended match
// can't be mistaken for one that still accepts entries. Text is single-sourced
// from PHASE_LABEL (LIVE overrides with the running minute).
function StatusPill({
  match,
  minute,
}: {
  match: MatchSummary;
  minute?: number | null;
}) {
  const phase = match.phase;

  if (phase === "LIVE") {
    return (
      <>
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-rose sm:text-xs">
          {minute ? `${minute}' Live` : "Live"}
        </span>
      </>
    );
  }

  if (phase === "UPCOMING") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-purple sm:text-xs">
        {PHASE_LABEL.UPCOMING}
        {match.onchain.startTime > 0 && (
          <span className="ml-2 font-normal text-muted">
            {formatKickoff(match.onchain.startTime)}
          </span>
        )}
      </span>
    );
  }

  if (phase === "OPEN") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan sm:text-xs">
        {PHASE_LABEL.OPEN}
      </span>
    );
  }

  // Terminal phases — bordered chip so they stand apart from the "open" state.
  const chip: Record<"FINISHED" | "RESOLVED" | "SETTLED", string> = {
    FINISHED: "border-gold/40 bg-gold/10 text-gold",
    RESOLVED: "border-gold/40 bg-gold/10 text-gold",
    SETTLED: "border-surface bg-surface/60 text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:text-xs",
        chip[phase],
      )}
    >
      {phase !== "SETTLED" && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {PHASE_LABEL[phase]}
    </span>
  );
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
  const isEnded = isTerminalPhase(match.phase);

  const opensAt = isUpcoming ? entryOpensAt(match.onchain.startTime) : null;
  const [nowSecs, setNowSecs] = useState(() => Math.floor(Date.now() / 1000));
  const entriesPending = opensAt !== null && opensAt > nowSecs;
  useEffect(() => {
    if (!entriesPending) return;
    const id = setInterval(
      () => setNowSecs(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [entriesPending]);

  const canEnter = match.phase === "OPEN" || (isUpcoming && !entriesPending);
  const hasScore = isLive || isEnded;

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
            <StatusPill match={match} minute={minute} />
            {match.pda === DEMO_PDA && (
              <span className="inline-flex border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground sm:text-xs">
                Demo Match
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 font-display text-lg sm:text-xl">
            <div className="flex items-center gap-3">
              <TeamBadge name={team1} size="lg" />
              <span className="truncate text-foreground">{team1}</span>
              <span
                className={cn("ml-auto", hasScore ? "text-cyan" : "text-muted")}
              >
                {score ? score.team1 : "–"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <TeamBadge name={team2} size="lg" />
              <span
                className={cn(
                  "truncate",
                  hasScore ? "text-foreground" : "text-muted",
                )}
              >
                {team2}
              </span>
              <span
                className={cn("ml-auto", hasScore ? "text-cyan" : "text-muted")}
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
            {entriesPending ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple">
                  Entries open in
                </span>
                <span className="font-mono text-[10px] font-bold tabular-nums text-purple sm:text-xs">
                  {formatCountdown(opensAt! - nowSecs)}
                </span>
              </>
            ) : canEnter ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
                  Enter
                </span>
                <span className="pointer-events-none">
                  <EnterButton className="px-3 py-1 text-[9px] sm:text-[10px]" />
                </span>
              </>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {isLive ? "Watch Live →" : "View Results →"}
              </span>
            )}
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
