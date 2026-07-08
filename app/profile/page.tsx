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
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageShell } from "../_components/page-shell";
import { AvatarPicker } from "../_components/avatar-picker";
import {
  getUser,
  getUserMatches,
  updateAvatar,
  updateUsername,
  formatWallet,
  type UserProfile,
  type UserMatch,
  type AvatarId,
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

  const totalPoints = matches.reduce((sum, m) => sum + m.points, 0);
  const active = matches.filter((m) => !m.final).length;

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
            <p className="font-display text-5xl text-foreground">$0.00</p>
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
              Portfolio Value
            </p>
            {connected && (
              <p className="mt-1 text-xs text-muted">Across {matches.length} entries</p>
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
                    src={`/avatars/${avatarId}.webp`}
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
            <p className="font-display text-5xl text-foreground">{active}</p>
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
            <p className="font-display text-5xl text-foreground">—</p>
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
                    src={`/avatars/${avatar}.webp`}
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
