"use client";

import { useEffect, useRef, useState } from "react";
import {
  Music2,
  MousePointerClick,
  Settings2,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../_lib/utils";
import { sound } from "../_lib/sound";

interface SettingsDropdownProps {
  variant?: "default" | "worldcup";
  mobile?: boolean;
}

export function SettingsDropdown({
  variant = "default",
  mobile = false,
}: SettingsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [audio, setAudio] = useState(() => sound.getSettings());
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => sound.subscribe(setAudio), []);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
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

  return (
    <div ref={ref} className="relative z-50 flex-none">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center justify-center border transition-[background-color,border-color,color,transform] duration-100 active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          mobile ? "h-14 w-10 rounded-2xl shadow-lg" : "h-10 w-10",
          variant === "worldcup"
            ? mobile
              ? "border-white/10 bg-slate-950/95 text-white shadow-black/40 hover:border-wc-cyan hover:text-wc-cyan"
              : "border-white/10 bg-white/5 text-white hover:border-wc-cyan hover:text-wc-cyan"
            : mobile
              ? "border-surface bg-background/95 text-foreground shadow-slate-950/20 hover:border-cyan hover:text-cyan"
              : "border-surface bg-surface text-foreground hover:border-cyan hover:text-cyan",
          open &&
            (variant === "worldcup"
              ? "border-wc-cyan text-wc-cyan"
              : "border-cyan text-cyan"),
        )}
        aria-label="Audio settings"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Settings2 size={19} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Audio settings"
          className={cn(
            "absolute right-0 z-[60] w-72 border p-3 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]",
            mobile ? "bottom-full mb-2" : "top-full mt-2",
            variant === "worldcup"
              ? "border-white/10 bg-slate-950"
              : "border-surface bg-background",
          )}
        >
          <div className="mb-2 flex items-center justify-between px-2 py-1">
            <span
              className={cn(
                "font-tech text-xs font-bold uppercase tracking-wider",
                variant === "worldcup" ? "text-white" : "text-foreground",
              )}
            >
              Audio
            </span>
            <span className="font-mono text-xs tabular-nums text-muted">
              {audio.muted ? "Muted" : "On"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => sound.setMuted(!audio.muted)}
            className={cn(
              "mb-2 flex min-h-10 w-full items-center justify-between px-2 font-tech text-xs font-bold uppercase tracking-wider transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-inset",
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
              {audio.muted ? "Off" : "On"}
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
