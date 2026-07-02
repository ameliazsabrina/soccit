"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PitchArena, type SubstitutionPrediction } from "../../../_components/pitch-arena";
import {
  getMatch,
  getLineup,
  isValidPda,
  formatUsdc,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
} from "../../../_lib/api";
import { submitPrediction } from "../../../_lib/prediction";

const DEMO_PDA = "demo";

const DEVNET_EXPLORER = "https://explorer.solana.com/tx";

// Seed match is the single live (on-chain) Devnet fixture that the backend's
// `/api/prediction/prepare` accepts. The backend *read* endpoints return 404
// for it (nothing ingested), so we render this minimal MatchState from the
// prepare/on-chain probe so the Arena is usable for real submissions. The
// lineup is the standard demo shape (no ingested lineup exists on the server).
const SEED_MATCH: MatchState = {
  fixtureId: SOCCIT_SEED_FIXTURE_ID,
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "5000000",
    poolTotal: "0",
    participantCount: 0,
    team1Id: 101,
    team2Id: 202,
    usdcMint: SOCCIT_USDC_MINT,
    winners: [null, null, null],
  },
  live: null,
  updatedAt: Date.now(),
};

const DEMO_MATCH: MatchState = {
  fixtureId: 999999,
  onchain: {
    status: 0,
    statusLabel: "OPEN",
    settled: false,
    entryFee: "1000000",
    poolTotal: "5000000",
    participantCount: 12,
    team1Id: 101,
    team2Id: 202,
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    winners: [null, null, null],
  },
  live: {
    statusId: 1,
    minute: 63,
    goals: { team1: 2, team2: 1 },
    ts: Date.now(),
  },
  updatedAt: Date.now(),
};

const DEMO_LINEUP: Lineup = {
  fixtureId: 999999,
  updatedAt: Date.now(),
  teams: [
    {
      side: 1,
      teamId: 101,
      teamName: "Demo United",
      players: [
        { id: 1001, name: "A. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper", onPitch: true },
        { id: 1002, name: "B. Right Back", number: "2", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1003, name: "C. Center Back", number: "4", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1004, name: "D. Center Back", number: "5", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1005, name: "E. Left Back", number: "3", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 1006, name: "F. CDM", number: "6", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1007, name: "G. Right Mid", number: "7", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1008, name: "H. Left Mid", number: "8", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 1009, name: "I. Forward", number: "9", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1010, name: "J. Forward", number: "10", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1011, name: "K. Forward", number: "11", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 1101, name: "Sub A", number: "12", starter: false, positionId: 1, position: "Goalkeeper", onPitch: false },
        { id: 1102, name: "Sub B", number: "13", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 1103, name: "Sub C", number: "14", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 1104, name: "Sub D", number: "15", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 1105, name: "Sub E", number: "16", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 1106, name: "Sub F", number: "17", starter: false, positionId: 4, position: "Forward", onPitch: false },
      ],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "Mock City",
      players: [
        { id: 2001, name: "M. Keeper", number: "1", starter: true, positionId: 1, position: "Goalkeeper", onPitch: true },
        { id: 2002, name: "N. Right Back", number: "2", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2003, name: "O. Center Back", number: "4", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2004, name: "P. Center Back", number: "5", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2005, name: "Q. Left Back", number: "3", starter: true, positionId: 2, position: "Defender", onPitch: true },
        { id: 2006, name: "R. CDM", number: "6", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2007, name: "S. Right Mid", number: "7", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2008, name: "T. Left Mid", number: "8", starter: true, positionId: 3, position: "Midfielder", onPitch: true },
        { id: 2009, name: "U. Forward", number: "9", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2010, name: "V. Forward", number: "10", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2011, name: "W. Forward", number: "11", starter: true, positionId: 4, position: "Forward", onPitch: true },
        { id: 2101, name: "Sub G", number: "12", starter: false, positionId: 1, position: "Goalkeeper", onPitch: false },
        { id: 2102, name: "Sub H", number: "13", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 2103, name: "Sub I", number: "14", starter: false, positionId: 2, position: "Defender", onPitch: false },
        { id: 2104, name: "Sub J", number: "15", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 2105, name: "Sub K", number: "16", starter: false, positionId: 3, position: "Midfielder", onPitch: false },
        { id: 2106, name: "Sub L", number: "17", starter: false, positionId: 4, position: "Forward", onPitch: false },
      ],
    },
  ],
  names: {},
};

