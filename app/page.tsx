"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageShell } from "./_components/page-shell";
import { ConnectWalletModal } from "./_components/connect-wallet-modal";
import { getCountryCode } from "./_components/team-badge";
import {
  getMatches,
  getPortfolio,
  formatUsdcAmount,
  type MatchSummary,
  type Portfolio,
} from "./_lib/api";
import { cn } from "./_lib/utils";

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
          <ExplorerTile connected={connected} onRequireWallet={requireWallet} />
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
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMatches()
      .then((rows) => {
        if (!active) return;
        const featured =
          rows.find((m) => m.featured) ??
          rows.find((m) => m.onchain.statusLabel === "OPEN") ??
          null;
        setMatch(featured);
      })
      .catch(() => {
        // Leave `match` null — the empty state renders once loading resolves.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <FeaturedMatchSkeleton />;
  }

  const team1 =
    match?.teamNames?.team1 ??
    (match ? `Team ${match.onchain.team1Id}` : "TBD");
  const team2 =
    match?.teamNames?.team2 ??
    (match ? `Team ${match.onchain.team2Id}` : "TBD");
  const team1Flag = match ? getCountryCode(team1) : null;
  const team2Flag = match ? getCountryCode(team2) : null;
  const matchUrl = match ? `/matches/${match.pda}` : null;
  const arenaUrl = match ? `/matches/${match.pda}/arena` : null;

  function goToMatch() {
    if (!matchUrl) return;
    if (connected) {
      router.push(matchUrl);
    } else {
      onRequireWallet();
    }
  }

  function goToArena(e: React.MouseEvent) {
    e.stopPropagation();
    if (!arenaUrl) return;
    if (connected) {
      router.push(arenaUrl);
    } else {
      onRequireWallet();
    }
  }

  return (
    <div
      onClick={goToMatch}
      className="group relative flex min-h-[420px] cursor-pointer flex-col justify-between bg-surface p-8 transition-all hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] lg:col-span-3"
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
        <FeaturedTeam name={team1} flag={team1Flag} />
        <FeaturedTeam name={team2} flag={team2Flag} />
      </div>

      <div className="relative z-10 mt-12 flex flex-col justify-between gap-6 border-t border-muted/20 pt-6 sm:flex-row sm:items-end">
        <div>
          <h2 className="unica-one text-3xl text-foreground transition-colors group-hover:text-white">
            FEATURED MATCH
          </h2>
          <p className="mt-1 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            {team1} vs {team2} · World Cup 2026
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

function FeaturedMatchSkeleton() {
  return (
    <div className="relative flex min-h-[420px] animate-pulse flex-col justify-between bg-surface p-8 lg:col-span-3">
      {/* Top-left: team logo/name placeholders */}
      <div className="relative z-10 flex items-start gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 bg-surface-elevated" />
            <div className="h-3 w-16 bg-surface-elevated" />
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-12 flex flex-col justify-between gap-6 border-t border-muted/20 pt-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-surface-elevated" />
          <div className="h-4 w-64 bg-surface-elevated" />
        </div>
        <div className="h-14 w-48 bg-surface-elevated" />
      </div>
    </div>
  );
}

function FeaturedTeam({ name, flag }: { name: string; flag: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2">
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/${flag}.svg`}
          alt={name}
          className="h-24 w-auto object-contain"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center bg-surface-elevated text-lg font-bold uppercase text-foreground">
          {name.slice(0, 3)}
        </div>
      )}
      <span className="text-center text-xs font-bold uppercase tracking-wider text-foreground transition-colors group-hover:text-white">
        {name}
      </span>
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
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  // "idle" = no wallet; distinct from an RPC error so we never show a fake $0.
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle",
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!wallet) {
      setPortfolio(null);
      setStatus("idle");
      return;
    }
    let active = true;
    setStatus("loading");
    getPortfolio(wallet)
      .then((p) => {
        if (!active) return;
        setPortfolio(p);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [wallet, reloadKey]);

  const decimals = portfolio?.usdcDecimals ?? 6;
  // Split for the display-only whole/cents styling; "--" stays intact.
  const formattedValue =
    status === "ready" && portfolio
      ? formatUsdcAmount(portfolio.portfolioValue, decimals)
      : "0.00";
  const [valueWhole, valueCents = "00"] = formattedValue.split(".");

  function retry(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setReloadKey((k) => k + 1);
  }

  return (
    <Link
      href="/profile"
      onClick={(e) => {
        if (!connected) {
          e.preventDefault();
          onRequireWallet();
        }
      }}
      className="group relative flex min-h-[420px] flex-col justify-between bg-surface p-8 transition-all hover:z-50 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-[#034694] hover:to-[#1e40af] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan lg:col-span-2"
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

        {status === "loading" ? (
          <div className="h-14 w-52 animate-pulse bg-surface-elevated" />
        ) : status === "error" ? (
          <h2 className="unica-one text-5xl leading-none tracking-tighter text-muted transition-colors group-hover:text-white/70 lg:text-6xl">
            —
          </h2>
        ) : (
          <div className="flex items-baseline gap-4">
            <h2 className="unica-one text-5xl leading-none tracking-tighter tabular-nums text-foreground transition-colors group-hover:text-white lg:text-6xl">
              ${valueWhole}
              <span className="text-2xl text-muted transition-colors group-hover:text-white/60">
                .{valueCents}
              </span>
            </h2>
          </div>
        )}

        {status === "idle" && (
          <p className="mt-2 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            Connect wallet to track net worth.
          </p>
        )}
        {status === "loading" && (
          <div className="mt-3 h-4 w-40 animate-pulse bg-surface-elevated" />
        )}
        {status === "error" && (
          <button
            onClick={retry}
            className="mt-3 inline-flex items-center gap-2 font-body text-sm font-medium text-rose transition-colors hover:text-rose/80"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Couldn&apos;t load balance — retry
          </button>
        )}
        {status === "ready" && portfolio && portfolio.activeCount > 0 && (
          <div className="mt-3 flex items-center gap-2 font-body text-sm font-medium">
            <span className="material-symbols-outlined text-base text-cyan transition-colors group-hover:text-white">
              lock
            </span>
            <span className="tabular-nums text-cyan transition-colors group-hover:text-white">
              ${formatUsdcAmount(portfolio.lockedStake, decimals)} at stake
            </span>
          </div>
        )}
        {status === "ready" && portfolio && portfolio.activeCount === 0 && (
          <p className="mt-3 font-body text-sm text-muted transition-colors group-hover:text-white/70">
            Live USDC balance.
          </p>
        )}
      </div>

      <div className="relative z-10 mt-12 border-t border-muted/20 pt-6">
        <span className="mb-1 block font-body text-xs uppercase tracking-wide text-muted transition-colors group-hover:text-white/70">
          Active Positions
        </span>

        {status === "loading" ? (
          <div className="h-7 w-12 animate-pulse bg-surface-elevated" />
        ) : status === "error" ? (
          <span className="unica-one text-2xl text-muted transition-colors group-hover:text-white/70">
            —
          </span>
        ) : status === "idle" ? (
          <>
            <span className="unica-one text-2xl text-muted transition-colors group-hover:text-white/70">
              —
            </span>
            <span className="mt-1 block font-body text-sm font-medium text-muted transition-colors group-hover:text-white/70">
              Connect wallet to view positions.
            </span>
          </>
        ) : (
          <>
            <span className="unica-one text-2xl tabular-nums text-foreground transition-colors group-hover:text-white">
              {portfolio?.activeCount ?? 0}
            </span>
            {portfolio && portfolio.activeCount === 0 ? (
              <span className="mt-1 block font-body text-sm font-medium text-rose">
                No active positions.
              </span>
            ) : (
              <span className="mt-1 block font-body text-sm font-medium text-muted transition-colors group-hover:text-white/70">
                Tap to view your positions.
              </span>
            )}
          </>
        )}
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
        className,
      )}
    >
      <div className="card-shine" />
      {image && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 z-0 origin-bottom transition-transform duration-300",
            imageClassName ?? "h-44 w-36 group-hover:scale-125",
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
              : "text-foreground group-hover:bg-white group-hover:text-[#034694]",
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
