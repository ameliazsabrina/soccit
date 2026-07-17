"use client";

import Link from "next/link";
import { cn } from "@/app/_lib/utils";

interface HoverRevealProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  underline?: boolean;
  external?: boolean;
}

export function HoverRevealLink({
  href,
  children,
  className,
  underline = false,
  external = false,
}: HoverRevealProps) {
  const shared = cn(
    "group/reveal relative inline-flex",
    className
  );

  const inner = (
    <span className="relative inline-flex overflow-hidden leading-none">
      <span className="hover-reveal-line inline-block transition-transform duration-200 ease-out group-hover/reveal:-translate-y-full group-focus-visible/reveal:-translate-y-full">
        {children}
      </span>
      <span
        className="hover-reveal-line absolute left-0 top-full inline-block transition-transform duration-200 ease-out group-hover/reveal:-translate-y-full group-focus-visible/reveal:-translate-y-full"
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cn(shared, underline && "hover-reveal-underline")}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cn(shared, underline && "hover-reveal-underline")}>
      {inner}
    </Link>
  );
}

export function HoverRevealButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex overflow-hidden leading-none", className)}>
      <span className="hover-reveal-line inline-block transition-transform duration-200 ease-out group-hover/reveal:-translate-y-full group-focus-visible/reveal:-translate-y-full">
        {children}
      </span>
      <span
        className="hover-reveal-line absolute left-0 top-full inline-block transition-transform duration-200 ease-out group-hover/reveal:-translate-y-full group-focus-visible/reveal:-translate-y-full"
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );
}
