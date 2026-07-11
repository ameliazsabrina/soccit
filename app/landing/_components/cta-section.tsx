"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { gsap, SplitText, useGSAP } from "./gsap-setup";
import { HoverRevealButton, HoverRevealLink } from "./hover-reveal";

export function CTASection() {
  const container = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useGSAP(() => {
    if (shouldReduceMotion) {
      gsap.set("[data-finale]", { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }
    const split = SplitText.create(heading.current, { type: "words,lines", mask: "lines" });
    const tl = gsap.timeline({ scrollTrigger: { trigger: container.current, start: "top 70%", once: true } });
    tl.from(split.words, { yPercent: 120, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: "power4.out" })
      .from("[data-finale-player]", { xPercent: 25, clipPath: "inset(0 0 0 100%)", duration: 0.9, ease: "power4.out" }, 0.05)
      .from("[data-finale]", { y: 28, autoAlpha: 0, stagger: 0.08, duration: 0.55, ease: "power3.out" }, 0.3)
      .from("[data-tunnel-line]", { scaleX: 0, stagger: 0.04, duration: 0.55, transformOrigin: "center", ease: "power3.out" }, 0.15);
    return () => split.revert();
  }, { scope: container });

  return (
    <section ref={container} className="relative flex min-h-[100svh] items-center overflow-hidden bg-white px-5 pb-24 pt-20 sm:px-8 lg:px-14">
      <div className="landing-tunnel pointer-events-none absolute inset-0">
        {[0, 1, 2, 3, 4].map((line) => <span key={line} data-tunnel-line className="absolute left-1/2 top-1/2 block border border-foreground/10" style={{ width: `${34 + line * 15}%`, height: `${25 + line * 16}%`, transform: "translate(-50%, -50%)" }} />)}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-purple" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] items-end lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-20 pb-10 lg:pb-24">
          <span data-finale className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple opacity-0">Your match is waiting</span>
          <h2 ref={heading} className="mt-4 font-display text-[clamp(3.8rem,10vw,10rem)] uppercase leading-[0.77] tracking-[-0.075em] text-foreground">READY<br /><span className="text-outline-blue">TO PLAY?</span></h2>
          <p data-finale className="mt-7 max-w-md font-body text-sm leading-relaxed text-foreground/65 opacity-0 sm:text-base">Connect your wallet. Pick the live match. Make the call that everyone else missed.</p>
          <div data-finale className="mt-8 flex items-center gap-5 opacity-0">
            <Link href="/matches" className="landing-cut-button group inline-flex min-h-12 items-center gap-4 bg-cyan px-7 py-3 font-display text-xs uppercase tracking-[0.15em] text-foreground transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">
              <HoverRevealButton>Enter the arena</HoverRevealButton><span className="material-symbols-outlined text-lg transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
            </Link>
            <span className="hidden font-tech text-[9px] uppercase tracking-[0.18em] text-muted sm:block">Built on Solana / Real prizes</span>
          </div>
        </div>

        <div data-finale-player className="relative h-[52vh] min-h-[420px] lg:h-[76vh] lg:min-h-[620px]">
          <Image src="/assets/cards/player-arena.webp" alt="Soccit manager ready at the players tunnel" fill sizes="(max-width: 1024px) 92vw, 50vw" className="object-contain object-bottom drop-shadow-[0_35px_30px_rgba(10,22,40,0.25)]" />
          <div className="absolute bottom-[6%] right-[4%] border border-white/20 bg-foreground px-4 py-3 text-white sm:right-[10%]">
            <span className="block font-tech text-[8px] uppercase tracking-[0.2em] text-white/55">Entry status</span><span className="mt-1 block font-display text-sm text-cyan">ARENA OPEN</span>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-0 left-0 z-20 w-full px-5 py-5 text-white sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <span className="font-tech text-[9px] uppercase tracking-[0.18em] text-white/60">© 2026 Soccit / Season 01</span>
          <div className="flex items-center gap-5">
            <a href="https://x.com/soccit" target="_blank" rel="noreferrer" className="min-h-10 py-3 font-tech text-[9px] uppercase tracking-[0.18em] text-white/60 transition-colors duration-100 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan">X</a>
            <a href="https://discord.gg/soccit" target="_blank" rel="noreferrer" className="hidden min-h-10 py-3 font-tech text-[9px] uppercase tracking-[0.18em] text-white/60 transition-colors duration-100 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan sm:block">Discord</a>
            <HoverRevealLink href="#top" className="min-h-10 py-3 font-tech text-[9px] uppercase tracking-[0.18em] text-white/60 transition-colors duration-100 hover:text-cyan" underline>Top</HoverRevealLink>
          </div>
        </div>
      </footer>
    </section>
  );
}
