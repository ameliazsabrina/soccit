"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventsTransition } from "./events-transition";

const EVENT_BRANDING: Record<string, EventBranding> = {
  worldcup: {
    logoExit: "/assets/events/fwc-logo-white.svg",
    titleExit: "See You",
    subtitleExit: "World Cup 2026",
  },
  ucl: {
    logoExit: "/assets/events/ucl-logo-white.svg",
    titleExit: "See You",
    subtitleExit: "Champions League",
  },
};

type EventBranding = {
  logoExit: string;
  titleExit: string;
  subtitleExit: string;
};

function getExitSlug(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("event_exit");
    if (fromUrl) return fromUrl;
  }
  return "";
}

export function EventExitTransition() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Capture slug on mount from URL so it survives router.replace cleanup.
  const [slug] = useState(() => searchParams.get("event_exit") ?? getExitSlug());
  const [show, setShow] = useState(() => slug !== "");

  // Strip the query param after the transition has started so a refresh
  // on /matches doesn't replay it.
  useEffect(() => {
    if (!slug) return;

    const timer = setTimeout(() => {
      router.replace("/matches", { scroll: false });
    }, 100);

    return () => clearTimeout(timer);
  }, [slug, router]);

  if (!show || !slug) return null;

  const brand = EVENT_BRANDING[slug] ?? EVENT_BRANDING.worldcup;

  return (
    <EventsTransition
      mode="exit"
      logoExit={brand.logoExit}
      titleExit={brand.titleExit}
      subtitleExit={brand.subtitleExit}
      onComplete={() => setShow(false)}
    />
  );
}
