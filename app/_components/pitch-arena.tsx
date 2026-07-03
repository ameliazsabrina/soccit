"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { PlayerCard, type PlayerCardData } from "./player-card";
import { SlideToLock } from "./slide-to-lock";
import { LiveMatchFeed } from "./live-match-feed";
import { cn } from "../_lib/utils";

export interface SubstitutionPrediction {
  slotId: string;
  position: string;
  outPlayerId: number;
  inPlayerId: number;
  side: 1 | 2;
}

interface PitchArenaProps {
  matchPda: string;
  teamName: string;
  side: 1 | 2;
  score: { team1: number; team2: number };
  minute: number | null;
  isLive: boolean;
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
  onLock: (predictions: SubstitutionPrediction[]) => void;
  locked?: boolean;
  className?: string;
}

const FORMATION_SLOTS = [
  { id: "lw", label: "LW", position: "Forward", col: 2, row: 1 },
  { id: "st", label: "ST", position: "Forward", col: 6, row: 1 },
  { id: "rw", label: "RW", position: "Forward", col: 10, row: 1 },
  { id: "lcm", label: "LCM", position: "Midfielder", col: 3, row: 3 },
  { id: "cm", label: "CM", position: "Midfielder", col: 6, row: 3 },
  { id: "rcm", label: "RCM", position: "Midfielder", col: 9, row: 3 },
  { id: "lb", label: "LB", position: "Defender", col: 1, row: 5 },
  { id: "lcb", label: "LCB", position: "Defender", col: 4, row: 5 },
  { id: "rcb", label: "RCB", position: "Defender", col: 8, row: 5 },
  { id: "rb", label: "RB", position: "Defender", col: 11, row: 5 },
  { id: "gk", label: "GK", position: "Goalkeeper", col: 6, row: 6 },
];

