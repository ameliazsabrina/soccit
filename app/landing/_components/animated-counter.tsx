"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

function formatNumber(
  raw: number,
  decimals: number,
  prefix: string,
  suffix: string,
  formatOptions?: Intl.NumberFormatOptions
) {
  const num = decimals > 0 ? Number(raw.toFixed(decimals)) : Math.floor(raw);
  const formatted = formatOptions
    ? num.toLocaleString("en-US", formatOptions)
    : num.toLocaleString("en-US");
  return `${prefix}${formatted}${suffix}`;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
  className = "",
  formatOptions,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });
  const shouldReduceMotion = useReducedMotion();

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 50,
    stiffness: 100,
    duration: shouldReduceMotion ? 0 : duration,
  });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    if (shouldReduceMotion && ref.current) {
      ref.current.textContent = formatNumber(value, decimals, prefix, suffix, formatOptions);
      return;
    }

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(latest, decimals, prefix, suffix, formatOptions);
      }
    });

    return () => unsubscribe();
  }, [springValue, value, shouldReduceMotion, decimals, prefix, suffix, formatOptions]);

  return (
    <span ref={ref} className={className}>
      {formatNumber(0, decimals, prefix, suffix, formatOptions)}
    </span>
  );
}
