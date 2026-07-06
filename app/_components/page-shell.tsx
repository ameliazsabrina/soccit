"use client";

import { TopNav } from "./top-nav";
import { TickerMarquee } from "./ticker-marquee";
import { cn } from "../_lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  variant?: "default" | "worldcup";
  fullWidth?: boolean;
  edgeToEdge?: boolean;
  hideTicker?: boolean;
}

export function PageShell({
  children,
  variant = "default",
  fullWidth,
  edgeToEdge,
  hideTicker,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "relative flex h-screen flex-col overflow-hidden",
        variant === "worldcup" ? "bg-slate-950" : "bg-background"
      )}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={cn(
            "absolute -left-24 -top-24 h-96 w-96 rounded-full blur-[120px]",
            variant === "worldcup" ? "bg-wc-purple/20" : "bg-purple/15"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-16 -right-16 h-80 w-80 rounded-full blur-[100px]",
            variant === "worldcup" ? "bg-wc-blue/20" : "bg-cyan/15"
          )}
        />
      </div>

      {edgeToEdge ? (
        <>
          <div className="relative z-20 mx-auto w-full max-w-[1200px] px-8 pt-4 lg:px-8">
            <TopNav variant={variant} compact />
          </div>
          <main className="relative z-20 flex w-full flex-1 flex-col">
            {children}
          </main>
        </>
      ) : (
        <main
          className={cn(
            "relative z-20 mx-auto flex w-full flex-1 flex-col pb-16",
            fullWidth ? "px-4 py-4" : "max-w-[1200px] px-8 py-8 lg:px-8"
          )}
        >
          <TopNav variant={variant} />
          {children}
        </main>
      )}

      {!hideTicker && <TickerMarquee variant={variant} />}
    </div>
  );
}
