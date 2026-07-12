"use client";

import Link from "next/link";
import { TeamBadge } from "./team-badge";
import {
  displayScore,
  formatUsdcAmount,
  PHASE_LABEL,
  type PortfolioPosition,
  type MatchSummary,
} from "../_lib/api";
import { cn } from "../_lib/utils";

// Renders one held portfolio position. It leans on the same `phase`/`live`
// semantics and `displayScore` helper as the /api/matches rows so a live score
// on an OPEN/LIVE position stays consistent with the rest of the app. When the
// matching /api/matches summary is passed in, we borrow its team names and
// final score (the portfolio feed carries neither).
export function PositionCard({
  position,
  match,
  usdcDecimals = 6,
}: {
  position: PortfolioPosition;
  match?: MatchSummary | null;
  usdcDecimals?: number;
}) {
  const team1 = match?.teamNames?.team1 ?? `Team ${position.team1Id}`;
  const team2 = match?.teamNames?.team2 ?? `Team ${position.team2Id}`;
  const phase = match?.phase ?? position.phase;
  const isLive = phase === "LIVE";
  // Running score from the live feed; final score only when the shared summary
  // provides it (the portfolio position shape has no finalScore of its own).
  const score = displayScore({
    live: position.live,
    finalScore: match?.finalScore ?? null,
  });
  const minute = position.live?.minute ?? match?.live?.minute ?? null;

  return (
    <Link
      href={`/matches/${position.pda}`}
      className="group-card relative flex flex-col gap-3 border border-surface bg-surface/40 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface/70 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      <div className="card-shine" />

      {/* Match info */}
      <div className="relative z-10 flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <PhasePill phase={phase} minute={minute} isLive={isLive} />
        </div>

        <div className="flex flex-col gap-2 font-display text-lg sm:text-xl">
          <div className="flex items-center gap-3">
            <TeamBadge name={team1} size="lg" />
            <span className="truncate text-foreground">{team1}</span>
            <span className="ml-auto tabular-nums text-cyan">
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
              className={cn(
                "ml-auto tabular-nums",
                isLive ? "text-cyan" : "text-muted",
              )}
            >
              {score ? score.team2 : "–"}
            </span>
          </div>
        </div>
      </div>

      {/* Your position snapshot */}
      <div className="relative z-10 flex w-full flex-col gap-2 border-t border-surface bg-background/50 p-3 sm:w-44 sm:border-l sm:border-t-0 sm:p-3.5">
        <div className="flex items-center justify-between text-[10px] uppercase sm:text-xs">
          <span className="text-muted">Your Stake</span>
          <span className="font-mono font-bold tabular-nums text-cyan">
            ${formatUsdcAmount(position.entryFee, usdcDecimals)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] uppercase sm:text-xs">
          <span className="text-muted">Slots</span>
          <span className="font-mono font-bold tabular-nums text-foreground">
            {position.slotsUsed}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-surface pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            {position.statusLabel === "RESOLVED" ? "Settled" : "In Play"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

function PhasePill({
  phase,
  minute,
  isLive,
}: {
  phase: PortfolioPosition["phase"];
  minute: number | null;
  isLive: boolean;
}) {
  if (isLive) {
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
        Upcoming
      </span>
    );
  }
  if (phase === "OPEN") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan sm:text-xs">
        Open for Predictions
      </span>
    );
  }
  // Terminal phases (FINISHED/RESOLVED/SETTLED) — use the shared label so an
  // ended position never renders a raw enum or reads like "Open".
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-muted sm:text-xs">
      {PHASE_LABEL[phase]}
    </span>
  );
}
