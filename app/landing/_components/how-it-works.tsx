"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { gsap, useGSAP } from "./gsap-setup";

const FORMATION = [
  [50, 85, "gk"], [22, 67, "df"], [40, 70, "df"], [60, 70, "df"], [78, 67, "df"],
  [30, 48, "md"], [50, 52, "md"], [70, 48, "md"], [25, 27, "fw"], [50, 22, "fw"], [75, 27, "fw"],
] as const;

const STEPS = ["CALL THE SCORE", "PITCH THE SUBS", "LOCK IT IN"];

export function HowItWorks() {
  const container = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(() => {
    if (shouldReduceMotion) {
      gsap.set("[data-how-panel]", { autoAlpha: 1, position: "relative" });
      gsap.set("[data-token]", { autoAlpha: 1, scale: 1, y: 0 });
      if (score.current) score.current.textContent = "2 — 1";
      return;
    }

    const panels = gsap.utils.toArray<HTMLElement>("[data-how-panel]");
    gsap.set(panels.slice(1), { autoAlpha: 0, clipPath: "inset(0 0 100% 0)" });
    gsap.set("[data-how-copy]", { autoAlpha: 0, y: 32 });
    gsap.set("[data-how-copy='0']", { autoAlpha: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: container.current, start: "top top", end: "+=320%", pin: stage.current, scrub: 1, anticipatePin: 1 },
    });

    const scoreValue = { home: 0, away: 0 };
    tl.to(scoreValue, { home: 2, away: 1, duration: 0.5, onUpdate: () => { if (score.current) score.current.textContent = `${Math.round(scoreValue.home)} — ${Math.round(scoreValue.away)}`; } }, 0.05)
      .from("[data-score-mark]", { scaleY: 0, stagger: 0.05, transformOrigin: "bottom", duration: 0.3 }, 0.08)
      .to(panels[0], { clipPath: "inset(100% 0 0 0)", autoAlpha: 0, duration: 0.18, ease: "power2.inOut" }, 0.28)
      .to("[data-how-copy='0']", { y: -30, autoAlpha: 0, duration: 0.12 }, 0.28)
      .fromTo(panels[1], { clipPath: "inset(0 0 100% 0)", autoAlpha: 1 }, { clipPath: "inset(0 0 0% 0)", duration: 0.22, ease: "power3.inOut" }, 0.31)
      .to("[data-how-copy='1']", { y: 0, autoAlpha: 1, duration: 0.12 }, 0.34)
      .from("[data-token]", { y: -90, scale: 0.35, autoAlpha: 0, stagger: { each: 0.012, from: "end" }, duration: 0.18, ease: "back.out(1.5)" }, 0.38)
      .to(panels[1], { clipPath: "inset(100% 0 0 0)", autoAlpha: 0, duration: 0.18, ease: "power2.inOut" }, 0.63)
      .to("[data-how-copy='1']", { y: -30, autoAlpha: 0, duration: 0.12 }, 0.63)
      .fromTo(panels[2], { clipPath: "inset(0 0 100% 0)", autoAlpha: 1 }, { clipPath: "inset(0 0 0% 0)", duration: 0.22, ease: "power3.inOut" }, 0.66)
      .to("[data-how-copy='2']", { y: 0, autoAlpha: 1, duration: 0.12 }, 0.69)
      .fromTo("[data-lock-fill]", { scaleX: 0 }, { scaleX: 1, duration: 0.2, transformOrigin: "left", ease: "power2.inOut" }, 0.76)
      .fromTo("[data-lock-thumb]", { xPercent: 0 }, { xPercent: 410, duration: 0.2, ease: "power2.inOut" }, 0.76)
      .from("[data-lock-confirmed]", { y: 18, autoAlpha: 0, duration: 0.1 }, 0.9);
  }, { scope: container });

  return (
    <section ref={container} id="how-it-works" className="relative min-h-[420vh] bg-white">
      <div ref={stage} className="relative flex min-h-[100svh] w-full items-center overflow-hidden px-5 py-20 sm:px-8 lg:px-14">
        <div className="pointer-events-none absolute inset-y-0 left-[34%] hidden w-px bg-foreground/10 lg:block" />
        <div className="relative z-20 mx-auto grid w-full max-w-[1500px] items-center gap-10 lg:grid-cols-[0.52fr_1fr] lg:gap-16">
          <div className="relative min-h-[220px] lg:min-h-[420px]">
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">The match protocol</span>
            {STEPS.map((step, index) => (
              <div key={step} data-how-copy={index} className="absolute left-0 top-12 max-w-md">
                <span className="font-display text-sm text-cyan">0{index + 1} / 03</span>
                <h2 className="mt-4 font-display text-[clamp(2.75rem,6vw,6.5rem)] uppercase leading-[0.86] tracking-[-0.055em] text-foreground">{step}</h2>
                <p className="mt-6 max-w-sm font-body text-sm leading-relaxed text-foreground/65 sm:text-base">
                  {index === 0 && "Read the pressure, the clock, and the shape. Call the final score before the match turns."}
                  {index === 1 && "Move your substitute cards into the XI. The formation is the prediction."}
                  {index === 2 && "One deliberate gesture. Your football instinct becomes an on-chain commitment."}
                </p>
              </div>
            ))}
            <div className="absolute bottom-0 left-0 hidden gap-2 lg:flex">
              {STEPS.map((_, index) => <span key={index} className={`h-1 w-12 ${index === 0 ? "bg-purple" : index === 1 ? "bg-cyan" : "bg-foreground"}`} />)}
            </div>
          </div>

          <div className="relative h-[54vh] min-h-[390px] w-full sm:min-h-[520px] lg:h-[72vh]">
            <div data-how-panel className="absolute inset-0 overflow-hidden bg-[#f4f4f4]">
              <div className="absolute left-5 top-5 font-tech text-[9px] uppercase tracking-[0.2em] text-muted sm:left-8 sm:top-8">Live read / Match 018</div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex items-center gap-5 sm:gap-10">
                  <div data-score-mark className="hidden h-36 w-px bg-purple/40 sm:block" />
                  <div className="text-center">
                    <div className="mb-5 flex justify-center gap-3 font-tech text-[9px] uppercase tracking-[0.2em] text-muted"><span>Home</span><span className="text-cyan">Exact call</span><span>Away</span></div>
                    <span ref={score} className="font-display text-[clamp(4rem,12vw,10rem)] tracking-[-0.09em] text-foreground">0 — 0</span>
                    <div className="mt-5 flex justify-center gap-2"><span className="bg-foreground px-3 py-2 font-tech text-[9px] uppercase tracking-[0.16em] text-white">5PTS exact</span><span className="border border-foreground/20 bg-white px-3 py-2 font-tech text-[9px] uppercase tracking-[0.16em]">3PTS outcome</span></div>
                  </div>
                  <div data-score-mark className="hidden h-36 w-px bg-cyan/60 sm:block" />
                </div>
              </div>
              <Image src="/assets/cards/player-arena.webp" alt="" width={260} height={520} className="pointer-events-none absolute -bottom-12 -right-5 hidden h-[70%] w-auto object-contain opacity-15 lg:block" />
            </div>

            <div data-how-panel className="absolute inset-0 overflow-hidden bg-foreground">
              <div className="absolute inset-[5%] overflow-hidden border border-white/15">
                <Image src="/field.webp" alt="Football pitch tactical view" fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover opacity-75" />
                <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-transparent to-foreground/40" />
                {FORMATION.map(([x, y, pos], index) => (
                  <motion.div key={`${pos}-${index}`} data-token className="absolute w-[7%] min-w-7 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_8px_rgba(0,0,0,0.28)]" style={{ left: `${x}%`, top: `${y}%` }} whileHover={shouldReduceMotion ? undefined : { scale: 1.35, zIndex: 20 }}>
                    <Image src={`/assets/cards/players/${pos}.webp`} alt="" width={72} height={108} className="h-auto w-full" />
                  </motion.div>
                ))}
              </div>
              <span className="absolute bottom-3 left-4 font-tech text-[8px] uppercase tracking-[0.2em] text-white/55 sm:bottom-5 sm:left-6">Formation 4—3—3 / Tactical view</span>
            </div>

            <div data-how-panel className="absolute inset-0 overflow-hidden bg-purple text-white">
              <div className="landing-lock-rings pointer-events-none absolute inset-0" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="font-tech text-[9px] uppercase tracking-[0.24em] text-white/60">On-chain commitment</span>
                <h3 className="mt-5 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.84] tracking-[-0.06em]">TRUST<br />YOUR READ.</h3>
                <div className="relative mt-10 h-14 w-full max-w-lg border border-white/25 bg-white/10 p-1">
                  <div data-lock-fill className="absolute inset-1 bg-cyan" />
                  <div data-lock-thumb className="absolute left-1 top-1 z-10 flex h-12 w-[19%] items-center justify-center bg-white text-foreground shadow-xl"><span className="material-symbols-outlined" aria-hidden="true">double_arrow</span></div>
                  <span className="relative z-10 flex h-full items-center justify-center font-tech text-[9px] uppercase tracking-[0.2em] text-foreground">Slide to lock</span>
                </div>
                <div data-lock-confirmed className="mt-6 flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan"><span className="h-2 w-2 rotate-45 bg-cyan" /> Prediction sealed / +50 XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
