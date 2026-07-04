"use client";

import { motion } from "framer-motion";
import { Lock, Users, Clock, Trophy } from "lucide-react";
import { PlayerCard, type PlayerCardData } from "./player-card";

interface GoalscorerPanelProps {
  team1Name: string;
  team2Name: string;
  players: PlayerCardData[];
}

export function GoalscorerPanel({ team1Name, team2Name, players }: GoalscorerPanelProps) {
  const team1Players = players.filter((p) => p.side === 1);
  const team2Players = players.filter((p) => p.side === 2);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl border-2 border-surface bg-surface/10 p-6 md:p-10"
      >
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 border border-surface bg-background px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            <Lock size={14} />
            Coming Soon
          </div>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">Goalscorer</h2>
          <p className="mt-2 text-sm text-muted">
            Pick the players who will score. Each correct prediction earns 2 points.
          </p>
        </div>

        <div className="pointer-events-none mb-8 grid grid-cols-2 gap-4 opacity-40">
          <div className="border border-gold/30 bg-gold/5 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-gold">
              <Trophy size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Per Scorer</span>
            </div>
            <p className="font-display text-2xl text-foreground">2 pts</p>
          </div>
          <div className="border border-cyan/30 bg-cyan/5 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-cyan">
              <Clock size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Live Grading</span>
            </div>
            <p className="font-display text-2xl text-foreground">Goal by Goal</p>
          </div>
        </div>

        <div className="pointer-events-none space-y-6 opacity-40">
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
              <Users size={18} className="text-purple" />
              {team1Name}
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {team1Players.slice(0, 5).map((p) => (
                <PlayerCard key={p.id} player={p} compact />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg text-foreground">
              <Users size={18} className="text-cyan" />
              {team2Name}
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {team2Players.slice(0, 5).map((p) => (
                <PlayerCard key={p.id} player={p} compact />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
