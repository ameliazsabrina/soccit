"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { gsap, SplitText, useGSAP } from "./gsap-setup";

export function LandingHero() {
  const container = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Cursor-reactive player tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 120,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 120,
    damping: 20,
  });

  function handleMouseMove(e: React.MouseEvent) {
    if (shouldReduceMotion || !playerRef.current) return;
    const rect = playerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // Magnetic CTA
  const ctaMouseX = useMotionValue(0);
  const ctaMouseY = useMotionValue(0);
  const ctaX = useSpring(ctaMouseX, { stiffness: 150, damping: 15 });
  const ctaY = useSpring(ctaMouseY, { stiffness: 150, damping: 15 });

  function handleCtaMove(e: React.MouseEvent) {
    if (shouldReduceMotion || !ctaRef.current) return;
    const rect = ctaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ctaMouseX.set(x * 0.15);
    ctaMouseY.set(y * 0.15);
  }

  function handleCtaLeave() {
    ctaMouseX.set(0);
    ctaMouseY.set(0);
  }

  useGSAP(
    () => {
      if (shouldReduceMotion) {
        gsap.set("[data-hero-animate]", { autoAlpha: 1, y: 0, yPercent: 0, scale: 1, rotationX: 0 });
        if (scoreRef.current) scoreRef.current.textContent = "2 — 1";
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      const split = SplitText.create(headlineRef.current, {
        type: "words",
        mask: "words",
        autoSplit: true,
        onSplit(self) {
          tl.from(
            self.words,
            {
              yPercent: 110,
              rotationX: 45,
              autoAlpha: 0,
              duration: 0.8,
              stagger: 0.08,
              transformOrigin: "bottom",
              ease: "power3.out",
            },
            0
          );
        },
      });

      tl.from("[data-hero-eyebrow]", { y: 20, autoAlpha: 0, duration: 0.6 }, 0.2);
      tl.from("[data-hero-subhead]", { y: 20, autoAlpha: 0, duration: 0.6 }, 0.4);
      tl.from("[data-hero-cta]", { y: 30, autoAlpha: 0, duration: 0.6 }, 0.55);
      tl.from(
        "[data-hero-flag]",
        { scale: 0, autoAlpha: 0, duration: 0.5, stagger: 0.15, ease: "back.out(1.7)" },
        0.6
      );

      // Score count-up with 3D reveal
      const scoreObj = { home: 0, away: 0 };
      tl.fromTo(
        "[data-hero-score]",
        { rotationY: -15, autoAlpha: 0 },
        { rotationY: 0, autoAlpha: 1, duration: 1, ease: "power2.out" },
        0.7
      );
      tl.to(
        scoreObj,
        {
          home: 2,
          away: 1,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => {
            if (scoreRef.current) {
              scoreRef.current.textContent = `${Math.round(scoreObj.home)} — ${Math.round(scoreObj.away)}`;
            }
          },
        },
        0.7
      );

      // Player image clip reveal + color + scale
      tl.fromTo(
        "[data-hero-player]",
        { clipPath: "inset(100% 0 0 0)", autoAlpha: 0, scale: 1.08, y: 40 },
        { clipPath: "inset(0% 0 0 0)", autoAlpha: 1, scale: 1, y: 0, duration: 1.1, ease: "power2.out" },
        0.8
      );
      tl.to("[data-hero-player] img", {
        filter: "grayscale(0%) brightness(1) contrast(1)",
        duration: 0.8,
        ease: "power2.out",
      }, 1.4);

      // Scroll cue
      tl.from("[data-hero-scroll-cue]", { autoAlpha: 0, y: -10, duration: 0.6 }, 1.5);

      // Pin + parallax
      gsap.to("[data-hero-parallax]", {
        y: -80,
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "+=100%",
          pin: true,
          scrub: 1,
        },
      });

      gsap.to("[data-hero-headline-parallax]", {
        y: 60,
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "+=100%",
          scrub: 1,
        },
      });

      gsap.to(container.current, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "bottom bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Scroll cue fade on scroll
      gsap.to("[data-hero-scroll-cue]", {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "+=20%",
          scrub: true,
        },
      });

      return () => {
        split.revert();
      };
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      className="relative min-h-screen w-full flex items-center overflow-hidden px-6 sm:px-8 lg:px-12"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(3,70,148,0.08),transparent_50%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        {/* Left column */}
        <div data-hero-headline-parallax className="flex flex-col gap-6 pt-28 lg:-ml-2 lg:pt-0">
          <span
            data-hero-animate
            data-hero-eyebrow
            className="font-tech text-xs uppercase tracking-[0.15em] text-muted opacity-0"
          >
            Gamified Football Prediction Market
          </span>

          <h1
            ref={headlineRef}
            className="font-display text-5xl uppercase leading-[0.95] text-foreground sm:text-6xl md:text-7xl lg:text-8xl text-shadow-sm"
          >
            <span className="block">CALL THE</span>
            <span className="block gradient-text">GAME.</span>
          </h1>

          <p
            data-hero-animate
            data-hero-subhead
            className="max-w-md font-body text-base text-muted opacity-0 sm:text-lg"
          >
            Predict the score. Pitch the subs. Lock it on-chain. Win the pool.
          </p>

          <div data-hero-animate data-hero-cta className="flex flex-wrap items-center gap-4 opacity-0">
            <motion.div
              style={{ x: ctaX, y: ctaY }}
              onMouseMove={handleCtaMove}
              onMouseLeave={handleCtaLeave}
            >
              <Link
                ref={ctaRef}
                href="/matches"
                className="btn-gradient relative inline-flex items-center gap-2 overflow-hidden px-8 py-4 font-display text-sm uppercase tracking-[0.1em] text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="relative z-10">Enter the Arena</span>
                <span className="material-symbols-outlined relative z-10 text-xl">arrow_forward</span>
              </Link>
            </motion.div>

            <motion.a
              href="#how-it-works"
              className="font-tech text-xs uppercase tracking-[0.15em] text-muted transition-colors hover:text-foreground"
              whileHover={{ x: 4 }}
            >
              Watch how it works
            </motion.a>
          </div>
        </div>

        {/* Right column */}
        <div
          data-hero-parallax
          className="relative flex h-[420px] items-end justify-center sm:h-[520px] lg:h-[680px]"
        >
          {/* Score */}
          <div className="perspective-800 absolute left-0 top-1/3 z-20 sm:left-4 lg:-left-12">
            <motion.div
              data-hero-score
              className="preserve-3d opacity-0"
              style={{ boxShadow: "0 0 60px rgba(219,161,17,0.15)" }}
            >
              <span
                ref={scoreRef}
                className="font-display text-6xl uppercase gradient-text sm:text-7xl lg:text-8xl"
              >
                0 — 0
              </span>
            </motion.div>
          </div>

          {/* Flags */}
          <div className="absolute right-0 top-12 z-20 flex flex-col gap-3 sm:right-4 lg:right-0">
            <motion.div
              data-hero-animate
              data-hero-flag
              className="opacity-0 shadow-2xl"
              style={{ rotate: 3 }}
              whileHover={{ scale: 1.08, rotate: 5 }}
            >
              <Image
                src="https://flagcdn.com/pt.svg"
                alt="Portugal"
                width={96}
                height={72}
                className="h-16 w-auto object-contain sm:h-20 lg:h-24"
              />
            </motion.div>
            <motion.div
              data-hero-animate
              data-hero-flag
              className="opacity-0 shadow-2xl"
              style={{ rotate: -3 }}
              whileHover={{ scale: 1.08, rotate: -5 }}
            >
              <Image
                src="https://flagcdn.com/ar.svg"
                alt="Argentina"
                width={96}
                height={72}
                className="h-16 w-auto object-contain sm:h-20 lg:h-24"
              />
            </motion.div>
          </div>

          {/* Player image with tilt */}
          <motion.div
            ref={playerRef}
            data-hero-animate
            data-hero-player
            className="group relative h-full w-full max-w-[420px] cursor-pointer opacity-0 preserve-3d"
            style={{ rotateX, rotateY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="card-shine" />
            <Image
              src="/assets/cards/player-hero.webp"
              alt="Soccit player"
              fill
              priority
              sizes="(max-width: 1024px) 80vw, 40vw"
              className="object-contain object-bottom grayscale brightness-[0.85] contrast-[1.1]"
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        data-hero-scroll-cue
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-0"
      >
        <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-muted">Scroll</span>
        <motion.div
          className="h-8 w-[1px] bg-muted/40"
          animate={{ scaleY: [1, 0.5, 1], originY: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </section>
  );
}
