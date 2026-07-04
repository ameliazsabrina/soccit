"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageShell } from "./_components/page-shell";
import { ConnectWalletModal } from "./_components/connect-wallet-modal";
import { SOCCIT_SEED_MATCH_PDA } from "./_lib/api";
import { cn } from "./_lib/utils";

const FEATURED_MATCH_URL = `/matches/${SOCCIT_SEED_MATCH_PDA}?seed=1`;
const FEATURED_ARENA_URL = `/matches/${SOCCIT_SEED_MATCH_PDA}/arena?seed=1`;

export default function StartMenu() {
  const { connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  function requireWallet() {
    setModalOpen(true);
  }

  return (
    <PageShell>
      <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <TileWrapper delay={0} className="lg:col-span-3">
          <FeaturedMatchTile
            connected={connected}
            onRequireWallet={requireWallet}
          />
        </TileWrapper>
        <TileWrapper delay={0.05} className="lg:col-span-2">
          <PortfolioTile
            connected={connected}
            onRequireWallet={requireWallet}
          />
        </TileWrapper>
        <TileWrapper delay={0.1} className="lg:col-span-2">
          <ExplorerTile
            connected={connected}
            onRequireWallet={requireWallet}
          />
        </TileWrapper>
        <TileWrapper delay={0.15} className="lg:col-span-3">
          <LeaderboardTile
            connected={connected}
            onRequireWallet={requireWallet}
          />
        </TileWrapper>
      </div>

      <ConnectWalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </PageShell>
  );
}

function TileWrapper({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeaturedMatchTile({
  connected,
  onRequireWallet,
}: {
  connected: boolean;
  onRequireWallet: () => void;
}) {
  const router = useRouter();

  function goToMatch() {
    if (connected) {
      router.push(FEATURED_MATCH_URL);
    } else {
      onRequireWallet();
    }
  }

  function goToArena(e: React.MouseEvent) {
    e.stopPropagation();
    if (connected) {
      router.push(FEATURED_ARENA_URL);
    } else {
      onRequireWallet();
    }
  }

  return (
    <div
      onClick={goToMatch}
      className="group relative flex min-h-[380px] cursor-pointer flex-col justify-between bg-surface p-8 transition-all hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] lg:col-span-3"
    >
      <div className="card-shine" />
      <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-80 w-80 origin-bottom transition-transform duration-300 group-hover:scale-150">
        <Image
          src="/assets/cards/player-hero.webp?v=2"
          alt="Featured match"
          fill
          sizes="30rem"
          className="object-contain object-bottom card-image-gray"
        />
      </div>

      {/* Top-left: team logos + names */}
      <div className="relative z-10 flex items-start gap-5">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://flagcdn.com/pt.svg"
            alt="Portugal"
            className="h-24 w-auto object-contain"
          />
          <span className="text-center text-xs font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-white">
            Portugal
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://flagcdn.com/ar.svg"
            alt="Argentina"
            className="h-24 w-auto object-contain"
          />
          <span className="text-center text-xs font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-white">
            Argentina
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-12 flex flex-col justify-between gap-6 border-t border-muted/20 pt-6 sm:flex-row sm:items-end">
        <div>
          <h2 className="unica-one text-3xl text-foreground transition-colors group-hover:text-white">
            FEATURED MATCH
          </h2>
          <p className="mt-1 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            Portugal vs Argentina · World Cup 2026
          </p>
        </div>
        <button
          onClick={goToArena}
          className="btn-gradient inline-flex items-center gap-3 px-8 py-4 font-display text-xl uppercase tracking-[0.1em] text-white"
        >
          ENTER MATCH
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

function PortfolioTile({
  connected,
  onRequireWallet,
}: {
  connected: boolean;
  onRequireWallet: () => void;
}) {
  const [portfolioDisplay, setPortfolioDisplay] = useState("$14,093.50");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const displayValue = connected ? portfolioDisplay : "$0.00";
  const [portfolioWhole, portfolioCents] = displayValue.split(".");

  function handlePortfolioEnter() {
    if (!connected || intervalRef.current) return;
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

  return (
    <Link
      href="/profile"
      onMouseEnter={handlePortfolioEnter}
      onClick={(e) => {
        if (!connected) {
          e.preventDefault();
          onRequireWallet();
        }
      }}
      className="group relative flex min-h-[380px] flex-col justify-between bg-surface p-8 transition-all hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] lg:col-span-2"
    >
      <div className="card-shine" />
      <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-80 w-80 origin-bottom transition-transform duration-300 group-hover:scale-150">
        <Image
          src="/assets/cards/player-arena.webp?v=2"
          alt="Portfolio"
          fill
          sizes="20rem"
          className="object-contain object-bottom card-image-gray"
        />
      </div>

      <div className="relative z-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center bg-surface-elevated shadow-sm transition-colors group-hover:bg-white">
          <span className="material-symbols-outlined text-2xl text-foreground transition-colors group-hover:text-[#034694]">
            account_balance_wallet
          </span>
        </div>
        <p className="mb-1 font-body text-sm font-medium uppercase tracking-wider text-muted transition-colors group-hover:text-white/70">
          Total Portfolio Value
        </p>
        <div className="flex items-baseline gap-4">
          <h2 className="unica-one text-5xl leading-none tracking-tighter text-foreground transition-colors group-hover:text-white lg:text-6xl">
            {portfolioWhole}
            <span className="text-2xl text-muted transition-colors group-hover:text-white/60">
              .{portfolioCents}
            </span>
          </h2>
        </div>
        {connected && (
          <div className="mt-3 flex items-center gap-2 font-body text-sm font-medium">
            <span className="material-symbols-outlined text-base text-cyan transition-colors group-hover:text-white">
              trending_up
            </span>
            <span className="text-cyan transition-colors group-hover:text-white">
              +24.5% ($2,850.00)
            </span>
            <span className="ml-2 text-muted transition-colors group-hover:text-white/70">
              Past 24H
            </span>
          </div>
        )}
        {!connected && (
          <p className="mt-2 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            Connect wallet to track net worth.
          </p>
        )}
      </div>

      <div className="relative z-10 mt-12 border-t border-muted/20 pt-6">
        <span className="mb-1 block font-body text-xs uppercase tracking-wide text-muted transition-colors group-hover:text-white/70">
          Active Positions
        </span>
        <span className="unica-one text-2xl text-foreground transition-colors group-hover:text-white">
          0
        </span>
        <span className="mt-1 block font-body text-sm font-medium text-rose">
          NO ACTIVE POSITIONS.
        </span>
      </div>
    </Link>
  );
}

function ExplorerTile({
  connected,
  onRequireWallet,
}: {
  connected: boolean;
  onRequireWallet: () => void;
}) {
  return (
    <NavTile
      href="/explorer"
      icon="explore"
      title="EXPLORER"
      description="Immutable match history."
      image="/assets/cards/player-logs.webp?v=2"
      imageClassName="h-54 w-54 group-hover:scale-180"
      className="min-h-[220px] lg:col-span-2"
      connected={connected}
      onRequireWallet={onRequireWallet}
    />
  );
}

function LeaderboardTile({
  connected,
  onRequireWallet,
}: {
  connected: boolean;
  onRequireWallet: () => void;
}) {
  return (
    <NavTile
      href="/leaderboard"
      icon="trophy"
      title="GLOBAL LEADERBOARD"
      description="Tier progression & rankings."
      rank="#4,092"
      image="/assets/cards/player-leaderboard.webp?v=2"
      imageClassName="h-64 w-64 group-hover:scale-180"
      className="min-h-[220px] lg:col-span-3"
      connected={connected}
      onRequireWallet={onRequireWallet}
    />
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
  connected,
  onRequireWallet,
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
  connected: boolean;
  onRequireWallet: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!connected) {
          e.preventDefault();
          onRequireWallet();
        }
      }}
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
          <div className="hidden text-right sm:block">
            <p className="font-body text-xs uppercase text-muted transition-colors group-hover:text-white/70">
              Current Rank
            </p>
            <p className="unica-one text-lg text-foreground transition-colors group-hover:text-white">
              {rank}
            </p>
          </div>
        ) : null}
      </div>
      <div className="relative z-10 mt-8">
        <div>
          <h4 className="unica-one text-2xl text-foreground transition-colors group-hover:text-white">
            {title}
          </h4>
          <p className="mt-1 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
