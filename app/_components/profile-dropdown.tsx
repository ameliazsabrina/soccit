"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "../_lib/utils";

interface ProfileDropdownProps {
  variant?: "default" | "worldcup";
}

export function ProfileDropdown({ variant = "default" }: ProfileDropdownProps) {
  const { disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-10 items-center justify-center border transition-all",
          variant === "worldcup"
            ? "border-white/10 bg-white/5 text-white hover:border-wc-cyan hover:text-wc-cyan"
            : "border-surface bg-surface text-foreground hover:border-cyan hover:text-cyan",
          open && (variant === "worldcup" ? "border-wc-cyan text-wc-cyan" : "border-cyan text-cyan")
        )}
        aria-label="Profile menu"
      >
        <span className="material-symbols-outlined">person</span>
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full z-50 mt-2 w-44 border shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]",
          variant === "worldcup" ? "border-white/10 bg-slate-950" : "border-surface bg-background"
        )}>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 font-tech text-xs font-bold uppercase tracking-wider transition-colors",
              variant === "worldcup"
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-surface"
            )}
          >
            <span className="material-symbols-outlined text-base">person</span>
            Profile
          </Link>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 font-tech text-xs font-bold uppercase tracking-wider text-rose transition-colors hover:bg-surface"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
