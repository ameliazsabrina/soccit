"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "./gsap-setup";

const FORMATION = [
  { id: "gk", src: "/assets/cards/players/gk.webp", x: 50, y: 88, pos: "GK" },
  { id: "df1", src: "/assets/cards/players/df.webp", x: 20, y: 70, pos: "DF" },
  { id: "df2", src: "/assets/cards/players/df.webp", x: 40, y: 72, pos: "DF" },
  { id: "df3", src: "/assets/cards/players/df.webp", x: 60, y: 72, pos: "DF" },
  { id: "df4", src: "/assets/cards/players/df.webp", x: 80, y: 70, pos: "DF" },
  { id: "md1", src: "/assets/cards/players/md.webp", x: 30, y: 50, pos: "MD" },
  { id: "md2", src: "/assets/cards/players/md.webp", x: 50, y: 52, pos: "MD" },
  { id: "md3", src: "/assets/cards/players/md.webp", x: 70, y: 50, pos: "MD" },
  { id: "fw1", src: "/assets/cards/players/fw.webp", x: 25, y: 28, pos: "FW" },
  { id: "fw2", src: "/assets/cards/players/fw.webp", x: 50, y: 24, pos: "FW" },
  { id: "fw3", src: "/assets/cards/players/fw.webp", x: 75, y: 28, pos: "FW" },
];

const BENCH = [
  { id: "b1", src: "/assets/cards/players/fw.webp", pos: "FW" },
  { id: "b2", src: "/assets/cards/players/md.webp", pos: "MD" },
  { id: "b3", src: "/assets/cards/players/df.webp", pos: "DF" },
  { id: "b4", src: "/assets/cards/players/gk.webp", pos: "GK" },
  { id: "b5", src: "/assets/cards/players/fw.webp", pos: "FW" },
];

const STEPS = [
  {
    id: 0,
    category: "Step 1",
    title: "Call the Score",
    description: "Read the match. Pick the exact final score or the winning outcome.",
  },
  {
    id: 1,
    category: "Step 2",
    title: "Pitch the Subs",
    description: "Drag substitute cards onto the pitch. Build the formation that wins.",
  },
  {
    id: 2,
    category: "Step 3",
    title: "Lock It In",
    description: "Slide to commit. Your prediction is sealed on-chain.",
  },
];

