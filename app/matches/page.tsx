"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, AlertCircle, Loader2, History, Radio, Zap } from "lucide-react";
import {
  getMatch,
  getLineup,
  isValidPda,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
} from "../_lib/api";

const RECENT_MATCHES_KEY = "soccit-recent-matches";

export default function MatchEvents() {
  const router = useRouter();
  const [pda, setPda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_MATCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  async function handleLoadPda(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidPda(pda)) {
      setError("Enter a valid base58 Solana address (32–44 chars).");
      return;
    }
    setLoading(true);
    try {
      await Promise.all([getMatch(pda), getLineup(pda)]);
      saveRecent(pda);
      router.push(`/matches/${pda}`);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load match.");
    }
  }

  function saveRecent(next: string) {
    setRecent((prev) => {
      const updated = [next, ...prev.filter((p) => p !== next)].slice(0, 5);
      try {
        window.localStorage.setItem(RECENT_MATCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Live Markets</p>
          <h1 className="font-display text-4xl tracking-tighter text-foreground">Events Matrix</h1>
        </div>

        {/* PDA loader */}
        <form
          onSubmit={handleLoadPda}
          className="mb-8 flex flex-col gap-3 border border-surface bg-surface/50 p-4 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              value={pda}
              onChange={(e) => setPda(e.target.value.trim())}
              placeholder="Paste match PDA (base58)"
              className="h-12 w-full bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient flex h-12 items-center justify-center gap-2 px-6 font-display uppercase tracking-wider text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Load Match"}
          </button>
        </form>
        {error && (
          <div className="mb-8 flex items-center gap-2 border border-rose/30 bg-rose/5 p-3 text-sm text-rose">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Live Devnet seed match — real on-chain submissions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href={`/matches/${SOCCIT_SEED_MATCH_PDA}?seed=1`}
            className="group relative block border border-cyan/40 bg-cyan/5 p-5 transition-all hover:border-cyan hover:bg-cyan/10 hover:shadow-[0_20px_40px_-10px_rgba(6,182,212,0.2)]"
          >
            <div className="mb-4 flex items-center gap-2">
              <Zap size={16} className="text-cyan" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan">
                Live Devnet Seed · Fixture {SOCCIT_SEED_FIXTURE_ID}
              </span>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                  Real on-chain predictions (wallet + mock USDC required)
                </p>
                <p className="font-display text-xl text-foreground">
                  Soccit Seed Match
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  PDA {SOCCIT_SEED_MATCH_PDA}
                </p>
              </div>
              <div className="flex flex-col gap-2 border-l border-surface bg-background/50 p-4 text-xs uppercase text-muted md:min-w-[200px]">
                <div className="flex justify-between">
                  <span>Network</span>
                  <span className="font-mono text-foreground">Devnet</span>
                </div>
                <div className="flex justify-between">
                  <span>Entry</span>
                  <span className="font-mono text-foreground">$5.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="text-cyan">OPEN</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Recently viewed */}
        {recent.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <History size={16} className="text-muted" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Recently Viewed</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recent.map((addr) => (
                <Link
                  key={addr}
                  href={`/matches/${addr}`}
                  className="flex items-center justify-between border border-surface bg-surface/30 p-4 transition-colors hover:border-cyan/50 hover:bg-surface/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground">{addr}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">Match PDA</p>
                  </div>
                  <span className="text-cyan">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state / helper */}
        <div className="mt-8 border border-dashed border-surface p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-cyan">
                <Radio size={16} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">No live markets discovered</p>
              </div>
              <p className="max-w-xl text-sm text-muted">
                There is no public match listing endpoint yet. Paste a match PDA above, try the
                demo match, or load one of your recently viewed matches.
              </p>
            </div>
            <div className="text-xs text-muted">
              <p className="mb-1 font-bold uppercase">Valid PDA format</p>
              <code className="block bg-background p-2 font-mono">
                CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq
              </code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
