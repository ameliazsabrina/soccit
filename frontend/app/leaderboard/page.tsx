"use client";

import { Trophy, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell } from "../_components/page-shell";

export default function LeaderboardPage() {
  return (
    <PageShell>
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
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
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
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
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
            <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">
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
    </PageShell>
  );
}
