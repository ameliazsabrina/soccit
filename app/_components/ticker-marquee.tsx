"use client";

import { cn } from "../_lib/utils";

const TICKER_ITEMS = [
  { name: "J. Doe", pos: "ST", val: "1.4x", up: true },
  { name: "M. Smith", pos: "CM", val: "0.8x", up: false },
  { name: "K. Jones", pos: "CB", val: "2.1x", up: true },
  { name: "A. Gomez", pos: "GK", val: "1.0x", up: null },
  { name: "T. Silva", pos: "CDM", val: "1.2x", up: true },
];

interface TickerMarqueeProps {
  variant?: "default" | "worldcup";
}

export function TickerMarquee({ variant = "default" }: TickerMarqueeProps) {
  const isWorldCup = variant === "worldcup";
  return (
    <div className="relative z-10 mx-auto w-full max-w-[1200px] px-8 pb-6 lg:px-8">
      <div
        className={cn(
          "relative overflow-hidden border-y py-2",
          isWorldCup
            ? "border-white/10 bg-slate-950"
            : "border-surface bg-background"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-20 w-16",
            isWorldCup ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-background to-transparent"
          )}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-20 w-16",
            isWorldCup ? "bg-gradient-to-l from-slate-950 to-transparent" : "bg-gradient-to-l from-background to-transparent"
          )}
        />
        <div className="animate-marquee flex whitespace-nowrap">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center">
              {TICKER_ITEMS.map((t) => (
                <span
                  key={t.name + i}
                  className={cn(
                    "inline-block border-l px-8 text-xs font-medium first:border-l-0",
                    isWorldCup
                      ? "border-white/10 text-white/80"
                      : "border-surface text-foreground"
                  )}
                >
                  {t.name} - {t.pos}:{" "}
                  <span
                    className={
                      t.up === true
                        ? isWorldCup
                          ? "text-wc-cyan"
                          : "text-cyan"
                        : t.up === false
                          ? "text-rose"
                          : isWorldCup
                            ? "text-white/50"
                            : "text-muted"
                    }
                  >
                    {t.val}{" "}
                    {t.up === true ? "▲" : t.up === false ? "▼" : "▬"}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
