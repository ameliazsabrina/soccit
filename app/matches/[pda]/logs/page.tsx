"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Search,
  WifiOff,
  Radio,
  ScrollText,
  AlertCircle,
  Clock,
  Zap,
  ArrowRightLeft,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import type { ArenaTab } from "../../../_components/top-nav";
import {
  getMatch,
  getLineup,
  openMatchEventsStream,
  isValidPda,
  isTerminalPhase,
  displayScore,
  type MatchState,
  type Lineup,
  type EventEntry,
  type SseStatus,
} from "../../../_lib/api";
import {
  describeMatchEvent,
  normalizeMatchEvents,
  type MatchEventContext,
} from "../../../_lib/match-events";
import { cn } from "../../../_lib/utils";

const DEMO_PDA = "demo";

const DEMO_MATCH_STATE: MatchState = {
  fixtureId: 999999,
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "1000000",
    poolTotal: "2500000",
    participantCount: 2,
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
  updatedAt: Date.now(),
};

const DEMO_LINEUP_STATE: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    {
      side: 1,
      teamId: 101,
      teamName: "SOCCIT FC",
      formation: "4-3-3",
      players: [],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "SOCCIT Reserves",
      formation: "4-3-3",
      players: [],
    },
  ],
  names: {},
};

const DEMO_EVENTS: EventEntry[] = [
  {
    id: "1719662400000-0",
    type: "goal",
    payload: { minute: 24, side: 1, scorerId: 7 },
    players: {
      out: null,
      in: {
        id: 7,
        name: "Lion",
        number: "7",
        positionId: 4,
        position: "Forward",
        side: 1,
      },
    },
  },
  {
    id: "1719662400001-0",
    type: "yellow_card",
    payload: { minute: 41, side: 1, playerId: 3 },
    players: {
      out: null,
      in: {
        id: 3,
        name: "Shark",
        number: "3",
        positionId: 2,
        position: "Defender",
        side: 1,
      },
    },
  },
  {
    id: "1719662400002-0",
    type: "substitution",
    payload: { minute: 63, side: 1, playerOutId: 7, playerInId: 12 },
    players: {
      out: {
        id: 7,
        name: "Lion",
        number: "7",
        positionId: 4,
        position: "Forward",
        side: 1,
      },
      in: {
        id: 12,
        name: "Bear",
        number: "12",
        positionId: 1,
        position: "Goalkeeper",
        side: 1,
      },
    },
  },
];

