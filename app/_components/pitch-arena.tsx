"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  ArrowRightLeft,
  Crosshair,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { type PlayerCardData } from "./player-card";
import { LiveMatchFeed } from "./live-match-feed";
import { ConfirmSubsModal, type SubstitutionPrediction } from "./confirm-subs-modal";
import { tcgCardImage } from "../_lib/api";
import { assignAvatars } from "../_lib/characters";
import { DEMO_EVENTS, DEMO_LEADERBOARD } from "../_lib/demo-data";
import { CardAvatar, CardAvatarFallback } from "./card-avatar";
import { TeamBadge } from "./team-badge";
import { formatPlayerName } from "../_lib/match-events";
import { cn } from "../_lib/utils";

export type { SubstitutionPrediction } from "./confirm-subs-modal";

export interface ArenaMatchOverview {
  score: { team1: number; team2: number } | null;
  minute: number | null;
  statusLabel: string;
  isLive: boolean;
  isTerminal: boolean;
  teams: Array<{
    side: 1 | 2;
    name: string;
    starters: PlayerCardData[];
    substitutes: PlayerCardData[];
  }>;
}

export interface PitchArenaProps {
  matchPda: string;
  teamName: string;
  formation?: string | null;
  side: 1 | 2;
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
  onLock: (predictions: SubstitutionPrediction[]) => void | Promise<void>;
  locked?: boolean;
  isSubmitting?: boolean;
  lockedPredictions?: SubstitutionPrediction[];
  overview: ArenaMatchOverview;
  className?: string;
}

type SidebarTab = "events" | "prediction" | "rank";
type EventsSubTab = "overview" | "streams";

// 11-slot formation mapped from ARENASUBS.svg coordinates (1920x1080 wireframe).
// Pitch bounding box: x=[98,1093] (w=995), y=[148,597] (h=449).
const FORMATION_SLOTS: Record<string, { gridX: number; gridY: number }> = {
  // Goalkeeper — own goal line (bottom)
  GK: { gridX: 50, gridY: 82 },
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
  // Forwards — highest line (kept below the top edge so tokens don't crop)
  SS: { gridX: 50, gridY: 20 },
  CF: { gridX: 50, gridY: 18 },
  ST: { gridX: 50, gridY: 16 },
  LST: { gridX: 38, gridY: 16 },
  RST: { gridX: 62, gridY: 16 },
  LF: { gridX: 30, gridY: 16 },
  RF: { gridX: 70, gridY: 16 },
};

type PositionGroup = "GK" | "DF" | "MD" | "FW" | "UNKNOWN";
type FormationSlot = { gridX: number; gridY: number };

// Index-based 4-3-3 fallback used when neither gridX/gridY nor a recognizable
// position code is available. Spreads 11 players across a default shape so they
// never stack on a single point.
const INDEX_FALLBACK_SLOTS: { gridX: number; gridY: number }[] = [
  { gridX: 50, gridY: 82 },   // GK
  { gridX: 17, gridY: 70 },   // LB
  { gridX: 35, gridY: 76 },   // LCB
  { gridX: 65, gridY: 76 },   // RCB
  { gridX: 83, gridY: 70 },   // RB
  { gridX: 36, gridY: 42 },   // LCM
  { gridX: 50, gridY: 58 },   // CDM
  { gridX: 64, gridY: 42 },   // RCM
  { gridX: 20, gridY: 32 },   // LW
  { gridX: 50, gridY: 16 },   // ST
  { gridX: 80, gridY: 32 },   // RW
];

