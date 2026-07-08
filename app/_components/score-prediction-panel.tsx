"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Trophy, TrendingUp } from "lucide-react";
import { SlideToLock } from "./slide-to-lock";

interface ScorePredictionPanelProps {
  team1Name: string;
  team2Name: string;
  currentScore: { team1: number; team2: number };
  minute: number;
  isLive: boolean;
  onLock: (score1: number, score2: number) => void;
  locked?: boolean;
  isSubmitting?: boolean;
}

export function ScorePredictionPanel({
  team1Name,
  team2Name,
  currentScore,
  isLive,
  onLock,
  locked,
  isSubmitting,
}: ScorePredictionPanelProps) {
  const [score1, setScore1] = useState(currentScore.team1);
  const [score2, setScore2] = useState(currentScore.team2);

  const outcome =
    score1 === score2 ? "Draw" : score1 > score2 ? `${team1Name} wins` : `${team2Name} wins`;

  function adjust(team: 1 | 2, delta: number) {
    if (team === 1) {
      setScore1((s) => Math.max(0, Math.min(99, s + delta)));
    } else {
      setScore2((s) => Math.max(0, Math.min(99, s + delta)));
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-purple/10 p-6 md:p-10"
      >
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl text-foreground md:text-4xl">Call the Score</h2>
          <p className="mt-2 text-sm text-muted">
            Predict the final whistle scoreline.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-4 md:gap-8">
          <TeamScore
            name={team1Name}
            score={score1}
            onAdjust={(d) => adjust(1, d)}
          />

          <div className="flex flex-col items-center gap-2">
            <span className="font-display text-2xl text-muted">VS</span>
            {!isLive && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Full Time</span>
            )}
          </div>

          <TeamScore
            name={team2Name}
            score={score2}
            onAdjust={(d) => adjust(2, d)}
          />
        </div>

        <div className="mb-8 border border-surface bg-background/50 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Predicted Outcome</p>
          <p className="mt-1 font-display text-xl text-foreground">{outcome}</p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="border border-gold/30 bg-gold/5 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-gold">
              <Trophy size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Exact Score</span>
            </div>
            <p className="font-display text-2xl text-foreground">5 pts</p>
          </div>
          <div className="border border-cyan/30 bg-cyan/5 p-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2 text-cyan">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Correct Outcome</span>
            </div>
            <p className="font-display text-2xl text-foreground">3 pts</p>
          </div>
        </div>

        <SlideToLock
          onLock={() => onLock(score1, score2)}
          disabled={locked || isSubmitting}
          label={locked ? "LOCKED" : isSubmitting ? "SUBMITTING…" : "SLIDE TO LOCK SCORE"}
        />
      </motion.div>
    </div>
  );
}

function TeamScore({
  name,
  score,
  onAdjust,
}: {
  name: string;
  score: number;
  onAdjust: (delta: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="max-w-[120px] text-center font-display text-sm uppercase tracking-wider text-foreground md:text-base">
        {name}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAdjust(-1)}
          className="flex h-10 w-10 items-center justify-center border border-surface bg-background text-foreground transition-colors hover:border-purple hover:text-purple"
          aria-label="Decrease score"
        >
          <Minus size={18} />
        </button>
        <div className="flex h-16 w-16 items-center justify-center border-2 border-surface bg-background">
          <span className="font-display text-4xl text-foreground">{score}</span>
        </div>
        <button
          onClick={() => onAdjust(1)}
          className="flex h-10 w-10 items-center justify-center border border-surface bg-background text-foreground transition-colors hover:border-purple hover:text-purple"
          aria-label="Increase score"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
