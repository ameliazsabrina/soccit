"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { ProfileDropdown } from "./_components/profile-dropdown";
import { SOCCIT_SEED_MATCH_PDA } from "./_lib/api";
import { cn } from "./_lib/utils";
import { ConnectWalletModal } from "./_components/connect-wallet-modal";

const TICKER_ITEMS = [
  { name: "J. Doe", pos: "ST", val: "1.4x", up: true },
  { name: "M. Smith", pos: "CM", val: "0.8x", up: false },
  { name: "K. Jones", pos: "CB", val: "2.1x", up: true },
  { name: "A. Gomez", pos: "GK", val: "1.0x", up: null },
  { name: "T. Silva", pos: "CDM", val: "1.2x", up: true },
];

const TABS = [
  { label: "menu", href: "/" },
  { label: "match", href: "/matches" },
  { label: "leaderboard", href: "/leaderboard" },
  { label: "profile", href: "/profile" },
];

export default function StartMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [portfolioDisplay, setPortfolioDisplay] = useState("$14,093.50");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function handlePortfolioEnter() {
    if (intervalRef.current) return;
    let ticks = 0;
    intervalRef.current = setInterval(() => {
      const whole = 14000 + Math.floor(Math.random() * 100);
      const cents = Math.floor(Math.random() * 99).toString().padStart(2, "0");
      setPortfolioDisplay(`$${whole}.${cents}`);
      ticks += 1;
      if (ticks > 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPortfolioDisplay("$14,093.50");
      }
    }, 50);
  }

  function handleEnterArena() {
    if (connected) {
      router.push("/matches");
    } else {
      setModalOpen(true);
    }
  }

  const [portfolioWhole, portfolioCents] = portfolioDisplay.split(".");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-purple/15 blur-[120px]" />
        <div className="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-cyan/15 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 lg:px-8">
        {/* Tabs + profile/connect button */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <nav className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const active =
                tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
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
            })}
          </nav>

          {connected ? (
            <ProfileDropdown />
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 border border-surface bg-surface px-4 py-2 font-tech text-xs font-bold uppercase tracking-[0.15em] text-muted transition-all hover:border-cyan hover:text-cyan"
            >
              <span className="material-symbols-outlined">wallet</span>
              CONNECT
            </button>
          )}
        </div>

        <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onMouseEnter={handlePortfolioEnter}
            className="group relative flex min-h-[380px] flex-col justify-between bg-surface p-8 transition-all hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] lg:col-span-2"
          >
            <div className="card-shine" />
            <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-80 w-80 origin-bottom transition-transform duration-300 group-hover:scale-150">
              <Image
                src="/assets/cards/player-hero.webp?v=2"
                alt="Portfolio"
                fill
                sizes="20rem"
                className="object-contain object-bottom card-image-gray"
              />
            </div>
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted transition-colors group-hover:text-white/70">
                  Total Portfolio Value
                </p>
                <div className="flex items-baseline gap-4">
                  <h2 className="unica-one text-6xl leading-none tracking-tighter text-foreground transition-colors group-hover:text-white lg:text-8xl">
                    {portfolioWhole}
                    <span className="text-3xl text-muted transition-colors group-hover:text-white/60">.{portfolioCents}</span>
                  </h2>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-base text-cyan transition-colors group-hover:text-white">
                    trending_up
                  </span>
                  <span className="text-cyan transition-colors group-hover:text-white">+24.5% ($2,850.00)</span>
                  <span className="ml-2 text-muted transition-colors group-hover:text-white/70">Past 24H</span>
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-12 flex flex-col justify-between gap-6 border-t border-muted/20 pt-6 sm:flex-row sm:items-end">
              <div className="flex flex-col">
                <span className="mb-1 text-xs uppercase tracking-wide text-muted transition-colors group-hover:text-white/70">
                  Active Positions
                </span>
                <span className="unica-one text-2xl text-foreground transition-colors group-hover:text-white">0</span>
                <span className="mt-1 text-sm font-medium text-rose">
                  NO ACTIVE POSITIONS.
                </span>
              </div>
              <button
                onClick={handleEnterArena}
                className="btn-gradient inline-flex items-center gap-3 px-8 py-4 font-display text-xl uppercase tracking-[0.1em] text-white"
              >
                ENTER ARENA
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </motion.div>

          <div className="flex h-full flex-col gap-6">
            <NavTile
              href="/matches"
              icon="view_in_ar"
              title="THE ARENA"
              description="Build predictions & lock lineups."
              accent="purple"
              image="/assets/cards/player-arena.webp?v=2"
              imageClassName="h-44 w-36 group-hover:scale-125"
              className="flex-1"
            />
            <NavTile
              href="/matches"
              icon="electric_bolt"
              title="EVENTS MATRIX"
              description="Live market volatility."
              image="/assets/cards/player-events.webp?v=2"
              imageClassName="h-44 w-36 group-hover:scale-125"
              className="flex-1"
            />
          </div>

          <NavTile
            href={`/matches/${SOCCIT_SEED_MATCH_PDA}/logs?seed=1`}
            icon="terminal"
            title="DATA LOGS"
            description="Immutable transaction history."
              image="/assets/cards/player-logs.webp?v=2"
              imageClassName="h-44 w-36 group-hover:scale-125"
              className="min-h-[220px]"
          />

          <NavTile
            href="/leaderboard"
            icon="trophy"
            title="GLOBAL LEADERBOARD"
            description="Tier progression & rankings."
              rank="#4,092"
              image="/assets/cards/player-leaderboard.webp?v=2"
              imageClassName="h-52 w-40 group-hover:scale-125"
              className="min-h-[220px] lg:col-span-2"
          />
        </div>
      </main>

      <ConnectWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-8 lg:px-8">
        <div className="relative overflow-hidden border-y border-surface bg-background py-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-background to-transparent" />
          <div className="animate-marquee flex whitespace-nowrap">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center">
                {TICKER_ITEMS.map((t) => (
                  <span
                    key={t.name + i}
                    className="inline-block border-l border-surface px-8 text-xs font-medium text-foreground first:border-l-0"
                  >
                    {t.name} - {t.pos}:{" "}
                    <span
                      className={
                        t.up === true
                          ? "text-cyan"
                          : t.up === false
                            ? "text-rose"
                            : "text-muted"
                      }
                    >
                      {t.val} {t.up === true ? "▲" : t.up === false ? "▼" : "▬"}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavTile({
  href,
  icon,
  title,
  description,
  accent,
  rank,
  image,
  imageClassName,
  className,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent?: "purple";
  rank?: string;
  image?: string;
  imageClassName?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[188px] flex-col justify-between bg-surface p-6 transition-all duration-150 hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] hover:shadow-[0_20px_40px_-10px_rgba(3,70,148,0.35)] focus-visible:ring-2 focus-visible:ring-cyan",
        className
      )}
    >
      <div className="card-shine" />
      {image && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 z-0 origin-bottom transition-transform duration-300",
            imageClassName ?? "h-44 w-36 group-hover:scale-125"
          )}
        >
          <Image
            src={image}
            alt={title}
            fill
            sizes="15rem"
            className="object-contain object-bottom card-image-gray"
          />
        </div>
      )}
      <div className="relative z-10 flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center bg-surface-elevated shadow-sm transition-colors duration-200",
            accent === "purple"
              ? "text-purple group-hover:bg-purple group-hover:text-white"
              : "text-foreground group-hover:bg-white group-hover:text-[#034694]"
          )}
        >
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {rank ? (
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs uppercase text-muted transition-colors group-hover:text-white/70">Current Rank</p>
              <p className="unica-one text-lg text-foreground transition-colors group-hover:text-white">{rank}</p>
            </div>
            <span className="material-symbols-outlined text-muted transition-colors group-hover:text-white">
              arrow_outward
            </span>
          </div>
        ) : (
          <span className="material-symbols-outlined text-muted transition-colors group-hover:text-white">
            arrow_outward
          </span>
        )}
      </div>
      <div className="relative z-10 mt-8">
        <div>
          <h4 className="unica-one text-2xl text-foreground transition-colors group-hover:text-white">{title}</h4>
          <p className="mt-1 text-sm text-muted transition-colors group-hover:text-white/70">{description}</p>
        </div>
      </div>
    </Link>
  );
}
