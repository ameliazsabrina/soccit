"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  ArrowRightLeft,
  Crosshair,
  Trophy,
  Activity,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { type PlayerCardData } from "./player-card";
import { LiveMatchFeed } from "./live-match-feed";
import { ConfirmSubsModal, type SubstitutionPrediction } from "./confirm-subs-modal";
import { cn } from "../_lib/utils";

export type { SubstitutionPrediction } from "./confirm-subs-modal";

export interface PitchArenaProps {
  matchPda: string;
  teamName: string;
  side: 1 | 2;
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
  onLock: (predictions: SubstitutionPrediction[]) => void | Promise<void>;
  locked?: boolean;
  isSubmitting?: boolean;
  lockedPredictions?: SubstitutionPrediction[];
  className?: string;
}

type SidebarTab = "events" | "prediction" | "rank";

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: "bg-purple/20 border-purple/50 text-purple",
  Defender: "bg-purple/10 border-purple/30 text-purple/80",
  Midfielder: "bg-gold/10 border-gold/40 text-gold",
  Forward: "bg-rose/10 border-rose/40 text-rose",
};

// 11-slot formation mapped from ARENASUBS.svg coordinates (1920x1080 wireframe).
// Pitch bounding box: x=[98,1093] (w=995), y=[148,597] (h=449).
const FORMATION_SLOTS: Record<string, { gridX: number; gridY: number }> = {
  // Goalkeeper — own goal line (bottom)
  GK: { gridX: 50, gridY: 88 },
  // Back line — deep, symmetric
  LB: { gridX: 17, gridY: 70 },
  LCB: { gridX: 35, gridY: 76 },
  CB: { gridX: 50, gridY: 78 },
  RCB: { gridX: 65, gridY: 76 },
  RB: { gridX: 83, gridY: 70 },
  // Wing-backs — advanced of fullbacks
  LWB: { gridX: 12, gridY: 52 },
  RWB: { gridX: 88, gridY: 52 },
  // Defensive mids — screen in front of CBs
  CDM: { gridX: 50, gridY: 58 },
  LDM: { gridX: 38, gridY: 58 },
  RDM: { gridX: 62, gridY: 58 },
  // Central mids
  CM: { gridX: 50, gridY: 47 },
  LCM: { gridX: 36, gridY: 42 },
  RCM: { gridX: 64, gridY: 42 },
  LM: { gridX: 15, gridY: 47 },
  RM: { gridX: 85, gridY: 47 },
  // Attacking mids — behind the striker
  CAM: { gridX: 50, gridY: 27 },
  LAM: { gridX: 35, gridY: 27 },
  RAM: { gridX: 65, gridY: 27 },
  // Wingers — wide, advanced
  LW: { gridX: 20, gridY: 32 },
  RW: { gridX: 80, gridY: 32 },
  // Forwards — highest line
  SS: { gridX: 50, gridY: 14 },
  CF: { gridX: 50, gridY: 12 },
  ST: { gridX: 50, gridY: 4 },
  LST: { gridX: 38, gridY: 8 },
  RST: { gridX: 62, gridY: 8 },
  LF: { gridX: 30, gridY: 8 },
  RF: { gridX: 70, gridY: 8 },
};

function posColor(position: string | null): string {
  if (!position) return "bg-surface border-surface text-muted";
  const key = position.charAt(0).toUpperCase() + position.slice(1).toLowerCase();
  for (const [posKey, cls] of Object.entries(POSITION_COLORS)) {
    if (key.includes(posKey) || posKey.includes(key)) return cls;
  }
  return "bg-surface border-surface text-muted";
}

const POSITION_DERIVED_CODE: Record<string, string> = {
  goalkeeper: "GK",
  defender: "CB",
  back: "CB",
  midfield: "CM",
  forward: "ST",
  striker: "ST",
  winger: "RW",
  wing: "RW",
};

// Index-based 4-3-3 fallback used when neither gridX/gridY nor a recognizable
// position code is available. Spreads 11 players across a default shape so they
// never stack on a single point.
const INDEX_FALLBACK_SLOTS: { gridX: number; gridY: number }[] = [
  { gridX: 50, gridY: 88 },   // GK
  { gridX: 17, gridY: 70 },   // LB
  { gridX: 35, gridY: 76 },   // LCB
  { gridX: 65, gridY: 76 },   // RCB
  { gridX: 83, gridY: 70 },   // RB
  { gridX: 36, gridY: 42 },   // LCM
  { gridX: 50, gridY: 58 },   // CDM
  { gridX: 64, gridY: 42 },   // RCM
  { gridX: 20, gridY: 32 },   // LW
  { gridX: 50, gridY: 4 },    // ST
  { gridX: 80, gridY: 32 },   // RW
];

