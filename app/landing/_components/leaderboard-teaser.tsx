"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { DigitRollCounter } from "./digit-roll-counter";

const PODIUM = [
  { rank: 1, name: "Ronaldo7", prize: "5,420.00", avatar: "/avatars/avatar-0.webp", color: "bg-gold" },
  { rank: 2, name: "Messi10", prize: "3,252.00", avatar: "/avatars/avatar-1.webp", color: "bg-foreground" },
  { rank: 3, name: "Benzema9", prize: "1,626.00", avatar: "/avatars/avatar-2.webp", color: "bg-bronze" },
];

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function LeaderboardTeaser() {
  const container = useRef<HTMLElement>(null);
  const isInView = useInView(container, { once: true, margin: "-20%" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      ref={container}
      className="relative w-full overflow-hidden bg-background px-6 py-24 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-[1200px]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: easeOut }}
          className="mb-16"
        >
          <span className="font-tech text-xs uppercase tracking-[0.15em] text-muted">Social Proof</span>
          <h2 className="mt-2 font-display text-4xl uppercase text-foreground sm:text-5xl">
            The Leaderboard
          </h2>
          <p className="mt-2 max-w-md font-body text-base text-muted">
            Prove you know the game. Climb the ranks. Take the prize.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Rank counter */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, ease: easeOut, delay: shouldReduceMotion ? 0 : 0.1 }}
            whileHover={{ y: -4, boxShadow: "0 24px 48px -12px rgba(3,70,148,0.12)" }}
            className="flex flex-col justify-between bg-surface p-6 transition-colors sm:p-8"
          >
            <div>
              <span className="font-tech text-xs uppercase tracking-wider text-muted">Your Global Rank</span>
              <div className="mt-2 font-display text-5xl uppercase text-foreground sm:text-6xl">
                <DigitRollCounter value={4092} prefix="#" duration={2.2} />
              </div>
            </div>
            <div className="mt-8">
              <span className="font-tech text-xs uppercase tracking-wider text-muted">Total Players</span>
              <div className="mt-1 font-display text-3xl uppercase text-foreground">
                <DigitRollCounter value={12847} duration={2.4} />
              </div>
            </div>
          </motion.div>

          {/* Podium */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, ease: easeOut, delay: shouldReduceMotion ? 0 : 0.25 }}
            className="flex items-end justify-center gap-3 bg-surface p-6 sm:p-8 lg:col-span-1"
          >
            {PODIUM.map((player, idx) => (
              <div key={player.rank} className="flex flex-1 flex-col items-center gap-3">
                <motion.div
                  className="flex flex-col items-center gap-2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.4 + idx * 0.1,
                    duration: shouldReduceMotion ? 0 : 0.5,
                    ease: easeOut,
                  }}
                >
                  <div className="relative">
                    <span
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 font-tech text-[10px] uppercase text-background ${player.color}`}
                    >
                      {idx === 0 ? "1st" : idx === 1 ? "2nd" : "3rd"}
                    </span>
                    <Image
                      src={player.avatar}
                      alt={player.name}
                      width={64}
                      height={64}
                      className="h-12 w-12 object-cover sm:h-16 sm:w-16"
                    />
                  </div>
                  <span className="font-display text-xs uppercase text-foreground sm:text-sm">
                    {player.name}
                  </span>
                </motion.div>
                <motion.div
                  className={`flex w-full items-end justify-center ${player.color} text-background`}
                  initial={{ scaleY: 0 }}
                  animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : 0.5 + idx * 0.15,
                    duration: shouldReduceMotion ? 0 : 0.7,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  }}
                  style={{ originY: 1 }}
                >
                  <div
                    className="relative w-full"
                    style={{
                      height: idx === 0 ? "180px" : idx === 1 ? "140px" : "100px",
                      boxShadow:
                        idx === 0
                          ? "0 -12px 30px rgba(219,161,17,0.25)"
                          : idx === 2
                          ? "0 -8px 20px rgba(205,127,50,0.2)"
                          : "none",
                    }}
                  >
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-display text-sm sm:text-base">
                      ${player.prize}
                    </span>
                  </div>
                </motion.div>
              </div>
            ))}
          </motion.div>

          {/* Prize pool */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
            transition={{ duration: 0.8, ease: easeOut, delay: shouldReduceMotion ? 0 : 0.4 }}
            whileHover={{ y: -4, boxShadow: "0 24px 48px -12px rgba(3,70,148,0.12)" }}
            className="relative flex flex-col justify-between overflow-hidden bg-surface p-6 transition-colors sm:p-8"
          >
            <div className="relative z-10">
              <span className="font-tech text-xs uppercase tracking-wider text-muted">Total Prize Pool</span>
              <div className="relative mt-2 inline-block font-display text-4xl uppercase text-cyan sm:text-5xl">
                <DigitRollCounter value={14093.5} prefix="$" decimals={2} duration={2.6} />
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-cyan/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={isInView ? { x: "200%" } : { x: "-100%" }}
                  transition={{ delay: shouldReduceMotion ? 0 : 1.2, duration: 1, ease: easeOut }}
                />
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <span className="font-tech text-xs uppercase tracking-wider text-muted">Distributed On-chain</span>
              <p className="mt-1 font-body text-sm text-muted">
                Winners claim directly to their Solana wallet.
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-12 -right-12 h-72 w-56 opacity-40 sm:-right-16">
              <Image
                src="/assets/cards/player-leaderboard.webp"
                alt=""
                fill
                className="card-image-gray object-contain object-bottom"
                sizes="224px"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
