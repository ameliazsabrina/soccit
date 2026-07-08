"use client";

import { motion } from "framer-motion";
import { Lock, Trophy } from "lucide-react";
import { type PlayerCardData } from "./player-card";
import { TeamBadge } from "./team-badge";
import { tcgCardImage } from "../_lib/api";
import { cn } from "../_lib/utils";

interface GoalscorerPanelProps {
  team1Name: string;
  team2Name: string;
  players: PlayerCardData[];
}

export function GoalscorerPanel({ team1Name, team2Name, players }: GoalscorerPanelProps) {
  const team1Players = players.filter((p) => p.side === 1 && !(p.position ?? "").match(/goal|keeper/i));
  const team2Players = players.filter((p) => p.side === 2 && !(p.position ?? "").match(/goal|keeper/i));

  return (
    <div className="flex flex-1 flex-col p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 border border-surface bg-background px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Lock size={12} />
              Coming Soon
            </div>
            <h2 className="font-display text-xl text-foreground md:text-2xl">Goalscorer</h2>
          </div>
          <div className="flex items-center gap-2 border border-gold/30 bg-gold/5 px-3 py-1.5">
            <Trophy size={14} className="text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold">2 pts per scorer</span>
          </div>
        </div>

        {/* Two team columns side-by-side */}
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <TeamColumn name={team1Name} players={team1Players} />
          <TeamColumn name={team2Name} players={team2Players} />
        </div>
      </motion.div>
    </div>
  );
}

function TeamColumn({ name, players }: { name: string; players: PlayerCardData[] }) {
  return (
    <div className="flex flex-col gap-3 bg-purple/10 p-4">
      <div className="flex items-center gap-2">
        <TeamBadge name={name} size="sm" />
        <h3 className="font-display text-sm uppercase tracking-wider text-foreground">{name}</h3>
        <span className="ml-auto text-[10px] font-bold text-muted">{players.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {players.map((p) => (
          <MiniTCGCard key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

function MiniTCGCard({ player }: { player: PlayerCardData }) {
  const cardImage = tcgCardImage(player.position);
  const lastName = player.name.split(" ").pop() ?? player.name;
  const shadow = "drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";

  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage}
        alt={player.name}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {player.number && (
        <span className={cn("absolute right-[6%] top-[3%] text-[7px] font-bold leading-none text-white sm:text-[9px]", shadow)}>
          {player.number}
        </span>
      )}
      <div className="absolute inset-x-[4%] top-[83.5%] bottom-[4%] flex items-center justify-center px-0.5">
        <span className={cn("truncate text-[5px] font-bold uppercase tracking-tight text-white sm:text-[7px]", shadow)}>
          {lastName}
        </span>
      </div>
    </div>
  );
}