function derivePositionCode(player: PlayerCardData): string {
  const explicit = (player.positionCode ?? "").toUpperCase();
  if (explicit && FORMATION_SLOTS[explicit]) return explicit;
  if (explicit) return explicit;
  const pos = (player.position ?? "").toLowerCase();
  for (const [key, code] of Object.entries(POSITION_DERIVED_CODE)) {
    if (pos.includes(key)) return code;
  }
  return "";
}

const _slotCache = new WeakMap<PlayerCardData, { gridX: number; gridY: number }>();

export function getSlot(player: PlayerCardData, index = 0): { gridX: number; gridY: number } {
  const cached = _slotCache.get(player);
  if (cached) return cached;
  let slot: { gridX: number; gridY: number };
  if (player.gridX != null && player.gridY != null) {
    slot = { gridX: player.gridX, gridY: player.gridY };
  } else {
    const code = derivePositionCode(player);
    slot = FORMATION_SLOTS[code] ?? INDEX_FALLBACK_SLOTS[index % INDEX_FALLBACK_SLOTS.length];
  }
  _slotCache.set(player, slot);
  return slot;
}

export function PitchArena({
  matchPda,
  teamName,
  side,
  starters,
  substitutes,
  onLock,
  locked,
  isSubmitting = false,
  lockedPredictions = [],
  className,
}: PitchArenaProps) {
  const [predictions, setPredictions] = useState<Record<string, SubstitutionPrediction>>({});
  const [dragOverPlayer, setDragOverPlayer] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<PlayerCardData | null>(null);
  const [showSubDetail, setShowSubDetail] = useState<PlayerCardData | null>(null);
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("events");

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
    setShowConfirmModal(true);
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
    await Promise.resolve(onLock(predictionList));
  }

  const predictionList = Object.values(predictions);
  const potentialPayout = useMemo(() => {
    return predictionList.reduce((sum, p) => {
      const sub = substitutes.find((s) => s.id === p.inPlayerId);
      return sum + (sub ? getMultiplier(sub) : 1);
    }, 0);
  }, [predictionList, substitutes]);

  const bench = substitutes;

  return (
    <div className={cn("grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_40%]", className)}>
      {/* ===== LEFT COLUMN: PitchCard + BenchCard ===== */}
      <div className="flex min-h-0 min-w-0 flex-col gap-6">
        {/* PitchCard */}
        <div className="relative flex min-h-[240px] flex-1 flex-col overflow-hidden bg-purple/10">
          {/* Pitch surface — fills the card body top-to-bottom. The sizer
              takes h-full w-full so the field reaches the card's top and
              bottom edges; min-w holds a usable size on mobile (scrolls
              horizontally instead of shrinking). */}
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            {/* TODO(field-webp): replace the SVG surface + clipPath below with
                <img src="/field.webp" alt="Pitch" className="absolute inset-0 h-full w-full object-cover" />
                once the field WebP (trapezoid baked in, transparent corners) is
                dropped in /public. Use object-cover so the image fills the card
                height edge-to-edge; author the WebP at ~2:1 with the trapezoid
                filling the bounding box and a small safe margin so cover-crop
                never cuts the pitch. Token % positions map to the bounding box. */}
            <div className="relative h-full w-full min-w-[560px]">
              {/* Trapezoid pitch surface */}
              <div
                className="pitch-surface absolute inset-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                style={{
                  clipPath: "polygon(14.5% 0%, 85.5% 0%, 100% 100%, 0% 100%)",
                }}
              />
              {/* Pitch markings */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full text-pitch-line"
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
                {starters.map((starter, idx) => {
                  const predicted = predictions[starter.id];
                  const sub = predicted
                    ? substitutes.find((s) => s.id === predicted.inPlayerId)
                    : null;
                  const isDragOver = dragOverPlayer === starter.id;
                  const flashed = justPlaced === starter.id;
                  const slot = getSlot(starter, idx);
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
          </div>

          {/* Team name + instruction (top-left) */}
          <div className="absolute left-6 top-6 z-10 flex flex-col gap-1 rounded bg-background/40 px-2 py-1.5 backdrop-blur-sm">
            <p className="font-display text-lg leading-tight text-foreground">
              {teamName}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {side === 1 ? "Home" : "Away"}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Crosshair size={12} className="text-purple" />
              {selectedSub
                ? `Tap a player to swap in ${selectedSub.name.split(" ").pop()}`
                : "Drag a sub onto a player"}
            </div>
          </div>
        </div>

        {/* BenchCard */}
        <div className="flex h-[310px] min-w-0 flex-shrink-0 flex-col bg-purple/10 p-6">
          <div className="mb-3 flex items-center justify-between">
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
          <div className="flex flex-1 items-center gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {bench.map((sub) => (
              <div
                key={sub.id}
                onClick={() => handleBenchClick(sub)}
                onDoubleClick={() => handleBenchDetails(sub)}
                className={cn(
                  "aspect-[2/3] w-[130px] shrink-0 snap-start cursor-pointer transition-transform hover:-translate-y-1 sm:w-[150px]",
                  selectedSub?.id === sub.id && "-translate-y-2 scale-105"
                )}
              >
                <BenchCard
                  player={sub}
                  draggable
                  onDragStart={handleDragStart}
                />
              </div>
            ))}
            {bench.length === 0 && (
              <p className="m-auto text-xs text-muted">No substitutes available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN: SidebarCard ===== */}
      <div className="flex min-h-0 flex-col bg-purple/10">
        {/* Tab header */}
        <div className="flex h-16 flex-shrink-0 items-center border-b border-surface">
          {[
            { key: "events" as const, label: "Events", icon: <Activity size={14} /> },
            { key: "prediction" as const, label: "Prediction", icon: <Crosshair size={14} /> },
            { key: "rank" as const, label: "Rank", icon: <Trophy size={14} /> },
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
              {tab.key === "prediction" && predictionList.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center bg-purple text-[8px] text-white">
                  {predictionList.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "events" && (
            <LiveMatchFeed
              pda={matchPda}
              isDemo={matchPda === "demo"}
              view="events"
              className="h-full"
              showViewLogsLink
            />
          )}
          {activeTab === "prediction" && (
            <PredictionTab
              pendingPredictions={predictionList}
              lockedPredictions={lockedPredictions}
              starters={starters}
              substitutes={substitutes}
            />
          )}
          {activeTab === "rank" && (
            <LiveMatchFeed
              pda={matchPda}
              isDemo={matchPda === "demo"}
              view="leaderboard"
              className="h-full"
            />
          )}
        </div>
      </div>

      {/* Confirm Substitutions Modal */}
      <ConfirmSubsModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        predictions={predictionList}
        starters={starters}
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

// ===== Prediction Tab =====
function PredictionTab({
  pendingPredictions,
  lockedPredictions,
  starters,
  substitutes,
}: {
  pendingPredictions: SubstitutionPrediction[];
  lockedPredictions: SubstitutionPrediction[];
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
}) {
  const hasPending = pendingPredictions.length > 0;
  const hasLocked = lockedPredictions.length > 0;

  if (!hasPending && !hasLocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Crosshair size={32} className="mb-3 text-muted/40" />
        <p className="text-sm text-muted">No predictions yet.</p>
        <p className="mt-1 text-xs text-muted/60">
          Drag a bench card onto a player on the pitch to make a substitution.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* Pending section */}
      {hasPending && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center bg-purple text-[9px] font-bold text-white">
              {pendingPredictions.length}
            </span>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Pending
            </h4>
          </div>
          <div className="space-y-2">
            {pendingPredictions.map((p) => {
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
          </div>
        </div>
      )}

      {/* Locked section */}
      {hasLocked && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Lock size={12} className="text-cyan" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Locked
            </h4>
          </div>
          <div className="space-y-2">
            {lockedPredictions.map((p, i) => {
              const sub = substitutes.find((s) => s.id === p.inPlayerId);
              const outPlayer = starters.find((s) => s.id === p.outPlayerId);
              return (
                <div
                  key={`${p.slotId}-locked-${i}`}
                  className="flex items-center gap-2 border border-cyan/30 bg-cyan/5 p-2.5"
                >
                  <CheckCircle2 size={12} className="flex-shrink-0 text-cyan" />
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
          </div>
        </div>
      )}
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
