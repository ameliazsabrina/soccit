"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatWallet,
  getMatches,
  isValidPda,
  openLeaderboardStream,
  openMatchEventsStream,
  type EventEntry,
  type MatchSummary,
} from "../_lib/api";
import {
  describeMatchEvent,
  eventPayload,
  type MatchEventContext,
} from "../_lib/match-events";
import { cn } from "../_lib/utils";

type TickerTone = "live" | "accent" | "info";

type TickerItem = {
  id: string;
  label: string;
  value: string;
  tone: TickerTone;
};

interface TickerMarqueeProps {
  variant?: "default" | "worldcup";
}

const PHASE_PRIORITY: Record<MatchSummary["phase"], number> = {
  LIVE: 0,
  FINISHED: 1,
  RESOLVED: 2,
  SETTLED: 3,
  OPEN: 4,
  UPCOMING: 5,
};

function matchName(match: MatchSummary) {
  const home = match.teamNames?.team1 ?? `Team ${match.onchain.team1Id}`;
  const away = match.teamNames?.team2 ?? `Team ${match.onchain.team2Id}`;
  return { home, away, label: `${home} vs ${away}` };
}

function eventTickerItem(match: MatchSummary, entry: EventEntry): TickerItem {
  const teams = matchName(match);
  const payload = eventPayload(entry);
  const stableEventId = payload.eventId ?? entry.id;

  if (
    entry.type === "prediction" ||
    entry.type === "points_awarded" ||
    typeof payload.points === "number"
  ) {
    const user = payload.username ?? payload.user ?? "A player";
    const points = Math.max(0, payload.points ?? 0);
    return {
      id: `points:${match.pda}:${stableEventId}`,
      label: "Points",
      value: `${user} earned +${points} pts · ${teams.label}`,
      tone: "accent",
    };
  }

  const context: MatchEventContext = {
    homeTeamName: teams.home,
    awayTeamName: teams.away,
    players: [],
  };
  const presentation = describeMatchEvent(entry, context);
  const minute = presentation.minute == null ? "" : `${presentation.minute}' · `;

  return {
    id: `event:${match.pda}:${entry.type}:${stableEventId}`,
    label: presentation.title,
    value: `${minute}${presentation.headline} · ${teams.label}`,
    tone:
      entry.type === "goal" || entry.type === "red_card"
        ? "live"
        : entry.type === "substitution" || entry.type === "yellow_card"
          ? "accent"
          : "info",
  };
}

export function TickerMarquee({ variant = "default" }: TickerMarqueeProps) {
  const isWorldCup = variant === "worldcup";
  const [items, setItems] = useState<TickerItem[]>([]);

  const addItem = useCallback((item: TickerItem) => {
    setItems((current) => {
      if (current.some((existing) => existing.id === item.id)) {
        return current.map((existing) =>
          existing.id === item.id ? item : existing,
        );
      }
      return [item, ...current].slice(0, 12);
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    const sources: EventSource[] = [];
    const pointsByMatch = new Map<string, Map<string, number>>();

    async function connectRealActivity() {
      try {
        const matches = (await getMatches())
          .filter((match) => match.pda !== "demo" && isValidPda(match.pda))
          .sort(
            (left, right) =>
              PHASE_PRIORITY[left.phase] - PHASE_PRIORITY[right.phase],
          )
          // Keep the browser below the common six-connections-per-origin cap:
          // four real event feeds plus leaderboard scoring for the top two.
          .slice(0, 4);

        if (disposed) return;

        for (const [matchIndex, match] of matches.entries()) {
          sources.push(
            openMatchEventsStream(match.pda, {
              onEvent: (entry) => {
                if (!disposed) addItem(eventTickerItem(match, entry));
              },
            }),
          );

          if (matchIndex < 2) {
            sources.push(
              openLeaderboardStream(match.pda, {
                onUpdate: (leaderboard) => {
                  if (disposed) return;

                  const previous = pointsByMatch.get(match.pda);
                  const current = new Map(
                    leaderboard.ranking.map((row) => [row.owner, row.points]),
                  );
                  pointsByMatch.set(match.pda, current);

                  // The first leaderboard payload establishes a baseline. Only
                  // later positive deltas are public scoring announcements.
                  if (!previous) return;

                  for (const row of leaderboard.ranking) {
                    const pointsBefore = previous.get(row.owner) ?? 0;
                    const earned = row.points - pointsBefore;
                    if (earned <= 0) continue;

                    addItem({
                      id: `points:${match.pda}:${row.owner}:${row.points}`,
                      label: "Points",
                      value: `${row.user?.username ?? formatWallet(row.owner)} earned +${earned} pts · ${matchName(match).label}`,
                      tone: "accent",
                    });
                  }
                },
              }),
            );
          }
        }
      } catch {
        // No fake fallback: the ticker stays hidden until real activity arrives.
      }
    }

    connectRealActivity();
    return () => {
      disposed = true;
      for (const source of sources) source.close();
    };
  }, [addItem]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 z-30 hidden w-full md:block"
      role="region"
      aria-label="Live match activity"
    >
      <div className="mx-auto w-full max-w-[1200px] px-8 pb-4 lg:px-8">
        <div
          className={cn(
            "relative overflow-hidden border-y py-2 motion-reduce:overflow-x-auto",
            isWorldCup
              ? "border-white/10 bg-slate-950"
              : "border-surface bg-surface",
          )}
        >
          <ul className="sr-only" aria-live="polite">
            {items.map((item) => (
              <li key={item.id}>
                {item.label}: {item.value}
              </li>
            ))}
          </ul>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-20 w-16",
              isWorldCup
                ? "bg-gradient-to-r from-slate-950 to-transparent"
                : "bg-gradient-to-r from-surface to-transparent",
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-20 w-16",
              isWorldCup
                ? "bg-gradient-to-l from-slate-950 to-transparent"
                : "bg-gradient-to-l from-surface to-transparent",
            )}
          />
          <div
            className="animate-marquee flex whitespace-nowrap motion-reduce:animate-none hover:[animation-play-state:paused]"
            aria-hidden="true"
          >
            {[...Array(4)].map((_, copy) => (
              <div key={copy} className="flex items-center">
                {items.map((item) => (
                  <span
                    key={`${item.id}:${copy}`}
                    className={cn(
                      "inline-flex items-center gap-2 border-l px-8 text-xs font-medium first:border-l-0",
                      isWorldCup
                        ? "border-white/10 text-white/80"
                        : "border-surface text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                        item.tone === "live"
                          ? "bg-rose"
                          : item.tone === "accent"
                            ? isWorldCup
                              ? "bg-wc-cyan"
                              : "bg-cyan"
                            : isWorldCup
                              ? "bg-white/50"
                              : "bg-purple",
                      )}
                    />
                    <span className="font-bold uppercase tracking-wider">
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        item.tone === "live"
                          ? "text-rose"
                          : item.tone === "accent"
                            ? isWorldCup
                              ? "text-wc-cyan"
                              : "text-cyan"
                            : isWorldCup
                              ? "text-white/70"
                              : "text-muted",
                      )}
                    >
                      {item.value}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
