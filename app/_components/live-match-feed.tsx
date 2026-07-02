"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Trophy,
  Zap,
  ArrowRightLeft,
  CircleDot,
  AlertTriangle,
  ShieldAlert,
  Timer,
  Wifi,
  WifiOff,
  Loader2,
  Radio,
} from "lucide-react";
import { cn } from "../_lib/utils";
import {
  openLeaderboardStream,
  openMatchEventsStream,
  type EventEntry,
  type Leaderboard,
  type SseStatus,
} from "../_lib/api";

export type FeedTab = "events" | "leaderboard";

interface LiveMatchFeedProps {
  pda: string;
  isDemo?: boolean;
  defaultTab?: FeedTab;
  demoEvents?: EventEntry[];
  demoLeaderboard?: Leaderboard | null;
  className?: string;
  title?: string;
  showViewLogsLink?: boolean;
}

export function LiveMatchFeed({
  pda,
  isDemo = false,
  defaultTab = "events",
  demoEvents = [],
  demoLeaderboard = null,
  className,
  title = "Live Match Feed",
  showViewLogsLink = false,
}: LiveMatchFeedProps) {
  const [tab, setTab] = useState<FeedTab>(defaultTab);
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
    <div className={cn("flex flex-col border border-surface bg-surface/20", className)}>
      {/* Header */}
      <div className="border-b border-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-foreground">{title}</h3>
            <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wider">
              <ConnectionBadge status={activeStatus} />
              {activeStatus === "error" && (
                <span className="text-rose">Reconnecting…</span>
              )}
            </div>
            {activeError && (
              <p className="mt-1 text-xs text-rose">{activeError}</p>
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
        <div className="mt-4 flex border-b border-surface">
          <TabButton active={tab === "events"} onClick={() => setTab("events")}>
            <Activity size={14} className="sm:mr-2" />
            <span className="hidden sm:inline">Match Events</span>
            <span className="sm:hidden">Events</span>
            {events.length > 0 && (
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center bg-surface px-1.5 text-[10px] font-bold text-foreground">
                {events.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
            <Trophy size={14} className="sm:mr-2" />
            <span className="hidden sm:inline">Leaderboard</span>
            <span className="sm:hidden">Ranks</span>
          </TabButton>
        </div>
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
              <EventList events={events} isDemo={isDemo} />
            </motion.div>
          ) : (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <LeaderboardList leaderboard={leaderboard} isDemo={isDemo} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showViewLogsLink && (
        <div className="border-t border-surface p-3">
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

function ConnectionBadge({ status }: { status: SseStatus }) {
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

function EventList({ events, isDemo }: { events: EventEntry[]; isDemo: boolean }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
        <Activity size={36} className="mb-4 opacity-30" />
        <p className="text-sm font-medium">
          {isDemo ? "Demo events will appear here." : "No events yet."}
        </p>
        <p className="mt-1 text-xs">
          {isDemo
            ? "The demo simulates a live feed."
            : "The SSE stream is open — events will populate once the match starts."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((entry) => (
        <EventRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function EventRow({ entry }: { entry: EventEntry }) {
  const meta = getEventMeta(entry.type);
  const minute = (entry.payload as { minute?: number })?.minute ?? null;
  const side = (entry.payload as { side?: 1 | 2 })?.side ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
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
          <meta.icon size={18} className={meta.iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold capitalize text-foreground">
              {formatEventType(entry.type)}
            </p>
            {side && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  side === 1 ? "text-purple" : "text-cyan"
                )}
              >
                {side === 1 ? "Home" : "Away"}
              </span>
            )}
          </div>
          {(entry.players?.in || entry.players?.out) && (
            <p className="mt-1 truncate text-xs text-muted">
              {entry.players?.out && (
                <>
                  <span className="text-foreground">{entry.players.out.name}</span> out
                </>
              )}
              {entry.players?.in && entry.players?.out && " → "}
              {entry.players?.in && (
                <>
                  <span className="text-foreground">{entry.players.in.name}</span> in
                </>
              )}
            </p>
          )}
          {isPayloadObject(entry.payload) && (
            <PayloadDetails payload={entry.payload} />
          )}
        </div>
        {minute !== null && (
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-muted">
            <Timer size={12} />
            {minute}&apos;
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PayloadDetails({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).filter(
    ([key]) => !["minute", "side", "playerOutId", "playerInId"].includes(key)
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 border border-surface bg-background px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted"
        >
          {key}: <span className="text-foreground">{String(value)}</span>
        </span>
      ))}
    </div>
  );
}

function LeaderboardList({
  leaderboard,
  isDemo,
}: {
  leaderboard: Leaderboard | null;
  isDemo: boolean;
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

  return (
    <div className="space-y-3">
      {leaderboard.final && (
        <div className="mb-3 border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-gold">
          Final Results
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
            i === 0 && "border-gold/30 bg-gold/5",
            i === 1 && "border-muted/50 bg-surface/30",
            i === 2 && "border-bronze/30 bg-bronze/5",
            i > 2 && "border-surface"
          )}
        >
          <RankBadge rank={i + 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {row.user?.username ?? "Unknown"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">
              {row.predictions.length} prediction{row.predictions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <span className="block font-mono font-bold text-cyan">{row.points} pts</span>
            {row.earliestScoringLockMinute !== null && (
              <span className="text-[10px] text-muted">{row.earliestScoringLockMinute}&apos;</span>
            )}
          </div>
        </motion.div>
      ))}
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

function formatEventType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPayloadObject(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === "object" && payload !== null;
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
