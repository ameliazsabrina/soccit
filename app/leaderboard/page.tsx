"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AlertCircle,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { PageShell } from "../_components/page-shell";
import {
  formatWallet,
  getGlobalLeaderboard,
  type GlobalLeaderboard,
  type GlobalLeaderboardRow,
} from "../_lib/api";
import { assetUrl } from "../_lib/assets";
import { cn } from "../_lib/utils";

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<GlobalLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadLeaderboard = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await getGlobalLeaderboard();
      if (requestId.current === currentRequest) setLeaderboard(result);
    } catch (cause) {
      if (requestId.current === currentRequest) {
        setError(
          cause instanceof Error ? cause.message : "Unable to load the leaderboard.",
        );
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
    return () => {
      requestId.current += 1;
    };
  }, [loadLeaderboard]);

  const wallet = publicKey?.toBase58() ?? null;
  const userRank = useMemo(() => {
    if (!wallet || !leaderboard) return null;
    const index = leaderboard.ranking.findIndex((row) => row.owner === wallet);
    return index >= 0 ? index + 1 : null;
  }, [leaderboard, wallet]);

  const topScore = leaderboard?.ranking[0]?.points ?? 0;

  return (
    <PageShell>
      <div className="min-h-0 flex-1 overflow-y-auto pb-8 pt-6">
        <div className="grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <StatCard
            icon={Trophy}
            label="Your Rank"
            value={loading ? null : wallet ? (userRank ? `#${userRank}` : "—") : "—"}
            detail={
              wallet
                ? userRank
                  ? `${leaderboard?.ranking[userRank - 1]?.points ?? 0} points`
                  : "Score a prediction to get ranked"
                : "Connect wallet to see your rank"
            }
          />
          <StatCard
            icon={Target}
            label="Top Score"
            value={loading ? null : String(topScore)}
            detail="Points across all matches"
          />
          <StatCard
            icon={Users}
            label="Competitors"
            value={loading ? null : String(leaderboard?.competitors ?? 0)}
            detail="Players with scored predictions"
          />

          <section className="min-h-[360px] border border-surface bg-surface/80 md:col-span-3">
            <header className="flex flex-col gap-4 border-b border-background px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan">
                  All-time
                </p>
                <h1 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
                  Global Standings
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Ranked by points, with earlier scoring predictions breaking ties.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadLeaderboard()}
                disabled={loading}
                className="inline-flex min-h-10 items-center justify-center gap-2 self-start border border-background bg-background px-4 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:border-cyan hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:cursor-wait disabled:opacity-60 sm:self-auto"
              >
                <RefreshCw size={15} className={cn(loading && "animate-spin")} />
                Refresh
              </button>
            </header>

            {loading && !leaderboard ? (
              <LeaderboardSkeleton />
            ) : error && !leaderboard ? (
              <ErrorState message={error} onRetry={loadLeaderboard} />
            ) : leaderboard && leaderboard.ranking.length > 0 ? (
              <LeaderboardTable leaderboard={leaderboard} wallet={wallet} />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

type Icon = React.ComponentType<{ size?: number; className?: string }>;

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: Icon;
  label: string;
  value: string | null;
  detail: string;
}) {
  return (
    <div className="flex min-h-[168px] flex-col justify-between bg-surface p-6 sm:p-7">
      <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
        <Icon size={22} />
      </div>
      <div className="mt-6">
        {value == null ? (
          <div className="h-10 w-20 animate-pulse bg-background" aria-label="Loading" />
        ) : (
          <p className="font-display text-4xl text-foreground sm:text-5xl">{value}</p>
        )}
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}

function LeaderboardTable({
  leaderboard,
  wallet,
}: {
  leaderboard: GlobalLeaderboard;
  wallet: string | null;
}) {
  return (
    <div>
      {leaderboard.unavailableMatches > 0 && (
        <div className="flex items-start gap-2 border-b border-gold/20 bg-gold/5 px-5 py-3 text-xs text-muted sm:px-6">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-gold" />
          <span>
            {leaderboard.unavailableMatches} archived match
            {leaderboard.unavailableMatches === 1 ? " is" : "es are"} unavailable; standings use {leaderboard.matchesIncluded} available match
            {leaderboard.matchesIncluded === 1 ? "" : "es"}.
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-background text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              <th scope="col" className="w-20 px-5 py-3 text-center sm:px-6">Rank</th>
              <th scope="col" className="px-3 py-3">Player</th>
              <th scope="col" className="px-3 py-3 text-center">Matches</th>
              <th scope="col" className="px-5 py-3 text-right sm:px-6">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.ranking.map((row, index) => (
              <LeaderboardRow
                key={row.owner}
                row={row}
                rank={index + 1}
                isCurrentUser={row.owner === wallet}
              />
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-background px-5 py-3 text-xs text-muted sm:px-6">
        {leaderboard.updatedAt ? `Last synced ${formatUpdatedAt(leaderboard.updatedAt)}` : "Live standings"}
      </footer>
    </div>
  );
}

function LeaderboardRow({
  row,
  rank,
  isCurrentUser,
}: {
  row: GlobalLeaderboardRow;
  rank: number;
  isCurrentUser: boolean;
}) {
  const name = row.user?.username ?? formatWallet(row.owner);

  return (
    <tr
      className={cn(
        "border-b border-background/70 transition-colors last:border-b-0 hover:bg-background/50",
        isCurrentUser && "bg-cyan/5",
      )}
    >
      <td className="px-5 py-4 text-center sm:px-6">
        <span
          className={cn(
            "inline-flex h-8 min-w-8 items-center justify-center font-display text-lg text-muted",
            rank === 1 && "bg-gold/10 text-gold",
            rank === 2 && "bg-foreground/10 text-foreground",
            rank === 3 && "bg-bronze/10 text-bronze",
          )}
        >
          {rank}
        </span>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar row={row} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-foreground">{name}</span>
              {isCurrentUser && (
                <span className="bg-cyan/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan">
                  You
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-muted">{formatWallet(row.owner)}</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-center font-mono text-sm text-muted">{row.matchesPlayed}</td>
      <td className="px-5 py-4 text-right sm:px-6">
        <span className="font-mono text-lg font-bold text-cyan">{row.points}</span>
        <span className="ml-1 text-[10px] uppercase text-muted">pts</span>
      </td>
    </tr>
  );
}

function PlayerAvatar({ row }: { row: GlobalLeaderboardRow }) {
  if (row.user?.avatar) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-background">
        <Image
          src={assetUrl(`avatars/${row.user.avatar}.webp`)}
          alt={`${row.user.username} avatar`}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  const initials = (row.user?.username ?? row.owner).slice(0, 2).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-background text-xs font-bold text-foreground">
      {initials}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="divide-y divide-background" aria-label="Loading leaderboard">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <div className="h-8 w-8 animate-pulse bg-background" />
          <div className="h-10 w-10 animate-pulse bg-background" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse bg-background" />
            <div className="h-2 w-20 animate-pulse bg-background" />
          </div>
          <div className="h-4 w-12 animate-pulse bg-background" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <AlertCircle size={28} className="text-rose" />
      <h2 className="mt-4 font-display text-xl text-foreground">Standings unavailable</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-5 inline-flex min-h-10 items-center gap-2 bg-foreground px-4 text-xs font-bold uppercase tracking-wider text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <Trophy size={30} className="text-muted" />
      <h2 className="mt-4 font-display text-xl text-foreground">No scored predictions yet</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        Join a match and score your first prediction to appear in the global standings.
      </p>
      <Link
        href="/matches"
        className="mt-5 inline-flex min-h-10 items-center justify-center bg-foreground px-4 text-xs font-bold uppercase tracking-wider text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      >
        Browse matches
      </Link>
    </div>
  );
}

function formatUpdatedAt(value: number) {
  const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(milliseconds));
}
