"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const FWC_LOGO_BLACK = "/assets/events/fwc-logo-black.svg";
const FWC_LOGO_WHITE = "/assets/events/fwc-logo-white.svg";

const ROWS = 6;
const COLS = 8;

const LOADING_DURATION = 2200; // logo + loading bar
const FADE_DURATION = 400;     // logo/loading fade out
const FLIP_DURATION = 1400;    // tile flip center-out

export type TransitionMode = "enter" | "exit";

interface EventsTransitionProps {
  mode: TransitionMode;
  logoEnter?: string;
  logoExit?: string;
  titleEnter?: string;
  titleExit?: string;
  subtitleExit?: string;
  onComplete?: () => void;
}

export function EventsTransition({
  mode,
  logoEnter,
  logoExit,
  titleEnter,
  titleExit,
  subtitleExit,
  onComplete,
}: EventsTransitionProps) {
  const [phase, setPhase] = useState<"loading" | "fading" | "flipping" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Phase orchestration. Each phase schedules the next one, so a remount
  // cleanly restarts from the current phase rather than losing timers.
  useEffect(() => {
    if (phase === "loading") {
      const timer = setTimeout(() => setPhase("fading"), LOADING_DURATION);
      return () => clearTimeout(timer);
    }
    if (phase === "fading") {
      const timer = setTimeout(() => setPhase("flipping"), FADE_DURATION);
      return () => clearTimeout(timer);
    }
    if (phase === "flipping") {
      const timer = setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, FLIP_DURATION);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  // Progress bar locked to actual percentage.
  useEffect(() => {
    if (phase !== "loading") return;

    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / LOADING_DURATION) * 100));
      setProgress(pct);
      if (elapsed < LOADING_DURATION) {
        requestAnimationFrame(animate);
      }
    };
    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  if (!mounted || phase === "done") return null;

  const isEnter = mode === "enter";

  // Transparent container so flipped tiles reveal the destination page.
  // Front face is the loading screen color. No back face — when rotated away
  // the tile becomes see-through and the actual page underneath shows through.
  const faceClass = isEnter ? "bg-background" : "bg-slate-950";
  const textClass = isEnter ? "text-foreground" : "text-white";
  const mutedClass = isEnter ? "text-muted" : "text-white/60";
  const surfaceClass = isEnter ? "bg-surface" : "bg-white/20";
  const barClass = isEnter ? "bg-foreground" : "bg-white";
  const logoSrc = isEnter
    ? (logoEnter ?? FWC_LOGO_BLACK)
    : (logoExit ?? FWC_LOGO_WHITE);
  const titleText = isEnter
    ? (titleEnter ?? "World Cup 2026")
    : (titleExit ?? "See You");
  const subtitleText = isEnter ? undefined : (subtitleExit ?? "World Cup 2026");

  const content = (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* Event theme orbs — visible only in exit mode behind tiles */}
      {!isEnter && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-wc-purple/25 blur-[120px]" />
          <div className="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-wc-blue/25 blur-[100px]" />
        </div>
      )}

      {/* Tile grid */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          perspective: "1000px",
        }}
      >
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const distance = Math.sqrt(
            (row - ROWS / 2) ** 2 + (col - COLS / 2) ** 2
          );
          const stagger = distance * 65;
          const flipped = phase === "flipping";

          return (
            <div key={i} className="relative" style={{ perspective: "800px" }}>
              <div
                className="relative h-full w-full transition-transform duration-[700ms]"
                style={{
                  transformStyle: "preserve-3d",
                  transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transitionDelay: flipped ? `${stagger}ms` : "0ms",
                }}
              >
                {/* Single face. Rotated 180deg it disappears, revealing page underneath. */}
                <div
                  className={`absolute inset-0 ${faceClass}`}
                  style={{ backfaceVisibility: "hidden" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading content */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${faceClass} transition-opacity duration-500`}
        style={{
          opacity: phase === "loading" ? 1 : 0,
          pointerEvents: "none",
        }}
      >
        <div className="mb-6 h-24 w-24 sm:h-32 sm:w-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={titleText} className="h-full w-full object-contain" />
        </div>
        <h2 className={`font-wc text-center text-4xl ${textClass} sm:text-5xl md:text-6xl`}>
          {titleText}
        </h2>
        {subtitleText && (
          <h3 className={`font-wc mt-1 text-center text-2xl ${textClass} sm:text-3xl`}>
            {subtitleText}
          </h3>
        )}

        <div className="mt-10 flex w-64 flex-col items-center gap-4 sm:w-80">
          <div className={`flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] ${mutedClass}`}>
            <span className="font-tech">Loading bracket</span>
            <span className="font-tech">{progress}%</span>
          </div>
          <div className={`relative h-2 w-full overflow-hidden ${surfaceClass}`}>
            <div
              className={`absolute inset-y-0 left-0 ${barClass}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${barClass}`}
                style={{
                  animation: "wc-pulse 1s ease-in-out infinite",
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
