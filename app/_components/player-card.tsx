"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../_lib/utils";
import { tcgCardImage, playerRarity } from "../_lib/api";

export interface PlayerCardData {
  id: number;
  name: string;
  number: string | null;
  position: string | null;
  positionCode?: string | null;
  gridX?: number | null;
  gridY?: number | null;
  rating?: number;
  multiplier?: number;
  side: 1 | 2;
}

type Rarity = "bronze" | "gold" | "iridescent";

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
  onDoubleClick?: () => void;
  compact?: boolean;
  locked?: boolean;
  selected?: boolean;
  className?: string;
}

export function PlayerCard({
  player,
  draggable,
  onDragStart,
  onClick,
  onDoubleClick,
  compact,
  locked,
  selected,
  className,
}: PlayerCardProps) {
  const [imageError, setImageError] = useState(false);

  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pos = player.position?.slice(0, 2).toUpperCase() ?? "??";
  const fallbackRating = 75 + ((player.id * 7) % 15);
  const rating = player.rating ?? fallbackRating;
  const rarity = playerRarity(rating);
  const multiplier = player.multiplier ?? (rarity === "iridescent" ? 4.0 : rarity === "gold" ? 2.5 : 1.2);
  const cardImage = tcgCardImage(player.position, rating);

  const chamfer = { clipPath: "polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)" };

  const wrapperClass = cn(
    "group relative flex flex-shrink-0 cursor-grab flex-col items-center justify-end overflow-hidden transition-all active:cursor-grabbing",
    compact ? "h-48 w-32" : "h-60 w-40",
    selected && "ring-2 ring-cyan ring-offset-2 ring-offset-background scale-105",
    locked && "glow-purple ring-2 ring-purple",
    onClick && "cursor-pointer",
    className
  );

  return (
    <motion.div
      layoutId={`player-${player.id}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e as unknown as React.DragEvent, player)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={wrapperClass}
      style={chamfer}
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* TCG card art */}
      {!imageError ? (
        <Image
          src={cardImage}
          alt={player.name}
          fill
          sizes={compact ? "8rem" : "10rem"}
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : null}

      {/* Fallback gradient if image missing */}
      {imageError && (
        <div className={cn("absolute inset-0 bg-gradient-to-br", rarityClass(rarity))} />
      )}

      {/* Texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />

      {/* Rarity glow for iridescent */}
      {rarity === "iridescent" && !imageError && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-tr from-purple/20 via-transparent to-cyan/20" />
      )}

      {/* Top-left: position + rating */}
      <div className="absolute left-2 top-2 z-10 text-white">
        <p className="text-[10px] font-bold drop-shadow-md">{pos}</p>
        <p className="font-display text-2xl leading-none drop-shadow-md">{rating}</p>
      </div>

      {/* Center: player initials avatar */}
      <div className="z-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/30 text-2xl font-bold text-white backdrop-blur-sm">
        {initials}
      </div>

      {/* Bottom: name + multiplier + number */}
      <div className="relative z-10 w-full px-2 pb-2 pt-4 text-center">
        <p className="truncate text-xs font-bold uppercase tracking-tight text-white drop-shadow-md">
          {player.name}
        </p>
        <div className="mt-1 flex items-center justify-between border border-white/20 bg-black/30 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <span className="font-bold">{multiplier.toFixed(1)}x</span>
          <span>#{player.number ?? "-"}</span>
        </div>
      </div>

      {/* Side indicator stripe */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1.5",
          player.side === 1 ? "bg-purple" : "bg-cyan"
        )}
      />

      {/* Locked overlay */}
      {locked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <span className="border border-purple bg-purple px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Locked
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function PlayerCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 animate-pulse flex-col items-center justify-end overflow-hidden bg-surface",
        compact ? "h-48 w-32" : "h-60 w-40"
      )}
      style={{ clipPath: "polygon(10% 0, 90% 0, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0 90%, 0 10%)" }}
    >
      <div className="mb-4 h-16 w-16 rounded-full bg-surface-elevated" />
      <div className="mb-2 h-4 w-24 bg-surface-elevated" />
    </div>
  );
}
