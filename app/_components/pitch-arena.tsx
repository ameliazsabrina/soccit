"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, ArrowRightLeft, GripHorizontal, Sparkles, Crosshair } from "lucide-react";
import { PlayerCard, type PlayerCardData } from "./player-card";
import { SlideToLock } from "./slide-to-lock";
import { LiveMatchFeed } from "./live-match-feed";
import { LockCelebration } from "./lock-celebration";
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
  onLock: (predictions: SubstitutionPrediction[]) => void | Promise<void>;
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
  const [showSubDetail, setShowSubDetail] = useState<PlayerCardData | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startersBySlot = useMemo(
    () =>
      Object.fromEntries(
        FORMATION_SLOTS.map((slot) => {
          const starter = starters.find((s) => matchPosition(s.position, slot.position));
          return [slot.id, starter];
        })
      ),
    [starters]
  );

  useEffect(() => {
    if (!justPlaced) return;
    const timer = setTimeout(() => setJustPlaced(null), 600);
    return () => clearTimeout(timer);
  }, [justPlaced]);

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
    setJustPlaced(slotId);
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
      setSelectedSub((prev) => (prev?.id === player.id ? null : player));
    }
  }

  function handleBenchDetails(player: PlayerCardData) {
    setShowSubDetail(player);
  }

  function handleSlotClick(slotId: string) {
    if (selectedSub) {
      assignPlayerToSlot(slotId, selectedSub);
    } else if (predictions[slotId]) {
      clearSlot(slotId);
    }
  }

  async function handleLock() {
    if (predictionList.length === 0 || locked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onLock(Object.values(predictions)));
      setCelebrating(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const predictionList = Object.values(predictions);
  const potentialPayout = useMemo(() => {
    return predictionList.reduce((sum, p) => {
      const sub = substitutes.find((s) => s.id === p.inPlayerId);
      return sum + (sub ? getMultiplier(sub) : 1);
    }, 0);
  }, [predictionList, substitutes]);

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden lg:flex-row", className)}>
      {/* Left: Bench Deck */}
      <aside className="hidden w-72 flex-col border-r border-surface bg-surface/20 p-4 lg:flex">
        <div className="mb-4 border-b border-surface pb-3">
          <h3 className="font-display text-2xl text-foreground">Bench Deck</h3>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Drag a card onto the pitch
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {substitutes.map((sub) => (
            <PlayerCard
              key={sub.id}
              player={sub}
              draggable
              onDragStart={handleDragStart}
              onClick={() => handleBenchDetails(sub)}
            />
          ))}
        </div>
      </aside>

      {/* Center: Pitch + HUD */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-background p-4 pb-40 lg:pb-4">
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

        {/* Desktop instruction */}
        <div className="relative z-20 mb-3 hidden items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted lg:flex">
          <Crosshair size={14} className="text-purple" />
          Drag a substitute card onto the pitch
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
                const flashed = justPlaced === slot.id;
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
                      flashed={flashed}
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
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              <GripHorizontal size={14} />
              Substitutes
            </span>
            {selectedSub ? (
              <span className="text-xs font-bold uppercase text-cyan">
                Tap a slot to place {selectedSub.name}
              </span>
            ) : (
              <span className="text-xs font-bold uppercase text-muted">
                Tap a sub, then tap a slot
              </span>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {substitutes.map((sub) => (
              <PlayerCard
                key={sub.id}
                player={sub}
                draggable
                onDragStart={handleDragStart}
                onClick={() => handleBenchClick(sub)}
                onDoubleClick={() => handleBenchDetails(sub)}
                compact
                selected={selectedSub?.id === sub.id}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Right: Live Feed */}
      <aside className="hidden w-full border-l border-surface bg-surface/20 lg:block lg:w-80 xl:w-96">
        <LiveMatchFeed
          pda={matchPda}
          isDemo={matchPda === "demo"}
          className="h-full border-0"
          showViewLogsLink
        />
      </aside>

      {/* Prediction slip */}
      <PredictionSlip
        teamName={teamName}
        predictions={predictionList}
        substitutes={substitutes}
        potentialPayout={potentialPayout}
        locked={locked}
        isSubmitting={isSubmitting}
        onLock={handleLock}
      />

      {/* Mobile sub detail sheet */}
      <AnimatePresence>
        {showSubDetail && (
          <SubDetailSheet
            player={showSubDetail}
            onClose={() => setShowSubDetail(null)}
            onSelect={() => {
              setSelectedSub(showSubDetail);
              setShowSubDetail(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Lock celebration */}
      <LockCelebration
        open={celebrating}
        subtitle={teamName}
        onDone={() => setCelebrating(false)}
      />
    </div>
  );
}

function Slot({
  slot,
  starter,
  sub,
  isDragOver,
  flashed,
  onClear,
}: {
  slot: (typeof FORMATION_SLOTS)[0];
  starter?: PlayerCardData;
  sub?: PlayerCardData | null;
  isDragOver: boolean;
  flashed: boolean;
  onClear: () => void;
}) {
  if (sub) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("relative", flashed && "animate-slot-flash")}
      >
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
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-24 w-16 cursor-pointer flex-col items-center justify-center border-2 transition-all lg:h-28 lg:w-20",
        isDragOver
          ? "border-purple bg-purple/10 shadow-[0_0_20px_rgba(3,70,148,0.45)]"
          : "border-dashed border-cyan/40 bg-background/40 hover:border-cyan hover:bg-cyan/5"
      )}
    >
      <User
        size={24}
        className={cn(
          "mb-1 transition-opacity",
          isDragOver ? "text-purple opacity-100" : "text-cyan/40 opacity-40"
        )}
      />
      <span className="text-[10px] uppercase tracking-wider text-muted">{slot.label}</span>
      {starter && (
        <span className="mt-1 max-w-full truncate px-1 text-[9px] uppercase text-foreground/80">
          {starter.name.split(" ").pop()}
        </span>
      )}
    </div>
  );
}

function PredictionSlip({
  teamName,
  predictions,
  substitutes,
  potentialPayout,
  locked,
  isSubmitting,
  onLock,
}: {
  teamName: string;
  predictions: SubstitutionPrediction[];
  substitutes: PlayerCardData[];
  potentialPayout: number;
  locked?: boolean;
  isSubmitting: boolean;
  onLock: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface bg-surface/95 px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm lg:left-72 lg:right-80 xl:right-96">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-display text-lg text-foreground">
              <Sparkles size={18} className="text-cyan" />
              Your Prediction Slip
            </h4>
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              {teamName}
            </span>
          </div>
          {predictions.length === 0 ? (
            <p className="text-xs text-muted">No subs selected yet. Make a swap to lock in.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {predictions.map((p) => {
                const sub = substitutes.find((s) => s.id === p.inPlayerId);
                return (
                  <span
                    key={p.slotId}
                    className="inline-flex items-center gap-1.5 border border-surface bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground"
                  >
                    {p.slotId.toUpperCase()}
                    <ArrowRightLeft size={10} className="text-muted" />
                    {sub?.name ?? "Sub"}
                    <span className="text-cyan">({getMultiplier(sub).toFixed(1)}x)</span>
                  </span>
                );
              })}
            </div>
          )}
          {predictions.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Potential payout multiplier: <span className="font-bold text-cyan">{potentialPayout.toFixed(1)}x</span>
            </p>
          )}
        </div>
        <div className="w-full md:w-64 lg:w-72">
          <SlideToLock
            onLock={onLock}
            disabled={predictions.length === 0 || locked || isSubmitting}
            label={locked ? "LOCKED" : isSubmitting ? "SUBMITTING…" : "SLIDE TO LOCK"}
          />
        </div>
      </div>
    </div>
  );
}

function SubDetailSheet({
  player,
  onClose,
  onSelect,
}: {
  player: PlayerCardData;
  onClose: () => void;
  onSelect: () => void;
}) {
  const multiplier = getMultiplier(player);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 lg:hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full border-t border-surface bg-surface p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{player.position}</p>
            <h3 className="font-display text-2xl text-foreground">{player.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="border border-surface bg-background p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Rating</p>
            <p className="font-display text-xl text-foreground">{player.rating ?? "—"}</p>
          </div>
          <div className="border border-surface bg-background p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Number</p>
            <p className="font-display text-xl text-foreground">#{player.number ?? "—"}</p>
          </div>
          <div className="border border-surface bg-background p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Multiplier</p>
            <p className="font-display text-xl text-cyan">{multiplier.toFixed(1)}x</p>
          </div>
        </div>
        <button
          onClick={onSelect}
          className="w-full bg-purple py-3 font-display text-sm uppercase tracking-wider text-white transition-colors hover:bg-purple/90"
        >
          Select for Substitution
        </button>
      </motion.div>
    </div>
  );
}

function getMultiplier(player?: PlayerCardData): number {
  if (!player) return 1;
  if (player.multiplier) return player.multiplier;
  const r = player.rating ?? 75;
  if (r >= 86) return 4.0;
  if (r >= 80) return 2.5;
  return 1.2;
}
