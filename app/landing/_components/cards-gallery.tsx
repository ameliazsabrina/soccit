"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { gsap, useGSAP } from "./gsap-setup";

const CARDS = [
  {
    id: "fw",
    src: "/assets/cards/players/fw.webp",
    title: "Forward",
    desc: "The finishers. Every goal is a point.",
    color: "#ed1c24",
    textColor: "text-rose",
  },
  {
    id: "md",
    src: "/assets/cards/players/md.webp",
    title: "Midfielder",
    desc: "The engine. Control the tempo.",
    color: "#dba111",
    textColor: "text-cyan",
  },
  {
    id: "df",
    src: "/assets/cards/players/df.webp",
    title: "Defender",
    desc: "The wall. Deny the attack.",
    color: "#034694",
    textColor: "text-purple",
  },
  {
    id: "gk",
    src: "/assets/cards/players/gk.webp",
    title: "Goalkeeper",
    desc: "The last line. Save the game.",
    color: "#dba111",
    textColor: "text-gold",
  },
];

export function CardsGallery() {
  const container = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(container, { once: true, margin: "-20%" });

  useGSAP(
    () => {
      if (shouldReduceMotion) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const trackEl = track.current;
        if (!trackEl) return;

        const cards = gsap.utils.toArray<HTMLElement>("[data-card]");

        const horizontalTl = gsap.to(trackEl, {
          x: () => -(trackEl.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            pin: true,
            start: "top top",
            end: () => `+=${trackEl.scrollWidth - window.innerWidth}`,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const velocity = self.getVelocity ? self.getVelocity() : 0;
              const targetRotateY = gsap.utils.clamp(-12, 12, velocity * 0.015);
              const targetSkewX = gsap.utils.clamp(-4, 4, velocity * 0.005);

              cards.forEach((card) => {
                gsap.to(card, {
                  rotationY: targetRotateY,
                  skewX: targetSkewX,
                  duration: 0.3,
                  ease: "power2.out",
                  overwrite: "auto",
                });

                const rect = card.getBoundingClientRect();
                const center = rect.left + rect.width / 2;
                const viewportCenter = window.innerWidth / 2;
                const dist = Math.abs(center - viewportCenter);
                const maxDist = window.innerWidth * 0.4;
                const targetScale = gsap.utils.interpolate(1, 0.9, Math.min(1, dist / maxDist));
                gsap.to(card, {
                  scale: targetScale,
                  zIndex: Math.round(targetScale * 10),
                  duration: 0.3,
                  overwrite: "auto",
                });
              });
            },
          },
        });

        return () => {
          horizontalTl.kill();
        };
      });

      mm.add("(max-width: 1023px)", () => {
        gsap.from("[data-card]", {
          y: 60,
          autoAlpha: 0,
          stagger: 0.15,
          scrollTrigger: {
            trigger: section.current,
            start: "top 80%",
            once: true,
          },
        });
        return () => {};
      });

      return () => mm.revert();
    },
    { scope: container }
  );

  return (
    <section ref={container} className="relative w-full bg-background py-24 lg:py-0">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <Image src="/field.webp" alt="" fill className="object-cover" sizes="100vw" />
      </div>

      <div
        ref={section}
        className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 sm:px-8 lg:px-12"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="mb-10 lg:mb-16"
        >
          <span className="font-tech text-xs uppercase tracking-[0.15em] text-muted">The Cards</span>
          <h2 className="mt-2 font-display text-4xl uppercase text-foreground sm:text-5xl">Build Your Squad</h2>
        </motion.div>

        <div ref={track} className="flex flex-col gap-8 lg:flex-row lg:gap-12" style={{ perspective: "1000px" }}>
          {CARDS.map((card) => (
            <motion.div
              key={card.id}
              data-card
              className="group relative flex flex-col gap-4 lg:w-[320px] lg:shrink-0 xl:w-[380px]"
              whileHover={{ y: -12 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="relative aspect-[2/3] w-full max-w-[300px] overflow-hidden transition-shadow duration-300"
                style={{ boxShadow: `0 24px 48px -12px ${card.color}20` }}
              >
                <div className="card-shine" />
                <Image
                  src={card.src}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 300px, (max-width: 1024px) 400px, 380px"
                  className="object-cover"
                />
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${card.color}10, transparent 60%)`,
                    opacity: 0,
                  }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div>
                <h3 className={`font-display text-2xl uppercase sm:text-3xl ${card.textColor}`}>{card.title}</h3>
                <p className="font-body text-sm text-muted sm:text-base">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
