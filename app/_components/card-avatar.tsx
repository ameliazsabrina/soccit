"use client";

import { cn } from "../_lib/utils";

interface CardAvatarProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Renders a full-body character avatar inside a TCG card.
 *
 * Card frame pixel analysis (1023×1537, all 4 position cards identical):
 *
 *   ┌──────────────────────────┐  0%
 *   │▓▓ border border border ▓▓│  ~2%    ← gold border frame
 *   │ [POS]      [##]          │  3-15%  ← header (position code + number)
 *   │                          │  ~16%   ← picture area starts
 *   │   ┌──────────────────┐   │
 *   │   │                  │   │
 *   │   │   CHARACTER      │   │
 *   │   │    CUTOUT        │   │
 *   │   │                  │   │
 *   │   └──────────────────┘   │  ~80%   ← picture area ends
 *   │ ▓▓▓▓ NAME BAR ▓▓▓▓▓▓▓ │  83-97%  ← name bar (bright gold band)
 *   │▓▓ border border border ▓▓│  ~98%
 *   └──────────────────────────┘  100%
 *
 * Avatar images are 1024×1536 (2:3) transparent WebP cutouts. The outer
 * wrapper defines the picture window; the inner image fills that window and
 * anchors the character's feet just behind the name bar.
 */
export function CardAvatar({ src, alt, className }: CardAvatarProps) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-x-[3%] bottom-[13%] top-[10%] overflow-hidden",
        className,
      )}
    >
      {/* The wrapper owns the inset box. Replaced elements keep their intrinsic
          size when only absolute insets are set, which was why these 1024px
          cutouts still rendered oversized and clipped inside small cards. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-contain object-bottom"
      />
    </span>
  );
}

export function CardAvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[24%] bottom-[27%] top-[30%] flex items-center justify-center border border-white/20 bg-foreground/35 font-display text-[10px] text-white backdrop-blur-sm sm:text-base"
    >
      {initials || "?"}
    </span>
  );
}
