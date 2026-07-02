"use client";

import { motion } from "framer-motion";
import { cn } from "../_lib/utils";

export interface PlayerCardData {
  id: number;
  name: string;
  number: string | null;
  position: string | null;
  rating?: number;
  multiplier?: number;
  side: 1 | 2;
}

type Rarity = "bronze" | "gold" | "iridescent";

function getRarity(rating?: number): Rarity {
  const r = rating ?? 75;
  if (r >= 86) return "iridescent";
  if (r >= 80) return "gold";
  return "bronze";
}

function rarityClass(rarity: Rarity) {
  switch (rarity) {
    case "iridescent":
      return "from-purple via-cyan to-purple bg-[length:200%_200%] animate-gradient-shift";
    case "gold":
      return "from-[#D4AF37] via-[#FDE68A] to-[#B45309]";
    case "bronze":
    default:
      return "from-[#CD7F32] via-[#FDBA74] to-[#92400E]";
  }
}

interface PlayerCardProps {
  player: PlayerCardData;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, player: PlayerCardData) => void;
  onClick?: () => void;
  compact?: boolean;
  locked?: boolean;
}

export function PlayerCard({
  player,
  draggable,
  onDragStart,
  onClick,
  compact,
  locked,
}: PlayerCardProps) {
  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const pos = player.position?.slice(0, 2).toUpperCase() ?? "??";
  const fallbackRating = 75 + ((player.id * 7) % 15);
  const rating = player.rating ?? fallbackRating;
  const rarity = getRarity(rating);
  const multiplier = player.multiplier ?? (rarity === "iridescent" ? 4.0 : rarity === "gold" ? 2.5 : 1.2);

  const chamfer = { clipPath: "polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)" };

  if (compact) {
    return (
      <motion.div
        layoutId={`player-${player.id}`}
        draggable={draggable}
        onDragStart={(e) => onDragStart?.(e as unknown as React.DragEvent, player)}
        onClick={onClick}
        className={cn(
          "group relative flex h-48 w-32 flex-shrink-0 cursor-grab flex-col items-center justify-end overflow-hidden border-2 border-background/50 p-3 transition-all hover:-translate-y-2 hover:scale-105 active:cursor-grabbing",
          locked && "glow-purple border-purple"
        )}
        style={chamfer}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br", rarityClass(rarity))} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-30" />
        <div className="absolute left-2 top-2 z-10 text-white">
          <p className="text-[10px] font-bold">{pos}</p>
          <p className="font-display text-2xl leading-none drop-shadow-md">{rating}</p>
        </div>
        <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/20 text-2xl font-bold text-white backdrop-blur-sm">
          {initials}
        </div>
        <p className="relative z-10 mt-2 text-center text-xs font-bold uppercase tracking-tight text-white drop-shadow-md">
          {player.name}
        </p>
        <div className="relative z-10 mt-1 flex w-full items-center justify-between border border-white/20 bg-black/20 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <span className="font-bold">{multiplier.toFixed(1)}x</span>
          <span>#{player.number ?? "-"}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`player-${player.id}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e as unknown as React.DragEvent, player)}
      onClick={onClick}
      className={cn(
        "group relative flex h-60 w-40 cursor-grab flex-col justify-between overflow-hidden border-2 border-background/50 p-3 transition-all hover:scale-[1.02] active:cursor-grabbing",
        locked && "glow-purple border-purple"
      )}
      style={chamfer}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", rarityClass(rarity))} />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-30" />
      <div className="relative z-10 flex justify-between">
        <div className="border border-white/20 bg-black/20 px-2 py-1 text-white backdrop-blur-sm">
          <span className="font-display text-lg leading-none">{pos}</span>
        </div>
        <span className="font-display text-2xl text-white drop-shadow-md">{rating}</span>
      </div>
      <div className="relative z-10 mt-auto">
        <h4 className="font-display text-xl uppercase text-white drop-shadow-md">
          {player.name}
        </h4>
        <div className="mt-2 flex items-center justify-between border border-white/20 bg-black/20 px-3 py-1 text-sm text-white backdrop-blur-sm">
          <span className="font-bold">{multiplier.toFixed(1)}x</span>
          <span>#{player.number ?? "-"}</span>
        </div>
      </div>
    </motion.div>
  );
}
