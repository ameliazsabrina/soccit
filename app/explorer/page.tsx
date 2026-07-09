"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  ScrollText,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { type EventEntry } from "../_lib/api";
import { cn } from "../_lib/utils";
import { PageShell } from "../_components/page-shell";

const PAGE_SIZE = 20;

export default function ExplorerPage() {
  const [events] = useState<EventEntry[]>(() => DEMO_EVENTS);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

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

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageEvents = filteredEvents.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 lg:px-8">
        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Matches" value="12 tracked" />
          <SummaryCard label="Predictions" value="1,240" />
          <SummaryCard label="Last update" value="Live" />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 bg-surface p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search events, players, payloads…"
              className="h-10 w-full bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
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

        {/* Event count + pagination info */}
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-muted">
          <span>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={12} />
            Page {currentPage + 1}/{totalPages}
          </span>
        </div>

        {/* Logs table */}
        <div className="max-h-[55vh] overflow-y-auto bg-surface">
          <div className="hidden grid-cols-12 gap-4 border-b border-surface-elevated px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted sm:grid sticky top-0 bg-surface z-10">
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Players</div>
            <div className="col-span-2">Side</div>
            <div className="col-span-3">Payload</div>
          </div>

          {pageEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
              <ScrollText size={36} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">No events match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-elevated">
              {pageEvents.map((entry) => (
                <LogRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex h-9 w-9 items-center justify-center border border-surface bg-surface text-muted transition-colors hover:border-purple hover:text-foreground disabled:opacity-30 disabled:hover:border-surface disabled:hover:text-muted"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="flex h-9 w-9 items-center justify-center border border-surface bg-surface text-muted transition-colors hover:border-purple hover:text-foreground disabled:opacity-30 disabled:hover:border-surface disabled:hover:text-muted"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </PageShell>
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
      className="grid grid-cols-1 gap-2 px-4 py-3 text-sm transition-colors hover:bg-background/50 sm:grid-cols-12 sm:gap-4"
    >
      <div className="flex items-center gap-2 sm:col-span-2">
        <span className="text-xs font-mono text-muted">{entry.id}</span>
        {minute !== null && (
          <span className="text-xs font-bold text-cyan">{minute}&apos;</span>
        )}
      </div>
      <div className="sm:col-span-2">
        <span className="inline-flex items-center border border-surface-elevated bg-background px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-foreground">
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
          <span className={cn("text-xs font-bold uppercase", side === 1 ? "text-purple" : "text-cyan")}>
            {side === 1 ? "Home" : "Away"}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </div>
      <div className="sm:col-span-3">
        <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted">
          {JSON.stringify(entry.payload, null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="font-display text-lg text-foreground">{value}</p>
    </div>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const DEMO_EVENTS: EventEntry[] = [
  {
    id: "1719662400000-0",
    type: "goal",
    payload: { minute: 24, side: 1, scorerId: 1010 },
    players: {
      out: null,
      in: { id: 1010, name: "Cristiano Ronaldo", number: "7", positionId: 4, position: "Forward", side: 1 },
    },
  },
  {
    id: "1719662400001-0",
    type: "yellow_card",
    payload: { minute: 41, side: 2, playerId: 2004 },
    players: {
      out: null,
      in: { id: 2004, name: "Nicolás Otamendi", number: "19", positionId: 2, position: "Defender", side: 2 },
    },
  },
  {
    id: "1719662400002-0",
    type: "substitution",
    payload: { minute: 63, side: 2, playerOutId: 2011, playerInId: 2106 },
    players: {
      out: { id: 2011, name: "Ángel Di María", number: "11", positionId: 4, position: "Forward", side: 2 },
      in: { id: 2106, name: "Paulo Dybala", number: "21", positionId: 4, position: "Forward", side: 2 },
    },
  },
];