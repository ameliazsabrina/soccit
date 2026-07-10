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
    "group relative inline-flex overflow-hidden",
    className
  );

  const inner = (
    <>
      <span className="hover-reveal-line inline-block transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full">
        {children}
      </span>
      <span
        className="hover-reveal-line absolute left-0 top-full inline-block transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
        aria-hidden="true"
      >
        {children}
      </span>
    </>
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
    <span className={cn("group relative inline-flex overflow-hidden", className)}>
      <span className="hover-reveal-line inline-block transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full">
        {children}
      </span>
      <span
        className="hover-reveal-line absolute left-0 top-full inline-block transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );
}
