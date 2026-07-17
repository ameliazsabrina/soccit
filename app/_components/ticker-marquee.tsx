"use client";

import { cn } from "../_lib/utils";

const TICKER_ITEMS = [
  { label: "Live", value: "FRA 2–1 ARG · 63′", tone: "live" },
  {
    label: "World Cup Final",
    value: "ESP vs ARG · Entries open soon",
    tone: "accent",
  },
  { label: "Pool", value: "$5.00 USDC · 12 players", tone: "accent" },
  { label: "Latest", value: "Mbappé goal · 63′", tone: "live" },
  { label: "Leader", value: "@demoking · 12 pts", tone: "info" },
] as const;

interface TickerMarqueeProps {
  variant?: "default" | "worldcup";
}

export function TickerMarquee({ variant = "default" }: TickerMarqueeProps) {
  const isWorldCup = variant === "worldcup";
  return (
    <div
      className="fixed bottom-0 left-0 z-30 w-full"
      role="region"
      aria-label="Match updates"
    >
      <div className="mx-auto w-full max-w-[1200px] px-8 pb-4 lg:px-8">
        <div
          className={cn(
            "relative overflow-hidden border-y py-2 motion-reduce:overflow-x-auto",
            isWorldCup
              ? "border-white/10 bg-slate-950"
              : "border-surface bg-surface"
          )}
        >
          <ul className="sr-only">
            {TICKER_ITEMS.map((item) => (
              <li key={item.label}>
                {item.label}: {item.value}
              </li>
            ))}
          </ul>
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-20 w-16",
              isWorldCup ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-surface to-transparent"
            )}
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-20 w-16",
              isWorldCup ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-surface to-transparent"
            )}
          />
          <div
            className="animate-marquee flex whitespace-nowrap motion-reduce:animate-none hover:[animation-play-state:paused]"
            aria-hidden="true"
          >
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center">
                {TICKER_ITEMS.map((item) => (
                  <span
                    key={item.label + i}
                    className={cn(
                      "inline-flex items-center gap-2 border-l px-8 text-xs font-medium first:border-l-0",
                      isWorldCup
                        ? "border-white/10 text-white/80"
                        : "border-surface text-foreground"
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
