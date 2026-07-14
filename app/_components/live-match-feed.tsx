"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Trophy,
  Zap,
  ArrowRightLeft,
  CircleDot,
  AlertTriangle,
  ShieldAlert,
  Wifi,
  WifiOff,
  Loader2,
  Radio,
} from "lucide-react";
import Image from "next/image";
import { cn } from "../_lib/utils";
import {
  openLeaderboardStream,
  openMatchEventsStream,
  calculatePrizes,
  formatUsdc,
  formatWallet,
  type EventEntry,
  type Leaderboard,
  type SseStatus,
} from "../_lib/api";
import {
  describeMatchEvent,
  normalizeMatchEvents,
  type MatchEventContext,
} from "../_lib/match-events";

export type FeedTab = "events" | "leaderboard";
export type FeedView = FeedTab | "both";

interface LiveMatchFeedProps {
  pda: string;
  isDemo?: boolean;
  defaultTab?: FeedTab;
  view?: FeedView;
  demoEvents?: EventEntry[];
  demoLeaderboard?: Leaderboard | null;
  className?: string;
  title?: string;
  showViewLogsLink?: boolean;
  poolTotal?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  players?: MatchEventContext["players"];
  isTerminal?: boolean;
}

export function LiveMatchFeed({
  pda,
  isDemo = false,
  defaultTab = "events",
  view = "both",
  demoEvents = [],
  demoLeaderboard = null,
  className,
  showViewLogsLink = false,
  poolTotal = "0",
  homeTeamName = "Home",
  awayTeamName = "Away",
  players = [],
  isTerminal = false,
}: LiveMatchFeedProps) {
  const [tab, setTab] = useState<FeedTab>(
    view === "leaderboard" ? "leaderboard" : view === "events" ? "events" : defaultTab
  );
  const showTabs = view === "both";
  const [events, setEvents] = useState<EventEntry[]>(() => (isDemo ? demoEvents : []));
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(() =>
    isDemo ? demoLeaderboard : null
  );
  const [eventsStatus, setEventsStatus] = useState<SseStatus>(isDemo ? "open" : "idle");
  const [leaderboardStatus, setLeaderboardStatus] = useState<SseStatus>(isDemo ? "open" : "idle");
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const eventsSourceRef = useRef<EventSource | null>(null);
  const leaderboardSourceRef = useRef<EventSource | null>(null);

  const activeStatus = tab === "events" ? eventsStatus : leaderboardStatus;
  const activeError = tab === "events" ? eventsError : leaderboardError;
  const normalizedEvents = useMemo(
    () => normalizeMatchEvents(events, { terminal: isTerminal }),
    [events, isTerminal],
  );
  const eventContext = useMemo<MatchEventContext>(
    () => ({ homeTeamName, awayTeamName, players }),
    [awayTeamName, homeTeamName, players],
  );

  function closeStreams() {
    eventsSourceRef.current?.close();
    leaderboardSourceRef.current?.close();
    eventsSourceRef.current = null;
    leaderboardSourceRef.current = null;
  }

  function openStreams() {
    if (isDemo || !pda || pda === "demo") return;

    closeStreams();

    setEventsStatus("connecting");
    setLeaderboardStatus("connecting");
    setEventsError(null);
    setLeaderboardError(null);

    eventsSourceRef.current = openMatchEventsStream(
      pda,
      {
        onEvent: (entry) => {
          setEvents((prev) => {
            if (prev.some((e) => e.id === entry.id)) return prev;
            return [entry, ...prev];
          });
        },
        onStatus: setEventsStatus,
        onError: setEventsError,
      },
      "0-0"
    );

    leaderboardSourceRef.current = openLeaderboardStream(pda, {
      onUpdate: setLeaderboard,
      onStatus: setLeaderboardStatus,
      onError: setLeaderboardError,
    });
  }

  useEffect(() => {
    if (isDemo) return;
    openStreams();
    return () => closeStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo]);

  return (
    <div className={cn("flex min-h-0 flex-col", showTabs && "border border-surface bg-surface/20", className)}>
      {/* Header */}
      <div className={cn("flex-shrink-0 border-b border-surface", showTabs ? "p-4" : "px-4 py-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
            <ConnectionBadge status={activeStatus} recorded={isTerminal} />
            {activeStatus === "error" && (
              <span className="text-rose">Reconnecting…</span>
            )}
            {activeError && (
              <p className="text-xs text-rose">{activeError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isDemo && (
              <button
                onClick={openStreams}
                disabled={activeStatus === "connecting"}
                className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-50"
                aria-label="Reconnect stream"
                title="Reconnect stream"
              >
                {activeStatus === "connecting" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Radio size={16} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="mt-4 flex border-b border-surface">
            <TabButton active={tab === "events"} onClick={() => setTab("events")}>
              <Activity size={14} className="sm:mr-2" />
              <span className="hidden sm:inline">Timeline</span>
              <span className="sm:hidden">Timeline</span>
              {normalizedEvents.length > 0 && (
                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center bg-surface px-1.5 text-[10px] font-bold text-foreground">
                  {normalizedEvents.length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
              <Trophy size={14} className="sm:mr-2" />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Ranks</span>
            </TabButton>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {tab === "events" ? (
            <motion.div
              key="events"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <EventList
                events={normalizedEvents}
                isDemo={isDemo}
                context={eventContext}
              />
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <LeaderboardList leaderboard={leaderboard} isDemo={isDemo} poolTotal={poolTotal} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showViewLogsLink && (
        <div className="flex-shrink-0 border-t border-surface p-3">
          <a
            href={`/matches/${pda}/logs`}
            className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:text-foreground"
          >
            View full data logs <ArrowRightLeft size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center border-b-2 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
        active
          ? "border-cyan text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ConnectionBadge({
  status,
  recorded,
}: {
  status: SseStatus;
  recorded: boolean;
}) {
  if (recorded) {
    return (
      <span className="flex items-center gap-1.5 text-foreground/70">
        <CircleDot size={12} aria-hidden="true" />
        Recorded feed
      </span>
    );
  }
  switch (status) {
    case "open":
      return (
        <span className="flex items-center gap-1.5 text-cyan">
          <Wifi size={12} />
          Live
        </span>
      );
    case "connecting":
      return (
        <span className="flex items-center gap-1.5 text-muted">
          <Loader2 size={12} className="animate-spin" />
          Connecting
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1.5 text-rose">
          <WifiOff size={12} />
          Interrupted
        </span>
      );
    case "closed":
      return (
        <span className="flex items-center gap-1.5 text-muted">
          <WifiOff size={12} />
          Closed
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-muted">
          <CircleDot size={12} />
          Idle
        </span>
      );
  }
}

function EventList({
  events,
  isDemo,
  context,
}: {
  events: EventEntry[];
  isDemo: boolean;
  context: MatchEventContext;
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
        <Activity size={36} className="mb-4 opacity-30" />
        <p className="text-sm font-medium">
          {isDemo ? "No demo action yet." : "No action yet · Stream connected"}
        </p>
        <p className="mt-1 text-xs">
          {isDemo
            ? "The demo simulates a live feed."
            : "Events will populate once the match starts."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0 pl-6">
      <div className="absolute bottom-0 left-[27px] top-4 w-px bg-surface" />
      {events.map((entry) => (
        <EventRow key={entry.id} entry={entry} context={context} />
      ))}
    </div>
  );
}

function EventRow({
  entry,
  context,
}: {
  entry: EventEntry;
  context: MatchEventContext;
}) {
  const meta = getEventMeta(entry.type);
  const presentation = describeMatchEvent(entry, context);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative py-3"
    >
      {/* Minute badge on timeline */}
      {presentation.minute !== null && (
        <div className="absolute -left-6 top-3 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center border border-surface bg-background">
          <span className="text-xs font-bold text-cyan">
            {presentation.minute}&apos;
          </span>
        </div>
      )}

      {/* Event card */}
      <div
        className={cn(
          "relative overflow-hidden border bg-background/50 p-3 transition-colors hover:bg-surface",
          meta.borderColor,
          meta.bgColor
        )}
      >
        <div className={cn("absolute left-0 top-0 bottom-0 w-1", meta.barColor)} />
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center",
              meta.iconBg
            )}
          >
            <meta.icon size={18} className={meta.iconColor} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">
                {presentation.title}
              </p>
              {presentation.teamName && (
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    presentation.side === 1 ? "text-purple" : "text-cyan"
                  )}
                >
                  {presentation.teamName}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium leading-snug text-foreground">
              {presentation.headline}
            </p>
            {presentation.detail && (
              <p className="mt-1 text-xs text-foreground/65">
                {presentation.detail}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LeaderboardList({
  leaderboard,
  isDemo,
  poolTotal,
}: {
  leaderboard: Leaderboard | null;
  isDemo: boolean;
  poolTotal: string;
}) {
  if (!leaderboard || leaderboard.ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
        <Trophy size={36} className="mb-4 opacity-30" />
        <p className="text-sm font-medium">
          {isDemo ? "Demo leaderboard is empty." : "No predictions scored yet."}
        </p>
        <p className="mt-1 text-xs">
          {isDemo
            ? "The demo shows placeholder ranks."
            : "Rankings will appear once predictions are locked and events are processed."}
        </p>
      </div>
    );
  }

  const prizes = calculatePrizes(poolTotal);
  const participantCount = leaderboard.ranking.length;
  const winnerTakesAll = participantCount < 3;

  const prizeForRank = (rank: number): number => {
    if (winnerTakesAll) return prizes.total;
    if (rank === 1) return prizes.first;
    if (rank === 2) return prizes.second;
    if (rank === 3) return prizes.third;
    return 0;
  };

  return (
    <div className="space-y-3">
      {leaderboard.final && (
        <div className="mb-3 border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-gold">
          Final Results
        </div>
      )}

      {winnerTakesAll && (
        <div className="mb-3 border border-gold/30 bg-gold/5 px-3 py-2 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-gold">Winner Takes All</p>
          <p className="text-[10px] text-muted">Less than 3 players — top rank wins full pool.</p>
        </div>
      )}

      {leaderboard.ranking.slice(0, 3).length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {leaderboard.ranking.slice(0, 3).map((row, i) => (
            <PodiumCard
              key={row.owner}
              rank={i + 1}
              username={row.user?.username}
              avatar={row.user?.avatar}
              points={row.points}
              prize={prizeForRank(i + 1)}
            />
          ))}
        </div>
      )}

      {leaderboard.ranking.map((row, i) => (
        <motion.div
          key={row.owner}
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-3 border bg-background/50 p-3 transition-colors hover:bg-surface",
            i === 0 && "border-gold/40 bg-gold/5 shadow-[0_0_20px_rgba(219,161,17,0.25)]",
            i === 1 && "border-silver/50 bg-surface/30 shadow-[0_0_16px_rgba(232,234,237,0.18)]",
            i === 2 && "border-bronze/40 bg-bronze/5 shadow-[0_0_14px_rgba(219,161,17,0.18)]",
            i > 2 && "border-surface"
          )}
        >
          <RankBadge rank={i + 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {row.user?.username ?? formatWallet(row.owner)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {row.predictions.length} prediction{row.predictions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <span className="block font-mono font-bold text-cyan">{row.points} pts</span>
            {i < 3 && prizeForRank(i + 1) > 0 && (
              <span className="text-[10px] font-bold text-gold">
                ${formatUsdc(String(Math.round(prizeForRank(i + 1))))}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PodiumCard({
  rank,
  username,
  avatar,
  points,
  prize,
}: {
  rank: number;
  username?: string | null;
  avatar?: string | null;
  points: number;
  prize: number;
}) {
  const colors =
    rank === 1
      ? "border-gold/40 bg-gold/5 text-gold"
      : rank === 2
      ? "border-surface bg-surface/30 text-foreground"
      : "border-bronze/40 bg-bronze/5 text-bronze";

  return (
    <div className={cn("flex flex-col items-center border p-3 text-center", colors)}>
      <span className="mb-2 font-display text-2xl">#{rank}</span>
      {avatar ? (
        <div className="relative mb-2 h-10 w-10 overflow-hidden">
          <Image src={`/avatars/${avatar}.webp`} alt={username ?? "Player"} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="mb-2 flex h-10 w-10 items-center justify-center bg-surface text-[10px] font-bold uppercase text-foreground">
          {username?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
      )}
      <p className="truncate text-xs font-bold text-foreground">{username ?? "Unknown"}</p>
      <p className="text-[10px] text-muted">{points} pts</p>
      {prize > 0 && <p className="mt-1 text-[10px] font-bold text-gold">${formatUsdc(String(Math.round(prize)))}</p>}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-9 w-9 items-center justify-center bg-gold text-background">
        <Trophy size={16} />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-9 w-9 items-center justify-center border border-muted/50 bg-surface font-display text-foreground">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-9 w-9 items-center justify-center bg-bronze text-background">
        3
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center bg-surface font-display text-foreground">
      {rank}
    </div>
  );
}

function getEventMeta(type: string) {
  switch (type) {
    case "goal":
      return {
        icon: Zap,
        iconColor: "text-cyan",
        iconBg: "bg-cyan/10",
        barColor: "bg-cyan",
        borderColor: "border-cyan/30",
        bgColor: "bg-cyan/5",
      };
    case "substitution":
      return {
        icon: ArrowRightLeft,
        iconColor: "text-purple",
        iconBg: "bg-purple/10",
        barColor: "bg-purple",
        borderColor: "border-purple/30",
        bgColor: "bg-purple/5",
      };
    case "yellow_card":
      return {
        icon: AlertTriangle,
        iconColor: "text-gold",
        iconBg: "bg-gold/10",
        barColor: "bg-gold",
        borderColor: "border-gold/30",
        bgColor: "bg-gold/5",
      };
    case "red_card":
      return {
        icon: ShieldAlert,
        iconColor: "text-rose",
        iconBg: "bg-rose/10",
        barColor: "bg-rose",
        borderColor: "border-rose/30",
        bgColor: "bg-rose/5",
      };
    case "status":
      return {
        icon: CircleDot,
        iconColor: "text-foreground/70",
        iconBg: "bg-surface",
        barColor: "bg-foreground/40",
        borderColor: "border-surface-elevated",
        bgColor: "bg-background/70",
      };
    default:
      return {
        icon: Activity,
        iconColor: "text-muted",
        iconBg: "bg-surface",
        barColor: "bg-muted",
        borderColor: "border-surface",
        bgColor: "bg-background/50",
      };
  }
}
