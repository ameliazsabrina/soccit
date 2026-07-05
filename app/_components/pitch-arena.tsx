"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  ArrowLeft,
  ArrowRightLeft,
  Sparkles,
  Crosshair,
  Trophy,
  Radio,
  Info,
} from "lucide-react";
import { type PlayerCardData } from "./player-card";
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

export interface PitchArenaProps {
  matchPda: string;
  teamName: string;
  side: 1 | 2;
  onBack: () => void;
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
  onLock: (predictions: SubstitutionPrediction[]) => void | Promise<void>;
  locked?: boolean;
  className?: string;
}

type SidebarTab = "slip" | "feed" | "info";

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: "bg-purple/20 border-purple/50 text-purple",
  Defender: "bg-purple/10 border-purple/30 text-purple/80",
  Midfielder: "bg-gold/10 border-gold/40 text-gold",
  Forward: "bg-rose/10 border-rose/40 text-rose",
};

// 11-slot formation mapped from ARENASUBS.svg coordinates (1920x1080 wireframe).
// Pitch bounding box: x=[98,1093] (w=995), y=[148,597] (h=449).
const FORMATION_SLOTS: Record<string, { gridX: number; gridY: number }> = {
  GK: { gridX: 49.6, gridY: 87.2 },
  LB: { gridX: 16.5, gridY: 70.5 },
  LCB: { gridX: 35.1, gridY: 75.6 },
  CB: { gridX: 35.1, gridY: 75.6 },
  RCB: { gridX: 64.2, gridY: 75.6 },
  RB: { gridX: 82.5, gridY: 65.4 },
  CDM: { gridX: 49.6, gridY: 36.2 },
  CM: { gridX: 36.1, gridY: 41.3 },
  LCM: { gridX: 36.1, gridY: 41.3 },
  RCM: { gridX: 63.1, gridY: 41.3 },
  LW: { gridX: 19.9, gridY: 31.5 },
  LM: { gridX: 19.9, gridY: 31.5 },
  ST: { gridX: 49.6, gridY: 4.1 },
  CF: { gridX: 49.6, gridY: 4.1 },
  RW: { gridX: 79.1, gridY: 31.5 },
  RM: { gridX: 79.1, gridY: 31.5 },
};

function posColor(position: string | null): string {
  if (!position) return "bg-surface border-surface text-muted";
  const key = position.charAt(0).toUpperCase() + position.slice(1).toLowerCase();
  for (const [posKey, cls] of Object.entries(POSITION_COLORS)) {
    if (key.includes(posKey) || posKey.includes(key)) return cls;
  }
  return "bg-surface border-surface text-muted";
}

function getSlot(player: PlayerCardData): { gridX: number; gridY: number } {
  if (player.gridX != null && player.gridY != null) {
    return { gridX: player.gridX, gridY: player.gridY };
  }
  const code = (player.positionCode ?? "").toUpperCase();
  return FORMATION_SLOTS[code] ?? { gridX: 50, gridY: 50 };
}

