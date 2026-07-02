"use client";

import { Trophy, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-cyan/15 blur-[120px]" />
        <div className="absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-purple/15 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 lg:px-8">
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Global Rankings</p>
          <h1 className="font-display text-4xl tracking-tight text-foreground lg:text-5xl">
            Leaderboard
          </h1>
        </div>

        <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <Trophy size={24} />
            </div>
            <div>
              <p className="font-display text-5xl text-foreground">—</p>
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
                Your Rank
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex min-h-[200px] flex-col justify-between bg-surface p-8"
          >
            <div className="flex h-10 w-10 items-center justify-center bg-background text-foreground">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="font-display text-5xl text-foreground">—</p>
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
                Best Trade
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
              <Users size={24} />
            </div>
            <div>
              <p className="font-display text-5xl text-foreground">—</p>
              <p className="mt-2 text-sm font-medium text-muted uppercase tracking-wider">
                Competitors
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex min-h-[360px] flex-col items-center justify-center border border-dashed border-surface bg-surface/30 p-8 md:col-span-3"
          >
            <p className="font-display text-2xl text-foreground">Season Opens Soon</p>
            <p className="mt-2 max-w-md text-center text-sm text-muted">
              The global leaderboard will populate once live fixtures are seeded and predictions
              start resolving. Lock your first prediction in the Arena to get on the board.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
