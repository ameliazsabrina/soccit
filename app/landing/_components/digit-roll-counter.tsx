"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface DigitRollCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function DigitRollCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2,
  className = "",
}: DigitRollCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let startTime: number | null = null;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [isInView, value, duration, shouldReduceMotion]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString("en-US");

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted.split("").map((char, idx) => (
        <span key={idx} className="inline-block overflow-hidden align-bottom">
          <span
            className="inline-block transition-transform duration-700 ease-out"
            style={{
              transform: isInView && !shouldReduceMotion ? "translateY(0)" : "translateY(100%)",
              transitionDelay: `${idx * 40}ms`,
            }}
          >
            {char}
          </span>
        </span>
      ))}
      {suffix}
    </span>
  );
}
