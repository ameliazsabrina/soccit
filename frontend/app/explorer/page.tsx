"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Search,
  Filter,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Activity,
  Trophy,
  Wallet,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { PageShell } from "../_components/page-shell";
import { TeamBadge } from "../_components/team-badge";
import {
  getMatches,
  getUserMatches,
  getLineup,
  PHASE_LABEL,
  displayScore,
  predictionKindLabel,
  formatUsdcAmount,
  type MatchSummary,
  type UserMatch,
  type UserMatchPrediction,
  type Lineup,
} from "../_lib/api";
import { cn } from "../_lib/utils";

type TabKey = "matches" | "predictions";
const PAGE_SIZE = 20;

export default function ExplorerPage() {
  const { connected, publicKey } = useWallet();

  const [activeTab, setActiveTab] = useState<TabKey>("matches");

  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [matchesStatus, setMatchesStatus] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");

  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [userStatus, setUserStatus] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");

  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;
    setMatchesStatus("loading");
    getMatches()
      .then((rows) => {
        if (!active) return;
        setMatches(rows);
        setMatchesStatus("ready");
      })
      .catch(() => {
        if (active) setMatchesStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUserMatches([]);
      setUserStatus("idle");
      return;
    }
    let active = true;
    setUserStatus("loading");
    getUserMatches(publicKey.toBase58())
      .then((rows) => {
        if (!active) return;
        setUserMatches(rows);
        setUserStatus("ready");
      })
      .catch(() => {
        if (active) setUserStatus("error");
      });
    return () => {
      active = false;
    };
  }, [connected, publicKey]);

  const matchesByFixture = useMemo(
    () => new Map(matches.map((m) => [m.fixtureId, m])),
    [matches],
  );

  const phaseOptions = useMemo(
    () => Array.from(new Set(matches.map((m) => m.phase))).sort(),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const phaseOk = filterPhase === "all" || match.phase === filterPhase;
      const term = search.toLowerCase();
      const team1 = match.teamNames?.team1 ?? "";
      const team2 = match.teamNames?.team2 ?? "";
      const matchesSearch =
        !term ||
        team1.toLowerCase().includes(term) ||
        team2.toLowerCase().includes(term) ||
        String(match.fixtureId).includes(term);
      return phaseOk && matchesSearch;
    });
  }, [matches, filterPhase, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageMatches = filteredMatches.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const totalPoints = userMatches.reduce((sum, m) => sum + m.points, 0);
  const totalPredictions = userMatches.reduce(
    (sum, m) => sum + m.predictions.length,
    0,
  );

  return (
    <PageShell>
      <div className="flex flex-1 flex-col gap-6">
        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Matches Tracked"
            value={matchesStatus === "ready" ? String(matches.length) : "—"}
            loading={matchesStatus === "loading"}
            icon={<Activity size={18} />}
          />
          <SummaryCard
            label="Your Predictions"
            value={
              connected
                ? userStatus === "ready"
                  ? String(totalPredictions)
                  : "—"
                : "—"
            }
            loading={userStatus === "loading"}
            icon={<ScrollText size={18} />}
          />
          <SummaryCard
            label="Career Points"
            value={
              connected
                ? userStatus === "ready"
                  ? String(totalPoints)
                  : "—"
                : "—"
            }
            loading={userStatus === "loading"}
            icon={<Trophy size={18} />}
          />
        </div>

        {/* Logs card */}
        <div className="mb-6 flex flex-col border border-surface bg-surface">
          {/* Tabs */}
          <div className="flex border-b border-surface">
            <Tab
              active={activeTab === "matches"}
              onClick={() => setActiveTab("matches")}
              icon={<Activity size={16} />}
              label="All Matches"
            />
            <Tab
              active={activeTab === "predictions"}
              onClick={() => setActiveTab("predictions")}
              icon={<ScrollText size={16} />}
              label="My Predictions"
            />
          </div>

          {/* Search / filter */}
          {activeTab === "matches" && (
            <div className="flex flex-col gap-3 border-b border-surface-elevated bg-surface p-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search teams or fixture ID…"
                  className="h-10 w-full bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-purple"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted" />
                <select
                  value={filterPhase}
                  onChange={(e) => {
                    setFilterPhase(e.target.value);
                    setPage(0);
                  }}
                  className="h-10 bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan"
                >
                  <option value="all">All phases</option>
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase}>
                      {PHASE_LABEL[phase]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Scrollable panel */}
          <div className="h-[55vh] overflow-y-auto">
            {activeTab === "matches" ? (
              <MatchLogs matches={pageMatches} status={matchesStatus} />
            ) : (
              <PredictionLogs
                userMatches={userMatches}
                matchesByFixture={matchesByFixture}
                status={userStatus}
                connected={connected}
              />
            )}
          </div>

          {/* Pagination */}
          {activeTab === "matches" && totalPages > 1 && (
            <div className="flex flex-shrink-0 items-center justify-between border-t border-surface-elevated px-4 py-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground disabled:opacity-30"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function SummaryCard({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: string;
  loading?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-surface p-4">
      <div className="mb-2 flex h-8 w-8 items-center justify-center bg-background text-foreground">
        {icon}
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse bg-background" />
      ) : (
        <p className="font-display text-2xl tabular-nums text-foreground">
          {value}
        </p>
      )}
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors sm:flex-none",
        active
          ? "border-purple text-foreground"
          : "border-transparent text-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MatchLogs({
  matches,
  status,
}: {
  matches: MatchSummary[];
  status: "idle" | "loading" | "error" | "ready";
}) {
  if (status === "loading") {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-background" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-rose">
        <AlertCircle size={32} className="mb-3" />
        <p className="font-bold uppercase tracking-wider">
          Matches unavailable
        </p>
        <p className="mt-1 text-sm">Couldn&apos;t load the match log.</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
        <ScrollText size={36} className="mb-4 opacity-30" />
        <p className="font-display text-xl tracking-wider">No matches found</p>
      </div>
    );
  }

  return (
    <div className="bg-surface">
      <div className="sticky top-0 z-10 hidden grid-cols-12 gap-4 border-b border-surface-elevated bg-surface px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted sm:grid">
        <div className="col-span-4">Match</div>
        <div className="col-span-2">Phase</div>
        <div className="col-span-2">Score</div>
        <div className="col-span-2">Pool</div>
        <div className="col-span-2 text-right">Entries</div>
      </div>
      <div className="divide-y divide-surface-elevated">
        {matches.map((match) => (
          <MatchLogRow key={match.pda} match={match} />
        ))}
      </div>
    </div>
  );
}

function MatchLogRow({ match }: { match: MatchSummary }) {
  const team1 = match.teamNames?.team1 ?? `Team ${match.onchain.team1Id}`;
  const team2 = match.teamNames?.team2 ?? `Team ${match.onchain.team2Id}`;
  const score = displayScore(match);
  const pool = formatUsdcAmount(match.onchain.poolTotal);

  return (
    <Link
      href={`/matches/${match.pda}`}
      className="grid grid-cols-1 gap-3 px-4 py-5 text-base transition-colors hover:bg-background/50 sm:grid-cols-12 sm:gap-4"
    >
      <div className="flex items-center gap-3 sm:col-span-4">
        <div className="flex -space-x-2">
          <TeamBadge name={team1} size="md" />
          <TeamBadge name={team2} size="md" />
        </div>
        <div>
          <p className="font-bold text-foreground">
            {team1} vs {team2}
          </p>
          <p className="text-xs text-muted">Fixture #{match.fixtureId}</p>
        </div>
      </div>
      <div className="flex items-center sm:col-span-2">
        <PhaseBadge phase={match.phase} />
      </div>
      <div className="flex items-center sm:col-span-2">
        {score ? (
          <span className="font-display text-xl tabular-nums text-foreground">
            {score.team1} - {score.team2}
          </span>
        ) : (
          <span className="text-sm text-muted">vs</span>
        )}
      </div>
      <div className="flex items-center sm:col-span-2">
        <span className="tabular-nums text-foreground">${pool}</span>
      </div>
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <span className="tabular-nums text-foreground">
          {match.onchain.participantCount}
        </span>
        <ArrowRight size={16} className="text-muted" />
      </div>
    </Link>
  );
}

function PhaseBadge({ phase }: { phase: MatchSummary["phase"] }) {
  const color =
    phase === "LIVE"
      ? "text-rose border-rose/30 bg-rose/10"
      : phase === "OPEN"
        ? "text-emerald border-emerald/30 bg-emerald/10"
        : phase === "UPCOMING"
          ? "text-cyan border-cyan/30 bg-cyan/10"
          : "text-muted border-surface-elevated bg-background";

  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        color,
      )}
    >
      {phase === "LIVE" && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-rose" />
      )}
      {PHASE_LABEL[phase]}
    </span>
  );
}

