"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { type PlayerCardData } from "./player-card";
import { SlideToLock } from "./slide-to-lock";
import { tcgCardImage } from "../_lib/api";
import { CardAvatar, CardAvatarFallback } from "./card-avatar";
import { cn } from "../_lib/utils";

export interface SubstitutionPrediction {
  slotId: string;
  position: string;
  outPlayerId: number;
  inPlayerId: number;
  side: 1 | 2;
}

interface ConfirmSubsModalProps {
  open: boolean;
  onClose: () => void;
  predictions: SubstitutionPrediction[];
  starters: PlayerCardData[];
  substitutes: PlayerCardData[];
  potentialPts: number;
  locked?: boolean;
  isSubmitting?: boolean;
  avatarMap: Map<number, string>;
  onLock: () => boolean | Promise<boolean>;
}

export function ConfirmSubsModal({
  open,
  onClose,
  predictions,
  starters,
  substitutes,
  potentialPts,
  locked,
  isSubmitting,
  avatarMap,
  onLock,
}: ConfirmSubsModalProps) {
  const [lockedState, setLockedState] = useState(false);
  const [awaitingLock, setAwaitingLock] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  useEffect(() => {
    if (open) {
      setLockedState(false);
      setAwaitingLock(false);
      setSubmitFailed(false);
    }
  }, [open]);

  async function confirmLock() {
    setAwaitingLock(true);
    setSubmitFailed(false);
    try {
      const confirmed = await onLock();
      if (!confirmed) {
        setSubmitFailed(true);
        return false;
      }
      setLockedState(true);
      return true;
    } finally {
      setAwaitingLock(false);
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !lockedState && !awaitingLock) onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, lockedState, awaitingLock, onClose]);

  // Auto-close 1.5s after locked state
  useEffect(() => {
    if (!lockedState) return;
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [lockedState, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => !lockedState && !awaitingLock && onClose()}
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
            className="relative w-full max-w-2xl overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            {!lockedState && !awaitingLock && (
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground z-10"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}

            {lockedState ? (
              <LockedState />
            ) : (
              <div className="flex flex-col px-8 py-8">
                <h2 className="unica-one text-2xl text-foreground">
                  CONFIRM SUBSTITUTIONS
                </h2>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                  {predictions.length} swap{predictions.length !== 1 ? "s" : ""} ·{" "}
                  <span className="text-cyan">{potentialPts} pts</span> potential
                </p>

                {/* Swap cards */}
                <div className="mt-6 flex-1 space-y-4 overflow-y-auto" style={{ maxHeight: "50vh" }}>
                  {predictions.map((p) => {
                    const outPlayer = starters.find((s) => s.id === p.outPlayerId);
                    const inPlayer = substitutes.find((s) => s.id === p.inPlayerId);
                    if (!outPlayer || !inPlayer) return null;
                    return (
                      <div key={p.slotId} className="flex items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-2">
                          <ModalTCGCard player={outPlayer} avatarSrc={avatarMap.get(outPlayer.id) ?? null} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            OUT
                          </span>
                        </div>
                        <ArrowRightLeft size={20} className="flex-shrink-0 text-purple" />
                        <div className="flex flex-col items-center gap-2">
                          <ModalTCGCard player={inPlayer} avatarSrc={avatarMap.get(inPlayer.id) ?? null} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
                            IN
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slide to lock */}
                <div className="mt-6">
                  <SlideToLock
                    onLock={confirmLock}
                    disabled={predictions.length === 0 || locked || isSubmitting || awaitingLock}
                    label={
                      isSubmitting || awaitingLock
                        ? "SUBMITTING…"
                        : "SLIDE TO LOCK"
                    }
                  />
                  {submitFailed && (
                    <p className="mt-3 text-center text-xs font-bold uppercase tracking-wider text-rose" role="alert">
                      Not every swap was confirmed. Review the notification and try again.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ===== Modal TCG card (WebP + overlays, larger than bench) =====
function ModalTCGCard({ player, avatarSrc }: { player: PlayerCardData; avatarSrc: string | null }) {
  const cardImage = tcgCardImage(player.position);
  const lastName = player.name.split(" ").pop() ?? player.name;
  const shadow = "drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]";

  return (
    <div className="relative aspect-[2/3] w-28 overflow-hidden sm:w-32">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage}
        alt={player.name}
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {avatarSrc && (
        <CardAvatar src={avatarSrc} alt={player.name} />
      )}
      {!avatarSrc && <CardAvatarFallback name={player.name} />}
      {player.number && (
        <span className={cn("absolute right-[8%] top-[5%] font-display text-lg font-bold leading-none text-white sm:text-xl", shadow)}>
          {player.number}
        </span>
      )}
      <div className="absolute inset-x-[4%] top-[83.5%] bottom-[4%] flex items-center justify-center px-1">
        <span className={cn("truncate text-xs font-bold uppercase tracking-tight text-white sm:text-sm", shadow)}>
          {lastName}
        </span>
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center px-8 py-12 text-center"
    >
      <CheckCircle2 size={48} className="text-cyan" />
      <h2 className="unica-one mt-4 text-2xl text-foreground">LOCKED IN</h2>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">
        Your predictions have been submitted
      </p>
    </motion.div>
  );
}
