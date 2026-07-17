"use client";

import { TopNav, type ArenaTab } from "./top-nav";
import { TickerMarquee } from "./ticker-marquee";
import { cn } from "../_lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  variant?: "default" | "worldcup";
  fullWidth?: boolean;
  edgeToEdge?: boolean;
  hideTicker?: boolean;
  arenaTabs?: ArenaTab[];
}

export function PageShell({
  children,
  variant = "default",
  fullWidth,
  edgeToEdge,
  hideTicker,
  arenaTabs,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "relative flex h-screen flex-col overflow-x-hidden overflow-y-auto md:overflow-hidden",
        variant === "worldcup" ? "bg-slate-950" : "bg-background bg-cover bg-center bg-no-repeat bg-fixed"
      )}
      style={
        variant === "worldcup"
          ? undefined
          : { backgroundImage: "url('/app-bg.webp')" }
      }
    >
      {variant === "worldcup" && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-wc-purple/20 blur-[120px]" />
          <div className="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-wc-blue/20 blur-[100px]" />
        </div>
      )}

      {edgeToEdge ? (
        <>
          <div className="relative z-40 mx-auto w-full max-w-[1200px] px-8 pt-8 lg:px-8">
            <TopNav variant={variant} arenaTabs={arenaTabs} />
          </div>
          <main className="relative z-20 flex min-h-0 w-full flex-1 flex-col overflow-hidden">
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
          <TopNav variant={variant} arenaTabs={arenaTabs} />
          {children}
        </main>
      )}

      {!hideTicker && <TickerMarquee variant={variant} />}
    </div>
  );
}