function PredictionLogs({
  userMatches,
  matchesByFixture,
  status,
  connected,
}: {
  userMatches: UserMatch[];
  matchesByFixture: Map<number, MatchSummary>;
  status: "idle" | "loading" | "error" | "ready";
  connected: boolean;
}) {
  const [players, setPlayers] = useState<
    Map<number, { name: string; side: number }>
  >(new Map());

  useEffect(() => {
    if (!connected || userMatches.length === 0) return;
    let active = true;

    async function load() {
      const maps = await Promise.all(
        userMatches.map(async (um) => {
          const match = matchesByFixture.get(um.fixtureId);
          if (!match) return new Map<number, { name: string; side: number }>();
          try {
            const lineup = await getLineup(match.pda);
            return lineupToPlayerMap(lineup);
          } catch {
            return new Map<number, { name: string; side: number }>();
          }
        }),
      );
      if (!active) return;
      const merged = new Map<number, { name: string; side: number }>();
      for (const map of maps) {
        for (const [id, data] of map) {
          merged.set(id, data);
        }
      }
      setPlayers(merged);
    }

    load();
    return () => {
      active = false;
    };
  }, [connected, userMatches, matchesByFixture]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted">
        <Wallet size={36} className="mb-4 opacity-30" />
        <p className="font-display text-xl tracking-wider">
          Connect Your Wallet
        </p>
        <p className="mt-2 max-w-sm text-sm">
          Your prediction log will appear once a wallet is connected.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse bg-background" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-rose">
        <AlertCircle size={32} className="mb-3" />
        <p className="font-bold uppercase tracking-wider">
          Predictions unavailable
        </p>
        <p className="mt-1 text-sm">
          Couldn&apos;t load your prediction history.
        </p>
      </div>
    );
  }

  if (userMatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted">
        <ScrollText size={36} className="mb-4 opacity-30" />
        <p className="font-display text-xl tracking-wider">
          No Predictions Yet
        </p>
        <p className="mt-2 max-w-sm text-sm">
          Enter a match and submit predictions to build your log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {userMatches.map((userMatch) => (
        <PredictionMatchCard
          key={userMatch.fixtureId}
          userMatch={userMatch}
          match={matchesByFixture.get(userMatch.fixtureId) ?? null}
          players={players}
        />
      ))}
    </div>
  );
}

