"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  MapPin,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import { getMatches, getWorldCupBracket } from "../../../_lib/api";
import { cn } from "../../../_lib/utils";
import {
  FALLBACK_BRACKET,
  ROUND_META,
  mergeApiBracket,
  mergeMatchSummaries,
  type BracketMatch,
  type BracketRoundKey,
  type BracketRounds,
  type BracketTeam,
} from "./world-cup-data";

type DataState = "syncing" | "live" | "preview";

const FWC_LOGO_WHITE = "/assets/events/fwc-logo-white.svg";

export function WorldCupBracket() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRound = searchParams.get("round") as BracketRoundKey | null;
  const validRequestedRound = ROUND_META.some((round) => round.key === requestedRound);
  const [selectedRound, setSelectedRound] = useState<BracketRoundKey>(
    validRequestedRound && requestedRound ? requestedRound : "final",
  );
  const [rounds, setRounds] = useState<BracketRounds>(FALLBACK_BRACKET);
  const [dataState, setDataState] = useState<DataState>("syncing");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadBracket = useCallback(async () => {
    setDataState("syncing");
    setErrorMessage(null);

    const [bracketResult, matchesResult] = await Promise.allSettled([
      getWorldCupBracket(),
      getMatches(),
    ]);

    try {
      let nextRounds = FALLBACK_BRACKET;
      let hasLiveData = false;
      let nextUpdatedAt: number | null = null;

      if (bracketResult.status === "fulfilled") {
        nextRounds = mergeApiBracket(bracketResult.value);
        nextUpdatedAt = bracketResult.value.updatedAt || Date.now();
        hasLiveData = true;
      }

      if (matchesResult.status === "fulfilled") {
        const merged = mergeMatchSummaries(nextRounds, matchesResult.value);
        nextRounds = merged.rounds;
        if (merged.mergedCount > 0) {
          hasLiveData = true;
          nextUpdatedAt = Date.now();
        }
      }

      if (!hasLiveData) throw new Error("Live tournament data is unavailable.");

      setRounds(nextRounds);
      setUpdatedAt(nextUpdatedAt);
      setDataState("live");
    } catch (error) {
      setRounds(FALLBACK_BRACKET);
      setUpdatedAt(null);
      setDataState("preview");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Live tournament data is temporarily unavailable.",
      );
    }
  }, []);

  useEffect(() => {
    void loadBracket();
  }, [loadBracket]);

  const selectRound = (round: BracketRoundKey) => {
    setSelectedRound(round);
    const params = new URLSearchParams(searchParams.toString());
    params.set("round", round);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const totalMatches = useMemo(
    () => Object.values(rounds).reduce((total, matches) => total + matches.length, 0),
    [rounds],
  );

  return (
    <PageShell variant="worldcup" fullWidth hideTicker>
      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden pb-6">
        <TournamentHeader dataState={dataState} updatedAt={updatedAt} />

        {errorMessage && dataState === "preview" && (
          <div className="mx-4 mb-4 flex flex-col gap-3 border border-wc-cyan/30 bg-wc-cyan/10 px-4 py-3 sm:mx-6 sm:flex-row sm:items-center sm:justify-between lg:mx-8">
            <div className="flex items-start gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-wc-cyan" size={18} />
              <p className="font-wc-support text-sm leading-5 text-white/80">
                Live scores are unavailable. Showing the official 2026 bracket structure.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadBracket()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-white/20 bg-white/10 px-4 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors duration-100 ease-out hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wc-cyan active:translate-y-px"
            >
              <RefreshCw aria-hidden="true" size={14} />
              Retry live data
            </button>
          </div>
        )}

        {totalMatches === 0 ? (
          <EmptyBracket onRetry={loadBracket} />
        ) : (
          <>
            <div className="hidden min-h-0 flex-1 lg:block">
              <DesktopBracket rounds={rounds} />
            </div>
            <div className="min-h-0 flex-1 lg:hidden">
              <MobileBracket
                rounds={rounds}
                selectedRound={selectedRound}
                onSelectRound={selectRound}
              />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

function TournamentHeader({
  dataState,
  updatedAt,
}: {
  dataState: DataState;
  updatedAt: number | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-5 pt-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:pb-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FWC_LOGO_WHITE}
          alt="FIFA World Cup 2026"
          className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
        />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-wc-cyan">
            FIFA World Cup 2026
          </p>
          <h1 className="font-wc mt-1 text-4xl leading-none text-white sm:text-5xl lg:text-6xl">
            Road to the final
          </h1>
          <p className="font-wc-support mt-2 max-w-xl text-sm text-white/65">
            Follow every knockout path. Open an active match to enter predictions.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Bracket data status">
        <span className="border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
          32 teams · 32 fixtures
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]",
            dataState === "live"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : dataState === "syncing"
                ? "border-white/15 bg-white/5 text-white/70"
                : "border-wc-cyan/30 bg-wc-cyan/10 text-wc-cyan",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              dataState === "live"
                ? "bg-emerald-300"
                : dataState === "syncing"
                  ? "motion-safe:animate-pulse bg-white/60"
                  : "bg-wc-cyan",
            )}
          />
          {dataState === "live"
            ? `Live · ${formatUpdatedAt(updatedAt)}`
            : dataState === "syncing"
              ? "Syncing scores"
              : "Schedule preview"}
        </span>
      </div>
    </header>
  );
}

