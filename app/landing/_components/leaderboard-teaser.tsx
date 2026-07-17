"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { DigitRollCounter } from "./digit-roll-counter";

const PLAYERS = [
  { rank: "01", name: "RONALDO7", score: "12,840", avatar: "/avatars/avatar-0.webp", zone: "CHAMPION" },
  { rank: "02", name: "MESSI10", score: "11,920", avatar: "/avatars/avatar-1.webp", zone: "REWARD" },
  { rank: "03", name: "BENZEMA9", score: "10,410", avatar: "/avatars/avatar-2.webp", zone: "REWARD" },
  { rank: "04", name: "CURVA10", score: "9,880", avatar: "/avatars/avatar-3.webp", zone: "TOP 10" },
  { rank: "05", name: "TIKI_TAKA", score: "9,240", avatar: "/avatars/avatar-4.webp", zone: "TOP 10" },
  { rank: "06", name: "PRESSING8", score: "8,760", avatar: "/avatars/avatar-5.webp", zone: "TOP 10" },
  { rank: "07", name: "LASTMINUTE", score: "8,320", avatar: "/avatars/avatar-6.webp", zone: "CHASING" },
] as const;

export function LeaderboardTeaser() {
  const container = useRef<HTMLElement>(null);
  const inView = useInView(container, { once: true, margin: "-20%" });
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <section ref={container} id="landing-leaderboard" className="relative h-[100svh] overflow-hidden bg-transparent px-5 py-5 sm:px-8 sm:py-7 lg:px-14 lg:py-8">
      <div className="pointer-events-none absolute -right-[3%] top-[1%] font-display text-[clamp(8rem,22vw,23rem)] leading-none tracking-[-0.08em] text-white">7D</div>

      <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col">
        <div className="flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-end lg:gap-8">
          <div>
            <span className="font-tech text-[9px] uppercase tracking-[0.24em] text-purple">Global leaderboard / Weekly competition</span>
            <h2 className="mt-2 font-display text-[clamp(2.55rem,6.1vw,6.5rem)] uppercase leading-[0.78] tracking-[-0.06em]">
              PLAY. CLIMB. <span className="text-outline-blue">WIN WEEKLY.</span>
            </h2>
            <p className="mt-3 max-w-2xl font-body text-xs leading-relaxed text-foreground/70 sm:text-sm">
              Correct calls earn weekly points. Keep playing, climb the global table, and finish in the reward zone before every weekly reset.
            </p>
          </div>

          <div className="shrink-0 border-l-2 border-cyan pl-4 sm:mb-1">
            <span className="block font-tech text-[8px] uppercase tracking-[0.18em] text-muted">Weekly reward / Live</span>
            <span className="mt-0.5 block font-display text-3xl text-purple lg:text-4xl">
              <DigitRollCounter value={14093.5} prefix="$" decimals={2} duration={2.2} />
            </span>
            <span className="block font-tech text-[7px] uppercase tracking-[0.16em] text-muted">Resets every 7 days</span>
          </div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 lg:mt-6 lg:grid-cols-[0.34fr_0.66fr] lg:items-stretch">
          <div className="relative hidden min-h-0 overflow-hidden bg-purple lg:block">
            <motion.div
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={inView ? { clipPath: "inset(0% 0 0 0)" } : undefined}
              transition={transition}
              className="absolute inset-0"
            >
              <Image
                src="/assets/cards/player-leaderboard.webp"
                alt="Soccit weekly leaderboard leaders"
                fill
                sizes="34vw"
                className="object-contain object-bottom drop-shadow-[0_24px_24px_rgba(0,0,0,0.2)]"
              />
            </motion.div>
            <div className="absolute left-5 top-5 font-tech text-[8px] uppercase tracking-[0.19em] text-white/60">Global top finishers</div>
            <div className="absolute bottom-5 left-5 bg-cyan px-4 py-2.5">
              <span className="block font-tech text-[7px] uppercase tracking-[0.18em] text-foreground/60">Your weekly rank</span>
              <span className="font-display text-xl text-foreground">#<DigitRollCounter value={4092} duration={2} /></span>
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-white lg:my-4 lg:-ml-5 lg:pl-5">
            <div className="hidden shrink-0 grid-cols-[3.5rem_3rem_1fr_auto_auto] items-center border-b border-foreground/12 px-5 py-2 font-tech text-[7px] uppercase tracking-[0.18em] text-muted sm:grid lg:grid-cols-[4rem_3rem_1fr_auto_auto]">
              <span>Rank</span><span /><span>Caller</span><span className="mr-8">Status</span><span>Points</span>
            </div>

            {PLAYERS.map((player, index) => (
              <motion.div
                key={player.rank}
                initial={{ x: reduceMotion ? 0 : 42, opacity: 0 }}
                animate={inView ? { x: 0, opacity: 1 } : undefined}
                transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.055 }}
                className={`group grid min-h-0 flex-1 grid-cols-[2.6rem_2.5rem_1fr_auto] items-center border-b border-foreground/12 px-3 py-1.5 transition-colors duration-100 hover:bg-cyan sm:grid-cols-[3.5rem_3rem_1fr_auto_auto] sm:px-5 ${index === 0 ? "bg-cyan/20" : ""}`}
              >
                <span className="font-display text-lg text-purple sm:text-xl">{player.rank}</span>
                <Image src={player.avatar} alt="" width={48} height={48} className="h-8 w-8 object-cover grayscale transition-[filter] duration-150 group-hover:grayscale-0 sm:h-9 sm:w-9" />
                <div className="ml-2 min-w-0 sm:ml-3">
                  <span className="block truncate font-display text-sm sm:text-base">{player.name}</span>
                  <span className="block font-tech text-[6px] uppercase tracking-[0.14em] text-muted sm:hidden">{player.zone}</span>
                </div>
                <span className="mr-8 hidden font-tech text-[7px] uppercase tracking-[0.16em] text-muted sm:block">{player.zone}</span>
                <span className="text-right font-display text-sm tabular-nums sm:text-base">
                  {player.score}<span className="ml-1 font-tech text-[6px] text-muted">PTS</span>
                </span>
              </motion.div>
            ))}

            <div className="flex shrink-0 items-center justify-between px-3 py-2 sm:px-5">
              <span className="font-tech text-[7px] uppercase tracking-[0.15em] text-muted sm:text-[8px]">12,847 players / Rewards settle to wallet / Weekly reset</span>
              <span className="ml-3 h-2.5 w-2.5 shrink-0 rotate-45 bg-purple" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
