"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface LockCelebrationProps {
  title?: string;
  subtitle?: string;
  open: boolean;
  onDone: () => void;
}

export function LockCelebration({ title = "LOCKED IN", subtitle, open, onDone }: LockCelebrationProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm"
        >
          <div className="celebration-burst absolute inset-0 pointer-events-none" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative z-10 text-center"
          >
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center bg-cyan text-background shadow-[0_0_40px_rgba(219,161,17,0.5)]">
              <Sparkles size={40} />
            </div>
            <h2 className="font-display text-4xl text-foreground md:text-6xl">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm font-bold uppercase tracking-wider text-muted">{subtitle}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
