"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { gsap, useGSAP } from "./gsap-setup";

const CARDS = [
  { id: "fw", title: "FORWARD", note: "Finish the move", color: "var(--rose)", rarity: "EPIC / 01" },
  { id: "md", title: "MIDFIELD", note: "Control the match", color: "#176b3a", rarity: "RARE / 02" },
  { id: "df", title: "DEFENDER", note: "Break the press", color: "var(--purple)", rarity: "ELITE / 03" },
  { id: "gk", title: "KEEPER", note: "Own the last line", color: "var(--cyan)", rarity: "LEGEND / 04" },
];

function SquadCard({ card, index, reduceMotion }: { card: (typeof CARDS)[number]; index: number; reduceMotion: boolean | null }) {
  const x = useRef(0);
  const y = useRef(0);
  return (
    <motion.article
      data-squad-card
      className="group relative flex h-[70vh] min-h-[500px] w-[78vw] max-w-[430px] shrink-0 flex-col justify-between overflow-hidden bg-surface p-4 sm:w-[50vw] sm:p-6 lg:w-[31vw] lg:max-w-[460px]"
      style={{ transformStyle: "preserve-3d" }}
      onMouseMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.current = (event.clientX - rect.left) / rect.width - 0.5;
        y.current = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(event.currentTarget, { rotateY: x.current * 9, rotateX: y.current * -7, duration: 0.2, ease: "power2.out", overwrite: "auto" });
      }}
      onMouseLeave={(event) => gsap.to(event.currentTarget, { rotateY: 0, rotateX: 0, duration: 0.35, ease: "power3.out" })}
      whileHover={reduceMotion ? undefined : { y: -10 }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: card.color }} />
      <div className="landing-card-foil pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-muted">Squad card / 0{index + 1}</span>
        <span className="font-tech text-[9px] uppercase tracking-[0.16em]" style={{ color: card.color }}>{card.rarity}</span>
      </div>
      <div className="relative z-10 mx-auto h-[72%] w-[78%]" style={{ transform: "translateZ(38px)" }}>
        <div className="absolute inset-[8%] blur-3xl opacity-15" style={{ background: card.color }} />
        <Image src={`/assets/cards/players/${card.id}.webp`} alt={`${card.title.toLowerCase()} tactical card`} fill sizes="(max-width: 768px) 70vw, 430px" className="object-contain drop-shadow-[0_28px_26px_rgba(10,22,40,0.2)]" />
      </div>
      <div className="relative z-10 border-t border-foreground/15 pt-4" style={{ transform: "translateZ(20px)" }}>
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl leading-none sm:text-3xl">{card.title}</h3>
          <span className="font-tech text-[9px] uppercase tracking-[0.16em] text-muted">{card.note}</span>
        </div>
      </div>
    </motion.article>
  );
}

export function CardsGallery() {
  const container = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(() => {
    if (shouldReduceMotion) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      if (!track.current || !stage.current) return;
      const distance = () => Math.max(0, track.current!.scrollWidth - window.innerWidth + 120);
      gsap.to(track.current, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: stage.current, start: "top top", end: () => `+=${distance() + window.innerHeight}`, pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      gsap.to("[data-vault-word]", { xPercent: -22, ease: "none", scrollTrigger: { trigger: stage.current, start: "top top", end: () => `+=${distance() + window.innerHeight}`, scrub: 1 } });
    });
    return () => mm.revert();
  }, { scope: container });

  return (
    <section ref={container} className="relative bg-white">
      <div ref={stage} className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8 lg:px-14 lg:py-0">
        <div data-vault-word className="pointer-events-none absolute left-[4%] top-[10%] whitespace-nowrap font-display text-[clamp(7rem,21vw,22rem)] leading-none tracking-[-0.08em] text-foreground/[0.035]">SQUAD VAULT</div>
        <div className="relative z-10 mb-9 flex max-w-[1500px] items-end justify-between gap-6 lg:mb-12">
          <div>
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">The cards / Rarity issued</span>
            <h2 className="mt-3 font-display text-[clamp(2.75rem,6vw,6.75rem)] uppercase leading-[0.84] tracking-[-0.055em]">BUILD YOUR XI.</h2>
          </div>
          <p className="hidden max-w-xs border-l border-cyan pl-5 font-body text-sm leading-relaxed text-foreground/60 md:block">Every card is a decision. The right player, in the right position, at the right minute.</p>
        </div>
        <div ref={track} className="relative z-10 flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] lg:w-max lg:overflow-visible lg:pr-[20vw]">
          {CARDS.map((card, index) => <SquadCard key={card.id} card={card} index={index} reduceMotion={shouldReduceMotion} />)}
          <div className="flex h-[70vh] min-h-[500px] w-[55vw] max-w-[520px] shrink-0 items-end bg-purple p-7 text-white sm:p-10">
            <div>
              <span className="font-tech text-[9px] uppercase tracking-[0.22em] text-cyan">Squad complete</span>
              <p className="mt-4 font-display text-[clamp(2.5rem,5vw,5rem)] uppercase leading-[0.88] tracking-[-0.05em]">YOUR READ.<br />YOUR XI.<br />YOUR RANK.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