export default function ArenaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, publicKey, wallet } = useWallet();
  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  // The seed match is the single live (on-chain) Devnet fixture. Its backend
  // reads 404, so we render the mock SEED_MATCH/DEMO_LINEUP instead of fetching.
  const isSeed = rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const pda = isDemo ? DEMO_PDA : rawPda;
  const sideParam = searchParams.get("side");
  const side: 1 | 2 = sideParam === "2" ? 2 : 1;
  const fixtureId = Number(
    searchParams.get("fixtureId") ??
      (isSeed ? SOCCIT_SEED_FIXTURE_ID : Number.NaN)
  );

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo ? DEMO_MATCH : isSeed ? SEED_MATCH : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : null
  );
  const [loading, setLoading] = useState(!isDemo && !isSeed);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<string[]>([]);

  useEffect(() => {
    if (isDemo || isSeed) return;
    if (!isValidPda(pda)) {
      setError("Invalid match address.");
      setLoading(false);
      return;
    }
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo, isSeed]);

  async function loadMatch() {
    setLoading(true);
    setError(null);
    try {
      const [m, l] = await Promise.all([getMatch(pda), getLineup(pda)]);
      setMatch(m);
      setLineup(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match.");
    } finally {
      setLoading(false);
    }
  }

  // Real prediction submission flow:
  //   prepare (backend) → wallet sign → connection.sendRawTransaction (Devnet)
  // Only the seed match currently has a live on-chain fixture the backend can
  // prepare against. Demo mode mocks success. Other PDAs cannot submit (no
  // fixtureId resolved from the backend reads).
  async function handleLock(predictions: SubstitutionPrediction[]) {
    setLocked(true);
    setLockError(null);
    setSignatures([]);

    // Demo: no on-chain submit.
    if (isDemo) {
      setLockMessage("Demo prediction locked locally. No on-chain transaction.");
      return;
    }

    // Seed/real submit requires a connected wallet.
    if (!isSeed) {
      setLockError("No fixture loaded that supports on-chain submission.");
      return;
    }
    if (!connected || !publicKey || !wallet) {
      setLocked(false);
      setLockError("Connect your wallet to submit a real prediction on Devnet.");
      return;
    }
    if (Number.isNaN(fixtureId)) {
      setLocked(false);
      setLockError("Could not resolve fixtureId for this match.");
      return;
    }

    setSubmitting(true);
    setLockMessage(`Preparing ${predictions.length} prediction(s)…`);
    const walletBase58 = publicKey.toBase58();

    try {
      const sigs: string[] = [];
      for (let i = 0; i < predictions.length; i++) {
        const p = predictions[i];
        setLockMessage(
          `Submitting ${i + 1}/${predictions.length}: ${outName(
            p
          )} → ${inName(p)}`
        );
        const result = await submitPrediction({
          connection,
          adapter: wallet.adapter,
          input: {
            wallet: walletBase58,
            fixtureId,
            outPlayerId: p.outPlayerId,
            inPlayerId: p.inPlayerId,
            lockMinute: 0,
            slotIndex: i,
            side: p.side,
            kind: 2, // COMBO (out + in) — the substitute-prediction model
          },
        });
        sigs.push(result.signature);
        setSignatures([...sigs]);
      }
      setLockMessage(
        `Locked ${sigs.length} prediction(s) on Devnet. Signatures:`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setLocked(false);
      setLockError(
        `${msg}${
          /insufficient funds|0x1|custom program error/i.test(msg)
            ? " — your wallet may need the Soccit mock USDC (mint 2SJt…) to pay the $5 entry fee."
            : ""
        }`
      );
    } finally {
      setSubmitting(false);
    }
  }

  function outName(p: SubstitutionPrediction): string {
    return `#${p.outPlayerId}`;
  }
  function inName(p: SubstitutionPrediction): string {
    return `#${p.inPlayerId}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-purple" size={32} />
        </div>
      </div>
    );
  }

  if (error || !match || !lineup) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">Arena Unavailable</h2>
          <p className="mt-2 text-muted">{error ?? "Unknown error"}</p>
          <button
            onClick={loadMatch}
            className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const team = lineup.teams.find((t) => t.side === side);
  if (!team) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="mb-4 text-rose" size={48} />
          <h2 className="font-display text-2xl text-foreground">Team Not Found</h2>
          <p className="mt-2 text-muted">Selected side has no lineup data.</p>
        </div>
      </div>
    );
  }

  const starters = team.players
    .filter((p) => p.starter)
    .map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      rating: p.positionId ? 75 + p.positionId * 2 : 78,
      side,
    }));

  const substitutes = team.players
    .filter((p) => !p.starter)
    .map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      rating: p.positionId ? 72 + p.positionId * 2 : 75,
      side,
    }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b border-surface bg-surface/20 px-4 py-3 lg:px-8">
        <button
          onClick={() => router.push(`/matches/${pda}`)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={18} /> Back
        </button>
        {isDemo ? (
          <span className="text-xs font-bold uppercase tracking-wider text-gold">Demo Mode</span>
        ) : isSeed ? (
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan" />
            Live Seed · Devnet · Fixture {fixtureId}
          </span>
        ) : null}
      </div>

      {/* Seed submit requires a wallet holding Soccit mock USDC. */}
      {isSeed && !isDemo && !connected && (
        <div className="mx-auto mt-4 max-w-2xl border border-gold/30 bg-gold/5 px-4 py-3 text-center text-sm text-gold">
          Connect your Devnet wallet to submit a real on-chain prediction. The
          wallet must hold the Soccit mock USDC (mint{" "}
          <span className="font-mono">{SOCCIT_USDC_MINT.slice(0, 6)}…</span>)
          to pay the ${formatUsdc(match.onchain?.entryFee ?? "0")} entry fee.
        </div>
      )}

      {lockError && (
        <div className="mx-auto mt-4 max-w-2xl flex items-start gap-2 border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{lockError}</span>
        </div>
      )}

      {submitting && (
        <div className="mx-auto mt-4 max-w-2xl flex items-center justify-center gap-2 border border-cyan/30 bg-cyan/5 px-4 py-3 text-sm text-cyan">
          <Loader2 size={16} className="animate-spin" />
          {lockMessage ?? "Submitting…"}
        </div>
      )}

      {!submitting && signatures.length > 0 && (
        <div className="mx-auto mt-4 max-w-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-600">
            <CheckCircle2 size={16} />
            {lockMessage ?? `${signatures.length} prediction(s) locked on Devnet`}
          </div>
          <ul className="mt-2 space-y-1">
            {signatures.map((sig) => (
              <li key={sig} className="flex items-center gap-2">
                <span className="truncate font-mono text-xs text-foreground">{sig}</span>
                <a
                  href={`${DEVNET_EXPLORER}/${sig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan hover:underline"
                >
                  View <ExternalLink size={10} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!submitting && isDemo && lockMessage && signatures.length === 0 && (
        <div className="mx-auto mt-4 max-w-2xl border border-cyan/30 bg-cyan/5 px-4 py-2 text-center text-sm text-cyan">
          {lockMessage}
        </div>
      )}

      <PitchArena
        matchPda={pda}
        teamName={team.teamName ?? `Team ${side}`}
        side={side}
        score={match.live?.goals ?? { team1: 0, team2: 0 }}
        minute={match.live?.minute ?? 0}
        isLive={match.live?.statusId === 1}
        starters={starters}
        substitutes={substitutes}
        onLock={handleLock}
        locked={locked}
      />
    </div>
  );
}