function PredictionMatchCard({
  userMatch,
  match,
  players,
}: {
  userMatch: UserMatch;
  match: MatchSummary | null;
  players: Map<number, { name: string; side: number }>;
}) {
  const team1 = match?.teamNames?.team1 ?? "Home";
  const team2 = match?.teamNames?.team2 ?? "Away";
  const score = match ? displayScore(match) : null;
  const final = userMatch.final;

  return (
    <div className="border border-surface-elevated bg-background p-4">
      <div className="mb-4 flex flex-col gap-3 border-b border-surface-elevated pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TeamBadge name={team1} size="sm" />
            <TeamBadge name={team2} size="sm" />
          </div>
          <div>
            <p className="font-bold text-foreground">
              {team1} vs {team2}
            </p>
            <p className="text-xs text-muted">
              Fixture #{userMatch.fixtureId}
              {score && (
                <span className="ml-2 font-display text-foreground">
                  {score.team1} - {score.team2}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Rank
            </p>
            <p className="font-display text-xl tabular-nums text-foreground">
              {userMatch.rank !== null ? `#${userMatch.rank + 1}` : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Points
            </p>
            <p className="font-display text-xl tabular-nums text-foreground">
              {userMatch.points}
            </p>
          </div>
          {final && (
            <span className="border border-surface-elevated bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              Final
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {userMatch.predictions.map((prediction, i) => (
          <PredictionPill
            key={`${prediction.kind}-${i}`}
            prediction={prediction}
            players={players}
          />
        ))}
      </div>
    </div>
  );
}

function PredictionPill({
  prediction,
  players,
}: {
  prediction: UserMatchPrediction;
  players: Map<number, { name: string; side: number }>;
}) {
  const sideText =
    prediction.side === 1 ? "Home" : prediction.side === 2 ? "Away" : null;

  return (
    <div className="flex flex-col gap-1 bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {predictionKindLabel(prediction.kind)}
        </span>
        {sideText && (
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              prediction.side === 1 ? "text-purple" : "text-cyan",
            )}
          >
            {sideText}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {predictionText(prediction, players)}
      </p>
      {prediction.kind === 3 && (
        <p className="font-display text-lg tabular-nums text-foreground">
          {prediction.outPlayerId} - {prediction.inPlayerId}
        </p>
      )}
    </div>
  );
}

function predictionText(
  prediction: UserMatchPrediction,
  players: Map<number, { name: string; side: number }>,
): string {
  switch (prediction.kind) {
    case 3:
      return `Predicted ${prediction.outPlayerId}-${prediction.inPlayerId}`;
    case 0: {
      const p = players.get(prediction.outPlayerId);
      return p
        ? `Sub out ${p.name}`
        : `Sub out player #${prediction.outPlayerId}`;
    }
    case 1: {
      const p = players.get(prediction.inPlayerId);
      return p ? `Sub in ${p.name}` : `Sub in player #${prediction.inPlayerId}`;
    }
    case 2: {
      const out = players.get(prediction.outPlayerId);
      const inn = players.get(prediction.inPlayerId);
      if (out && inn) return `Sub out ${out.name}, in ${inn.name}`;
      return `Sub out #${prediction.outPlayerId}, in #${prediction.inPlayerId}`;
    }
    default:
      return "Prediction";
  }
}

function lineupToPlayerMap(
  lineup: Lineup,
): Map<number, { name: string; side: number }> {
  const map = new Map<number, { name: string; side: number }>();
  for (const team of lineup.teams) {
    for (const player of team.players) {
      map.set(player.id, { name: player.name, side: team.side });
    }
  }
  return map;
}
