"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  User,
  Wallet,
  Trophy,
  History,
  LogOut,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { AlertCircle, Loader2 as Spinner } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageShell } from "../_components/page-shell";
import { AvatarPicker } from "../_components/avatar-picker";
import { PositionCard } from "../_components/position-card";
import {
  getUser,
  getUserMatches,
  getMatches,
  getPortfolio,
  getGlobalRank,
  updateAvatar,
  updateUsername,
  formatWallet,
  formatUsdcAmount,
  type UserProfile,
  type UserMatch,
  type MatchSummary,
  type Portfolio,
  type AvatarId,
  type GlobalRankSummary,
} from "../_lib/api";
import { ensureSession } from "../_lib/session";
import { cn } from "../_lib/utils";

export default function ProfilePage() {
  const { publicKey, connected, disconnect } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Portfolio (USDC balance + active positions) loads independently of the
  // profile/points fetch so an RPC hiccup on one doesn't blank the other.
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioStatus, setPortfolioStatus] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  // /api/matches summaries, keyed by fixtureId — lends team names + final
  // scores to positions (the portfolio feed carries neither).
  const [matchesByFixture, setMatchesByFixture] = useState<
    Map<number, MatchSummary>
  >(new Map());
  const [reloadKey, setReloadKey] = useState(0);
  const [rankSummary, setRankSummary] = useState<GlobalRankSummary | null>(null);
  const [rankStatus, setRankStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [rankReloadKey, setRankReloadKey] = useState(0);

  useEffect(() => {
    if (!connected || !publicKey) {
      setProfile(null);
      setMatches([]);
      return;
    }
    const wallet = publicKey.toBase58();
    setLoading(true);
    Promise.all([getUser(wallet).catch(() => null), getUserMatches(wallet)])
      .then(([p, m]) => {
        setProfile(p);
        setMatches(m);
      })
      .finally(() => setLoading(false));
  }, [connected, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setPortfolio(null);
      setPortfolioStatus("idle");
      setMatchesByFixture(new Map());
      return;
    }
    const wallet = publicKey.toBase58();
    let active = true;
    setPortfolioStatus("loading");
    // Enrich positions with team names/final scores when available, but never
    // let a /api/matches failure fail the portfolio itself.
    getMatches()
      .then((rows) => {
        if (active) setMatchesByFixture(new Map(rows.map((r) => [r.fixtureId, r])));
      })
      .catch(() => {
        if (active) setMatchesByFixture(new Map());
      });
    getPortfolio(wallet)
      .then((p) => {
        if (!active) return;
        setPortfolio(p);
        setPortfolioStatus("ready");
      })
      .catch(() => {
        if (active) setPortfolioStatus("error");
      });
    return () => {
      active = false;
    };
  }, [connected, publicKey, reloadKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setRankSummary(null);
      setRankStatus("idle");
      return;
    }

    let active = true;
    setRankStatus("loading");
    getGlobalRank(publicKey.toBase58())
      .then((summary) => {
        if (!active) return;
        setRankSummary(summary);
        setRankStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setRankSummary(null);
        setRankStatus("error");
      });

    return () => {
      active = false;
    };
  }, [connected, publicKey, rankReloadKey]);

  const totalPoints = matches.reduce((sum, m) => sum + m.points, 0);
  const decimals = portfolio?.usdcDecimals ?? 6;
  const activeCount = portfolio?.activeCount ?? 0;

  function handleDisconnect() {
    if (window.confirm("Disconnect your wallet?")) {
      disconnect();
    }
  }

  const avatarId = profile?.avatar ?? null;

  return (
    <PageShell>
      <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Portfolio value card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[200px] flex-col justify-between bg-surface p-8 lg:col-span-2"
        >
          <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
            <Wallet size={24} />
          </div>
          <div>
            {portfolioStatus === "loading" ? (
              <div className="h-12 w-40 animate-pulse bg-background" />
            ) : portfolioStatus === "error" ? (
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex items-center gap-2 font-display text-2xl text-rose transition-colors hover:text-rose/80"
              >
                <Spinner size={20} />
                Retry
              </button>
            ) : portfolioStatus === "ready" && portfolio ? (
              <p className="font-display text-5xl tabular-nums text-foreground">
                ${formatUsdcAmount(portfolio.portfolioValue, decimals)}
              </p>
            ) : (
              <p className="font-display text-5xl text-muted">$0.00</p>
            )}
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
              Portfolio Value
            </p>
            {portfolioStatus === "ready" && portfolio && (
              <p className="mt-1 text-xs tabular-nums text-muted">
                ${formatUsdcAmount(portfolio.lockedStake, decimals)} at stake ·{" "}
                {activeCount} active
              </p>
            )}
          </div>
        </motion.div>

        {/* Profile card with avatar customization */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative flex min-h-[200px] flex-col justify-between bg-surface p-8"
        >
          <div className="flex items-start justify-between">
            <div className="relative">
              <div className="relative h-16 w-16 overflow-hidden border-2 border-purple bg-background">
                {avatarId ? (
                  <Image
                    src={`/api/assets/avatars/${avatarId}.webp`}
                    alt={profile?.username ?? "Player"}
                    fill
                    sizes="4rem"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-foreground">
                    <User size={28} />
                  </div>
                )}
              </div>
              {connected && (
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center border border-surface bg-background text-foreground shadow-sm transition-colors hover:border-purple hover:text-purple"
                  aria-label="Edit avatar"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
            {!connected && (
              <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
                <User size={24} />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-2xl text-foreground">
                {connected
                  ? loading
                    ? "Loading…"
                    : profile?.username ?? "Unnamed Player"
                  : "Connect Wallet"}
              </p>
              {connected && (
                <button
                  onClick={() => setShowUsernameModal(true)}
                  className="text-muted transition-colors hover:text-purple"
                  aria-label="Edit username"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            {connected && publicKey && (
              <p className="mt-1 font-mono text-xs text-muted">
                {formatWallet(publicKey.toBase58())}
              </p>
            )}
            {!connected && (
              <p className="mt-2 text-sm text-muted">
                Connect a Solana wallet to view your profile.
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
        >
          <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
            <Trophy size={24} />
          </div>
          <div>
            <p className="font-display text-5xl text-foreground">{totalPoints}</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
              Career Points
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
        >
          <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
            <History size={24} />
          </div>
          <div>
            {portfolioStatus === "loading" ? (
              <div className="h-12 w-16 animate-pulse bg-background" />
            ) : portfolioStatus === "ready" ? (
              <p className="font-display text-5xl tabular-nums text-foreground">
                {activeCount}
              </p>
            ) : (
              <p className="font-display text-5xl text-muted">—</p>
            )}
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
              Active Positions
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
        >
          <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
            <span className="font-display text-lg">?</span>
          </div>
          <div>
            {rankStatus === "loading" ? (
              <div className="h-12 w-24 animate-pulse bg-background" aria-label="Loading current rank" />
            ) : rankStatus === "error" ? (
              <button
                type="button"
                onClick={() => setRankReloadKey((key) => key + 1)}
                className="inline-flex min-h-10 items-center gap-2 font-display text-2xl text-rose transition-colors hover:text-rose/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
              >
                <RefreshCw size={18} aria-hidden="true" />
                Retry
              </button>
            ) : rankStatus === "ready" && rankSummary?.rank ? (
              <>
                <p className="font-display text-5xl tabular-nums text-foreground">
                  #{rankSummary.rank}
                </p>
                <p className="mt-1 text-xs tabular-nums text-muted">
                  of {rankSummary.competitors} ranked player{rankSummary.competitors === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-5xl text-muted">—</p>
                {connected && rankStatus === "ready" && (
                  <p className="mt-1 text-xs text-muted">Earn points to enter the table.</p>
                )}
              </>
            )}
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
              Current Rank
            </p>
          </div>
        </motion.div>

        {connected && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={handleDisconnect}
            className="group relative flex min-h-[200px] flex-col justify-between bg-surface p-8 text-left transition-all hover:border-rose hover:bg-surface-elevated hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.1)] md:col-span-2 lg:col-span-3"
          >
            <div className="absolute inset-0 border border-transparent transition-colors group-hover:border-rose" />
            <div className="relative z-10 flex h-10 w-10 items-center justify-center bg-background text-rose">
              <LogOut size={24} />
            </div>
            <div className="relative z-10">
              <p className="font-display text-2xl text-foreground">DISCONNECT WALLET</p>
              <p className="mt-1 text-sm text-muted">Sign out and clear the session.</p>
            </div>
          </motion.button>
        )}
      </div>

      {connected && (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-2xl uppercase tracking-wider text-foreground">
            Your Positions
          </h2>

          {portfolioStatus === "loading" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse border border-surface bg-surface/40"
                />
              ))}
            </div>
          ) : portfolioStatus === "error" ? (
            <div className="flex flex-col items-center justify-center border border-rose/30 bg-rose/5 p-8 text-center text-rose">
              <AlertCircle size={32} className="mb-3" />
              <p className="font-bold uppercase tracking-wider">
                Portfolio unavailable
              </p>
              <p className="mt-1 text-sm">
                The balance service is temporarily unreachable.
              </p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-5 flex items-center gap-2 border border-rose/30 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-rose/10"
              >
                <Spinner size={14} />
                Retry
              </button>
            </div>
          ) : portfolio && portfolio.positions.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {portfolio.positions.map((position) => (
                <PositionCard
                  key={position.pda}
                  position={position}
                  match={matchesByFixture.get(position.fixtureId) ?? null}
                  usdcDecimals={decimals}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-surface py-16 text-center text-muted">
              <p className="font-display text-xl tracking-wider">
                No Active Positions
              </p>
              <p className="mt-2 max-w-sm text-sm">
                Enter a match to open your first position. Your live stakes will
                show up here.
              </p>
            </div>
          )}
        </section>
      )}

      <AvatarEditModal
        open={showAvatarModal}
        currentAvatar={profile?.avatar ?? "avatar-0"}
        onClose={() => setShowAvatarModal(false)}
        onSuccess={(updated) => setProfile(updated)}
      />

      <UsernameEditModal
        open={showUsernameModal}
        currentUsername={profile?.username ?? ""}
        onClose={() => setShowUsernameModal(false)}
        onSuccess={(updated) => setProfile(updated)}
      />
    </PageShell>
  );
}

function AvatarEditModal({
  open,
  currentAvatar,
  onClose,
  onSuccess,
}: {
  open: boolean;
  currentAvatar: AvatarId;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}) {
  const { publicKey, signMessage } = useWallet();
  const [avatar, setAvatar] = useState<AvatarId>(currentAvatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setAvatar(currentAvatar);
  }, [open, currentAvatar]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !signMessage) return;

    const wallet = publicKey.toBase58();
    setLoading(true);
    setError(null);

    try {
      const token = await ensureSession(wallet, signMessage);
      const updated = await updateAvatar({ wallet, avatar, token });

      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar update failed.");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/95"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-4xl border border-surface bg-surface/95 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: full PFP preview */}
              <div className="flex flex-col items-center justify-center gap-4 border-b border-surface bg-background/50 p-8 md:border-b-0 md:border-r">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  Preview
                </p>
                <div className="relative aspect-square w-full max-w-[280px] overflow-hidden border-2 border-purple">
                  <Image
                    src={`/api/assets/avatars/${avatar}.webp`}
                    alt="Selected avatar"
                    fill
                    sizes="280px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Right: avatar grid + save */}
              <div className="flex flex-col gap-6 p-6 md:p-8">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                    Customization
                  </p>
                  <h2 className="font-display text-3xl text-foreground">Edit Avatar</h2>
                  <p className="mt-1 text-sm text-muted">
                    Choose a new avatar for your manager profile.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
                  <AvatarPicker value={avatar} onChange={setAvatar} columns={4} />

                  {error && (
                    <div className="flex items-start gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
                      <X size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={avatar === currentAvatar || loading}
                    className={cn(
                      "mt-auto flex w-full items-center justify-center gap-2 py-4 font-display text-lg uppercase tracking-[0.1em] transition-all",
                      avatar !== currentAvatar && !loading
                        ? "btn-gradient text-white"
                        : "cursor-not-allowed bg-surface text-muted"
                    )}
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    {loading ? "Saving…" : "Sign & Save Avatar"}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

function UsernameEditModal({
  open,
  currentUsername,
  onClose,
  onSuccess,
}: {
  open: boolean;
  currentUsername: string;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}) {
  const { publicKey, signMessage } = useWallet();
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setUsername(currentUsername);
  }, [open, currentUsername]);

  const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !signMessage || !isValidUsername) return;

    const wallet = publicKey.toBase58();
    setLoading(true);
    setError(null);

    try {
      const token = await ensureSession(wallet, signMessage);
      const updated = await updateUsername({ wallet, username, token });

      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Username update failed.");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/95"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 w-full max-w-md border border-surface bg-surface/95 p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Customization
              </p>
              <h2 className="font-display text-3xl text-foreground">Edit Username</h2>
              <p className="mt-1 text-sm text-muted">
                Choose a new manager name.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager_name"
                  maxLength={20}
                  className={cn(
                    "h-12 w-full border bg-background px-4 text-foreground placeholder:text-muted focus:outline-none focus:ring-2",
                    isValidUsername
                      ? "border-purple focus:ring-purple"
                      : "border-surface focus:ring-cyan"
                  )}
                />
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
                  3–20 characters, letters/numbers/underscores only
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
                  <X size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={username === currentUsername || !isValidUsername || loading}
                className={cn(
                  "flex w-full items-center justify-center gap-2 py-4 font-display text-lg uppercase tracking-[0.1em] transition-all",
                  username !== currentUsername && isValidUsername && !loading
                    ? "btn-gradient text-white"
                    : "cursor-not-allowed bg-surface text-muted"
                )}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {loading ? "Saving…" : "Sign & Save Username"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
