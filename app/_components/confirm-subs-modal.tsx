"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { PlayerCard, type PlayerCardData } from "./player-card";
import { SlideToLock } from "./slide-to-lock";

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
  potentialPayout: number;
  locked?: boolean;
  isSubmitting?: boolean;
  onLock: () => void;
}

export function ConfirmSubsModal({
  open,
  onClose,
  predictions,
  starters,
  substitutes,
  potentialPayout,
  locked,
  isSubmitting,
  onLock,
}: ConfirmSubsModalProps) {
  const [lockedState, setLockedState] = useState(false);

  useEffect(() => {
    if (open) setLockedState(false);
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !lockedState) onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, lockedState, onClose]);

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
          onClick={() => !lockedState && onClose()}
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
            {!lockedState && (
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
                  <span className="text-cyan">{potentialPayout.toFixed(1)}x</span> potential payout
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
                          <PlayerCard player={outPlayer} compact />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                            OUT
                          </span>
                        </div>
                        <ArrowRightLeft size={20} className="flex-shrink-0 text-purple" />
                        <div className="flex flex-col items-center gap-2">
                          <PlayerCard player={inPlayer} compact />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan">
                            IN · {(inPlayer.multiplier ?? 1).toFixed(1)}x
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slide to lock */}
                <div className="mt-6">
                  <SlideToLock
                    onLock={() => {
                      setLockedState(true);
                      onLock();
                    }}
                    disabled={predictions.length === 0 || locked || isSubmitting}
                    label={
                      isSubmitting
                        ? "SUBMITTING…"
                        : "SLIDE TO LOCK"
                    }
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