function DesktopBracket({ rounds }: { rounds: BracketRounds }) {
  const leftR32 = rounds.round_of_32.slice(0, 8);
  const rightR32 = rounds.round_of_32.slice(8, 16);
  const leftR16 = rounds.round_of_16.slice(0, 4);
  const rightR16 = rounds.round_of_16.slice(4, 8);
  const leftQuarter = rounds.quarter.slice(0, 2);
  const rightQuarter = rounds.quarter.slice(2, 4);
  const leftSemi = rounds.semi.slice(0, 1);
  const rightSemi = rounds.semi.slice(1, 2);

  return (
    <section aria-label="World Cup knockout bracket" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-8 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
        <span>Scroll horizontally to explore every round</span>
        <span>Match cards with an arrow are open</span>
      </div>
      <div className="wc-bracket-scroll min-h-0 flex-1 overflow-x-auto overflow-y-auto border-y border-white/10 bg-slate-950/40">
        <div className="relative mx-auto h-[900px] w-[1800px]">
          <BracketLines />
          <div
            className="relative z-10 grid h-full"
            style={{ gridTemplateColumns: "repeat(9, 200px)" }}
          >
            <BracketColumn label="Round of 32" matches={leftR32} />
            <BracketColumn label="Round of 16" matches={leftR16} />
            <BracketColumn label="Quarter-finals" matches={leftQuarter} />
            <BracketColumn label="Semi-finals" matches={leftSemi} />
            <FinalColumn
              match={rounds.final[0]}
              thirdPlaceMatch={rounds.third_place[0]}
            />
            <BracketColumn label="Semi-finals" matches={rightSemi} />
            <BracketColumn label="Quarter-finals" matches={rightQuarter} />
            <BracketColumn label="Round of 16" matches={rightR16} />
            <BracketColumn label="Round of 32" matches={rightR32} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BracketColumn({
  label,
  matches,
}: {
  label: string;
  matches: BracketMatch[];
}) {
  return (
    <div className="relative flex h-full flex-col px-3 pb-6 pt-14">
      <h2 className="absolute inset-x-2 top-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-wc-cyan">
        {label}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col">
        {matches.map((match) => (
          <div key={match.id} className="flex min-h-0 flex-1 items-center justify-center">
            <MatchCard match={match} compact />
          </div>
        ))}
      </div>
    </div>
  );
}

function FinalColumn({
  match,
  thirdPlaceMatch,
}: {
  match: BracketMatch | undefined;
  thirdPlaceMatch: BracketMatch | undefined;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-2 pb-6 pt-14">
      <div className="absolute inset-x-2 top-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-wc-cyan">
        Final · Match 104
      </div>
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-wc-cyan/30 bg-wc-cyan/10 shadow-[0_0_60px_rgba(219,161,17,0.16)]">
        <Trophy aria-hidden="true" className="text-wc-cyan" size={36} />
      </div>
      {match ? <MatchCard match={match} featured /> : null}
      <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
        New York New Jersey
      </p>
      {thirdPlaceMatch && (
        <div className="mt-10 flex flex-col items-center">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
            Bronze final
          </p>
          <MatchCard match={thirdPlaceMatch} compact />
        </div>
      )}
    </div>
  );
}

function BracketLines() {
  const width = 1800;
  const height = 900;
  const columnWidth = 200;
  const cardHalfWidth = 88;
  const top = 56;
  const usableHeight = 820;

  const centerX = (column: number) => column * columnWidth + columnWidth / 2;
  const yPositions = (count: number) =>
    Array.from({ length: count }, (_, index) => top + ((index + 0.5) * usableHeight) / count);

  const paths: string[] = [];
  const addConnections = (
    childColumn: number,
    parentColumn: number,
    childCount: number,
    parentCount: number,
  ) => {
    const childYs = yPositions(childCount);
    const parentYs = yPositions(parentCount);
    const movingRight = parentColumn > childColumn;
    const childEdge = centerX(childColumn) + (movingRight ? cardHalfWidth : -cardHalfWidth);
    const parentEdge = centerX(parentColumn) + (movingRight ? -cardHalfWidth : cardHalfWidth);
    const elbowX = (childEdge + parentEdge) / 2;

    if (childCount === parentCount) {
      childYs.forEach((childY) => {
        paths.push(`M ${childEdge} ${childY} H ${parentEdge}`);
      });
      return;
    }

    parentYs.forEach((parentY, index) => {
      const firstChildY = childYs[index * 2];
      const secondChildY = childYs[index * 2 + 1];
      paths.push(`M ${childEdge} ${firstChildY} H ${elbowX}`);
      paths.push(`M ${childEdge} ${secondChildY} H ${elbowX}`);
      paths.push(`M ${elbowX} ${firstChildY} V ${secondChildY}`);
      paths.push(`M ${elbowX} ${parentY} H ${parentEdge}`);
    });
  };

  addConnections(0, 1, 8, 4);
  addConnections(1, 2, 4, 2);
  addConnections(2, 3, 2, 1);
  addConnections(3, 4, 1, 1);
  addConnections(8, 7, 8, 4);
  addConnections(7, 6, 4, 2);
  addConnections(6, 5, 2, 1);
  addConnections(5, 4, 1, 1);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      viewBox={`0 0 ${width} ${height}`}
    >
      {paths.map((path, index) => (
        <path
          key={`${path}-${index}`}
          d={path}
          fill="none"
          stroke="var(--wc-cyan)"
          strokeOpacity="0.28"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function MobileBracket({
  rounds,
  selectedRound,
  onSelectRound,
}: {
  rounds: BracketRounds;
  selectedRound: BracketRoundKey;
  onSelectRound: (round: BracketRoundKey) => void;
}) {
  const selectedMeta = ROUND_META.find((round) => round.key === selectedRound) ?? ROUND_META[0];
  const matches = rounds[selectedRound];

  return (
    <section aria-label="World Cup rounds" className="flex h-full min-h-0 flex-col">
      <div className="wc-bracket-scroll shrink-0 overflow-x-auto border-y border-white/10 bg-slate-950/80 px-4 py-3">
        <div className="mx-auto flex w-max gap-2" role="group" aria-label="Select knockout round">
          {ROUND_META.map((round) => {
            const active = round.key === selectedRound;
            return (
              <button
                key={round.key}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectRound(round.key)}
                className={cn(
                  "min-h-11 border px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wc-cyan active:translate-y-px",
                  active
                    ? "border-wc-cyan bg-wc-cyan text-slate-950"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {round.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-wc-cyan">
                Knockout stage
              </p>
              <h2 className="font-wc mt-1 text-3xl text-white">{selectedMeta.label}</h2>
            </div>
            <span className="font-mono text-xs tabular-nums text-white/55">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="border border-white/10 bg-white/5 px-5 py-10 text-center">
              <Trophy aria-hidden="true" className="mx-auto text-white/35" size={28} />
              <p className="mt-3 text-sm font-semibold text-white">Round not drawn yet</p>
              <p className="mt-1 text-sm text-white/60">Qualifying teams will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} detailed />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MatchCard({
  match,
  compact,
  featured,
  detailed,
}: {
  match: BracketMatch;
  compact?: boolean;
  featured?: boolean;
  detailed?: boolean;
}) {
  const status = statusMeta(match);
  const content = (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
          Match {match.matchNumber}
        </span>
        <span className={cn("text-[9px] font-bold uppercase tracking-[0.12em]", status.className)}>
          {status.label}
        </span>
      </div>
      <div className={cn("px-3", detailed ? "py-2" : "py-1.5")}>
        <TeamRow team={match.home} score={match.homeScore} />
        <div className="my-1 h-px bg-white/10" />
        <TeamRow team={match.away} score={match.awayScore} />
      </div>
      {detailed && (match.date || match.venue || match.pda) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 px-3 py-2.5 text-[11px] text-white/55">
          {match.date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" size={13} />
              {formatMatchDate(match.date)}
            </span>
          )}
          {match.venue && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden="true" className="shrink-0" size={13} />
              <span className="truncate">{match.venue}</span>
            </span>
          )}
          {match.pda && (
            <span className="ml-auto inline-flex items-center gap-1 font-bold uppercase tracking-[0.1em] text-wc-cyan">
              Open match <ArrowRight aria-hidden="true" size={13} />
            </span>
          )}
        </div>
      )}
    </>
  );

  const className = cn(
    "relative block overflow-hidden border bg-slate-950/95 text-left",
    "transition-[border-color,background-color,transform] duration-100 ease-out",
    compact && "w-44",
    featured && "w-48 border-wc-cyan/45 bg-wc-blue/20 shadow-[0_0_36px_rgba(219,161,17,0.12)]",
    detailed && "w-full",
    !featured && "border-white/15",
    match.pda &&
      "cursor-pointer hover:-translate-y-px hover:border-wc-cyan/70 hover:bg-wc-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wc-cyan active:translate-y-px",
  );

  if (match.pda) {
    return (
      <Link
        href={`/matches/${match.pda}`}
        className={className}
        aria-label={`Open match ${match.matchNumber}: ${match.home.name} versus ${match.away.name}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={className}
      aria-label={`Match ${match.matchNumber}: ${match.home.name} versus ${match.away.name}`}
    >
      {content}
    </article>
  );
}

function TeamRow({ team, score }: { team: BracketTeam; score: number | null }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {team.code ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/${team.code}.svg`}
            alt=""
            className="h-4 w-6 shrink-0 border border-white/10 object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-4 w-6 shrink-0 items-center justify-center border border-white/15 bg-white/5 text-[8px] font-bold text-white/45"
          >
            {team.name.startsWith("Winner") ? "W" : "Q"}
          </span>
        )}
        <span className="truncate text-[11px] font-semibold text-white/90" title={team.name}>
          {team.name}
        </span>
      </div>
      <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-wc-cyan">
        {score ?? "—"}
      </span>
    </div>
  );
}

function EmptyBracket({ onRetry }: { onRetry: () => Promise<void> }) {
  return (
    <div className="mx-4 flex flex-1 flex-col items-center justify-center border border-white/10 bg-white/5 px-6 py-16 text-center sm:mx-6 lg:mx-8">
      <Trophy aria-hidden="true" className="text-white/35" size={36} />
      <h2 className="font-wc mt-4 text-3xl text-white">Bracket not drawn yet</h2>
      <p className="font-wc-support mt-2 max-w-md text-sm text-white/60">
        The knockout path will appear as soon as the tournament feed is ready.
      </p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-5 inline-flex min-h-11 items-center gap-2 border border-wc-cyan bg-wc-cyan px-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-px"
      >
        <RefreshCw aria-hidden="true" size={15} />
        Try again
      </button>
    </div>
  );
}

function statusMeta(match: BracketMatch) {
  const status = match.status?.toUpperCase();
  if (status === "LIVE") return { label: "Live", className: "text-rose" };
  if (status === "OPEN") return { label: "Predictions open", className: "text-wc-cyan" };
  if (
    status === "FINISHED" ||
    status === "RESOLVED" ||
    status === "SETTLED" ||
    (match.homeScore !== null && match.awayScore !== null)
  ) {
    return { label: "Full time", className: "text-white/55" };
  }
  return { label: "Scheduled", className: "text-white/45" };
}

function formatUpdatedAt(value: number | null) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
