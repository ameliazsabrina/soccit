"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { DigitRollCounter } from "./digit-roll-counter";

const PLAYERS = [
  { rank: "01", name: "RONALDO7", score: "12,840", avatar: "/avatars/avatar-0.webp" },
  { rank: "02", name: "MESSI10", score: "11,920", avatar: "/avatars/avatar-1.webp" },
  { rank: "03", name: "BENZEMA9", score: "10,410", avatar: "/avatars/avatar-2.webp" },
];

export function LeaderboardTeaser() {
  const container = useRef<HTMLElement>(null);
  const inView = useInView(container, { once: true, margin: "-20%" });
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <section ref={container} className="relative min-h-[100svh] overflow-hidden bg-[#f1f2f3] px-5 py-24 sm:px-8 lg:px-14 lg:py-28">
      <div className="pointer-events-none absolute -right-[4%] top-[4%] font-display text-[clamp(8rem,24vw,25rem)] leading-none tracking-[-0.08em] text-white">01</div>
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">On-chain table / Season 01</span>
            <h2 className="mt-3 max-w-4xl font-display text-[clamp(3rem,8vw,8.5rem)] uppercase leading-[0.8] tracking-[-0.065em]">THE TABLE<br /><span className="text-outline-blue">DOESN’T LIE.</span></h2>
          </div>
          <div className="border-l-2 border-cyan pl-5 lg:mb-2">
            <span className="block font-tech text-[9px] uppercase tracking-[0.2em] text-muted">Total pool / Live</span>
            <span className="mt-1 block font-display text-3xl text-purple sm:text-5xl"><DigitRollCounter value={14093.5} prefix="$" decimals={2} duration={2.2} /></span>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-12 lg:mt-20 lg:flex-row lg:items-end lg:gap-0">
          <div className="relative h-[430px] overflow-hidden bg-purple lg:h-[540px] lg:w-[42%]">
            <motion.div initial={{ clipPath: "inset(100% 0 0 0)" }} animate={inView ? { clipPath: "inset(0% 0 0 0)" } : undefined} transition={transition} className="absolute inset-0">
              <Image src="/assets/cards/player-leaderboard.webp" alt="Soccit team leaders" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-contain object-bottom drop-shadow-[0_30px_30px_rgba(0,0,0,0.2)]" />
            </motion.div>
            <div className="absolute left-5 top-5 font-tech text-[9px] uppercase tracking-[0.2em] text-white/60 sm:left-7 sm:top-7">Hall of instinct / Top finishers</div>
            <div className="absolute bottom-5 left-5 bg-cyan px-4 py-3 sm:bottom-7 sm:left-7">
              <span className="block font-tech text-[8px] uppercase tracking-[0.2em] text-foreground/60">Your global rank</span>
              <span className="font-display text-2xl text-foreground">#<DigitRollCounter value={4092} duration={2} /></span>
            </div>
          </div>

          <div className="flex-1 bg-white lg:mb-8 lg:-ml-8 lg:pl-8">
            {PLAYERS.map((player, index) => (
              <motion.div key={player.rank} initial={{ x: reduceMotion ? 0 : 45, opacity: 0 }} animate={inView ? { x: 0, opacity: 1 } : undefined} transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.08 }} className="group flex min-h-28 items-center border-b border-foreground/12 px-5 py-5 transition-colors duration-100 hover:bg-cyan sm:px-8">
                <span className="w-14 font-display text-2xl text-purple sm:w-20 sm:text-3xl">{player.rank}</span>
                <Image src={player.avatar} alt="" width={64} height={64} className="h-12 w-12 object-cover grayscale transition-[filter] duration-150 group-hover:grayscale-0 sm:h-14 sm:w-14" />
                <div className="ml-4 sm:ml-6">
                  <span className="block font-display text-base sm:text-xl">{player.name}</span>
                  <span className="font-tech text-[8px] uppercase tracking-[0.18em] text-muted group-hover:text-foreground/60">Verified football caller</span>
                </div>
                <span className="ml-auto font-display text-lg tabular-nums sm:text-2xl">{player.score}<span className="ml-1 font-tech text-[8px] text-muted group-hover:text-foreground/60">PTS</span></span>
              </motion.div>
            ))}
            <div className="flex items-center justify-between px-5 py-5 sm:px-8">
              <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-muted">12,847 players / Rewards settle to wallet</span>
              <span className="h-3 w-3 rotate-45 bg-purple" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
