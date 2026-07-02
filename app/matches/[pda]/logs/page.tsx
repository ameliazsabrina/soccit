"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  Search,
  Filter,
  Wifi,
  WifiOff,
  Loader2,
  Radio,
  ScrollText,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  getMatch,
  getLineup,
  openMatchEventsStream,
  isValidPda,
  type MatchState,
  type Lineup,
  type EventEntry,
  type SseStatus,
} from "../../../_lib/api";
import { cn } from "../../../_lib/utils";

const DEMO_PDA = "demo";

export default function DataLogsPage() {
  const params = useParams();
  const router = useRouter();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const pda = isDemo ? DEMO_PDA : rawPda;

  const [match, setMatch] = useState<MatchState | null>(null);
  const [lineup, setLineup] = useState<Lineup | null>(null);
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventEntry[]>(() => (isDemo ? DEMO_EVENTS : []));
  const [status, setStatus] = useState<SseStatus>(isDemo ? "open" : "idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const sourceRef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isDemo) return;
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
      "0-0"
    );
  }

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.type))).sort(),
    [events]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((entry) => {
      const matchesType = filter === "all" || entry.type === filter;
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        entry.type.toLowerCase().includes(term) ||
        String(entry.players?.in?.name).toLowerCase().includes(term) ||
        String(entry.players?.out?.name).toLowerCase().includes(term) ||
        JSON.stringify(entry.payload).toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [events, filter, search]);

  const team1 = lineup?.teams.find((t) => t.side === 1);
  const team2 = lineup?.teams.find((t) => t.side === 2);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-purple" size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">Data Unavailable</h2>
          <p className="mt-2 text-muted">{error}</p>
          <button
            onClick={loadMatch}
            className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            <Radio size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b border-surface bg-surface/20 px-4 py-3 lg:px-8">
        <button
          onClick={() => router.push(`/matches/${pda}`)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={18} /> Back to Match
        </button>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={status} />
          {!isDemo && (
            <button
              onClick={openStream}
              disabled={status === "connecting"}
              className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground disabled:opacity-50"
              aria-label="Reconnect"
              title="Reconnect"
            >
              {status === "connecting" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Radio size={16} />
              )}
            </button>
          )}
        </div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-8 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Immutable Log</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              Data Logs
            </h1>
            <span className="font-mono text-xs text-muted">{isDemo ? "DEMO" : pda}</span>
          </div>
        </div>

        {/* Match summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Match"
            value={`${team1?.teamName ?? "Home"} vs ${team2?.teamName ?? "Away"}`}
          />
          <SummaryCard
            label="Score"
            value={`${match?.live?.goals.team1 ?? 0} - ${match?.live?.goals.team2 ?? 0}`}
          />
          <SummaryCard
            label="Minute"
            value={match?.live?.minute !== null ? `${match?.live?.minute ?? 0}'` : "—"}
          />
        </div>

        {streamError && (
          <div className="mb-4 flex items-center gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
            <WifiOff size={16} />
            {streamError}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 border border-surface bg-surface/20 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, players, payloads…"
              className="h-10 w-full bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan"
            >
              <option value="all">All types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event count */}
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted">
          <span>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Updated live
          </span>
        </div>

        {/* Logs table */}
        <div className="border border-surface bg-surface/10">
          <div className="hidden grid-cols-12 gap-4 border-b border-surface bg-surface/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted sm:grid">
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Players</div>
            <div className="col-span-2">Side</div>
            <div className="col-span-3">Payload</div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
              <ScrollText size={36} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">No events match your filters.</p>
              <p className="mt-1 text-xs">
                {events.length === 0
                  ? "Waiting for the first event from the stream."
                  : "Try clearing the search or filter."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface">
              {filteredEvents.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}

function LogRow({ entry }: { entry: EventEntry }) {
  const minute = (entry.payload as { minute?: number })?.minute ?? null;
  const side = (entry.payload as { side?: 1 | 2 })?.side ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 gap-2 px-4 py-3 text-sm transition-colors hover:bg-surface/30 sm:grid-cols-12 sm:gap-4"
    >
      <div className="flex items-center gap-2 sm:col-span-2">
        <span className="text-xs font-mono text-muted">{entry.id}</span>
        {minute !== null && (
          <span className="text-xs font-bold text-cyan">{minute}&apos;</span>
        )}
      </div>
      <div className="sm:col-span-2">
        <span className="inline-flex items-center border border-surface bg-background px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-foreground">
          {formatType(entry.type)}
        </span>
      </div>
      <div className="sm:col-span-3">
        {entry.players?.in || entry.players?.out ? (
          <div className="text-xs">
            {entry.players?.out && (
              <p className="text-muted">
                Out: <span className="text-foreground">{entry.players.out.name}</span>
              </p>
            )}
            {entry.players?.in && (
              <p className="text-muted">
                In: <span className="text-foreground">{entry.players.in.name}</span>
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </div>
      <div className="sm:col-span-2">
        {side ? (
          <span
            className={cn(
              "text-xs font-bold uppercase",
              side === 1 ? "text-purple" : "text-cyan"
            )}
          >
            {side === 1 ? "Home" : "Away"}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </div>
      <div className="sm:col-span-3">
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-surface bg-surface/20 p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="font-display text-lg text-foreground">{value}</p>
    </div>
  );
}

function ConnectionBadge({ status }: { status: SseStatus }) {
  switch (status) {
    case "open":
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-cyan">
          <Wifi size={12} /> Live
        </span>
      );
    case "connecting":
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted">
          <Loader2 size={12} className="animate-spin" /> Connecting
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-rose">
          <WifiOff size={12} /> Reconnecting
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted">
          <Activity size={12} /> Idle
        </span>
      );
  }
}

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEMO_EVENTS: EventEntry[] = [
  {
    id: "1719662400000-0",
    type: "goal",
    payload: { minute: 24, side: 1, scorerId: 5009 },
    players: {
      out: null,
      in: { id: 5009, name: "I. Forward", number: "9", positionId: 4, position: "Forward", side: 1 },
    },
  },
  {
    id: "1719662400001-0",
    type: "yellow_card",
    payload: { minute: 41, side: 1, playerId: 5004 },
    players: {
      out: null,
      in: { id: 5004, name: "D. Center Back", number: "5", positionId: 2, position: "Defender", side: 1 },
    },
  },
  {
    id: "1719662400002-0",
    type: "substitution",
    payload: { minute: 63, side: 1, playerOutId: 5009, playerInId: 5002 },
    players: {
      out: { id: 5009, name: "J. Forward", number: "9", positionId: 4, position: "Forward", side: 1 },
      in: { id: 5002, name: "M. Smith", number: "17", positionId: 4, position: "Forward", side: 1 },
    },
  },
];
