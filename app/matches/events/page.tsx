"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { PageShell } from "../../_components/page-shell";
import { WorldCupTransition } from "../../_components/worldcup-transition";
import { cn } from "../../_lib/utils";

const FWC_LOGO_WHITE = "/assets/events/fwc-logo-white.svg";

// Mock Round of 32 bracket for WC 2026. Replace with API data when ready.
const MOCK_KNOCKOUT: KnockoutBracket = {
  updatedAt: Date.now(),
  rounds: [
    {
      name: "Round of 32",
      shortName: "R32",
      matches: [
        { id: "r32-1", home: { name: "Netherlands", code: "nl" }, away: { name: "United States", code: "us" }, homeScore: null, awayScore: null },
        { id: "r32-2", home: { name: "Argentina", code: "ar" }, away: { name: "Australia", code: "au" }, homeScore: null, awayScore: null },
        { id: "r32-3", home: { name: "Japan", code: "jp" }, away: { name: "Croatia", code: "hr" }, homeScore: null, awayScore: null },
        { id: "r32-4", home: { name: "Brazil", code: "br" }, away: { name: "South Korea", code: "kr" }, homeScore: null, awayScore: null },
        { id: "r32-5", home: { name: "England", code: "gb-eng" }, away: { name: "Senegal", code: "sn" }, homeScore: null, awayScore: null },
        { id: "r32-6", home: { name: "France", code: "fr" }, away: { name: "Poland", code: "pl" }, homeScore: null, awayScore: null },
        { id: "r32-7", home: { name: "Morocco", code: "ma" }, away: { name: "Spain", code: "es" }, homeScore: null, awayScore: null },
        { id: "r32-8", home: { name: "Portugal", code: "pt" }, away: { name: "Switzerland", code: "ch" }, homeScore: null, awayScore: null },
      ],
    },
    {
      name: "Round of 16",
      shortName: "R16",
      matches: [
        { id: "r16-1", home: { name: "Netherlands", code: "nl" }, away: { name: "Argentina", code: "ar" }, homeScore: null, awayScore: null },
        { id: "r16-2", home: { name: "Croatia", code: "hr" }, away: { name: "Brazil", code: "br" }, homeScore: null, awayScore: null },
        { id: "r16-3", home: { name: "England", code: "gb-eng" }, away: { name: "France", code: "fr" }, homeScore: null, awayScore: null },
        { id: "r16-4", home: { name: "Morocco", code: "ma" }, away: { name: "Portugal", code: "pt" }, homeScore: null, awayScore: null },
      ],
    },
    {
      name: "Quarter-Finals",
      shortName: "QF",
      matches: [
        { id: "qf-1", home: { name: "Argentina", code: "ar" }, away: { name: "Croatia", code: "hr" }, homeScore: null, awayScore: null },
        { id: "qf-2", home: { name: "France", code: "fr" }, away: { name: "Morocco", code: "ma" }, homeScore: null, awayScore: null },
      ],
    },
    {
      name: "Semi-Finals",
      shortName: "SF",
      matches: [
        { id: "sf-1", home: { name: "Argentina", code: "ar" }, away: { name: "France", code: "fr" }, homeScore: null, awayScore: null },
      ],
    },
    {
      name: "Final",
      shortName: "Final",
      matches: [
        { id: "final", home: { name: "Argentina", code: "ar" }, away: { name: "France", code: "fr" }, homeScore: null, awayScore: null },
      ],
    },
  ],
};

type Team = {
  name: string;
  code: string;
};

type KnockoutMatch = {
  id: string;
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
};

type KnockoutRound = {
  name: string;
  shortName: string;
  matches: KnockoutMatch[];
};

type KnockoutBracket = {
  updatedAt: number;
  rounds: KnockoutRound[];
};

