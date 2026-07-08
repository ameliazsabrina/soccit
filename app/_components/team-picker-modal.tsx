"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import { TeamBadge } from "./team-badge";
import { SlideToLock } from "./slide-to-lock";

interface TeamPickerModalProps {
  team1: string;
  team2: string;
  onSelect: (side: 1 | 2) => void;
  onClose: () => void;
}

export function TeamPickerModal({ team1, team2, onSelect, onClose }: TeamPickerModalProps) {
  const [pickedSide, setPickedSide] = useState<1 | 2 | null>(null);

  const pickedName = pickedSide === 1 ? team1 : pickedSide === 2 ? team2 : null;

  function handleSlideLock() {
    if (pickedSide) {
      onSelect(pickedSide);
    }
  }

  function resetPick() {
    setPickedSide(null);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          className="absolute inset-0 bg-foreground/60"
        />
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
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {pickedSide === null ? (
            <>
              <p className="mb-2 px-8 pt-8 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Substitute Prediction
              </p>
              <h2 className="mb-8 px-8 font-display text-3xl text-foreground">Pick Your Side</h2>

              <div className="grid grid-cols-1 gap-6 px-8 pb-8 md:grid-cols-2">
                <button
                  onClick={() => setPickedSide(1)}
                  className="group relative flex flex-col items-center gap-4 border border-surface bg-surface p-8 transition-all hover:border-purple hover:shadow-[0_0_30px_rgba(3,70,148,0.35)] focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
                >
                  <TeamBadge name={team1} size="lg" className="h-16 w-16" />
                  <span className="font-display text-xl text-foreground">{team1}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple opacity-0 transition-opacity group-hover:opacity-100">
                    Select Team A
                  </span>
                </button>

                <button
                  onClick={() => setPickedSide(2)}
                  className="group relative flex flex-col items-center gap-4 border border-surface bg-surface p-8 transition-all hover:border-cyan hover:shadow-[0_0_30px_rgba(219,161,17,0.35)] focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
                >
                  <TeamBadge name={team2} size="lg" className="h-16 w-16" />
                  <span className="font-display text-xl text-foreground">{team2}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                    Select Team B
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-8 pt-8">
                <button
                  onClick={resetPick}
                  className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  Confirm Selection
                </p>
                <h2 className="mb-6 font-display text-3xl text-foreground">Lock In {pickedName}</h2>
              </div>

              <div className="flex flex-col items-center gap-6 px-8 pb-8">
                <TeamBadge name={pickedName!} size="xl" />
                <span className="font-display text-xl text-foreground">{pickedName}</span>
                <p className="max-w-xs text-center text-sm text-muted">
                  Slide to confirm your team selection and enter the pitch.
                </p>
                <div className="w-full">
                  <SlideToLock
                    onLock={handleSlideLock}
                    label="SLIDE TO ENTER"
                  />
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