export default function MatchIntelligencePage() {
  const params = useParams();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const isDemoSettled = rawPda === "demo-settled";
  const pda = isDemo ? DEMO_PDA : isDemoSettled ? "demo-settled" : rawPda;

  const subNavTabs: ArenaTab[] = [
    {
      model: "logs",
      label: "Logs",
      href: `/matches/${pda}/logs`,
      active: true,
    },
    {
      model: "settlement",
      label: "Settlement",
      href: `/matches/${pda}/settlement`,
      active: false,
    },
  ];

  const DEMO_SETTLED_MATCH_STATE: MatchState = {
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
      usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      winners: ["EcLvtR1WJv47bUUa6MbcCS1AB7KVDdS5JuSWdUFR9ycQ", null, null],
    },
    // Terminal: backend nulls `live` and moves the score to `finalScore`.
    live: null,
    finalScore: { team1: 2, team2: 1 },
    updatedAt: Date.now(),
  };

  const DEMO_SETTLED_LINEUP_STATE: Lineup = {
    fixtureId: 888888,
    updatedAt: Date.now(),
    teams: [
      {
        side: 1,
        teamId: 301,
        teamName: "SOCCIT FC",
        formation: "4-3-3",
        players: [],
      },
      {
        side: 2,
        teamId: 302,
        teamName: "SOCCIT Reserves",
        formation: "4-3-3",
        players: [],
      },
    ],
    names: {},
  };

  const DEMO_SETTLED_EVENTS: EventEntry[] = [
    {
      id: "s1",
      type: "goal",
      payload: { minute: 18, side: 1 },
      players: {
        out: null,
        in: {
          id: 10,
          name: "Eagle",
          number: "10",
          positionId: 4,
          position: "Forward",
          side: 1,
        },
      },
    },
    {
      id: "s2",
      type: "prediction",
      payload: { user: "demoking", points: 3, kind: 2 },
    },
    {
      id: "s3",
      type: "goal",
      payload: { minute: 34, side: 2 },
      players: {
        out: null,
        in: {
          id: 9,
          name: "Bull",
          number: "9",
          positionId: 4,
          position: "Forward",
          side: 2,
        },
      },
    },
    {
      id: "s4",
      type: "yellow_card",
      payload: { minute: 52, side: 1 },
      players: {
        out: null,
        in: {
          id: 8,
          name: "Wolf",
          number: "8",
          positionId: 3,
          position: "Midfielder",
          side: 1,
        },
      },
    },
    {
      id: "s5",
      type: "goal",
      payload: { minute: 67, side: 1 },
      players: {
        out: null,
        in: {
          id: 7,
          name: "Lion",
          number: "7",
          positionId: 4,
          position: "Forward",
          side: 1,
        },
      },
    },
    {
      id: "s6",
      type: "substitution",
      payload: { minute: 75, side: 2 },
      players: {
        out: {
          id: 9,
          name: "Bull",
          number: "9",
          positionId: 4,
          position: "Forward",
          side: 2,
        },
        in: {
          id: 12,
          name: "Bear",
          number: "12",
          positionId: 1,
          position: "Goalkeeper",
          side: 2,
        },
      },
    },
  ];

  const [match, setMatch] = useState<MatchState | null>(
    isDemo ? DEMO_MATCH_STATE : isDemoSettled ? DEMO_SETTLED_MATCH_STATE : null,
  );
  const [lineup, setLineup] = useState<Lineup | null>(
    isDemo
      ? DEMO_LINEUP_STATE
      : isDemoSettled
        ? DEMO_SETTLED_LINEUP_STATE
        : null,
  );
  const [loading, setLoading] = useState(!isDemo && !isDemoSettled);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventEntry[]>(() =>
    isDemo ? DEMO_EVENTS : isDemoSettled ? DEMO_SETTLED_EVENTS : [],
  );
  const [status, setStatus] = useState<SseStatus>(
    isDemo ? "open" : isDemoSettled ? "idle" : "idle",
  );
  const [streamError, setStreamError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isDemo || isDemoSettled) return;
    if (!isValidPda(pda)) {
      setError("Invalid match address.");
      setLoading(false);
      return;
    }
    loadMatch();
    openStream();
    return () => sourceRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo]);

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

  function openStream() {
    if (isDemo || !pda || pda === "demo") return;
    sourceRef.current?.close();
    setStatus("connecting");
    setStreamError(null);
    sourceRef.current = openMatchEventsStream(
      pda,
      {
        onEvent: (entry) => {
          setEvents((prev) => {
            if (prev.some((e) => e.id === entry.id)) return prev;
            return [entry, ...prev];
          });
        },
        onStatus: setStatus,
        onError: setStreamError,
      },
      "0-0",
    );
  }

  const terminal = match?.phase
    ? isTerminalPhase(match.phase)
    : Boolean(match?.onchain?.settled);
  const normalizedEvents = useMemo(
    () => normalizeMatchEvents(events, { terminal }),
    [events, terminal],
  );
  const eventContext = useMemo<MatchEventContext>(() => {
    const home = lineup?.teams.find((team) => team.side === 1);
    const away = lineup?.teams.find((team) => team.side === 2);
    return {
      homeTeamName: home?.teamName ?? "Home",
      awayTeamName: away?.teamName ?? "Away",
      players: lineup?.teams.flatMap((team) =>
        team.players.map((player) => ({
          id: player.id,
          name: player.name,
          side: team.side,
        })),
      ) ?? [],
    };
  }, [lineup]);

  const eventTypes = useMemo(
    () => Array.from(new Set(normalizedEvents.map((event) => event.type))).sort(),
    [normalizedEvents],
  );

  const filteredEvents = useMemo(() => {
    return normalizedEvents.filter((entry) => {
      const matchesType = filter === "all" || entry.type === filter;
      const term = search.toLowerCase();
      const presentation = describeMatchEvent(entry, eventContext);
      const matchesSearch =
        !term ||
        entry.type.toLowerCase().includes(term) ||
        presentation.title.toLowerCase().includes(term) ||
        presentation.headline.toLowerCase().includes(term) ||
        String(presentation.teamName).toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [eventContext, filter, normalizedEvents, search]);

  const team1 = lineup?.teams.find((t) => t.side === 1);
  const team2 = lineup?.teams.find((t) => t.side === 2);
  const score = match ? displayScore(match) : null;

  if (loading) {
    return (
      <PageShell arenaTabs={subNavTabs}>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Loading Intelligence
          </div>
          <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
            <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell arenaTabs={subNavTabs}>
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">
            Data Unavailable
          </h2>
          <p className="mt-2 text-muted">{error}</p>
          <button
            onClick={loadMatch}
            className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            <Radio size={16} /> Retry
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell arenaTabs={subNavTabs}>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 lg:px-8">
        {/* Match summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Match"
            value={`${team1?.teamName ?? "Home"} vs ${team2?.teamName ?? "Away"}`}
          />
          <SummaryCard
            label="Score"
            value={score ? `${score.team1} - ${score.team2}` : "— : —"}
          />
          <SummaryCard
            label="Minute"
            value={match?.live?.minute != null ? `${match.live.minute}'` : "—"}
          />
        </div>

        {streamError && (
          <div className="mb-4 flex items-center gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
            <WifiOff size={16} />
            {streamError}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 bg-surface p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, players…"
              className="h-10 w-full bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterPill>
            {eventTypes.map((type) => (
              <FilterPill
                key={type}
                active={filter === type}
                onClick={() => setFilter(type)}
              >
                {formatType(type)}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Event count */}
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted">
          <span>
            {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {terminal
              ? "Recorded feed"
              : status === "open"
                ? "Live feed"
                : status === "connecting"
                  ? "Connecting"
                  : "Feed idle"}
          </span>
        </div>

        {/* Timeline — scrollable so it doesn't overlap the ticker */}
        <div className="max-h-[50vh] overflow-y-auto bg-surface p-4">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
              <ScrollText size={36} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">
                No events match your filters.
              </p>
              <p className="mt-1 text-xs">
                {normalizedEvents.length === 0
                  ? "Waiting for the first event from the stream."
                  : "Try clearing the search or filter."}
              </p>
            </div>
          ) : (
            <div className="relative space-y-0 pl-6">
              <div className="absolute bottom-0 left-[27px] top-4 w-px bg-surface-elevated" />
              {filteredEvents.map((entry) => (
                <TimelineRow key={entry.id} entry={entry} context={eventContext} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function FilterPill({
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
        "px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
        active
          ? "bg-purple text-white"
          : "border border-surface bg-background text-muted hover:border-purple hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function TimelineRow({
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative py-3"
    >
      {presentation.minute !== null && (
        <div className="absolute -left-6 top-3 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center border border-surface bg-background">
          <span className="text-xs font-bold text-cyan">
            {presentation.minute}&apos;
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative overflow-hidden border bg-background/50 p-3 transition-colors hover:bg-surface",
          meta.borderColor,
          meta.bgColor,
        )}
      >
        <div
          className={cn("absolute left-0 top-0 bottom-0 w-1", meta.barColor)}
        />
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center",
              meta.iconBg,
            )}
          >
            <meta.icon size={18} className={meta.iconColor} />
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
                    presentation.side === 1 ? "text-purple" : "text-cyan",
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="font-display text-lg text-foreground">{value}</p>
    </div>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
        icon: Activity,
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
        icon: Activity,
        iconColor: "text-foreground/70",
        iconBg: "bg-surface",
        barColor: "bg-foreground/40",
        borderColor: "border-surface-elevated",
        bgColor: "bg-background/70",
      };
    default:
      return {
        icon: Trophy,
        iconColor: "text-muted",
        iconBg: "bg-surface",
        barColor: "bg-muted",
        borderColor: "border-surface",
        bgColor: "bg-background/50",
      };
  }
}
