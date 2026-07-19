"use client";

import Image from "next/image";
import { cn } from "../_lib/utils";
import { type AvatarId } from "../_lib/api";

const AVATARS: AvatarId[] = [
  "avatar-0",
  "avatar-1",
  "avatar-2",
  "avatar-3",
  "avatar-4",
  "avatar-5",
  "avatar-6",
  "avatar-7",
  "avatar-8",
  "avatar-9",
  "avatar-10",
  "avatar-11",
];

interface AvatarPickerProps {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  columns?: 3 | 4 | 5 | 6;
}

export function AvatarPicker({ value, onChange, columns = 4 }: AvatarPickerProps) {
  const gridCols = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns])}>
      {AVATARS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "relative aspect-square overflow-hidden border-2 transition-all",
            value === id
              ? "border-purple ring-2 ring-purple ring-offset-2 ring-offset-surface"
              : "border-surface hover:border-purple/50"
          )}
        >
          <Image
            src={`/api/assets/avatars/${id}.webp`}
            alt={id}
            fill
            sizes="5rem"
            className="object-cover"
            unoptimized
          />
        </button>
      ))}
    </div>
  );
}
