"use client";

import { cn } from "../_lib/utils";

interface EnterButtonProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Reusable "Enter" CTA style taken from the card-hero button on the start menu.
 * Use it inside a Next.js `<Link>` or a `<button>`.
 */
export function EnterButton({ children = "ENTER MATCH", className }: EnterButtonProps) {
  return (
    <span
      className={cn(
        "btn-gradient inline-flex items-center gap-3 px-8 py-4 font-display text-xl uppercase tracking-[0.1em] text-white",
        className
      )}
    >
      {children}
      <span className="material-symbols-outlined">arrow_forward</span>
    </span>
  );
}