export function PitchArena({
  matchPda,
  teamName,
  side,
  score,
  minute,
  isLive,
  starters,
  substitutes,
  onLock,
  locked,
  className,
}: PitchArenaProps) {
  const [predictions, setPredictions] = useState<Record<string, SubstitutionPrediction>>({});
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<PlayerCardData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Map slots to starters
  const startersBySlot = Object.fromEntries(
    FORMATION_SLOTS.map((slot) => {
      const starter = starters.find((s) => matchPosition(s.position, slot.position));
      return [slot.id, starter];
    })
  );

  function matchPosition(playerPos: string | null, slotPos: string) {
    if (!playerPos) return false;
    return playerPos.toLowerCase() === slotPos.toLowerCase();
  }

  function handleDragStart(e: React.DragEvent, player: PlayerCardData) {
    e.dataTransfer.setData("application/json", JSON.stringify(player));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleDrop(e: React.DragEvent, slotId: string) {
    e.preventDefault();
    setDragOverSlot(null);
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const player: PlayerCardData = JSON.parse(data);
      assignPlayerToSlot(slotId, player);
    } catch {
      // ignore
    }
  }

  function assignPlayerToSlot(slotId: string, sub: PlayerCardData) {
    const slot = FORMATION_SLOTS.find((s) => s.id === slotId);
    const starter = startersBySlot[slotId];
    if (!slot || !starter) return;
    setPredictions((prev) => ({
      ...prev,
      [slotId]: {
        slotId,
        position: slot.position,
        outPlayerId: starter.id,
        inPlayerId: sub.id,
        side,
      },
    }));
    setSelectedSub(null);
  }

  function clearSlot(slotId: string) {
    setPredictions((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }

  function handleBenchClick(player: PlayerCardData) {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSelectedSub(player);
    }
  }

  function handleSlotClick(slotId: string) {
    if (selectedSub) {
      assignPlayerToSlot(slotId, selectedSub);
    } else if (predictions[slotId]) {
      clearSlot(slotId);
    }
  }

  function handleLockConfirm() {
    setShowConfirm(false);
    onLock(Object.values(predictions));
  }

  const predictionList = Object.values(predictions);
  const filledCount = predictionList.length;

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden lg:flex-row", className)}>
      {/* Left: Bench Deck */}
      <aside className="hidden w-72 flex-col border-r border-surface bg-surface/20 p-4 lg:flex">
        <div className="mb-4 border-b border-surface pb-3">
          <h3 className="font-display text-2xl text-foreground">Bench Deck</h3>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Available Substitutes</p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {substitutes.map((sub) => (
            <PlayerCard
              key={sub.id}
              player={sub}
              draggable
              onDragStart={handleDragStart}
              onClick={() => handleBenchClick(sub)}
            />
          ))}
        </div>
      </aside>

      {/* Center: Pitch + HUD */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-4">
        {/* Atmospheric orb */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/10 blur-[120px]" />
        </div>

        {/* Scoreboard HUD */}
        <div className="relative z-20 mb-4 flex items-center gap-6 glass border border-surface px-8 py-3">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{teamName}</p>
            <div className="flex items-center gap-3 font-display text-4xl text-foreground">
              <span>{score.team1}</span>
              <span className="text-muted">-</span>
              <span>{score.team2}</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
              {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-rose" />}
              <span>{isLive ? `${minute ?? 0}' LIVE` : "UPCOMING"}</span>
            </div>
          </div>
        </div>

        {/* Perspective pitch */}
        <div className="relative z-10 w-full max-w-4xl" style={{ perspective: "1200px" }}>
          <div
            className="pitch-surface relative aspect-[3/2] w-full overflow-hidden border-[10px] border-pitch-deep shadow-2xl"
            style={{ transform: "rotateX(24deg) scale(1.05)", transformStyle: "preserve-3d" }}
          >
            <div className="pitch-line absolute inset-4 rounded-[40px]" />
            <div className="pitch-line absolute left-1/2 top-4 bottom-4 w-0 -translate-x-1/2" />
            <div className="pitch-line absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full" />

            {/* Slots grid */}
            <div
              className="absolute inset-0 grid grid-cols-11 grid-rows-6 gap-2 p-8"
              onDragOver={(e) => e.preventDefault()}
            >
              {FORMATION_SLOTS.map((slot) => {
                const starter = startersBySlot[slot.id];
                const predicted = predictions[slot.id];
                const sub = predicted ? substitutes.find((s) => s.id === predicted.inPlayerId) : null;
                const isDragOver = dragOverSlot === slot.id;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-center"
                    style={{ gridColumn: slot.col, gridRow: slot.row }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverSlot(slot.id);
                    }}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleDrop(e, slot.id)}
                    onClick={() => handleSlotClick(slot.id)}
                  >
                    <Slot
                      slot={slot}
                      starter={starter}
                      sub={sub}
                      isDragOver={isDragOver}
                      onClear={() => clearSlot(slot.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile bench deck */}
        <div className="relative z-20 mt-4 w-full max-w-4xl lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Substitutes</span>
            {selectedSub && (
              <span className="text-xs font-bold uppercase text-cyan">
                Tap a slot to place {selectedSub.name}
              </span>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {substitutes.map((sub) => (
              <PlayerCard
                key={sub.id}
                player={sub}
                draggable
                onDragStart={handleDragStart}
                onClick={() => handleBenchClick(sub)}
                compact
              />
            ))}
          </div>
        </div>

        {/* Lock action */}
        <div className="relative z-20 mt-4 w-full max-w-md">
          <button
            onClick={() => filledCount > 0 && setShowConfirm(true)}
            disabled={filledCount === 0 || locked}
            className={cn(
              "w-full py-4 font-display text-lg uppercase tracking-[0.1em] transition-all",
              filledCount > 0 && !locked
                ? "btn-gradient text-white"
                : "cursor-not-allowed bg-surface text-muted"
            )}
          >
            {locked ? "Locked" : `Lock Predictions (${filledCount}/11)`}
          </button>
        </div>
      </main>

      {/* Right: Live Feed */}
      <aside className="w-full border-l border-surface bg-surface/20 lg:w-80 xl:w-96">
        <LiveMatchFeed
          pda={matchPda}
          isDemo={matchPda === "demo"}
          className="h-full border-0"
          showViewLogsLink
        />
      </aside>

      {/* Lock confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <LockConfirmationModal
            teamName={teamName}
            predictions={predictionList}
            substitutes={substitutes}
            starters={starters}
            onConfirm={handleLockConfirm}
            onClose={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Slot({
  slot,
  starter,
  sub,
  isDragOver,
  onClear,
}: {
  slot: (typeof FORMATION_SLOTS)[0];
  starter?: PlayerCardData;
  sub?: PlayerCardData | null;
  isDragOver: boolean;
  onClear: () => void;
}) {
  if (sub) {
    return (
      <div className="relative">
        <PlayerCard player={sub} locked />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-rose text-white shadow-lg transition-transform hover:scale-110"
          aria-label="Clear prediction"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-24 w-16 cursor-pointer flex-col items-center justify-center border-2 transition-all lg:h-28 lg:w-20",
        isDragOver
          ? "border-cyan bg-cyan/10 glow-cyan"
          : "border-dashed border-cyan/40 bg-background/40 hover:border-cyan hover:bg-cyan/5"
      )}
    >
      <User
        size={24}
        className={cn(
          "mb-1 transition-opacity",
          isDragOver ? "text-cyan opacity-100" : "text-cyan/40 opacity-40"
        )}
      />
      <span className="text-[10px] uppercase tracking-wider text-muted">{slot.label}</span>
      {starter && (
        <span className="mt-1 max-w-full truncate px-1 text-[9px] uppercase text-foreground/60">
          {starter.name.split(" ").pop()}
        </span>
      )}
    </div>
  );
}

function LockConfirmationModal({
  teamName,
  predictions,
  substitutes,
  starters,
  onConfirm,
  onClose,
}: {
  teamName: string;
  predictions: SubstitutionPrediction[];
  substitutes: PlayerCardData[];
  starters: PlayerCardData[];
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative z-10 w-full max-w-lg border border-surface bg-surface/95 p-6 shadow-2xl"
      >
        <h2 className="mb-2 font-display text-2xl text-foreground">Confirm Substitutions</h2>
        <p className="mb-6 text-sm text-muted">
          {teamName} — {predictions.length} prediction{predictions.length !== 1 ? "s" : ""}
        </p>
        <div className="mb-6 max-h-64 space-y-2 overflow-y-auto">
          {predictions.map((p) => {
            const sub = substitutes.find((s) => s.id === p.inPlayerId);
            const out = starters.find((s) => s.id === p.outPlayerId);
            return (
              <div key={p.slotId} className="flex items-center justify-between border border-surface bg-background/50 p-3">
                <div>
                  <p className="text-sm font-bold text-foreground">{p.position}</p>
                  <p className="text-xs text-muted">
                    {out?.name ?? "Starter"} → {sub?.name ?? "Sub"}
                  </p>
                </div>
                <span className="font-display text-sm text-cyan">{p.slotId.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        <SlideToLock onLock={onConfirm} label="SLIDE TO LOCK" />
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
