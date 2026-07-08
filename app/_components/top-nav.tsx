"use client";

import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
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
  arenaTabs?: ArenaTab[];
}

export interface ArenaTab {
  model: string;
  label: string;
  href: string;
  active: boolean;
}

export function TopNav({ variant = "default", arenaTabs }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const eventSlug =
    pathname.startsWith("/matches/events/") && typeof params.slug === "string"
      ? params.slug
      : "worldcup";

  const pathDepth = pathname.split("/").filter(Boolean).length;
  const isNested = pathDepth > 1;

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
        <div className="flex items-center gap-8">
          <img
            src="/assets/soccit-logo.svg"
            alt="Soccit"
            className="h-10 w-10 flex-shrink-0"
          />
          <nav className="flex flex-wrap items-center gap-2">
          {variant === "worldcup" ? (
            <button
              onClick={() => router.push(`/matches?event_exit=${eventSlug}`)}
              className="flex items-center gap-2 border border-white/10 bg-white/5 px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] text-white/70 transition-all hover:border-purple hover:bg-purple hover:text-white"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : isNested ? (
            <>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 border border-surface bg-surface px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] text-muted transition-all hover:border-purple hover:bg-purple hover:text-white"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              {arenaTabs?.map((tab) => (
                <Link
                  key={tab.model}
                  href={tab.href}
                  className={cn(
                    "border px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
                    tab.active
                      ? "border-purple bg-purple text-white"
                      : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </>
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
                    "border px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
                    active
                      ? "border-purple bg-purple text-white"
                      : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })
          )}
        </nav>
        </div>

        {connected ? (
          <ProfileDropdown variant={variant} />
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "flex items-center gap-2 border px-4 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
              variant === "worldcup"
                ? "border-white/10 bg-white/5 text-white/70 hover:border-purple hover:bg-purple hover:text-white"
                : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
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