export default function WorldCupPage() {
  // Render mock bracket immediately. The page-entry transition overlay runs on
  // this page after navigation, so the bracket is already underneath.
  const [bracket] = useState<KnockoutBracket>(MOCK_KNOCKOUT);
  const [showTransition, setShowTransition] = useState(true);

  return (
    <>
      {showTransition && (
        <WorldCupTransition
          mode="enter"
          onComplete={() => setShowTransition(false)}
        />
      )}
    <PageShell variant="worldcup">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header: logo + title */}
        <header className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-3 h-16 w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FWC_LOGO_WHITE}
              alt="World Cup 2026"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="font-wc text-3xl text-white sm:text-4xl md:text-5xl">
            World Cup bracket
          </h1>
          <p className="font-wc-support mt-1 text-xs font-bold uppercase tracking-[0.25em] text-wc-cyan">
            Round of 32 Update
          </p>
        </header>

        {/* Bracket */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <BracketTree bracket={bracket} />
        </div>
      </div>
    </PageShell>
    </>
  );
}

function BracketTree({ bracket }: { bracket: KnockoutBracket }) {
  const [r32, r16, qf, sf, final] = bracket.rounds;

  return (
    <div className="relative flex flex-1 flex-col items-center overflow-y-auto overflow-x-hidden py-2">
      {/* Center trophy — fixed visual anchor */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center lg:flex">
        <Trophy size={56} className="text-wc-yellow drop-shadow-[0_0_30px_rgba(237,255,66,0.25)]" />
      </div>

      {/* Round of 32 */}
      <BracketRound
        round={r32}
        leftMatches={r32.matches.slice(0, 4)}
        rightMatches={r32.matches.slice(4, 8)}
      />

      {/* Round of 16 */}
      <BracketRound
        round={r16}
        leftMatches={r16.matches.slice(0, 2)}
        rightMatches={r16.matches.slice(2, 4)}
      />

      {/* Quarter-Finals */}
      <BracketRound
        round={qf}
        leftMatches={qf.matches.slice(0, 1)}
        rightMatches={qf.matches.slice(1, 2)}
      />

      {/* Semi-Finals */}
      <BracketRound
        round={sf}
        leftMatches={sf.matches.slice(0, 1)}
        rightMatches={sf.matches.slice(0, 1)}
      />

      {/* Final */}
      <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
        <Trophy size={32} className="text-wc-yellow lg:hidden" />
        {final.matches.map((match) => (
          <FinalMatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function BracketRound({
  round,
  leftMatches,
  rightMatches,
}: {
  round: KnockoutRound;
  leftMatches: KnockoutMatch[];
  rightMatches: KnockoutMatch[];
}) {
  return (
    <div className="relative z-10 mb-4 w-full max-w-4xl">
      <h3 className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-wc-cyan">
        {round.name}
      </h3>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col items-end gap-3">
          {leftMatches.map((match, i) => (
            <MatchNode key={match.id} match={match} side="left" index={i} />
          ))}
        </div>
        <div className="w-12 flex-shrink-0" /> {/* spacer for trophy */}
        <div className="flex flex-1 flex-col items-start gap-3">
          {rightMatches.map((match, i) => (
            <MatchNode key={match.id} match={match} side="right" index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchNode({
  match,
  side,
  index,
}: {
  match: KnockoutMatch;
  side: "left" | "right";
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex w-36 flex-col border border-white/10 bg-white/5 sm:w-44"
    >
      <TeamRow team={match.home} score={match.homeScore} />
      <div className="h-px bg-white/10" />
      <TeamRow team={match.away} score={match.awayScore} />
    </motion.div>
  );
}

function FinalMatchCard({ match }: { match: KnockoutMatch }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex w-52 flex-col border border-wc-yellow/30 bg-gradient-to-b from-wc-blue/20 to-wc-purple/20 sm:w-60"
    >
      <TeamRow team={match.home} score={match.homeScore} highlight />
      <div className="h-px bg-wc-yellow/20" />
      <TeamRow team={match.away} score={match.awayScore} highlight />
    </motion.div>
  );
}

function TeamRow({
  team,
  score,
  highlight,
}: {
  team: Team;
  score: number | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 sm:px-3 sm:py-2">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/${team.code}.svg`}
          alt={team.name}
          className="h-4 w-6 object-cover sm:h-5 sm:w-7"
        />
        <span
          className={cn(
            "truncate text-xs font-medium text-white/90 sm:text-sm",
            highlight && "text-white"
          )}
        >
          {team.name}
        </span>
      </div>
      <span className="ml-2 font-mono text-xs font-bold text-wc-cyan sm:text-sm">
        {score ?? "—"}
      </span>
    </div>
  );
}


