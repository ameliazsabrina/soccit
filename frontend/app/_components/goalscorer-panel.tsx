"use client";

import { Lock } from "lucide-react";
import { type PlayerCardData } from "./player-card";

interface GoalscorerPanelProps {
  team1Name: string;
  team2Name: string;
  players: PlayerCardData[];
}

export function GoalscorerPanel({}: GoalscorerPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <div className="flex h-16 w-16 items-center justify-center bg-surface text-muted">
        <Lock size={32} />
      </div>
      <h2 className="font-display text-2xl text-foreground">Goalscorer</h2>
      <p className="text-sm text-muted">Coming Soon</p>
    </div>
  );
}
