"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface TeamPickerModalProps {
  team1: string;
  team2: string;
  onSelect: (side: 1 | 2) => void;
  onClose: () => void;
}

export function TeamPickerModal({ team1, team2, onSelect, onClose }: TeamPickerModalProps) {
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
        className="relative z-10 w-full max-w-2xl border border-surface bg-surface/95 p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">
          Substitute Prediction
        </p>
        <h2 className="mb-8 font-display text-3xl text-foreground">Pick Your Side</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <button
            onClick={() => onSelect(1)}
            className="group relative flex flex-col items-center gap-4 border border-surface bg-background p-8 transition-all hover:border-purple hover:shadow-[0_0_30px_rgba(3,70,148,0.35)] focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center bg-purple/10 text-2xl font-bold text-purple transition-colors group-hover:bg-purple group-hover:text-white">
              {team1.slice(0, 2)}
            </div>
            <span className="font-display text-xl text-foreground">{team1}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple opacity-0 transition-opacity group-hover:opacity-100">
              Select Team A
            </span>
          </button>

          <button
            onClick={() => onSelect(2)}
            className="group relative flex flex-col items-center gap-4 border border-surface bg-background p-8 transition-all hover:border-cyan hover:shadow-[0_0_30px_rgba(219,161,17,0.35)] focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center bg-cyan/10 text-2xl font-bold text-cyan transition-colors group-hover:bg-cyan group-hover:text-white">
              {team2.slice(0, 2)}
            </div>
            <span className="font-display text-xl text-foreground">{team2}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan opacity-0 transition-opacity group-hover:opacity-100">
              Select Team B
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