export function HowItWorks() {
  const container = useRef<HTMLElement>(null);
  const panelARef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<HTMLDivElement>(null);
  const panelCRef = useRef<HTMLDivElement>(null);
  const scoreARef = useRef<HTMLSpanElement>(null);
  const lockThumbRef = useRef<HTMLDivElement>(null);
  const lockGhostRef = useRef<HTMLDivElement>(null);
  const lockFillRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(
    () => {
      if (shouldReduceMotion) {
        gsap.set([panelARef.current, panelBRef.current, panelCRef.current], { autoAlpha: 1 });
        if (scoreARef.current) scoreARef.current.textContent = "2 — 1";
        return;
      }

      const howTl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          pin: true,
          start: "top top",
          end: "+=300%",
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            const step = Math.min(2, Math.floor(progress * 3));
            document.querySelectorAll("[data-step-indicator]").forEach((el, idx) => {
              const dot = el.querySelector("[data-step-dot]");
              const label = el.querySelector("[data-step-label]");
              if (idx <= step) {
                dot?.classList.add("bg-cyan", "border-cyan");
                dot?.classList.remove("border-muted/40", "bg-transparent");
                label?.classList.add("text-cyan");
                label?.classList.remove("text-muted");
              } else {
                dot?.classList.remove("bg-cyan", "border-cyan");
                dot?.classList.add("border-muted/40", "bg-transparent");
                label?.classList.remove("text-cyan");
                label?.classList.add("text-muted");
              }
            });
          },
        },
      });

      // Step progress line
      howTl.fromTo(
        "[data-step-line]",
        { scaleX: 0 },
        { scaleX: 1, ease: "none" },
        0
      );

      // Category carousel slide
      howTl.fromTo(
        "[data-category-inner]",
        { yPercent: 0 },
        { yPercent: -(100 / 3) * 2, ease: "none" },
        0
      );

      // Title split-text reveals per step
      const titleSplits: ReturnType<typeof SplitText.create>[] = [];
      const descSplits: ReturnType<typeof SplitText.create>[] = [];

      document.querySelectorAll("[data-step-title]").forEach((el) => {
        titleSplits.push(
          SplitText.create(el as HTMLElement, {
            type: "words",
            mask: "words",
            autoSplit: true,
          })
        );
      });

      document.querySelectorAll("[data-step-desc]").forEach((el) => {
        descSplits.push(
          SplitText.create(el as HTMLElement, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
          })
        );
      });

      // Hide all titles/descs initially
      titleSplits.forEach((split) => gsap.set(split.words, { yPercent: 110, autoAlpha: 0 }));
      descSplits.forEach((split) => gsap.set(split.lines, { yPercent: 110, autoAlpha: 0 }));

      // Animate each step's text in/out
      [0, 1, 2].forEach((step) => {
        const start = step / 3;
        const mid = start + 0.12;
        const end = start + 0.28;

        howTl.to(
          titleSplits[step].words,
          { yPercent: 0, autoAlpha: 1, duration: 0.08, stagger: 0.01, ease: "power4.out" },
          mid
        );
        howTl.to(
          descSplits[step].lines,
          { yPercent: 0, autoAlpha: 1, duration: 0.08, stagger: 0.01, ease: "power4.out" },
          mid + 0.02
        );

        if (step < 2) {
          howTl.to(
            titleSplits[step].words,
            { yPercent: -110, autoAlpha: 0, duration: 0.06, stagger: 0.005, ease: "power4.in" },
            end
          );
          howTl.to(
            descSplits[step].lines,
            { yPercent: -110, autoAlpha: 0, duration: 0.06, stagger: 0.005, ease: "power4.in" },
            end + 0.01
          );
        }
      });

      // Media stack transitions with clip-path and blur
      const setActivePanel = (active: number) => {
        [panelARef, panelBRef, panelCRef].forEach((ref, idx) => {
          if (!ref.current) return;
          const isActive = idx === active;
          gsap.to(ref.current, {
            clipPath: isActive ? "inset(0% round 0px)" : "inset(10% round 0px)",
            filter: isActive ? "blur(0px)" : "blur(8px)",
            scale: isActive ? 1 : 1.05,
            autoAlpha: isActive ? 1 : 0,
            duration: 0.4,
            ease: "power4.out",
          });
        });
      };

      // Panel A starts active
      gsap.set([panelBRef.current, panelCRef.current], { autoAlpha: 0, clipPath: "inset(10% round 0px)", filter: "blur(8px)", scale: 1.05 });
      gsap.set(panelARef.current, { autoAlpha: 1, clipPath: "inset(0% round 0px)", filter: "blur(0px)", scale: 1 });

      // Step transitions at progress thirds
      [0, 1, 2].forEach((step) => {
        const t = step / 3 + 0.05;
        howTl.call(() => setActivePanel(step), [], t);
      });

      // Panel A internal: score count-up
      const scoreA = { home: 0, away: 0 };
      howTl.to(
        scoreA,
        {
          home: 2,
          away: 1,
          ease: "power2.out",
          onUpdate: () => {
            if (scoreARef.current) {
              scoreARef.current.textContent = `${Math.round(scoreA.home)} — ${Math.round(scoreA.away)}`;
            }
          },
        },
        0.05
      );
      howTl.from("[data-score-control]", { autoAlpha: 0, x: -20, stagger: 0.05 }, 0.1);

      // Panel B internal animations
      howTl.from(
        "[data-token]",
        {
          y: -120,
          scale: 0.6,
          rotation: -5,
          autoAlpha: 0,
          stagger: { each: 0.02, from: "center" },
          ease: "bounce.out",
          onComplete: function (this: gsap.core.Tween) {
            this.targets().forEach((el: unknown) => {
              if (el instanceof HTMLElement) {
                el.classList.add("animate-slot-flash");
                setTimeout(() => el.classList.remove("animate-slot-flash"), 600);
              }
            });
          },
        },
        0.45
      );
      howTl.fromTo(
        "[data-formation-line]",
        { strokeDashoffset: 200 },
        { strokeDashoffset: 0, duration: 0.2, stagger: 0.03, ease: "power2.out" },
        0.55
      );
      howTl.from("[data-bench-shimmer]", { autoAlpha: 0, duration: 0.15 }, 0.55);

      // Panel C internal animations
      const lockProgress = { pct: 0 };
      howTl.to(
        lockProgress,
        {
          pct: 95,
          ease: "none",
          onUpdate: () => {
            const pct = lockProgress.pct;
            if (lockThumbRef.current) lockThumbRef.current.style.left = `${pct}%`;
            if (lockGhostRef.current) lockGhostRef.current.style.left = `${Math.max(0, pct - 8)}%`;
            if (lockFillRef.current) lockFillRef.current.style.width = `${pct}%`;
          },
          onComplete: () => {
            if (panelCRef.current) {
              panelCRef.current.classList.add("celebration-burst");
            }
            if (burstRef.current) {
              burstRef.current.classList.remove("pointer-events-none", "opacity-0");
              gsap.fromTo(
                "[data-particle]",
                { x: 0, y: 0, opacity: 1, scale: 1 },
                {
                  x: (i) => [60, -50, 40, -70, 30, -40][i],
                  y: (i) => [-50, -60, 40, 30, -40, 50][i],
                  opacity: 0,
                  scale: 0,
                  duration: 1,
                  stagger: 0.05,
                  ease: "power2.out",
                }
              );
            }
            gsap.fromTo(
              "[data-locked-text]",
              { scale: 0.9, letterSpacing: "0.2em", opacity: 0 },
              { scale: 1, letterSpacing: "0.05em", opacity: 1, duration: 0.6, ease: "power2.out" }
            );
          },
        },
        0.75
      );

      // Refresh after images load
      const imgs = container.current?.querySelectorAll("img");
      if (imgs) {
        Promise.all(
          Array.from(imgs).map((img) =>
            img.complete ? Promise.resolve() : new Promise<void>((r) => (img.onload = () => r()))
          )
        ).then(() => ScrollTrigger.refresh());
      }

      return () => {
        titleSplits.forEach((s) => s.revert());
        descSplits.forEach((s) => s.revert());
      };
    },
    { scope: container }
  );

  return (
    <section id="how-it-works" ref={container} className="relative h-[300vh] w-full bg-background">
      <div className="sticky top-0 flex h-screen min-h-[85svh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-8 lg:px-12">
        {/* Step indicator */}
        <div className="absolute left-1/2 top-8 z-30 w-full max-w-md -translate-x-1/2">
          <div className="relative flex items-center justify-between">
            <div data-step-line className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-muted/20 origin-left" />
            {STEPS.map((step, idx) => (
              <div key={step.id} data-step-indicator className="relative flex flex-col items-center gap-2 bg-background px-2">
                <div
                  data-step-dot
                  className={`h-3 w-3 border transition-colors duration-300 ${
                    idx === 0 ? "border-cyan bg-cyan" : "border-muted/40 bg-transparent"
                  }`}
                />
                <span
                  data-step-label
                  className={`font-tech text-[10px] uppercase tracking-wider transition-colors duration-300 ${
                    idx === 0 ? "text-cyan" : "text-muted"
                  }`}
                >
                  {step.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="relative z-10 grid w-full max-w-[1400px] grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left: Step content */}
          <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
            {/* Category carousel */}
            <div ref={categoryRef} className="h-[1.6cap] overflow-hidden">
              <div
                data-category-inner
                className="flex flex-col"
                style={{ height: `${STEPS.length * 1.6}cap` }}
              >
                {STEPS.map((step) => (
                  <span
                    key={step.id}
                    className="font-tech text-xs uppercase tracking-[0.15em] text-muted"
                    style={{ height: "1.6cap", lineHeight: "1.6cap" }}
                  >
                    {step.category}
                  </span>
                ))}
              </div>
            </div>

            {/* Titles stack */}
            <div className="relative mt-4 h-[1.2em] overflow-hidden sm:h-[1.1em]">
              {STEPS.map((step) => (
                <h2
                  key={step.id}
                  data-step-title
                  className="font-display text-4xl uppercase leading-[1.1] text-foreground sm:text-5xl md:text-6xl"
                  style={{ position: "absolute", inset: 0 }}
                >
                  {step.title}
                </h2>
              ))}
            </div>

            {/* Descriptions stack */}
            <div className="relative mt-4 h-[3.5em] overflow-hidden">
              {STEPS.map((step) => (
                <p
                  key={step.id}
                  data-step-desc
                  className="max-w-md font-body text-base text-muted"
                  style={{ position: "absolute", inset: 0 }}
                >
                  {step.description}
                </p>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <span className="border border-cyan/30 bg-surface px-3 py-1 font-tech text-xs uppercase tracking-wider text-cyan">
                5pts exact
              </span>
              <span className="border border-cyan/30 bg-surface px-3 py-1 font-tech text-xs uppercase tracking-wider text-cyan">
                3pts outcome
              </span>
            </div>
          </div>

          {/* Right: Media stack */}
          <div className="relative order-1 aspect-[4/3] w-full max-w-xl lg:order-2 lg:aspect-square lg:max-w-none">
            {/* Panel A - Call the Score */}
            <div
              ref={panelARef}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-surface/50 opacity-0"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <button
                  data-score-control
                  className="flex h-10 w-10 items-center justify-center border border-muted/30 bg-surface text-foreground hover:border-cyan hover:text-cyan"
                  aria-label="Decrease home"
                >
                  <span className="material-symbols-outlined">remove</span>
                </button>
                <Image
                  src="https://flagcdn.com/pt.svg"
                  alt="Portugal"
                  width={120}
                  height={90}
                  className="h-16 w-auto object-contain sm:h-20"
                />
                <span
                  ref={scoreARef}
                  className="font-display text-6xl uppercase gradient-text sm:text-7xl md:text-8xl"
                >
                  0 — 0
                </span>
                <Image
                  src="https://flagcdn.com/ar.svg"
                  alt="Argentina"
                  width={120}
                  height={90}
                  className="h-16 w-auto object-contain sm:h-20"
                />
                <button
                  data-score-control
                  className="flex h-10 w-10 items-center justify-center border border-muted/30 bg-surface text-foreground hover:border-cyan hover:text-cyan"
                  aria-label="Increase home"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Panel B - Pitch the Subs */}
            <div
              ref={panelBRef}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-surface/50 opacity-0"
            >
              <div className="relative h-[220px] w-full max-w-md overflow-hidden border border-pitch-line/30 sm:h-[280px] lg:h-[320px]">
                <Image
                  src="/field.webp"
                  alt="Football pitch"
                  fill
                  className="object-fill"
                  sizes="(max-width: 1024px) 100vw, 500px"
                />

                <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ opacity: 0.25 }}>
                  <line data-formation-line x1="50%" y1="88%" x2="50%" y2="72%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                  <line data-formation-line x1="20%" y1="70%" x2="80%" y2="70%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                  <line data-formation-line x1="50%" y1="72%" x2="50%" y2="52%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                  <line data-formation-line x1="30%" y1="50%" x2="70%" y2="50%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                  <line data-formation-line x1="50%" y1="52%" x2="50%" y2="24%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                  <line data-formation-line x1="25%" y1="28%" x2="75%" y2="28%" stroke="rgba(248,250,252,0.4)" strokeWidth="1" strokeDasharray="200" strokeDashoffset="200" />
                </svg>

                {FORMATION.map((token) => (
                  <motion.div
                    key={token.id}
                    data-token
                    className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${token.x}%`, top: `${token.y}%` }}
                    whileHover={{ scale: 1.15, y: -8, zIndex: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="relative aspect-[2/3] w-8 overflow-hidden shadow-lg sm:w-10 lg:w-12">
                      <div className="card-shine" />
                      <Image src={token.src} alt={token.pos} fill sizes="80px" className="object-cover" />
                      <span className="absolute right-1 top-1 font-tech text-[8px] font-bold text-white drop-shadow sm:text-[10px]">
                        10
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div data-bench-shimmer className="relative mt-3 flex w-full max-w-md gap-2 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan/10 to-transparent animate-[shimmer_2s_infinite]" />
                {BENCH.map((card) => (
                  <motion.div
                    key={card.id}
                    className="group relative aspect-[2/3] w-[70px] shrink-0 cursor-pointer overflow-hidden sm:w-[90px]"
                    whileHover={{ y: -6, scale: 1.04 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="card-shine" />
                    <Image src={card.src} alt={card.pos} fill sizes="90px" className="object-cover" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Panel C - Lock It In */}
            <div
              ref={panelCRef}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-surface/50 opacity-0"
            >
              <div className="relative w-full max-w-sm">
                <div className="relative h-14 bg-surface">
                  <div ref={lockFillRef} className="absolute left-0 top-0 h-full bg-cyan/30" style={{ width: "0%" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-tech text-xs uppercase tracking-wider text-muted">Slide to lock</span>
                  </div>
                  <div
                    ref={lockGhostRef}
                    className="absolute top-1/2 aspect-square h-10 -translate-x-1/2 -translate-y-1/2 bg-cyan/30"
                    style={{ left: "0%" }}
                  />
                  <div
                    ref={lockThumbRef}
                    className="absolute top-1/2 aspect-square h-12 -translate-x-1/2 -translate-y-1/2 bg-cyan shadow-[0_0_20px_rgba(219,161,17,0.5)]"
                    style={{ left: "0%" }}
                  >
                    <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background">
                      arrow_forward
                    </span>
                  </div>
                </div>

                <div
                  ref={burstRef}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0"
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      data-particle
                      className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-cyan"
                    />
                  ))}
                </div>
              </div>

              <h3 data-locked-text className="mt-8 font-display text-3xl uppercase text-foreground opacity-0 sm:text-4xl">
                Prediction Locked
              </h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