export function PitchArena({
  matchPda,
  teamName,
  side,
  onBack,
  starters,
  substitutes,
  onLock,
  locked,
  className,
}: PitchArenaProps) {
  const [predictions, setPredictions] = useState<Record<string, SubstitutionPrediction>>({});
  const [dragOverPlayer, setDragOverPlayer] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<PlayerCardData | null>(null);
  const [showSubDetail, setShowSubDetail] = useState<PlayerCardData | null>(null);
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("slip");

  useEffect(() => {
    if (justPlaced === null) return;
    const timer = setTimeout(() => setJustPlaced(null), 600);
    return () => clearTimeout(timer);
  }, [justPlaced]);

  function handleDragStart(e: React.DragEvent, player: PlayerCardData) {
    e.dataTransfer.setData("application/json", JSON.stringify(player));
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleDropOnStarter(e: React.DragEvent, starterPlayer: PlayerCardData) {
    e.preventDefault();
    setDragOverPlayer(null);
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const sub: PlayerCardData = JSON.parse(data);
      assignSubToStarter(starterPlayer, sub);
    } catch {
      // ignore
    }
  }

  function assignSubToStarter(starter: PlayerCardData, sub: PlayerCardData) {
    setPredictions((prev) => ({
      ...prev,
      [starter.id]: {
        slotId: String(starter.id),
        position: starter.position ?? "Player",
        outPlayerId: starter.id,
        inPlayerId: sub.id,
        side,
      },
    }));
    setSelectedSub(null);
    setJustPlaced(starter.id);
  }

  function clearPrediction(playerId: number) {
    setPredictions((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });
  }

  function handleBenchClick(player: PlayerCardData) {
    setSelectedSub((prev) => (prev?.id === player.id ? null : player));
  }

  function handleBenchDetails(player: PlayerCardData) {
    setShowSubDetail(player);
  }

  function handleStarterClick(starter: PlayerCardData) {
    if (selectedSub) {
      assignSubToStarter(starter, selectedSub);
    } else if (predictions[starter.id]) {
      clearPrediction(starter.id);
    }
  }

  async function handleLock() {
    const predictionList = Object.values(predictions);
    if (predictionList.length === 0 || locked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await Promise.resolve(onLock(predictionList));
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

  const bench = substitutes.slice(0, 5);

  return (
    <div className={cn("grid h-full grid-cols-1 gap-5 lg:grid-cols-[1fr_40%]", className)}>
      {/* ===== LEFT: Pitch + Bench ===== */}
      <div className="flex min-h-0 flex-col">
        {/* Top bar: back + team identity */}
        <div className="flex h-16 items-center gap-3 px-2">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center border border-surface bg-surface/30 text-foreground transition-colors hover:bg-surface/60"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="flex h-10 w-10 items-center justify-center border border-surface bg-surface/30 text-foreground">
            <User size={18} />
          </span>
          <div>
            <p className="font-display text-lg leading-tight text-foreground">{teamName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {side === 1 ? "Home" : "Away"} · Sub Manager
            </p>
          </div>
        </div>

        {/* Pitch */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2">
          <div className="relative w-full max-w-full" style={{ aspectRatio: "995 / 449" }}>
            {/* Trapezoid pitch surface */}
            <div
              className="pitch-surface absolute inset-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
              style={{
                clipPath: "polygon(14.5% 0%, 85.5% 0%, 100% 100%, 0% 100%)",
              }}
            />
            {/* Pitch markings */}
            <svg
              className="pointer-events-none absolute inset-0 text-pitch-line"
              viewBox="0 0 995 449"
              preserveAspectRatio="none"
            >
              <polygon
                points="144,0 851,0 995,449 0,449"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <line x1="497.5" y1="0" x2="497.5" y2="449" stroke="currentColor" strokeWidth="2" />
              <circle
                cx="497.5"
                cy="224.5"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>

            {/* Player tokens */}
            <div className="absolute inset-0" onDragOver={(e) => e.preventDefault()}>
              {starters.map((starter) => {
                const predicted = predictions[starter.id];
                const sub = predicted
                  ? substitutes.find((s) => s.id === predicted.inPlayerId)
                  : null;
                const isDragOver = dragOverPlayer === starter.id;
                const flashed = justPlaced === starter.id;
                const slot = getSlot(starter);
                return (
                  <div
                    key={starter.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${slot.gridX}%`,
                      top: `${slot.gridY}%`,
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverPlayer(starter.id);
                    }}
                    onDragLeave={() => setDragOverPlayer(null)}
                    onDrop={(e) => handleDropOnStarter(e, starter)}
                    onClick={() => handleStarterClick(starter)}
                  >
                    <PlayerToken
                      player={starter}
                      sub={sub}
                      isDragOver={isDragOver}
                      flashed={flashed}
                      onClear={() => clearPrediction(starter.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instruction overlay */}
          <div className="absolute left-4 top-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            <Crosshair size={12} className="text-purple" />
            {selectedSub
              ? `Tap a player to swap in ${selectedSub.name.split(" ").pop()}`
              : "Drag a sub onto a player"}
          </div>
        </div>

        {/* Bench strip */}
        <div className="h-64 flex-shrink-0 border-t border-surface bg-surface/10 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              <span className="flex h-5 w-5 items-center justify-center bg-surface text-foreground">
                <User size={10} />
              </span>
              Bench
              <span className="text-muted/60">({substitutes.length})</span>
            </span>
            {selectedSub && (
              <button
                onClick={() => setSelectedSub(null)}
                className="text-[10px] font-bold uppercase text-cyan hover:underline"
              >
                Cancel selection
              </button>
            )}
          </div>
          <div className="flex h-[calc(100%-2rem)] items-center justify-center gap-3">
            {bench.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleBenchClick(sub)}
                onDoubleClick={() => handleBenchDetails(sub)}
                className={cn(
                  "h-full max-h-52 flex-1 cursor-pointer transition-transform hover:-translate-y-1",
                  selectedSub?.id === sub.id && "-translate-y-2 scale-105"
                )}
                style={{ maxWidth: "180px", minWidth: "100px" }}
              >
                <BenchCard
                  player={sub}
                  draggable
                  onDragStart={handleDragStart}
                />
              </div>
            ))}
            {bench.length === 0 && (
              <p className="text-xs text-muted">No substitutes available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT: Sidebar with separate tab header ===== */}
      <div className="flex min-h-0 flex-col">
        <div className="flex h-16 items-center border-b border-surface">
          {[
            { key: "slip" as const, label: "Slip", icon: <Sparkles size={14} /> },
            { key: "feed" as const, label: "Feed", icon: <Radio size={14} /> },
            { key: "info" as const, label: "Info", icon: <Info size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-3 py-4 text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === tab.key
                  ? "border-b-2 border-purple bg-surface/40 text-foreground"
                  : "border-b-2 border-transparent text-muted hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "slip" && predictionList.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center bg-purple text-[8px] text-white">
                  {predictionList.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden bg-surface/20">
          {activeTab === "slip" && (
            <SlipTab
              predictions={predictionList}
              substitutes={substitutes}
              potentialPayout={potentialPayout}
              locked={locked}
              isSubmitting={isSubmitting}
              onLock={handleLock}
              starters={starters}
            />
          )}
          {activeTab === "feed" && (
            <LiveMatchFeed
              pda={matchPda}
              isDemo={matchPda === "demo"}
              className="h-full border-0"
              showViewLogsLink
            />
          )}
          {activeTab === "info" && <InfoTab teamName={teamName} />}
        </div>
      </div>

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

      <LockCelebration
        open={celebrating}
        subtitle={teamName}
        onDone={() => setCelebrating(false)}
      />
    </div>
  );
}

// ===== Player Token (on pitch) =====
function PlayerToken({
  player,
  sub,
  isDragOver,
  flashed,
  onClear,
}: {
  player: PlayerCardData;
  sub?: PlayerCardData | null;
  isDragOver: boolean;
  flashed: boolean;
  onClear: () => void;
}) {
  const displayPlayer = sub ?? player;
  const posCls = posColor(displayPlayer.position);
  const lastName = displayPlayer.name.split(" ").pop() ?? displayPlayer.name;
  const posCode = displayPlayer.positionCode
    ?? displayPlayer.position?.slice(0, 2).toUpperCase()
    ?? "??";

  if (sub) {
    return (
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("relative", flashed && "animate-slot-flash")}
      >
        <div className={cn("flex h-12 w-12 flex-col items-center justify-center border-2 sm:h-14 sm:w-14", posCls)}>
          <span className="text-[10px] font-bold uppercase">{posCode}</span>
          <span className="max-w-full truncate px-0.5 text-[7px] font-bold uppercase tracking-tight sm:text-[8px]">
            {lastName}
          </span>
        </div>
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-cyan text-[8px] font-bold text-background">
          {getMultiplier(sub).toFixed(1)}x
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center bg-rose text-white shadow-lg transition-transform hover:scale-110"
          aria-label="Clear prediction"
        >
          <X size={11} />
        </button>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-12 w-12 cursor-pointer flex-col items-center justify-center border-2 transition-all sm:h-14 sm:w-14",
        posCls,
        isDragOver && "scale-110 ring-2 ring-cyan ring-offset-2 ring-offset-pitch-turf",
      )}
    >
      <span className="text-[10px] font-bold uppercase">{posCode}</span>
      <span className="max-w-full truncate px-0.5 text-[7px] font-bold uppercase tracking-tight sm:text-[8px]">
        {lastName}
      </span>
    </div>
  );
}

// ===== Bench Card (large portrait TCG) =====
function BenchCard({
  player,
  draggable,
  onDragStart,
}: {
  player: PlayerCardData;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, player: PlayerCardData) => void;
}) {
  const posCls = posColor(player.position);
  const lastName = player.name.split(" ").pop() ?? player.name;
  const posCode = player.positionCode
    ?? player.position?.slice(0, 2).toUpperCase()
    ?? "??";
  const multiplier = getMultiplier(player);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, player)}
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-between border-2 p-2",
        posCls,
      )}
    >
      <span className="text-xs font-bold uppercase">{posCode}</span>
      <div className="flex flex-col items-center">
        <span className="max-w-full truncate text-center text-[10px] font-bold uppercase tracking-tight">
          {lastName}
        </span>
        {player.number && (
          <span className="text-[9px] text-muted">#{player.number}</span>
        )}
      </div>
      <div className="flex h-5 w-full items-center justify-center bg-background/40 text-[10px] font-bold text-foreground">
        {multiplier.toFixed(1)}x
      </div>
    </div>
  );
}

// ===== Slip Tab =====
function SlipTab({
  predictions,
  substitutes,
  potentialPayout,
  locked,
  isSubmitting,
  onLock,
  starters,
}: {
  predictions: SubstitutionPrediction[];
  substitutes: PlayerCardData[];
  potentialPayout: number;
  locked?: boolean;
  isSubmitting: boolean;
  onLock: () => void;
  starters: PlayerCardData[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Crosshair size={32} className="mb-3 text-muted/40" />
            <p className="text-sm text-muted">No subs selected yet.</p>
            <p className="mt-1 text-xs text-muted/60">
              Drag a bench card onto a player on the pitch.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {predictions.map((p) => {
              const sub = substitutes.find((s) => s.id === p.inPlayerId);
              const outPlayer = starters.find((s) => s.id === p.outPlayerId);
              return (
                <div
                  key={p.slotId}
                  className="flex items-center gap-2 border border-surface bg-background/50 p-2.5"
                >
                  <div className="flex flex-1 items-center gap-2">
                    <span className="truncate text-xs font-bold text-muted">
                      {outPlayer?.name.split(" ").pop() ?? "Player"}
                    </span>
                    <ArrowRightLeft size={12} className="text-muted" />
                    <span className="truncate text-xs font-bold text-foreground">
                      {sub?.name.split(" ").pop() ?? "Sub"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan">
                    {getMultiplier(sub).toFixed(1)}x
                  </span>
                </div>
              );
            })}
            <p className="pt-3 text-center text-xs text-muted">
              Potential payout:{" "}
              <span className="font-bold text-cyan">{potentialPayout.toFixed(1)}x</span>
            </p>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 border-t border-surface p-4">
        <SlideToLock
          onLock={onLock}
          disabled={predictions.length === 0 || locked || isSubmitting}
          label={locked ? "LOCKED" : isSubmitting ? "SUBMITTING…" : "SLIDE TO LOCK"}
        />
      </div>
    </div>
  );
}

// ===== Info Tab =====
function InfoTab({ teamName }: { teamName: string }) {
  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm uppercase tracking-wider text-foreground">
        <Trophy size={14} className="text-gold" />
        How to Play
      </h3>
      <div className="space-y-3 text-xs text-muted">
        <div className="flex gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-purple text-[9px] font-bold text-white">1</span>
          <p>Pick a sub from the bench below the pitch.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-purple text-[9px] font-bold text-white">2</span>
          <p>Drag or tap to place them onto a starting player.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-purple text-[9px] font-bold text-white">3</span>
          <p>Each correct sub earns points based on the player multiplier.</p>
        </div>
        <div className="flex gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-purple text-[9px] font-bold text-white">4</span>
          <p>Lock your prediction slip to submit on-chain.</p>
        </div>
      </div>
      <div className="mt-4 border-t border-surface pt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted">Team</p>
        <p className="font-display text-sm text-foreground">{teamName}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="border border-surface bg-background/50 p-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">GK / DEF</p>
          <div className="mx-auto mt-1 h-3 w-3 border-2 border-purple bg-purple/20" />
        </div>
        <div className="border border-surface bg-background/50 p-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">MID</p>
          <div className="mx-auto mt-1 h-3 w-3 border-2 border-gold bg-gold/10" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1">
        <div className="border border-surface bg-background/50 p-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">FWD</p>
          <div className="mx-auto mt-1 h-3 w-3 border-2 border-rose bg-rose/10" />
        </div>
      </div>
    </div>
  );
}

// ===== Mobile sub detail sheet =====
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
