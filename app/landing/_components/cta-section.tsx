"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { gsap, SplitText, useGSAP } from "./gsap-setup";

export function CTASection() {
  const container = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const shouldReduceMotion = useReducedMotion();

  // Magnetic button
  const btnX = useMotionValue(0);
  const btnY = useMotionValue(0);
  const springX = useSpring(btnX, { stiffness: 150, damping: 15 });
  const springY = useSpring(btnY, { stiffness: 150, damping: 15 });

  function handleBtnMove(e: React.MouseEvent) {
    if (shouldReduceMotion || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    btnX.set((e.clientX - rect.left - rect.width / 2) * 0.12);
    btnY.set((e.clientY - rect.top - rect.height / 2) * 0.12);
  }

  function handleBtnLeave() {
    btnX.set(0);
    btnY.set(0);
  }

  function handleBtnClick(e: React.MouseEvent) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
  }

  useGSAP(
    () => {
      if (shouldReduceMotion) {
        gsap.set("[data-cta-animate]", { autoAlpha: 1, y: 0, yPercent: 0, scale: 1 });
        return;
      }

      ScrollTrigger.create({
        trigger: container.current,
        pin: true,
        start: "top top",
        end: "+=50%",
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top 60%",
          once: true,
        },
      });

      const split = SplitText.create(headlineRef.current, {
        type: "words",
        mask: "words",
        autoSplit: true,
        onSplit(self) {
          tl.from(
            self.words,
            {
              yPercent: 110,
              rotationX: 45,
              autoAlpha: 0,
              duration: 0.8,
              stagger: 0.1,
              transformOrigin: "bottom",
              ease: "power3.out",
            },
            0
          );
        },
      });

      tl.from("[data-cta-logo]", { scale: 0.8, autoAlpha: 0, duration: 0.6, ease: "back.out(1.7)" }, 0.2);
      tl.from("[data-cta-subhead]", { y: 20, autoAlpha: 0, duration: 0.6 }, 0.4);
      tl.from("[data-cta-button-wrap]", { y: 40, autoAlpha: 0, duration: 0.6 }, 0.55);
      tl.from("[data-cta-meta]", { y: 20, autoAlpha: 0, duration: 0.6 }, 0.7);

      return () => {
        split.revert();
      };
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 sm:px-8 lg:px-12"
    >
      {/* Aurora mesh background */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(3,70,148,0.4), transparent 35%), radial-gradient(circle at 80% 40%, rgba(219,161,17,0.3), transparent 35%), radial-gradient(circle at 50% 80%, rgba(3,70,148,0.3), transparent 40%)",
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo with rotating ring */}
        <motion.div
          data-cta-logo
          className="relative mb-6 opacity-0"
          whileHover={{ rotate: 10, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <Image
            src="/assets/soccit-logo.svg"
            alt="Soccit"
            width={80}
            height={80}
            className="relative z-10 h-16 w-16 invert dark:invert-0 sm:h-20 sm:w-20"
          />
          <motion.div
            className="absolute inset-0 -m-3 border border-cyan/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        <h2
          ref={headlineRef}
          className="font-display text-5xl uppercase text-foreground sm:text-6xl md:text-7xl text-shadow-sm"
        >
          <span className="block text-outline">READY</span>
          <span className="block">TO PLAY?</span>
        </h2>

        <p
          data-cta-animate
          data-cta-subhead
          className="mt-4 max-w-md font-body text-lg text-muted opacity-0"
        >
          Connect your wallet. Pick a match. Call the game.
        </p>

        <motion.div
          data-cta-animate
          data-cta-button-wrap
          className="mt-8 opacity-0"
          style={{ x: springX, y: springY }}
          onMouseMove={handleBtnMove}
          onMouseLeave={handleBtnLeave}
        >
          <Link
            ref={buttonRef}
            href="/matches"
            onClick={handleBtnClick}
            className="btn-gradient relative inline-flex items-center gap-3 overflow-hidden px-12 py-6 font-display text-xl uppercase tracking-[0.1em] text-white shadow-[0_0_30px_rgba(219,161,17,0.25)] transition-shadow hover:shadow-[0_0_50px_rgba(219,161,17,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="relative z-10">Enter the Arena</span>
            <span className="material-symbols-outlined relative z-10 text-2xl">arrow_forward</span>
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="pointer-events-none absolute bg-white/30"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 20,
                  height: 20,
                  marginLeft: -10,
                  marginTop: -10,
                  animation: "ripple 0.6s ease-out forwards",
                }}
              />
            ))}
          </Link>
        </motion.div>

        <p
          data-cta-animate
          data-cta-meta
          className="mt-6 font-tech text-xs uppercase tracking-wider text-muted opacity-0"
        >
          Built on Solana · On-chain predictions · Real prizes
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full border-t border-muted/20 px-6 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="font-tech text-xs uppercase text-muted">© 2026 Soccit</span>
          <div className="flex items-center gap-6">
            <a
              href="https://x.com/soccit"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-foreground"
              aria-label="X / Twitter"
            >
              <span className="material-symbols-outlined">share</span>
            </a>
            <a
              href="https://discord.gg/soccit"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-foreground"
              aria-label="Discord"
            >
              <span className="material-symbols-outlined">chat</span>
            </a>
            <a
              href="https://github.com/soccit"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors hover:text-foreground"
              aria-label="GitHub"
            >
              <span className="material-symbols-outlined">code</span>
            </a>
            <a
              href="#top"
              className="font-tech text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
            >
              Back to top
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}
