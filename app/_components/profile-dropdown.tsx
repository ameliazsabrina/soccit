"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "../_lib/utils";

export function ProfileDropdown() {
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
          "flex h-10 w-10 items-center justify-center border border-surface bg-surface text-foreground transition-all hover:border-cyan hover:text-cyan",
          open && "border-cyan text-cyan"
        )}
        aria-label="Profile menu"
      >
        <span className="material-symbols-outlined">person</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 border border-surface bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 font-tech text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-surface"
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
