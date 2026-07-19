"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Lock } from "lucide-react";

interface SlideToLockProps {
  onLock: () => void | boolean | Promise<void | boolean>;
  disabled?: boolean;
  label?: string;
}

export function SlideToLock({ onLock, disabled, label = "SLIDE TO LOCK" }: SlideToLockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [max, setMax] = useState(0);
  const x = useMotionValue(0);

  const progress = useTransform(x, [0, Math.max(max, 1)], [0, 1]);
  const bg = useTransform(
    progress,
    [0, 1],
    ["rgba(3, 70, 148, 0)", "rgba(3, 70, 148, 1)"]
  );

  const measure = useCallback(() => {
    const width = containerRef.current?.offsetWidth ?? 0;
    const thumbWidth = 56;
    setMax(Math.max(0, width - thumbWidth - 8));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const unsubscribe = progress.on("change", (v) => {
      if (v >= 0.95 && !unlocked && !disabled && !isConfirming) {
        setUnlocked(true);
        setIsConfirming(true);
        animate(x, max, { duration: 0.2 });
        Promise.resolve(onLock())
          .then((confirmed) => {
            if (confirmed === false) {
              setUnlocked(false);
              animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
            }
          })
          .catch(() => {
            setUnlocked(false);
            animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
          })
          .finally(() => setIsConfirming(false));
      }
    });
    return () => unsubscribe();
  }, [progress, unlocked, disabled, isConfirming, x, max, onLock]);

  function handleDragEnd() {
    setIsDragging(false);
    if (!unlocked) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-16 w-full overflow-hidden border border-surface bg-surface/50"
    >
      <motion.div
        className="absolute inset-y-1 left-1 right-1"
        style={{ backgroundColor: bg }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className={`font-display text-sm uppercase tracking-[0.2em] ${unlocked ? "text-white" : "text-muted"}`}>
          {isConfirming ? "CONFIRMING…" : unlocked ? "LOCKED" : label}
        </span>
      </div>
      <motion.button
        drag="x"
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        disabled={disabled || unlocked || isConfirming}
        className={`absolute left-1 top-1 flex h-14 w-14 items-center justify-center transition-colors ${
          unlocked
            ? "bg-cyan text-white"
            : isDragging
            ? "bg-purple text-white"
            : "bg-background text-foreground hover:bg-purple hover:text-white"
        }`}
        aria-label="Slide to lock prediction"
      >
        <Lock size={22} />
      </motion.button>
    </div>
  );
}
