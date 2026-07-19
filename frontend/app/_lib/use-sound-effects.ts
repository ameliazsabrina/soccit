"use client";

import { useEffect } from "react";
import { sound } from "./sound";

// Elements that count as "interactive" for sound purposes. Matches:
//  - semantic: button, link, role=button, tabindex
//  - opt-in:   [data-sound] (explicit)
//  - visual:   .cursor-pointer, .group-card (cards/buttons with hover styles)
const INTERACTIVE_SELECTOR =
  "button, a, [role='button'], [tabindex]:not([tabindex='-1']), [data-sound], .cursor-pointer, .group-card";

function findInteractive(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(INTERACTIVE_SELECTOR);
}

function isDisabledEl(el: Element): boolean {
  if (el.hasAttribute("disabled")) return true;
  if (el.getAttribute("aria-disabled") === "true") return true;
  return false;
}

/**
 * App-wide hover + click sound effects via event delegation.
 *
 * Mount once near the root (see Providers). No per-component wiring needed —
 * any element matching INTERACTIVE_SELECTOR gets hover/click sounds.
 *
 * Respects the sound manager's mute flag and stays silent until the first
 * user gesture (AudioContext autoplay policy).
 */
export function useSoundEffects() {
  useEffect(() => {
    let lastHoverEl: Element | null = null;
    let lastHoverAt = 0;

    const onPointerDown = () => {
      // Browsers require a gesture before AudioContext can start.
      void sound.initOnGesture();
    };

    const onMouseOver = (e: MouseEvent) => {
      const interactive = findInteractive(e.target);
      if (!interactive) return;
      if (isDisabledEl(interactive)) return;
      const now = performance.now();
      // Per-element dedupe: don't replay while moving within the same card.
      if (interactive === lastHoverEl && now - lastHoverAt < 500) return;
      lastHoverEl = interactive;
      lastHoverAt = now;
      sound.playHover(interactive);
    };

    const onClick = (e: MouseEvent) => {
      const interactive = findInteractive(e.target);
      if (!interactive) return;
      if (isDisabledEl(interactive)) return;
      sound.playClick();
    };

    // pointerdown (capture) primes the AudioContext on the very first gesture.
    document.addEventListener("pointerdown", onPointerDown, {
      capture: true,
    });
    // mouseover bubbles — single delegated listener for all hovers.
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("click", onClick, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, {
        capture: true,
      });
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("click", onClick);
    };
  }, []);
}
