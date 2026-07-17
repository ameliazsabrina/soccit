"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BottomNav } from "./bottom-nav";
import { ScrollProgress } from "./scroll-progress";
import { StadiumFrame } from "./stadium-frame";

type LandingPhase = "checking" | "loading" | "hero" | "content";

interface LandingExperienceValue {
  phase: LandingPhase;
  completeLoading: () => void;
  enterContent: () => void;
}

const LandingExperienceContext = createContext<LandingExperienceValue | null>(null);
const SESSION_KEY = "soccit-landing-seen";

export function LandingExperienceProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<LandingPhase>("checking");

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY)) {
      setPhase("hero");
    } else {
      setPhase("loading");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("landing-scrollbar-hidden");
    return () => document.documentElement.classList.remove("landing-scrollbar-hidden");
  }, []);

  useEffect(() => {
    if (phase === "content") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  const completeLoading = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "true");
    setPhase("hero");
  }, []);

  const enterContent = useCallback(() => {
    setPhase("content");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("soccit:scroll-to-how-it-works"));
      });
    });
  }, []);

  useEffect(() => {
    if (phase !== "hero") return;

    const recoverFromNativeScroll = () => {
      if (window.scrollY > 4) enterContent();
    };

    window.addEventListener("scroll", recoverFromNativeScroll, { passive: true });
    return () => window.removeEventListener("scroll", recoverFromNativeScroll);
  }, [enterContent, phase]);

  const value = useMemo(
    () => ({ phase, completeLoading, enterContent }),
    [phase, completeLoading, enterContent],
  );

  return <LandingExperienceContext.Provider value={value}>{children}</LandingExperienceContext.Provider>;
}

export function useLandingExperience() {
  const context = useContext(LandingExperienceContext);
  if (!context) {
    throw new Error("useLandingExperience must be used inside LandingExperienceProvider");
  }
  return context;
}

export function LandingExperienceChrome({ audioTracks }: { audioTracks: string[] }) {
  const { phase } = useLandingExperience();
  const contentVisible = phase === "content";

  return (
    <>
      <StadiumFrame audioTracks={audioTracks} visible={contentVisible} />
      {contentVisible && (
        <>
          <ScrollProgress />
          <BottomNav />
        </>
      )}
    </>
  );
}
