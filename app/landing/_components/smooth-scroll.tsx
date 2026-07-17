"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "./gsap-setup";
import { useLandingExperience } from "./landing-experience";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const { phase } = useLandingExperience();

  useEffect(() => {
    const scrollToHowItWorks = () => {
      ScrollTrigger.refresh();
      const howTrigger = ScrollTrigger.getById("landing-how-it-works");
      const section = document.getElementById("how-it-works");
      const target = howTrigger?.start
        ?? (section ? window.scrollY + section.getBoundingClientRect().top : null);
      if (target === null) return;

      gsap.to(window, {
        scrollTo: { y: target, autoKill: true },
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.4,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    };

    window.addEventListener("soccit:scroll-to-how-it-works", scrollToHowItWorks);
    return () => window.removeEventListener("soccit:scroll-to-how-it-works", scrollToHowItWorks);
  }, []);

  useEffect(() => {
    if (phase !== "hero") return;

    let entryRequested = false;
    let touchStartY: number | null = null;
    const requestEntry = () => {
      if (entryRequested) return;
      entryRequested = true;
      window.dispatchEvent(new CustomEvent("soccit:request-enter-content"));
    };
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY > 0) requestEntry();
    };
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (touchStartY === null) return;
      const currentY = event.touches[0]?.clientY;
      if (currentY !== undefined && touchStartY - currentY > 18) requestEntry();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(event.key)) requestEntry();
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase]);

  return <>{children}</>;
}
