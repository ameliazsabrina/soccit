"use client";

import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useState } from "react";

const ACTS = ["ARRIVAL", "THE CALL", "THE XI", "THE TABLE", "KICK-OFF"];

export function StadiumFrame() {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const [act, setAct] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setAct(Math.min(ACTS.length - 1, Math.floor(latest * ACTS.length)));
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] text-foreground" aria-hidden="true">
      <div className="landing-frame-corner landing-frame-corner--tl" />
      <div className="landing-frame-corner landing-frame-corner--tr" />
      <div className="landing-frame-corner landing-frame-corner--bl" />
      <div className="landing-frame-corner landing-frame-corner--br" />

      <div className="absolute left-4 top-4 flex items-center gap-3 sm:left-6 sm:top-6">
        <span className="relative block h-9 w-9 bg-white p-1 shadow-[0_8px_30px_rgba(3,70,148,0.1)] sm:h-10 sm:w-10">
          <Image src="/assets/soccit-logo-black.svg" alt="" fill sizes="40px" className="object-contain p-1.5" />
        </span>
        <div className="hidden sm:block">
          <span className="block font-display text-xs leading-none">SOCCIT</span>
          <span className="mt-1 block font-tech text-[9px] uppercase tracking-[0.22em] text-muted">Match intelligence</span>
        </div>
      </div>

      <div className="absolute right-4 top-4 flex h-9 items-center border border-foreground/15 bg-white/75 px-3 backdrop-blur-md sm:right-6 sm:top-6 sm:h-10 sm:px-4">
        <span className="mr-2 h-1.5 w-1.5 bg-rose shadow-[0_0_0_4px_rgba(237,28,36,0.1)]" />
        <span className="font-tech text-[9px] uppercase tracking-[0.2em] sm:text-[10px]">03 matches live</span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 sm:bottom-6 sm:left-6 sm:right-6">
        <div className="hidden w-36 sm:block">
          <div className="mb-2 flex justify-between font-tech text-[9px] uppercase tracking-[0.18em] text-muted">
            <span>Match day</span><span>0{act + 1}/05</span>
          </div>
          <div className="h-px bg-foreground/15">
            <motion.div className="h-px origin-left bg-cyan" style={{ scaleX: shouldReduceMotion ? scrollYProgress : progress }} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-muted">Act 0{act + 1}</span>
          <span className="font-display text-xs uppercase tracking-[0.06em] sm:text-sm">{ACTS[act]}</span>
          <span className="h-2 w-2 rotate-45 bg-cyan" />
        </div>
      </div>

      <div className="landing-scanlines absolute inset-0 opacity-20" />
    </div>
  );
}
