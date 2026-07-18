"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Music2,
  MousePointerClick,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../_lib/utils";
import { sound } from "../_lib/sound";

interface ProfileDropdownProps {
  variant?: "default" | "worldcup";
}

export function ProfileDropdown({ variant = "default" }: ProfileDropdownProps) {
  const { disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [audio, setAudio] = useState(() => sound.getSettings());
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => sound.subscribe(setAudio), []);

  return (
    <div ref={ref} className="relative z-50">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-10 items-center justify-center border transition-all focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variant === "worldcup"
            ? "border-white/10 bg-white/5 text-white hover:border-wc-cyan hover:text-wc-cyan"
            : "border-surface bg-surface text-foreground hover:border-cyan hover:text-cyan",
          open && (variant === "worldcup" ? "border-wc-cyan text-wc-cyan" : "border-cyan text-cyan")
        )}
        aria-label="Profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="material-symbols-outlined">person</span>
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full z-[60] mt-2 w-72 border shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]",
          variant === "worldcup" ? "border-white/10 bg-slate-950" : "border-surface bg-background"
        )} role="menu">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className={cn(
              "flex min-h-10 items-center gap-3 px-4 py-3 font-tech text-xs font-bold uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan",
              variant === "worldcup"
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-surface"
            )}
          >
            <span className="material-symbols-outlined text-base">person</span>
            Profile
          </Link>
          <section
            className={cn(
              "border-y p-3",
              variant === "worldcup" ? "border-white/10" : "border-surface",
            )}
            aria-label="Audio settings"
          >
            <button
              type="button"
              onClick={() => sound.setMuted(!audio.muted)}
              className={cn(
                "mb-3 flex min-h-10 w-full items-center justify-between px-2 font-tech text-xs font-bold uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-inset",
                variant === "worldcup"
                  ? "text-white hover:bg-white/10"
                  : "text-foreground hover:bg-surface",
              )}
              aria-pressed={audio.muted}
            >
              <span className="flex items-center gap-2">
                {audio.muted ? (
                  <VolumeX size={16} aria-hidden="true" />
                ) : (
                  <Volume2 size={16} aria-hidden="true" />
                )}
                All audio
              </span>
              <span className={audio.muted ? "text-rose" : "text-cyan"}>
                {audio.muted ? "Muted" : "On"}
              </span>
            </button>

            <AudioSlider
              id="music-volume"
              label="Music"
              icon={Music2}
              value={audio.musicVolume}
              onChange={(value) => sound.setMusicVolume(value)}
              variant={variant}
            />
            <AudioSlider
              id="vfx-volume"
              label="VFX"
              icon={MousePointerClick}
              value={audio.vfxVolume}
              onChange={(value) => sound.setVfxVolume(value)}
              variant={variant}
            />
          </section>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            role="menuitem"
            className="flex min-h-10 w-full items-center gap-3 px-4 py-3 font-tech text-xs font-bold uppercase tracking-wider text-rose transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function AudioSlider({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  variant,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: number;
  onChange: (value: number) => void;
  variant: "default" | "worldcup";
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "grid min-h-12 grid-cols-[4rem_1fr_2.5rem] items-center gap-2 px-2 text-xs",
        variant === "worldcup" ? "text-white/80" : "text-foreground",
      )}
    >
      <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
        <Icon size={15} aria-hidden="true" />
        {label}
      </span>
      <input
        id={id}
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-full cursor-pointer accent-purple focus-visible:ring-2 focus-visible:ring-cyan"
      />
      <span className="text-right font-mono tabular-nums text-muted">
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}
