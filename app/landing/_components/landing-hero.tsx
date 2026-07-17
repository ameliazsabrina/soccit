"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useLandingExperience } from "./landing-experience";

const HERO_PARALLAX_BACKGROUND = "/assets/hero/bg.webp";
const HERO_PARALLAX_MIDGROUND = "/assets/hero/mid.webp";
const HERO_PARALLAX_FOREGROUND = "/assets/hero/fg.webp";

export function LandingHero() {
  const { phase, enterContent } = useLandingExperience();
  const [leaving, setLeaving] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 105, damping: 26, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 105, damping: 26, mass: 0.5 });

  const backdropX = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);
  const backdropY = useTransform(smoothY, [-0.5, 0.5], [-6, 6]);
  const midgroundX = useTransform(smoothX, [-0.5, 0.5], [10, -10]);
  const midgroundY = useTransform(smoothY, [-0.5, 0.5], [7, -7]);
  const foregroundX = useTransform(smoothX, [-0.5, 0.5], [15, -15]);
  const foregroundY = useTransform(smoothY, [-0.5, 0.5], [10, -10]);
  const ctaX = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);
  const ctaY = useTransform(smoothY, [-0.5, 0.5], [-3, 3]);

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function resetParallax() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const continueToHowItWorks = useCallback(() => {
    if (phase !== "hero" || leaving) return;
    if (shouldReduceMotion) {
      enterContent();
      return;
    }
    setLeaving(true);
  }, [enterContent, leaving, phase, shouldReduceMotion]);

  useEffect(() => {
    const handleEntryRequest = () => continueToHowItWorks();
    window.addEventListener("soccit:request-enter-content", handleEntryRequest);
    return () => window.removeEventListener("soccit:request-enter-content", handleEntryRequest);
  }, [continueToHowItWorks]);

  useEffect(() => {
    if (phase !== "content" || !leaving) return;
    const timer = window.setTimeout(() => setLeaving(false), shouldReduceMotion ? 0 : 950);
    return () => window.clearTimeout(timer);
  }, [leaving, phase, shouldReduceMotion]);

  return (
    <section
      id="landing-hero"
      className="landing-hero-stage relative min-h-[100svh] w-full overflow-hidden bg-purple text-white"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetParallax}
    >
      <motion.div
        className="pointer-events-none absolute -inset-5 z-0"
        style={shouldReduceMotion ? undefined : { x: backdropX, y: backdropY }}
      >
        <Image
          src={HERO_PARALLAX_BACKGROUND}
          alt=""
          fill
          preload
          sizes="100vw"
          className="scale-[1.04] object-cover object-center"
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute -inset-5 z-[1]"
        style={shouldReduceMotion ? undefined : { x: midgroundX, y: midgroundY }}
      >
        <Image
          src={HERO_PARALLAX_MIDGROUND}
          alt=""
          fill
          preload
          sizes="100vw"
          className="scale-[1.04] object-cover object-center"
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute -inset-5 z-10"
        style={shouldReduceMotion ? undefined : { x: foregroundX, y: foregroundY }}
      >
        <Image
          src={HERO_PARALLAX_FOREGROUND}
          alt=""
          fill
          preload
          sizes="100vw"
          className="scale-[1.04] object-cover object-center"
        />
      </motion.div>

      <div className="landing-hero-vignette pointer-events-none absolute inset-0 z-20" />

      {phase === "hero" && (
        <>
          <button
            type="button"
            aria-label="Press anywhere to start"
            onClick={continueToHowItWorks}
            disabled={leaving}
            className="absolute inset-0 z-30 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-cyan disabled:cursor-wait"
          />
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : 0.25 }}
              style={shouldReduceMotion ? undefined : { x: ctaX, y: ctaY }}
              className="flex flex-col items-center"
            >
              <div className="relative h-24 w-40 sm:h-32 sm:w-52">
                <Image src="/assets/soccit-logo.svg" alt="" fill sizes="(max-width: 640px) 160px, 208px" className="object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.32)]" />
              </div>
              <span className="mt-5 whitespace-nowrap font-[family-name:var(--font-mona-sans)] text-xs font-extrabold uppercase tracking-[0.22em] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)] sm:text-sm">
                Press anywhere to start
              </span>
            </motion.div>
          </div>
        </>
      )}

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-50 origin-bottom bg-background"
        initial={false}
        animate={{ scaleY: leaving ? 1 : 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.62, ease: [0.65, 0.05, 0, 1] }}
        onAnimationComplete={() => {
          if (leaving) enterContent();
        }}
      />
    </section>
  );
}
