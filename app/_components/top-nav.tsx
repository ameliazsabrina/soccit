"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft } from "lucide-react";
import { ProfileDropdown } from "./profile-dropdown";
import { ConnectWalletModal } from "./connect-wallet-modal";
import { cn } from "../_lib/utils";
import { useState, useEffect } from "react";

const TABS = [
  { label: "menu", href: "/" },
  { label: "match", href: "/matches" },
  { label: "leaderboard", href: "/leaderboard" },
  { label: "profile", href: "/profile" },
];

interface TopNavProps {
  variant?: "default" | "worldcup";
}

export function TopNav({ variant = "default" }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-2">
          {variant === "worldcup" ? (
            <button
              onClick={() => router.push("/matches?event_exit=1")}
              className="flex items-center gap-2 border border-white/10 bg-white/5 px-5 py-2 font-tech text-xs font-bold uppercase tracking-[0.15em] text-white/70 transition-all hover:border-wc-cyan/50 hover:text-white"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            TABS.map((tab) => {
              const active =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "border px-5 py-2 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
                    active
                      ? "border-cyan bg-cyan/5 text-cyan"
                      : "border-surface bg-surface text-muted hover:border-cyan/50 hover:text-foreground"
                  )}
                >
                  [{tab.label}]
                </Link>
              );
            })
          )}
        </nav>

        {connected ? (
          <ProfileDropdown variant={variant} />
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2 border px-4 py-2 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
              variant === "worldcup"
                ? "border-white/10 bg-white/5 text-white/70 hover:border-wc-cyan hover:text-wc-cyan"
                : "border-surface bg-surface text-muted hover:border-cyan hover:text-cyan"
            )}
          >
            <span className="material-symbols-outlined">wallet</span>
            CONNECT
          </button>
        )}
      </div>

      <ConnectWalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
