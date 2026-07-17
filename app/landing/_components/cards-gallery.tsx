"use client";

import { useRef } from "react";
import Image from "next/image";
import { Globe2, RadioTower, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { gsap, useGSAP } from "./gsap-setup";

const ECOSYSTEM_CARDS = [
  {
    id: "soccit",
    name: "SOCCIT",
    category: "THE PLATFORM",
    role: "THE GAME LAYER",
    description: "A live football prediction arena where match knowledge becomes points, rank, and prizes.",
    tags: ["PREDICT", "COMPETE", "WIN"],
  },
  {
    id: "solana",
    name: "SOLANA",
    category: "THE TRUST LAYER",
    role: "THE ON-CHAIN RAILS",
    description: "Fast, transparent settlement for locked predictions, match vaults, and wallet payouts.",
    tags: ["ON-CHAIN", "VERIFIABLE", "FAST"],
  },
  {
    id: "txodds",
    name: "TXODDS",
    category: "THE DATA LAYER",
    role: "THE LIVE SIGNAL",
    description: "Live fixtures, lineups, scores, and match events powering every prediction inside Soccit.",
    tags: ["LIVE DATA", "LINEUPS", "EVENTS"],
  },
  {
    id: "soccit-community",
    name: "SOCCIT FOOTBALL COMMUNITY",
    category: "THE HOME CROWD",
    role: "THE INNER CIRCLE",
    description: "Players, callers, builders, and competitors shaping the Soccit arena together.",
    tags: ["PLAYERS", "BUILDERS", "RIVALS"],
  },
  {
    id: "football-community",
    name: "FOOTBALL COMMUNITY",
    category: "THE GLOBAL GAME",
    role: "THE WORLDWIDE TERRACE",
    description: "Connecting clubs, creators, supporters, and match-day culture through one shared game.",
    tags: ["CLUBS", "CREATORS", "SUPPORTERS"],
  },
] as const;

type EcosystemCardData = (typeof ECOSYSTEM_CARDS)[number];

function EcosystemCard({ card, index, reduceMotion }: { card: EcosystemCardData; index: number; reduceMotion: boolean | null }) {
  const x = useRef(0);
  const y = useRef(0);

  return (
    <motion.article
      data-ecosystem-card
      className="group relative flex h-[70vh] min-h-[500px] w-[82vw] max-w-[420px] shrink-0 overflow-hidden bg-purple p-3 text-white sm:w-[52vw] sm:p-4 lg:w-[31vw]"
      style={{ transformStyle: "preserve-3d" }}
      onMouseMove={(event) => {
        if (reduceMotion) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.current = (event.clientX - rect.left) / rect.width - 0.5;
        y.current = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(event.currentTarget, {
          rotateY: x.current * 7,
          rotateX: y.current * -5,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
        });
      }}
      onMouseLeave={(event) => {
        gsap.to(event.currentTarget, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.35,
          ease: "power3.out",
        });
      }}
      whileHover={reduceMotion ? undefined : { y: -8 }}
    >
      <div className="landing-ecosystem-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="landing-card-foil pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-150 group-hover:opacity-70" />

      <div className="pointer-events-none absolute inset-3 border border-cyan/80 sm:inset-4" />
      <div className="pointer-events-none absolute inset-5 border border-white/20 sm:inset-6" />
      <CardCorners />

      <div className="relative z-10 flex h-full w-full flex-col p-4 sm:p-5" style={{ transform: "translateZ(20px)" }}>
        <div className="flex items-center justify-between gap-4 font-tech text-[9px] uppercase tracking-[0.18em]">
          <span className="text-white/65">Soccit stack / {String(index + 1).padStart(2, "0")}</span>
          <span className="text-cyan">{card.category}</span>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-5">
          <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-cyan/25" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan/10 blur-2xl transition-opacity duration-150 group-hover:opacity-100" />
          <CardLogo card={card} />
        </div>

        <div className="relative bg-white p-5 text-foreground sm:p-6" style={{ transform: "translateZ(22px)" }}>
          <span className="font-tech text-[8px] uppercase tracking-[0.2em] text-purple">Ecosystem card / {String(index + 1).padStart(2, "0")}</span>
          <h3 className={`mt-2 font-display leading-[0.92] tracking-[-0.035em] ${card.name.length > 20 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}>
            {card.name}
          </h3>
          <p className="mt-3 font-body text-xs leading-relaxed text-foreground/70 sm:text-sm">{card.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span key={tag} className="border border-purple/20 bg-purple/5 px-2 py-1.5 font-tech text-[8px] font-bold uppercase tracking-[0.12em] text-purple">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-3 font-tech text-[8px] uppercase tracking-[0.16em] text-muted">
            <span>{card.role}</span>
            <span>{String(index + 1).padStart(2, "0")} / 05</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CardLogo({ card }: { card: EcosystemCardData }) {
  if (card.id === "soccit") {
    return (
      <div className="relative z-10 flex flex-col items-center">
        <Image src="/assets/soccit-logo.svg" alt="Soccit" width={154} height={96} className="h-24 w-36 object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.22)]" />
        <span className="mt-3 font-display text-lg tracking-[0.2em]">SOCCIT</span>
      </div>
    );
  }

  if (card.id === "solana") {
    return (
      <div className="relative z-10 flex flex-col items-center" aria-label="Solana">
        <div className="flex w-32 flex-col gap-2" aria-hidden="true">
          <span className="h-4 -skew-x-[28deg] bg-cyan" />
          <span className="h-4 skew-x-[28deg] bg-white" />
          <span className="h-4 -skew-x-[28deg] bg-cyan" />
        </div>
        <span className="mt-5 font-display text-2xl tracking-[0.18em]">SOLANA</span>
      </div>
    );
  }

  if (card.id === "txodds") {
    return (
      <div className="relative z-10 flex flex-col items-center text-center" aria-label="TxODDS">
        <RadioTower size={58} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
        <span className="mt-4 font-display text-4xl tracking-[-0.04em]">TX<span className="text-cyan">ODDS</span></span>
        <span className="mt-1 font-tech text-[8px] uppercase tracking-[0.25em] text-white/60">Live match intelligence</span>
      </div>
    );
  }

  if (card.id === "soccit-community") {
    return (
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center border border-cyan/50 bg-cyan/10">
          <Users size={50} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
        </div>
        <span className="mt-4 max-w-48 font-display text-lg leading-tight">SOCCIT COMMUNITY</span>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="flex h-24 w-24 items-center justify-center border border-cyan/50 bg-cyan/10">
        <Globe2 size={50} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
      </div>
      <span className="mt-4 max-w-48 font-display text-lg leading-tight">THE GLOBAL GAME</span>
    </div>
  );
}

function CardCorners() {
  return (
    <div className="pointer-events-none absolute inset-0 text-cyan" aria-hidden="true">
      <span className="absolute left-3 top-3 h-7 w-7 border-l-2 border-t-2 border-current sm:left-4 sm:top-4" />
      <span className="absolute right-3 top-3 h-7 w-7 border-r-2 border-t-2 border-current sm:right-4 sm:top-4" />
      <span className="absolute bottom-3 left-3 h-7 w-7 border-b-2 border-l-2 border-current sm:bottom-4 sm:left-4" />
      <span className="absolute bottom-3 right-3 h-7 w-7 border-b-2 border-r-2 border-current sm:bottom-4 sm:right-4" />
    </div>
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
      const scrollDistance = () => distance() * 3 + window.innerHeight * 1.5;

      gsap.to(track.current, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          id: "landing-ecosystem",
          trigger: stage.current,
          start: "top top",
          end: () => `+=${scrollDistance()}`,
          pin: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
        },
      });

      gsap.to("[data-stack-word]", {
        xPercent: -22,
        ease: "none",
        scrollTrigger: {
          trigger: stage.current,
          start: "top top",
          end: () => `+=${scrollDistance()}`,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    return () => mm.revert();
  }, { scope: container, dependencies: [shouldReduceMotion] });

  return (
    <section ref={container} id="about-us" className="relative bg-transparent">
      <div ref={stage} className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 py-24 sm:px-8 lg:px-14 lg:py-0">
        <div data-stack-word className="pointer-events-none absolute left-[4%] top-[10%] whitespace-nowrap font-display text-[clamp(7rem,19vw,20rem)] leading-none tracking-[-0.08em] text-foreground/[0.035]">
          THE PLAYBOOK
        </div>

        <div className="relative z-10 mb-9 flex max-w-[1500px] items-end justify-between gap-6 lg:mb-12">
          <div>
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">Five forces / One football ecosystem</span>
            <h2 className="mt-3 font-display text-[clamp(2.75rem,6vw,6.75rem)] uppercase leading-[0.84] tracking-[-0.055em]">SOCCIT ECOSYSTEM.</h2>
          </div>
          <p className="hidden max-w-xs border-l border-cyan pl-5 font-body text-sm leading-relaxed text-foreground/65 md:block">
            The platform, trust, data, and communities that turn football instinct into a verifiable competition.
          </p>
        </div>

        <div ref={track} className="relative z-10 flex gap-5 overflow-x-auto pb-4 [scrollbar-width:none] lg:w-max lg:overflow-visible lg:pr-[20vw]">
          {ECOSYSTEM_CARDS.map((card, index) => (
            <EcosystemCard key={card.id} card={card} index={index} reduceMotion={shouldReduceMotion} />
          ))}

          <div className="flex h-[70vh] min-h-[500px] w-[72vw] max-w-[520px] shrink-0 items-end bg-purple p-7 text-white sm:w-[55vw] sm:p-10">
            <div>
              <span className="font-tech text-[9px] uppercase tracking-[0.22em] text-cyan">The stack is complete</span>
              <p className="mt-4 font-display text-[clamp(2.5rem,5vw,5rem)] uppercase leading-[0.88] tracking-[-0.05em]">
                FIVE FORCES.<br />ONE ARENA.<br />BUILT FOR FOOTBALL.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
