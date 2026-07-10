"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("soccit-landing-seen");
    if (!hasSeen) {
      setIsLoading(true);
      sessionStorage.setItem("soccit-landing-seen", "true");
    }
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          onAnimationComplete={() => setIsLoading(false)}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            >
              <Image
                src="/assets/soccit-logo.svg"
                alt="Soccit"
                width={80}
                height={80}
                className="h-16 w-16 invert dark:invert-0"
              />
            </motion.div>
            <div className="relative h-[2px] w-48 overflow-hidden bg-surface">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple to-cyan"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: shouldReduceMotion ? 0 : 1.2, ease: [0.45, 0, 0.55, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
