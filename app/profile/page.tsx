"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Wallet, Trophy, History, LogOut } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getUser,
  getUserMatches,
  formatWallet,
  type UserProfile,
  type UserMatch,
} from "../_lib/api";

export default function ProfilePage() {
  const { publicKey, connected, disconnect } = useWallet();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) return;
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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-purple/15 blur-[120px]" />
        <div className="absolute -bottom-16 -right-16 h-80 w-80 rounded-full bg-cyan/15 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Operator</p>
          <h1 className="font-display text-4xl tracking-tight text-foreground lg:text-5xl">
            Profile
          </h1>
        </div>

        <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8 lg:col-span-2"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <User size={24} />
            </div>
            <div>
              <p className="font-display text-4xl text-foreground">
                {connected
                  ? loading
                    ? "Loading…"
                    : profile?.username ?? "Unnamed Player"
                  : "Connect Wallet"}
              </p>
              {connected && publicKey && (
                <p className="mt-2 font-mono text-sm text-muted">
                  {formatWallet(publicKey.toBase58())}
                </p>
              )}
              {!connected && (
                <p className="mt-2 text-sm text-muted">
                  Connect a Solana wallet to view your Soccit profile and stats.
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <Wallet size={24} />
            </div>
            <div>
              <p className="font-display text-5xl text-foreground">{matches.length}</p>
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
                Total Entries
              </p>
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
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
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
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
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
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
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
              className="group flex min-h-[200px] flex-col justify-between bg-surface p-8 text-left transition-all hover:bg-surface-elevated hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.1)] md:col-span-2 lg:col-span-3"
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
      </main>
    </div>
  );
}
