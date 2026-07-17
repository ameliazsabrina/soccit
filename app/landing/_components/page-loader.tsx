"use client";

import { EventsTransition } from "../../_components/events-transition";
import { useLandingExperience } from "./landing-experience";

export function PageLoader() {
  const { phase, completeLoading } = useLandingExperience();

  if (phase === "checking") {
    return <div className="fixed inset-0 z-[9999] bg-purple" aria-hidden="true" />;
  }

  if (phase !== "loading") return null;

  return (
    <EventsTransition
      mode="enter"
      tone="soccit"
      minimal
      logoEnter="/assets/soccit-logo.svg"
      titleEnter="Soccit"
      onComplete={completeLoading}
    />
  );
}
