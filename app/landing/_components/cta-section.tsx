"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { gsap, SplitText, useGSAP } from "./gsap-setup";
import { HoverRevealButton, HoverRevealLink } from "./hover-reveal";
import { SOCCIT_APP_URL, SOCCIT_MATCHES_URL } from "../_lib/app-urls";

const FOOTER_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Docs", href: "/docs" },
  { label: "Whitepaper", href: "/whitepaper" },
] as const;

const COMMUNITY_LINKS = [
  { label: "X", href: "https://x.com/playsoccit" },
  { label: "Discord", href: "https://discord.gg/soccit" },
] as const;

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
      .from("[data-finale]", { y: 28, autoAlpha: 0, stagger: 0.08, duration: 0.55, ease: "power3.out" }, 0.3)
      .from("[data-tunnel-line]", { scaleX: 0, stagger: 0.04, duration: 0.55, transformOrigin: "center", ease: "power3.out" }, 0.15);
    return () => split.revert();
  }, { scope: container });

  return (
    <section ref={container} id="landing-footer" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-transparent px-5 pt-16 sm:px-8 lg:h-[100svh] lg:px-14 lg:pt-12">
      <div className="landing-tunnel pointer-events-none absolute inset-0">
        {[0, 1, 2, 3, 4].map((line) => <span key={line} data-tunnel-line className="absolute left-1/2 top-1/2 block border border-foreground/10" style={{ width: `${34 + line * 15}%`, height: `${25 + line * 16}%`, transform: "translate(-50%, -50%)" }} />)}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-purple sm:h-[40%] lg:h-[34%]" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 items-center justify-center">
        <div className="relative z-20 flex max-w-5xl flex-col items-center pb-8 text-center lg:pb-12">
          <span data-finale className="font-tech text-[10px] uppercase tracking-[0.25em] text-purple">Your match is waiting</span>
          <h2 ref={heading} className="mt-4 font-display text-[clamp(2.45rem,6.3vw,6.75rem)] uppercase leading-[0.77] tracking-[-0.075em] text-foreground">COMPETE<br /><span className="whitespace-nowrap text-outline-blue">AND PROVE IT.</span></h2>
          <p data-finale className="mt-7 max-w-md font-body text-sm leading-relaxed text-foreground/65 sm:text-base">Connect your wallet. Pick the live match. Make the call that everyone else missed.</p>
          <div data-finale className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={SOCCIT_MATCHES_URL} className="landing-cut-button group group/reveal inline-flex min-h-12 items-center gap-4 bg-cyan px-7 py-3 font-display text-xs uppercase tracking-[0.15em] text-foreground transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">
              <HoverRevealButton>Enter the arena</HoverRevealButton>
              <ArrowRight size={17} strokeWidth={2} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href={SOCCIT_APP_URL} className="landing-cut-button group group/reveal inline-flex min-h-12 items-center gap-4 border border-purple bg-white px-7 py-3 font-display text-xs uppercase tracking-[0.15em] text-purple transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">
              <HoverRevealButton>Main menu</HoverRevealButton>
              <ArrowRight size={17} strokeWidth={2} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <span data-finale className="mt-4 hidden font-tech text-[9px] uppercase tracking-[0.18em] text-muted sm:block">Built on Solana / Real prizes</span>
        </div>
      </div>

      <footer className="relative z-20 w-full shrink-0 border-t border-white/25 pb-16 pt-4 text-white sm:pb-20 sm:pt-5 lg:pb-16">
        <div className="mx-auto grid max-w-[1500px] items-center gap-4 lg:grid-cols-[0.55fr_1.45fr] lg:gap-8">
          <div className="flex items-center gap-3">
            <Image src="/assets/soccit-logo.svg" alt="" width={54} height={34} className="h-7 w-11 object-contain" />
            <div>
              <span className="block font-display text-sm tracking-[0.12em]">SOCCIT</span>
              <span className="block font-tech text-xs uppercase tracking-[0.12em] text-white/80">© 2026 / Season 01</span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 lg:justify-end" aria-label="Footer navigation">
            {FOOTER_LINKS.map((link) => (
              <HoverRevealLink
                key={link.href}
                href={link.href}
                underline
                className="min-h-10 items-center py-2 font-tech text-xs uppercase tracking-[0.12em] text-white/85 transition-colors duration-100 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-purple"
              >
                {link.label}
              </HoverRevealLink>
            ))}
            {COMMUNITY_LINKS.map((link) => (
              <HoverRevealLink
                key={link.href}
                href={link.href}
                external
                underline
                className="min-h-10 items-center py-2 font-tech text-xs uppercase tracking-[0.12em] text-white/85 transition-colors duration-100 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-purple"
              >
                {link.label}
              </HoverRevealLink>
            ))}
            <HoverRevealLink
              href="#top"
              underline
              className="min-h-10 items-center py-2 font-tech text-xs uppercase tracking-[0.12em] text-white/85 transition-colors duration-100 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-purple"
            >
              Top
            </HoverRevealLink>
          </nav>

        </div>
      </footer>
    </section>
  );
}