function getPositionGroup(player: PlayerCardData): PositionGroup {
  const code = (player.positionCode ?? "").toUpperCase();
  if (code === "GK") return "GK";
  if (["DF", "LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(code)) return "DF";
  if (["MD", "DM", "LDM", "CDM", "RDM", "LM", "LCM", "CM", "RCM", "RM", "LAM", "CAM", "RAM"].includes(code)) return "MD";
  if (["FW", "LW", "LF", "SS", "CF", "ST", "RF", "RW", "LST", "RST"].includes(code)) return "FW";

  switch (player.positionId) {
    case 1:
    case 34:
      return "GK";
    case 2:
    case 35:
      return "DF";
    case 3:
    case 36:
      return "MD";
    case 4:
    case 37:
      return "FW";
  }

  const position = (player.position ?? "").toLowerCase();
  if (position.includes("goal")) return "GK";
  if (position.includes("def") || position.includes("back")) return "DF";
  if (position.includes("mid")) return "MD";
  if (position.includes("for") || position.includes("att") || position.includes("wing") || position.includes("strik")) return "FW";
  return "UNKNOWN";
}

export function getSlot(player: PlayerCardData, index = 0): { gridX: number; gridY: number } {
  if (player.gridX != null && player.gridY != null) {
    return { gridX: player.gridX, gridY: player.gridY };
  }
  const code = (player.positionCode ?? "").toUpperCase();
  return FORMATION_SLOTS[code] ?? INDEX_FALLBACK_SLOTS[index % INDEX_FALLBACK_SLOTS.length];
}

function spreadAcrossLine(count: number, minX: number, maxX: number): number[] {
  if (count <= 1) return [50];
  return Array.from({ length: count }, (_, index) =>
    minX + ((maxX - minX) * index) / (count - 1),
  );
}

function lineSlot(group: PositionGroup, gridX: number): FormationSlot {
  const centerWeight = 1 - Math.min(Math.abs(gridX - 50) / 40, 1);
  switch (group) {
    case "GK":
      return { gridX, gridY: 84 };
    case "DF":
      return { gridX, gridY: 68 + centerWeight * 8 };
    case "MD":
      return { gridX, gridY: 42 + centerWeight * 9 };
    case "FW":
      return { gridX, gridY: 18 + (1 - centerWeight) * 11 };
    default:
      return { gridX, gridY: 50 };
  }
}

export function buildFormationLayout(players: PlayerCardData[]): {
  slots: Map<number, FormationSlot>;
  label: string | null;
  mode: "provided" | "inferred" | "fallback";
} {
  const slots = new Map<number, FormationSlot>();
  const grouped = new Map<PositionGroup, PlayerCardData[]>();

  for (const player of players) {
    const group = getPositionGroup(player);
    grouped.set(group, [...(grouped.get(group) ?? []), player]);
  }

  const goalkeepers = grouped.get("GK")?.length ?? 0;
  const defenders = grouped.get("DF")?.length ?? 0;
  const midfielders = grouped.get("MD")?.length ?? 0;
  const forwards = grouped.get("FW")?.length ?? 0;
  const unknown = grouped.get("UNKNOWN")?.length ?? 0;
  const hasCompleteShape =
    players.length === 11 &&
    goalkeepers === 1 &&
    defenders + midfielders + forwards === 10 &&
    unknown === 0;
  const hasProvidedGrid =
    players.length > 0 &&
    players.every((player) => player.gridX != null && player.gridY != null);

  // An incomplete or unrecognisable lineup must not be presented as a real
  // tactical shape. Keep all tokens usable with the neutral 4-3-3 fallback.
  if (!hasProvidedGrid && !hasCompleteShape) {
    players.forEach((player, index) => {
      slots.set(
        player.id,
        INDEX_FALLBACK_SLOTS[index % INDEX_FALLBACK_SLOTS.length],
      );
    });
    return { slots, label: null, mode: "fallback" };
  }

  for (const [group, groupPlayers] of grouped) {
    const ordered = [...groupPlayers].sort((a, b) => {
      const aNumber = Number.parseInt(a.number ?? "", 10);
      const bNumber = Number.parseInt(b.number ?? "", 10);
      if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) {
        return aNumber - bNumber;
      }
      return a.id - b.id;
    });

    const hasExactGrid = ordered.every(
      (player) => player.gridX != null && player.gridY != null,
    );
    if (hasExactGrid) {
      for (const player of ordered) slots.set(player.id, getSlot(player));
      continue;
    }

    const codes = ordered.map((player) => (player.positionCode ?? "").toUpperCase());
    const hasUniqueDetailedCodes = codes.every(
      (code, index) =>
        Boolean(FORMATION_SLOTS[code]) &&
        !["DF", "MD", "FW"].includes(code) &&
        codes.indexOf(code) === index,
    );
    if (hasUniqueDetailedCodes) {
      for (const player of ordered) slots.set(player.id, getSlot(player));
      continue;
    }

    const range = group === "GK"
      ? [50, 50]
      : group === "DF"
        ? [14, 86]
        : group === "MD"
          ? [12, 88]
          : group === "FW"
            ? [20, 80]
            : [20, 80];
    const xPositions = spreadAcrossLine(ordered.length, range[0], range[1]);
    ordered.forEach((player, index) => {
      slots.set(player.id, lineSlot(group, xPositions[index]));
    });
  }

  const label = hasCompleteShape
    ? [defenders, midfielders, forwards].join("-")
    : null;

  return {
    slots,
    label,
    mode: hasProvidedGrid ? "provided" : "inferred",
  };
}

export function PitchArena({
  matchPda,
  teamName,
  formation,
  side,
  starters,
  substitutes,
  onLock,
  locked,
  isSubmitting = false,
  lockedPredictions = [],
  overview,
  className,
}: PitchArenaProps) {
  const [predictions, setPredictions] = useState<Record<string, SubstitutionPrediction>>({});
  const [dragOverPlayer, setDragOverPlayer] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<PlayerCardData | null>(null);
  const [showSubDetail, setShowSubDetail] = useState<PlayerCardData | null>(null);
  const [justPlaced, setJustPlaced] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLockedWarning, setShowLockedWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("events");
  const [eventsSubTab, setEventsSubTab] = useState<EventsSubTab>("overview");

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
      if (lockedIds.has(starterPlayer.id) || lockedIds.has(sub.id)) {
        setShowLockedWarning(true);
        return;
      }
      assignSubToStarter(starterPlayer, sub);
    } catch {
      // ignore
    }
  }

  function assignSubToStarter(starter: PlayerCardData, sub: PlayerCardData) {
    if (lockedIds.has(starter.id) || lockedIds.has(sub.id)) {
      setShowLockedWarning(true);
      return;
    }
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
    if (lockedIds.has(player.id)) {
      setShowLockedWarning(true);
      return;
    }
    setSelectedSub((prev) => (prev?.id === player.id ? null : player));
  }

  function handleBenchDetails(player: PlayerCardData) {
    setShowSubDetail(player);
  }

  function handleStarterClick(starter: PlayerCardData) {
    if (lockedIds.has(starter.id)) {
      setShowLockedWarning(true);
      return;
    }
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
    setPredictions({});
    setSelectedSub(null);
  }

  function cancelDraftPredictions() {
    setShowConfirmModal(false);
    if (locked || isSubmitting) return;
    setPredictions({});
    setSelectedSub(null);
    setJustPlaced(null);
  }

  const predictionList = Object.values(predictions);
  // Pts system: each prediction can score 3 pts max (both correct).
  const potentialPts = predictionList.length * 3;

  const bench = substitutes;

  const lockedIds = new Set(lockedPredictions?.flatMap((p) => [p.outPlayerId, p.inPlayerId]) ?? []);

  // Assign character avatars based on position + priority (starters first)
  const avatarMap = useMemo(
    () => assignAvatars([...starters, ...substitutes], side === 2 ? 3 : 0),
    [starters, substitutes, side],
  );
  const formationLayout = useMemo(() => buildFormationLayout(starters), [starters]);
  const providedFormation = formation?.trim() || null;
  const formationSummary = providedFormation
    ? `Starting formation · ${providedFormation}`
    : formationLayout.label
      ? `Inferred lineup shape · ${formationLayout.label}`
      : "Default lineup layout";
  const formationSource = providedFormation
    ? "Lineup formation"
    : formationLayout.mode === "fallback"
      ? "TXLINE positions unavailable"
      : "TXLINE starting XI";
  const formationExplanation = providedFormation
    ? "Starting formation supplied with the lineup data."
    : formationLayout.label
      ? "Shape inferred from TXLINE starter counts by broad position group. It is not an official tactical formation."
      : "TXLINE did not provide enough recognised starter positions, so players use a neutral display layout.";

  return (
    <div className={cn("grid min-h-0 flex-none grid-cols-1 gap-6 lg:h-full lg:flex-1 lg:grid-rows-1 lg:grid-cols-[1fr_40%]", className)}>
      {/* ===== LEFT COLUMN: PitchCard + BenchCard ===== */}
      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        {/* PitchCard */}
        <div className="relative flex h-[300px] flex-shrink-0 flex-col overflow-hidden bg-purple/10 sm:h-[380px] lg:h-[440px]">
          {/* Pitch surface — fills the card body top-to-bottom. */}
          <div className="relative flex flex-1 items-center justify-center overflow-auto">
            <div className="relative h-full w-full min-w-[560px]">
              {/* Field WebP — trapezoid baked in, fills edge-to-edge */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/field.webp"
                alt="Pitch"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-fill"
              />

              {/* Player tokens */}
              <div className="absolute inset-0" onDragOver={(e) => e.preventDefault()}>
                {starters.map((starter, idx) => {
                  const predicted = predictions[starter.id];
                  const sub = predicted
                    ? substitutes.find((s) => s.id === predicted.inPlayerId)
                    : null;
                  const isDragOver = dragOverPlayer === starter.id;
                  const flashed = justPlaced === starter.id;
                  const slot = formationLayout.slots.get(starter.id) ?? getSlot(starter, idx);
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
                        avatarSrc={avatarMap.get(starter.id) ?? null}
                        subAvatarSrc={sub ? avatarMap.get(sub.id) ?? null : null}
                        isDragOver={isDragOver}
                        flashed={flashed}
                        onClear={() => clearPrediction(starter.id)}
                        isLocked={lockedIds.has(starter.id) || (sub ? lockedIds.has(sub.id) : false)}
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
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              {side === 1 ? "Home" : "Away"} · {formationSummary}
            </p>
            <span
              className="w-fit border border-purple/30 bg-purple/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple"
              title={formationExplanation}
            >
              {formationSource}
            </span>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Crosshair size={12} className="text-purple" />
              {selectedSub
                ? `Tap a player to swap in ${selectedSub.name.split(" ").pop()}`
                : "Drag a sub onto a player"}
            </div>
          </div>
        </div>

        {/* Bench — label + scrollable TCG cards, no card box */}
        <div className="flex min-w-0 flex-shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-3 overflow-x-auto py-1.5 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
                  avatarSrc={avatarMap.get(sub.id) ?? null}
                  draggable
                  onDragStart={handleDragStart}
                  isLocked={lockedIds.has(sub.id)}
                />
              </div>
            ))}
            {bench.length === 0 && (
              <p className="py-4 text-xs text-muted">No substitutes available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN: SidebarCard ===== */}
      <div className="flex h-[70svh] min-h-0 max-h-[640px] flex-col overflow-hidden bg-surface lg:h-full lg:max-h-none">
        {/* Tab header */}
        <div className="flex h-14 flex-shrink-0 items-center border-b border-surface-elevated">
          {[
            { key: "events" as const, label: "Events" },
            { key: "prediction" as const, label: "Prediction" },
            { key: "rank" as const, label: "Rank" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center px-3 py-4 text-[10px] font-bold uppercase tracking-wider transition-all",
                activeTab === tab.key
                  ? "border-b-2 border-purple bg-background text-foreground"
                  : "border-b-2 border-transparent text-muted hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.key === "prediction" && lockedPredictions.length > 0 && (
                <span className="ml-1.5 flex h-4 w-4 items-center justify-center bg-purple text-[8px] text-white">
                  {lockedPredictions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "events" && (
            <div className="flex h-full min-h-0 flex-col">
              {/* Sub-tabs */}
              <div className="flex flex-shrink-0 border-b border-surface-elevated">
                {(["overview", "streams"] as EventsSubTab[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setEventsSubTab(st)}
                    className={cn(
                      "flex-1 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors",
                      eventsSubTab === st
                        ? "bg-background text-foreground"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {eventsSubTab === "overview" ? (
                <OverviewTab overview={overview} />
              ) : (
                <LiveMatchFeed
                  pda={matchPda}
                  isDemo={matchPda === "demo"}
                  view="events"
                  className="min-h-0 flex-1"
                  showViewLogsLink
                  demoEvents={matchPda === "demo" ? DEMO_EVENTS : []}
                  demoLeaderboard={matchPda === "demo" ? DEMO_LEADERBOARD : null}
                  homeTeamName={overview.teams.find((team) => team.side === 1)?.name}
                  awayTeamName={overview.teams.find((team) => team.side === 2)?.name}
                  players={overview.teams.flatMap((team) =>
                    [...team.starters, ...team.substitutes].map((player) => ({
                      id: player.id,
                      name: player.name,
                      side: team.side,
                    })),
                  )}
                  isTerminal={overview.isTerminal}
                />
              )}
            </div>
          )}
          {activeTab === "prediction" && (
            <PredictionTab
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
              className="h-full min-h-0 flex-1"
              demoLeaderboard={matchPda === "demo" ? DEMO_LEADERBOARD : null}
            />
          )}
        </div>
      </div>

      {/* Confirm Substitutions Modal */}
      <ConfirmSubsModal
        open={showConfirmModal}
        onClose={cancelDraftPredictions}
        predictions={predictionList}
        starters={starters}
        substitutes={substitutes}
        potentialPts={potentialPts}
        locked={locked}
        isSubmitting={isSubmitting}
        avatarMap={avatarMap}
        onLock={handleLock}
      />

      <LockedWarningModal
        open={showLockedWarning}
        onClose={() => setShowLockedWarning(false)}
      />

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

// ===== Player Token (on pitch) — mini TCG WebP =====
function PlayerToken({
  player,
  sub,
  avatarSrc,
  subAvatarSrc,
  isDragOver,
  flashed,
  onClear,
  isLocked,
}: {
  player: PlayerCardData;
  sub?: PlayerCardData | null;
  avatarSrc: string | null;
  subAvatarSrc: string | null;
  isDragOver: boolean;
  flashed: boolean;
  onClear: () => void;
  isLocked: boolean;
}) {
  const displayPlayer = sub ?? player;
  const cardImage = tcgCardImage(displayPlayer.position);
  const lastName = displayPlayer.name.split(" ").pop() ?? displayPlayer.name;
  const shadow = "drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]";
  const displayAvatar = sub ? subAvatarSrc : avatarSrc;

  if (sub) {
    return (
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("relative aspect-[2/3] w-12 transition-transform hover:scale-110 sm:w-14", flashed && "animate-slot-flash", isLocked && "grayscale opacity-70 hover:scale-100")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImage}
          alt={displayPlayer.name}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {displayAvatar && (
          <CardAvatar src={displayAvatar} alt={displayPlayer.name} />
        )}
        {!displayAvatar && <CardAvatarFallback name={displayPlayer.name} />}
        {isLocked && (
          <span className="absolute bottom-1 right-1 flex h-3 w-3 items-center justify-center bg-foreground text-white">
            <Lock size={8} />
          </span>
        )}
        {displayPlayer.number && (
          <span className={cn("absolute right-[6%] top-[3%] font-display text-[10px] font-bold leading-none text-white sm:text-xs", shadow)}>
            {displayPlayer.number}
          </span>
        )}
        {/* Name bar */}
        <div className="absolute inset-x-[4%] top-[83.5%] bottom-[4%] flex items-center justify-center px-0.5">
          <span className={cn("truncate text-[6px] font-bold uppercase tracking-tight text-white sm:text-[8px]", shadow)}>
            {lastName}
          </span>
        </div>
        {!isLocked && (
          <>
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-cyan text-[9px] font-bold text-background">
              {getMultiplier(sub).toFixed(1)}x
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-rose text-white shadow-lg transition-transform hover:scale-110"
              aria-label="Clear prediction"
            >
              <X size={12} />
            </button>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-12 cursor-pointer transition-all hover:scale-110 sm:w-14",
        isDragOver && "scale-110 ring-2 ring-cyan ring-offset-2 ring-offset-pitch-turf",
        isLocked && "grayscale opacity-70 hover:scale-100",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage}
        alt={displayPlayer.name}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {avatarSrc && (
        <CardAvatar src={avatarSrc} alt={displayPlayer.name} />
      )}
      {!avatarSrc && <CardAvatarFallback name={displayPlayer.name} />}
      {displayPlayer.number && (
        <span className={cn("absolute right-[6%] top-[3%] font-display text-[10px] font-bold leading-none text-white sm:text-xs", shadow)}>
          {displayPlayer.number}
        </span>
      )}
      {/* Name bar */}
      <div className="absolute inset-x-[4%] top-[83.5%] bottom-[4%] flex items-center justify-center px-0.5">
        <span className={cn("truncate text-[6px] font-bold uppercase tracking-tight text-white sm:text-[8px]", shadow)}>
          {lastName}
        </span>
      </div>
    </div>
  );
}

// ===== Bench Card (TCG WebP + text overlay) =====
// Card layout (from pixel analysis of the WebPs, all 4 positions identical):
//   - Top-left:  position code (baked into the WebP, no overlay needed)
//   - Top-right: player number slot (dark area ~75-95% W, ~4-12% H)
//   - Center:    player picture area (~20-78% H, currently empty)
//   - Bottom:    name bar (bright band at 82.4%-97.1% H, full width)
function BenchCard({
  player,
  avatarSrc,
  draggable,
  onDragStart,
  isLocked,
}: {
  player: PlayerCardData;
  avatarSrc: string | null;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, player: PlayerCardData) => void;
  isLocked?: boolean;
}) {
  const cardImage = tcgCardImage(player.position);
  const lastName = player.name.split(" ").pop() ?? player.name;
  const textShadow = "drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]";

  return (
    <div
      draggable={draggable && !isLocked}
      onDragStart={(e) => onDragStart?.(e, player)}
      className={cn("relative h-full w-full overflow-hidden", isLocked && "grayscale opacity-70")}
    >
      {/* TCG card WebP — fills the container 1:1 (2:3 matches 1023×1537) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage}
        alt={player.name}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Character avatar — center picture area */}
      {avatarSrc && (
        <CardAvatar src={avatarSrc} alt={player.name} />
      )}
      {!avatarSrc && <CardAvatarFallback name={player.name} />}

      {/* Player number — top-right slot */}
      {player.number && (
        <span
          className={cn(
            "absolute right-[8%] top-[5%] font-display text-base font-bold leading-none text-white sm:text-lg",
            textShadow,
          )}
        >
          {player.number}
        </span>
      )}

      {/* Name bar (bottom 82.5%-97%) — centered name only */}
      <div className="absolute inset-x-[4%] top-[83.5%] bottom-[4%] flex items-center justify-center px-1">
        <span
          className={cn(
            "truncate text-[11px] font-bold uppercase tracking-tight text-white sm:text-sm",
            textShadow,
          )}
        >
          {lastName}
        </span>
      </div>

      {isLocked && (
        <div className="absolute right-1 bottom-1 flex h-4 w-4 items-center justify-center bg-foreground text-white">
          <Lock size={10} />
        </div>
      )}
    </div>
  );
}

// ===== Overview Tab (scoreboard + lineups text list) =====
function OverviewTab({ overview }: { overview: ArenaMatchOverview }) {
  const home = overview.teams.find((team) => team.side === 1);
  const away = overview.teams.find((team) => team.side === 2);
  const score = overview.score;
  const statusText = overview.isLive && overview.minute != null
    ? `${overview.statusLabel} · ${overview.minute}'`
    : overview.statusLabel;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="sticky top-0 z-10 border-b border-surface-elevated bg-surface p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreboardTeam team={home} align="left" />
          <div className="text-center">
            <p className="font-mono text-3xl font-black tabular-nums text-foreground">
              {score ? `${score.team1}–${score.team2}` : "VS"}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex border px-2 py-1 text-xs font-bold uppercase tracking-wider",
                overview.isLive
                  ? "border-rose/40 bg-rose/10 text-rose"
                  : overview.isTerminal
                    ? "border-cyan/30 bg-cyan/5 text-cyan"
                    : "border-surface-elevated bg-background text-muted",
              )}
            >
              {statusText}
            </span>
          </div>
          <ScoreboardTeam team={away} align="right" />
        </div>
      </div>

      <div className="space-y-5 p-3">
        {overview.teams.map((team) => (
          <LineupTeam key={team.side} team={team} />
        ))}
      </div>
    </div>
  );
}

function ScoreboardTeam({
  team,
  align,
}: {
  team: ArenaMatchOverview["teams"][number] | undefined;
  align: "left" | "right";
}) {
  const name = team?.name ?? (align === "left" ? "Home" : "Away");
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", align === "right" && "items-end text-right")}>
      <TeamBadge name={name} size="lg" />
      <p className="line-clamp-2 text-xs font-bold uppercase leading-tight text-foreground">
        {name}
      </p>
    </div>
  );
}

function LineupTeam({ team }: { team: ArenaMatchOverview["teams"][number] }) {
  return (
    <section aria-labelledby={`lineup-team-${team.side}`}>
      <div className="mb-2 flex items-center gap-2 border-b border-surface-elevated pb-2">
        <TeamBadge name={team.name} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 id={`lineup-team-${team.side}`} className="truncate text-sm font-bold text-foreground">
            {team.name}
          </h3>
          <p className="text-xs uppercase tracking-wider text-muted">
            {team.side === 1 ? "Home" : "Away"} · {team.starters.length + team.substitutes.length} players
          </p>
        </div>
      </div>
      <LineupGroup label="Starting XI" players={team.starters} />
      <LineupGroup label="Bench" players={team.substitutes} className="mt-3" />
    </section>
  );
}

function LineupGroup({
  label,
  players,
  className,
}: {
  label: string;
  players: PlayerCardData[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">{label}</h4>
        <span className="font-mono text-xs text-muted">{players.length}</span>
      </div>
      {players.length === 0 ? (
        <p className="border border-dashed border-surface-elevated px-3 py-2 text-xs text-muted">
          No players provided.
        </p>
      ) : (
        <div className="space-y-1">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex min-h-9 items-center gap-2 border border-transparent bg-background/60 px-2 py-1.5"
            >
              <span className="flex h-6 w-7 flex-shrink-0 items-center justify-center bg-surface-elevated font-mono text-xs font-bold text-foreground">
                {player.number ?? "–"}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                {formatPlayerName(player.name)}
              </span>
              <span className="text-xs font-bold uppercase text-muted">
                {player.positionCode ?? player.position?.slice(0, 3).toUpperCase() ?? "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Prediction Tab =====
function PredictionTab({
  lockedPredictions,
  starters,
  substitutes,
}: {
  lockedPredictions: SubstitutionPrediction[];
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
}) {
  const hasLocked = lockedPredictions.length > 0;

  if (!hasLocked) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Crosshair size={32} className="mb-3 text-muted/40" />
        <p className="text-sm text-muted">No locked substitutions yet.</p>
        <p className="mt-1 text-xs text-muted/60">
          Drag a bench card onto a player on the pitch to make a substitution.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      {/* Locked section */}
      {hasLocked && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Lock size={10} className="text-cyan" />
            <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted">Locked</h4>
          </div>
          <div className="space-y-1.5">
            {lockedPredictions.map((p, i) => {
              const sub = substitutes.find((s) => s.id === p.inPlayerId);
              const outPlayer = starters.find((s) => s.id === p.outPlayerId);
              return (
                <div key={`${p.slotId}-locked-${i}`} className="flex items-center gap-2 border border-cyan/30 bg-cyan/5 p-2">
                  <CheckCircle2 size={10} className="flex-shrink-0 text-cyan" />
                  <span className="truncate text-[10px] font-bold text-muted">
                    {outPlayer?.name.split(" ").pop() ?? "Player"}
                  </span>
                  <ArrowRightLeft size={10} className="flex-shrink-0 text-muted" />
                  <span className="truncate text-[10px] font-bold text-foreground">
                    {sub?.name.split(" ").pop() ?? "Sub"}
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

// ===== Locked Warning Modal (connect-wallet style) =====
function LockedWarningModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-foreground/60" />
          <motion.div
            layout
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center bg-surface text-foreground">
                <Lock size={24} />
              </div>
              <h2 className="font-display text-xl text-foreground">Prediction Locked</h2>
              <p className="text-sm text-muted">
                This prediction has been locked on-chain and can no longer be changed.
              </p>
              <button
                onClick={onClose}
                className="mt-2 flex h-10 items-center px-8 font-display text-sm uppercase tracking-[0.1em] text-white bg-foreground transition-colors hover:bg-foreground/90"
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
