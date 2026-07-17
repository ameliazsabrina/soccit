"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowRightLeft, Check, Trophy, Wallet } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { TeamBadge } from "../../_components/team-badge";
import { gsap, useGSAP } from "./gsap-setup";

const STEPS = [
  {
    title: "ENTER A MATCH",
    description: "Open a fixture, check the entry fee, live vault, prize split, and match status. Then take your place in the arena.",
  },
  {
    title: "CALL THE SCORE",
    description: "Read the pressure, the clock, and the shape. Call Spain vs Argentina before the match turns.",
  },
  {
    title: "PITCH THE SUBS",
    description: "Choose the player going out and the player coming in. Confirm the swap and see the points on the line.",
  },
  {
    title: "LOCK IT IN",
    description: "One deliberate gesture seals your prediction on-chain. When your read lands, you earn points.",
  },
  {
    title: "CLIMB THE LEADERBOARD AND WIN THE PRIZE",
    description: "Every correct call moves you up the match leaderboard. Finish on top and the vault pays the prize to your wallet.",
  },
] as const;

const LEADERBOARD = [
  { rank: "01", name: "YOU", points: "15", prize: "$80.00" },
  { rank: "02", name: "RIVAL_X", points: "11", prize: "$48.00" },
  { rank: "03", name: "CURVA10", points: "8", prize: "$32.00" },
] as const;

