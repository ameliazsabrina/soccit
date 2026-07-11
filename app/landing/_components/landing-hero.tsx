"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { gsap, SplitText, useGSAP } from "./gsap-setup";
import { HoverRevealButton, HoverRevealLink } from "./hover-reveal";

export function LandingHero() {
  const container = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const player = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [5, -5]), { stiffness: 130, damping: 22 });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-7, 7]), { stiffness: 130, damping: 22 });

  useGSAP(() => {
    if (shouldReduceMotion) {
      gsap.set("[data-hero-reveal]", { autoAlpha: 1, y: 0, clipPath: "inset(0 0 0 0)" });
      return;
    }

    const split = SplitText.create(headline.current, { type: "lines,words", mask: "lines" });
    const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
    intro
      .from(split.words, { yPercent: 120, rotationX: 18, autoAlpha: 0, stagger: 0.045, duration: 0.95, transformOrigin: "bottom" })
      .from("[data-hero-kicker]", { y: 18, autoAlpha: 0, duration: 0.5 }, 0.15)
      .from("[data-hero-meta]", { y: 18, autoAlpha: 0, stagger: 0.06, duration: 0.5 }, 0.35)
      .fromTo("[data-hero-player]", { clipPath: "inset(100% 0 0 0)", y: 60, scale: 1.08 }, { clipPath: "inset(0% 0 0 0)", y: 0, scale: 1, duration: 1.15 }, 0.2)
      .from("[data-scoreboard]", { xPercent: 35, autoAlpha: 0, duration: 0.7 }, 0.65)
      .from("[data-hero-rule]", { scaleX: 0, duration: 0.75, transformOrigin: "left" }, 0.7);

    const scroll = gsap.timeline({
      scrollTrigger: { trigger: container.current, start: "top top", end: "+=105%", pin: true, scrub: 1 },
    });
    scroll
      .to("[data-hero-player]", { yPercent: -10, scale: 1.07, ease: "none" }, 0)
      .to("[data-hero-copy]", { yPercent: 13, opacity: 0.18, ease: "none" }, 0)
      .to("[data-hero-depth]", { rotateX: 64, yPercent: 34, scale: 1.2, opacity: 0, ease: "none" }, 0)
      .to(container.current, { clipPath: "inset(0 0 100% 0)", ease: "power2.inOut" }, 0.72);

    return () => split.revert();
  }, { scope: container });

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>) {
    if (shouldReduceMotion || !player.current) return;
    const rect = player.current.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section ref={container} className="landing-hero relative flex min-h-[100svh] w-full items-center overflow-hidden bg-white px-5 pb-16 pt-24 sm:px-8 lg:px-14">
      <div className="landing-hero-wash pointer-events-none absolute inset-0" />
      <div data-hero-depth className="landing-pitch-perspective pointer-events-none absolute inset-x-0 bottom-0 h-[68%]" />
      <div className="pointer-events-none absolute left-[7%] top-[19%] h-[2px] w-20 bg-cyan sm:w-32" />
      <div className="pointer-events-none absolute right-[8%] top-[15%] font-tech text-[9px] uppercase tracking-[0.28em] text-muted [writing-mode:vertical-rl]">Arena protocol / 2026</div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] items-center lg:grid-cols-[1.05fr_0.95fr]">
        <div data-hero-copy className="relative z-20 pt-4 lg:pt-0">
          <div data-hero-kicker data-hero-reveal className="mb-5 flex items-center gap-3 opacity-0">
            <span className="h-px w-8 bg-purple" />
            <span className="font-tech text-[10px] uppercase tracking-[0.24em] text-purple sm:text-xs">Football, called by you</span>
          </div>

          <h1 ref={headline} className="font-display text-[clamp(4rem,11vw,10.5rem)] uppercase leading-[0.76] tracking-[-0.075em] text-foreground">
            <span className="block">CALL</span>
            <span className="block pl-[0.1em] text-outline-blue">THE</span>
            <span className="block text-purple">GAME.</span>
          </h1>

          <div data-hero-rule className="my-6 h-px w-full max-w-xl bg-foreground/20 sm:my-8" />
          <div className="flex max-w-xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p data-hero-meta data-hero-reveal className="max-w-sm font-body text-sm leading-relaxed text-foreground/70 opacity-0 sm:text-base">
              Read the match. Move the squad. Commit your call on-chain before the whistle.
            </p>
            <div data-hero-meta data-hero-reveal className="flex shrink-0 items-center gap-5 opacity-0">
              <Link href="/matches" className="landing-cut-button group inline-flex min-h-11 items-center gap-3 bg-purple px-5 py-3 font-display text-[11px] uppercase tracking-[0.15em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">
                <HoverRevealButton>Enter arena</HoverRevealButton>
                <span className="material-symbols-outlined text-base transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
              </Link>
              <HoverRevealLink href="#how-it-works" className="hidden min-h-11 items-center font-tech text-[10px] uppercase tracking-[0.18em] text-muted transition-colors duration-100 hover:text-foreground sm:flex" underline>View the play</HoverRevealLink>
            </div>
          </div>
        </div>

        <div className="relative mt-4 h-[46vh] min-h-[360px] sm:h-[54vh] lg:mt-0 lg:h-[78vh] lg:min-h-[620px]">
          <motion.div ref={player} data-hero-player data-hero-reveal className="absolute inset-0 z-10 opacity-0" style={{ rotateX, rotateY, transformPerspective: 1200 }} onMouseMove={handlePointerMove} onMouseLeave={() => { pointerX.set(0); pointerY.set(0); }}>
            <Image src="/assets/cards/player-hero.webp" alt="Eagle striker in the Soccit home kit controlling the ball" fill priority sizes="(max-width: 1024px) 92vw, 52vw" className="object-contain object-bottom drop-shadow-[0_35px_35px_rgba(3,70,148,0.16)]" />
          </motion.div>

          <div data-scoreboard className="absolute bottom-[8%] right-0 z-20 flex items-stretch bg-foreground text-white shadow-[0_20px_60px_rgba(10,22,40,0.18)] sm:right-[4%] lg:bottom-[13%]">
            <div className="border-r border-white/15 px-3 py-3 sm:px-5">
              <span className="block font-tech text-[8px] uppercase tracking-[0.2em] text-white/55">Live / 78:42</span>
              <span className="mt-1 block font-display text-lg tracking-tight sm:text-2xl">SOC 2</span>
            </div>
            <div className="px-3 py-3 sm:px-5">
              <span className="block font-tech text-[8px] uppercase tracking-[0.2em] text-cyan">Your call</span>
              <span className="mt-1 block font-display text-lg tracking-tight text-cyan sm:text-2xl">2 — 1</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-3 sm:left-8 lg:left-14">
        <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-muted">Scroll to kick-off</span>
        <motion.span className="block h-px w-12 origin-left bg-cyan" animate={shouldReduceMotion ? undefined : { scaleX: [0.25, 1, 0.25] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
      </div>
    </section>
  );
}