export function HowItWorks() {
  const container = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const score = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(() => {
    const panels = gsap.utils.toArray<HTMLElement>("[data-how-panel]");

    if (shouldReduceMotion) {
      gsap.set(panels, { autoAlpha: 1, position: "relative", clipPath: "none" });
      gsap.set("[data-how-copy]", { autoAlpha: 1, position: "relative", y: 0 });
      gsap.set("[data-lock-fill]", { scaleX: 1 });
      gsap.set("[data-lock-thumb]", { xPercent: 410 });
      if (score.current) score.current.textContent = "2 — 1";
      return;
    }

    gsap.set(panels.slice(1), { autoAlpha: 0, clipPath: "inset(0 0 100% 0)" });
    gsap.set("[data-how-copy]", { autoAlpha: 0, y: 32 });
    gsap.set("[data-how-copy='0']", { autoAlpha: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        id: "landing-how-it-works",
        trigger: container.current,
        start: "top top",
        end: "+=520%",
        pin: stage.current,
        scrub: true,
        anticipatePin: 1,
      },
    });

    const transitionTo = (index: number, at: number) => {
      tl.to(panels[index - 1], {
        clipPath: "inset(100% 0 0 0)",
        autoAlpha: 0,
        duration: 0.11,
        ease: "power2.inOut",
      }, at)
        .to(`[data-how-copy='${index - 1}']`, { y: -30, autoAlpha: 0, duration: 0.08, ease: "power2.inOut" }, at)
        .fromTo(panels[index], {
          clipPath: "inset(0 0 100% 0)",
          autoAlpha: 1,
        }, {
          clipPath: "inset(0 0 0% 0)",
          duration: 0.12,
          ease: "power3.inOut",
        }, at + 0.025)
        .to(`[data-how-copy='${index}']`, { y: 0, autoAlpha: 1, duration: 0.09, ease: "power2.out" }, at + 0.075);
    };

    transitionTo(1, 0.02);
    const scoreValue = { home: 0, away: 0 };
    tl.to(scoreValue, {
      home: 2,
      away: 1,
      duration: 0.07,
      onUpdate: () => {
        if (score.current) {
          score.current.textContent = `${Math.round(scoreValue.home)} — ${Math.round(scoreValue.away)}`;
        }
      },
    }, 0.13);

    transitionTo(2, 0.22);
    tl.from("[data-sub-card]", {
      y: 24,
      scale: 0.94,
      autoAlpha: 0,
      stagger: 0.012,
      duration: 0.05,
      ease: "power2.out",
    }, 0.32);

    transitionTo(3, 0.42);
    tl.fromTo("[data-lock-fill]", { scaleX: 0 }, {
      scaleX: 1,
      duration: 0.1,
      transformOrigin: "left",
      ease: "power2.inOut",
    }, 0.49)
      .fromTo("[data-lock-thumb]", { xPercent: 0 }, {
        xPercent: 410,
        duration: 0.1,
        ease: "power2.inOut",
      }, 0.49)
      .from("[data-lock-confirmed]", { y: 12, autoAlpha: 0, duration: 0.04, ease: "power2.out" }, 0.56);

    transitionTo(4, 0.62);
    tl.from("[data-leader-row]", {
      x: 24,
      autoAlpha: 0,
      stagger: 0.012,
      duration: 0.05,
      ease: "power2.out",
    }, 0.72)
      .from("[data-prize-paid]", { scale: 0.88, autoAlpha: 0, duration: 0.05, ease: "power2.out" }, 0.81)
      // Keep the final result settled through the rest of the pinned range.
      .to(panels[4], { autoAlpha: 1, duration: 0.14, ease: "none" }, 0.86);
  }, { scope: container, dependencies: [shouldReduceMotion] });

  return (
    <section ref={container} id="how-it-works" className="relative min-h-[620vh] bg-transparent motion-reduce:min-h-0">
      <div ref={stage} className="relative flex min-h-[100svh] w-full items-center overflow-hidden px-5 py-20 motion-reduce:min-h-0 motion-reduce:overflow-visible sm:px-8 lg:px-14">
        <div className="pointer-events-none absolute inset-y-0 left-[34%] hidden w-px bg-foreground/10 lg:block" />
        <div className="relative z-20 mx-auto grid w-full max-w-[1500px] items-center gap-10 motion-reduce:block lg:grid-cols-[0.52fr_1fr] lg:gap-16">
          <div className="relative min-h-[250px] motion-reduce:min-h-0 lg:min-h-[470px]">
            <span className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">The full match protocol</span>
            {STEPS.map((step, index) => (
              <div key={step.title} data-how-copy={index} className="absolute left-0 top-12 max-w-md motion-reduce:static motion-reduce:mt-8">
                <span className="font-display text-sm text-cyan">0{index + 1} / 05</span>
                <h2 className={`mt-4 font-display uppercase leading-[0.86] tracking-[-0.055em] text-foreground ${index === 4 ? "text-[clamp(2.2rem,4.5vw,5rem)]" : "text-[clamp(2.75rem,6vw,6.5rem)]"}`}>
                  {step.title}
                </h2>
                <p className="mt-6 max-w-sm font-body text-sm leading-relaxed text-foreground/70 sm:text-base">
                  {step.description}
                </p>
              </div>
            ))}
            <div className="absolute bottom-0 left-0 hidden gap-2 lg:flex">
              {STEPS.map((step, index) => (
                <span key={step.title} className={`h-1 w-9 ${index === 0 || index === 3 ? "bg-purple" : index === 1 || index === 4 ? "bg-cyan" : "bg-foreground"}`} />
              ))}
            </div>
          </div>

          <div className="relative h-[58vh] min-h-[430px] w-full motion-reduce:mt-12 motion-reduce:grid motion-reduce:h-auto motion-reduce:gap-6 sm:min-h-[540px] lg:h-[72vh]">
            <EnterMatchPanel />
            <ScorePanel scoreRef={score} />
            <SubsConfirmationPanel />
            <LockPanel />
            <LeaderboardPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

function EnterMatchPanel() {
  return (
    <div data-how-panel className="absolute inset-0 overflow-hidden bg-surface motion-reduce:static motion-reduce:min-h-[540px]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple via-cyan to-purple" />
      <div className="flex h-full flex-col p-5 sm:p-8 lg:p-10">
        <div data-enter-detail className="flex items-start justify-between gap-5">
          <div>
            <span className="font-tech text-[9px] uppercase tracking-[0.22em] text-purple">World Cup 2026 / Match 018</span>
            <h3 className="mt-2 font-display text-2xl text-foreground sm:text-4xl">Spain vs Argentina</h3>
            <p className="mt-1 font-tech text-[10px] uppercase tracking-[0.16em] text-muted">Group stage · Today, 20:00 UTC</p>
          </div>
          <span className="bg-rose px-3 py-2 font-tech text-[9px] uppercase tracking-[0.18em] text-white">Entry open</span>
        </div>

        <div className="mt-6 grid flex-1 gap-4 sm:grid-cols-[1fr_0.92fr]">
          <div data-enter-detail className="flex flex-col justify-between bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <TeamCrest team="Spain" />
              <span className="font-display text-2xl text-muted">VS</span>
              <TeamCrest team="Argentina" />
            </div>
            <div className="mt-6 border-t border-foreground/10 pt-4">
              <p className="font-tech text-[9px] uppercase tracking-[0.18em] text-muted">Match status</p>
              <div className="mt-2 flex items-center justify-between font-body text-sm">
                <span>Predictions close at kickoff</span>
                <span className="font-display text-purple">02H 14M</span>
              </div>
            </div>
          </div>

          <div data-enter-detail className="bg-purple p-5 text-white sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center bg-cyan text-foreground"><Wallet size={18} aria-hidden="true" /></span>
              <div>
                <p className="font-display text-xl">Match Vault</p>
                <p className="font-tech text-[8px] uppercase tracking-[0.18em] text-white/70">200 players entered</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 font-body text-sm">
              <DetailRow label="Vault total" value="$200.00 USDC" accent />
              <DetailRow label="Entry fee" value="$1.00 USDC" />
              <DetailRow label="Net prize pool" value="$160.00 USDC" />
            </div>
            <div className="mt-5 border-t border-white/15 pt-4">
              <p className="font-tech text-[8px] uppercase tracking-[0.18em] text-white/50">After 20% platform fee</p>
              <p className="mt-2 font-tech text-[9px] uppercase tracking-[0.16em] text-cyan">Top 3 split · 50 / 30 / 20</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScorePanel({ scoreRef }: { scoreRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <div data-how-panel className="absolute inset-0 overflow-hidden bg-purple motion-reduce:static motion-reduce:min-h-[540px]">
      <div className="absolute left-5 top-5 font-tech text-[9px] uppercase tracking-[0.2em] text-white/65 sm:left-8 sm:top-8">Score prediction / Match 018</div>
      <div className="absolute inset-0 flex items-center justify-center px-5">
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <TeamCrest team="Spain" large inverse />
            <span ref={scoreRef} className="whitespace-nowrap font-display text-[clamp(3.2rem,9vw,8.5rem)] tracking-[-0.09em] text-white">0 — 0</span>
            <TeamCrest team="Argentina" large inverse />
          </div>
          <div className="mt-8 flex justify-center gap-2">
            <span className="bg-cyan px-3 py-2 font-tech text-[9px] uppercase tracking-[0.16em] text-foreground">5 pts exact</span>
            <span className="border border-foreground/20 bg-background px-3 py-2 font-tech text-[9px] uppercase tracking-[0.16em] text-foreground">3 pts outcome</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubsConfirmationPanel() {
  return (
    <div data-how-panel className="absolute inset-0 overflow-hidden bg-purple p-4 motion-reduce:static motion-reduce:min-h-[540px] sm:p-8">
      <div className="landing-lock-rings pointer-events-none absolute inset-0 opacity-10" />
      <div className="relative flex h-full items-center justify-center">
        <div className="w-full max-w-2xl border border-cyan/40 bg-background p-5 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-xl text-foreground sm:text-2xl">Confirm Substitution</p>
              <p className="mt-1 font-tech text-[9px] uppercase tracking-[0.16em] text-muted">1 swap · <span className="text-cyan">3 pts potential</span></p>
            </div>
            <span className="border border-purple/20 bg-purple/5 px-3 py-2 font-tech text-[8px] uppercase tracking-[0.16em] text-purple">Spain · 64&apos;</span>
          </div>

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <PlayerSwapCard avatar="/assets/cards/players/FW_07_Lion.webp" number="7" name="TORES" status="PLAYER OUT" />
            <div data-sub-card className="flex h-10 w-10 items-center justify-center bg-purple text-white">
              <ArrowRightLeft size={18} aria-hidden="true" />
            </div>
            <PlayerSwapCard avatar="/assets/cards/players/FW_09_Bull.webp" number="9" name="OYARZABAL" status="PLAYER IN" incoming />
          </div>

          <div data-sub-card className="mt-7 flex items-center justify-between border-t border-foreground/10 pt-5">
            <div>
              <p className="font-tech text-[8px] uppercase tracking-[0.18em] text-muted">Correct substitution</p>
              <p className="mt-1 font-display text-lg text-foreground">Earn 3 pts</p>
            </div>
            <span className="bg-cyan px-5 py-3 font-display text-xs uppercase tracking-[0.12em] text-foreground">Confirm swap</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockPanel() {
  return (
    <div data-how-panel className="absolute inset-0 overflow-hidden bg-purple text-white motion-reduce:static motion-reduce:min-h-[540px]">
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="font-tech text-[9px] uppercase tracking-[0.24em] text-white/65">On-chain commitment</span>
        <h3 className="mt-5 font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.84] tracking-[-0.06em]">Trust<br />your read.</h3>
        <div className="relative mt-10 h-14 w-full max-w-lg border border-white/25 bg-white/10 p-1">
          <div data-lock-fill className="absolute inset-1 bg-cyan" />
          <div data-lock-thumb className="absolute left-1 top-1 z-10 flex h-12 w-[19%] items-center justify-center bg-white text-foreground shadow-xl">
            <span className="material-symbols-outlined" aria-hidden="true">double_arrow</span>
          </div>
          <span className="relative z-10 flex h-full items-center justify-center font-tech text-[9px] uppercase tracking-[0.2em] text-foreground">Slide to lock</span>
        </div>
        <div data-lock-confirmed className="mt-6 flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan">
          <span className="flex h-5 w-5 items-center justify-center bg-cyan text-foreground"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
          Prediction sealed / Earn 3 pts
        </div>
      </div>
    </div>
  );
}

function LeaderboardPanel() {
  return (
    <div data-how-panel className="absolute inset-0 overflow-hidden bg-purple motion-reduce:static motion-reduce:min-h-[540px]">
      <div className="flex h-full flex-col p-5 sm:p-8 lg:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-cyan">Local leaderboard / Final</span>
            <h3 className="mt-2 font-display text-2xl text-white sm:text-4xl">Spain 2 — 1 Argentina</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <span className="block font-tech text-[8px] uppercase tracking-[0.16em] text-white/65">Vault total</span>
              <span className="mt-1 block font-display text-lg text-gold">$200.00 USDC</span>
            </div>
            <span className="flex h-11 w-11 items-center justify-center bg-gold text-foreground"><Trophy size={20} aria-hidden="true" /></span>
          </div>
        </div>

        <div className="mt-6 flex-1 bg-background">
          {LEADERBOARD.map((player, index) => (
            <div key={player.rank} data-leader-row className={`grid min-h-20 grid-cols-[3rem_1fr_auto] items-center border-b border-foreground/10 px-4 sm:min-h-24 sm:grid-cols-[4rem_1fr_auto] sm:px-6 ${index === 0 ? "bg-gold/10" : ""}`}>
              <span className={`font-display text-xl sm:text-2xl ${index === 0 ? "text-gold" : "text-purple"}`}>{player.rank}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base text-foreground sm:text-xl">{player.name}</span>
                  {index === 0 && <span className="bg-gold px-2 py-1 font-tech text-[7px] uppercase tracking-[0.14em] text-foreground">Winner</span>}
                </div>
                <span className="font-tech text-[8px] uppercase tracking-[0.16em] text-muted">{player.points} pts</span>
              </div>
              <div className="text-right">
                <span className={`block font-display text-base sm:text-xl ${index === 0 ? "text-gold" : "text-foreground"}`}>{player.prize}</span>
                <span className="font-tech text-[7px] uppercase tracking-[0.14em] text-muted">USDC prize</span>
              </div>
            </div>
          ))}
        </div>

        <div data-prize-paid className="mt-4 flex items-center justify-between bg-white px-4 py-4 text-foreground sm:px-6">
          <div>
            <p className="font-tech text-[8px] uppercase tracking-[0.18em] text-muted">$200.00 vault settled to your wallet</p>
            <p className="mt-1 font-display text-lg text-purple">You won $80.00 USDC</p>
          </div>
          <span className="font-tech text-[8px] uppercase tracking-[0.16em] text-muted">50% of net pool</span>
        </div>
      </div>
    </div>
  );
}

function TeamCrest({ team, large = false, inverse = false }: { team: string; large?: boolean; inverse?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <TeamBadge
        name={team}
        size={large ? "xl" : "lg"}
        className={large ? "h-20 w-20 md:h-24 md:w-24" : undefined}
      />
      <span className={`mt-3 font-display ${inverse ? "text-white" : "text-foreground"} ${large ? "text-sm sm:text-xl" : "text-xs sm:text-sm"}`}>{team}</span>
    </div>
  );
}

function DetailRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/65">{label}</span>
      <span className={`font-tech text-xs font-bold ${accent ? "text-cyan" : "text-white"}`}>{value}</span>
    </div>
  );
}

function PlayerSwapCard({ avatar, number, name, status, incoming = false }: { avatar: string; number: string; name: string; status: string; incoming?: boolean }) {
  return (
    <div data-sub-card className="flex min-w-0 flex-col items-center">
      <div className="relative aspect-[2/3] w-full max-w-28 overflow-hidden sm:max-w-32">
        <Image src="/assets/cards/players/fw.webp" alt="" fill sizes="128px" className="object-cover" />
        <div className="absolute inset-x-[8%] bottom-[13%] top-[11%] flex items-center justify-center overflow-hidden">
          <Image src={avatar} alt="" fill sizes="112px" className="object-contain object-center" />
        </div>
        <span className="absolute right-[9%] top-[5%] font-display text-lg text-white drop-shadow-md">{number}</span>
        <span className="absolute inset-x-[8%] bottom-[6%] truncate text-center font-tech text-[9px] font-bold uppercase text-white drop-shadow-md sm:text-xs">{name}</span>
      </div>
      <span className={`mt-2 font-tech text-[8px] font-bold uppercase tracking-[0.16em] ${incoming ? "text-cyan" : "text-muted"}`}>{status}</span>
    </div>
  );
}
