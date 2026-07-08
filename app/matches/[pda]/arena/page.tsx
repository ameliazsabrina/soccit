"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import type { ArenaTab } from "../../../_components/top-nav";
import { PitchArena } from "../../../_components/pitch-arena";
import { ScorePredictionPanel } from "../../../_components/score-prediction-panel";
import { GoalscorerPanel } from "../../../_components/goalscorer-panel";
import { TeamPickerModal } from "../../../_components/team-picker-modal";
import { EventsTransition } from "../../../_components/events-transition";
import { Notifications, useNotifications } from "../../../_components/notifications";
import type { SubstitutionPrediction } from "../../../_components/confirm-subs-modal";
import {
  getMatch,
  getLineup,
  isValidPda,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
} from "../../../_lib/api";
import { submitPrediction } from "../../../_lib/prediction";


const DEMO_PDA = "demo";
const DEVNET_EXPLORER = "https://explorer.solana.com/tx";

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
      teamName: "Portugal",
      formation: "4-3-3",
      players: [
        { id: 1001, name: "Diogo Costa", number: "22", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", gridX: 50, gridY: 82, onPitch: true },
        { id: 1002, name: "João Cancelo", number: "2", starter: true, positionId: 2, position: "Defender", positionCode: "RB", gridX: 83, gridY: 70, onPitch: true },
        { id: 1003, name: "Rúben Dias", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", gridX: 65, gridY: 76, onPitch: true },
        { id: 1004, name: "Gonçalo Inácio", number: "14", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", gridX: 35, gridY: 76, onPitch: true },
        { id: 1005, name: "Nuno Mendes", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", gridX: 17, gridY: 70, onPitch: true },
        { id: 1006, name: "João Neves", number: "6", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", gridX: 50, gridY: 58, onPitch: true },
        { id: 1007, name: "Bruno Fernandes", number: "8", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", gridX: 64, gridY: 42, onPitch: true },
        { id: 1008, name: "Vitinha", number: "23", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", gridX: 36, gridY: 42, onPitch: true },
        { id: 1009, name: "Bernardo Silva", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", gridX: 80, gridY: 32, onPitch: true },
        { id: 1010, name: "Cristiano Ronaldo", number: "7", starter: true, positionId: 4, position: "Forward", positionCode: "ST", gridX: 50, gridY: 16, onPitch: true },
        { id: 1011, name: "Rafael Leão", number: "17", starter: true, positionId: 4, position: "Forward", positionCode: "LW", gridX: 20, gridY: 32, onPitch: true },
        { id: 1101, name: "Rui Patrício", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 1102, name: "Pepe", number: "5", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 1103, name: "Danilo Pereira", number: "13", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1104, name: "Rúben Neves", number: "18", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1105, name: "Otávio", number: "15", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 1106, name: "Gonçalo Ramos", number: "9", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
      ],
    },
    {
      side: 2,
      teamId: 202,
      teamName: "Argentina",
      formation: "4-3-3",
      players: [
        { id: 2001, name: "Emiliano Martínez", number: "23", starter: true, positionId: 1, position: "Goalkeeper", positionCode: "GK", gridX: 50, gridY: 82, onPitch: true },
        { id: 2002, name: "Nahuel Molina", number: "4", starter: true, positionId: 2, position: "Defender", positionCode: "RB", gridX: 83, gridY: 70, onPitch: true },
        { id: 2003, name: "Cristian Romero", number: "13", starter: true, positionId: 2, position: "Defender", positionCode: "RCB", gridX: 65, gridY: 76, onPitch: true },
        { id: 2004, name: "Nicolás Otamendi", number: "19", starter: true, positionId: 2, position: "Defender", positionCode: "LCB", gridX: 35, gridY: 76, onPitch: true },
        { id: 2005, name: "Nicolás Tagliafico", number: "3", starter: true, positionId: 2, position: "Defender", positionCode: "LB", gridX: 17, gridY: 70, onPitch: true },
        { id: 2006, name: "Rodrigo De Paul", number: "7", starter: true, positionId: 3, position: "Midfielder", positionCode: "CDM", gridX: 50, gridY: 58, onPitch: true },
        { id: 2007, name: "Enzo Fernández", number: "24", starter: true, positionId: 3, position: "Midfielder", positionCode: "RCM", gridX: 64, gridY: 42, onPitch: true },
        { id: 2008, name: "Alexis Mac Allister", number: "20", starter: true, positionId: 3, position: "Midfielder", positionCode: "LCM", gridX: 36, gridY: 42, onPitch: true },
        { id: 2009, name: "Lionel Messi", number: "10", starter: true, positionId: 4, position: "Forward", positionCode: "RW", gridX: 80, gridY: 32, onPitch: true },
        { id: 2010, name: "Julián Álvarez", number: "9", starter: true, positionId: 4, position: "Forward", positionCode: "ST", gridX: 50, gridY: 16, onPitch: true },
        { id: 2011, name: "Ángel Di María", number: "11", starter: true, positionId: 4, position: "Forward", positionCode: "LW", gridX: 20, gridY: 32, onPitch: true },
        { id: 2101, name: "Franco Armani", number: "1", starter: false, positionId: 1, position: "Goalkeeper", positionCode: "GK", onPitch: false },
        { id: 2102, name: "Lisandro Martínez", number: "25", starter: false, positionId: 2, position: "Defender", positionCode: "CB", onPitch: false },
        { id: 2103, name: "Leandro Paredes", number: "5", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2104, name: "Giovani Lo Celso", number: "16", starter: false, positionId: 3, position: "Midfielder", positionCode: "CM", onPitch: false },
        { id: 2105, name: "Lautaro Martínez", number: "22", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
        { id: 2106, name: "Paulo Dybala", number: "21", starter: false, positionId: 4, position: "Forward", positionCode: "ST", onPitch: false },
      ],
    },
  ],
  names: {},
};

type ArenaModel = "sub" | "score" | "goalscorer";

export default function ArenaPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { connected, publicKey, wallet } = useWallet();

  const rawPda = params.pda as string;
  const isDemo = rawPda === DEMO_PDA;
  const isSeed = rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.get("seed") === "1";
  const pda = isDemo ? DEMO_PDA : rawPda;
  const modelParam = searchParams.get("model");
  const model: ArenaModel = ["sub", "score", "goalscorer"].includes(modelParam ?? "")
    ? (modelParam as ArenaModel)
    : "sub";

  const sideParam = searchParams.get("side");
  const sideSelected = sideParam === "1" || sideParam === "2";
  const side: 1 | 2 = sideParam === "2" ? 2 : 1;
  const fixtureId = Number(
    searchParams.get("fixtureId") ?? (isSeed ? SOCCIT_SEED_FIXTURE_ID : Number.NaN)
  );

  function buildModelHref(m: string) {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("model", m);
    return `/matches/${pda}/arena?${qs.toString()}`;
  }
  const arenaTabs: ArenaTab[] = [
    { model: "sub", label: "Pitch", href: buildModelHref("sub"), active: model === "sub" },
    { model: "score", label: "Score", href: buildModelHref("score"), active: model === "score" },
    { model: "goalscorer", label: "Goalscorer", href: buildModelHref("goalscorer"), active: model === "goalscorer" },
  ];

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
  const [lockedPredictions, setLockedPredictions] = useState<SubstitutionPrediction[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState(model === "sub" && !sideSelected);
  const [showEnterTransition, setShowEnterTransition] = useState(true);
  const notifs = useNotifications();
  const submitNotifId = useRef<string | null>(null);

  useEffect(() => {
    if (!isDemo && !connected) {
      notifs.push({
        id: "wallet-warn",
        type: "warning",
        title: "Wallet not connected",
        message: "Connect your wallet to submit real predictions. Demo mode skips the chain.",
        duration: 0,
      });
    } else {
      notifs.dismiss("wallet-warn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, connected]);

  function handleTeamSelected(selectedSide: 1 | 2) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("side", String(selectedSide));
    router.replace(`/matches/${pda}/arena?${params.toString()}`);
    setShowTeamPicker(false);
  }

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

  async function handleSubmit(input: {
    kind: 0 | 1 | 2 | 3;
    side: 0 | 1 | 2;
    outPlayerId: number;
    inPlayerId: number;
    label: string;
  }) {
    setLocked(true);

    if (isDemo) {
      notifs.push({
        id: "demo-lock",
        type: "info",
        title: "Demo locked",
        message: "Demo prediction locked locally. No on-chain transaction.",
        duration: 5000,
      });
      return;
    }

    if (!isSeed) {
      setLocked(false);
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Cannot submit",
        message: "No fixture loaded that supports on-chain submission.",
        duration: 6000,
      });
      return;
    }

    if (!connected || !publicKey || !wallet) {
      setLocked(false);
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Wallet not connected",
        message: "Connect your wallet to submit a real prediction.",
        duration: 6000,
      });
      return;
    }

    if (Number.isNaN(fixtureId)) {
      setLocked(false);
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Missing fixture",
        message: "Could not resolve fixtureId for this match.",
        duration: 6000,
      });
      return;
    }

    setSubmitting(true);
    const walletBase58 = publicKey.toBase58();

    if (submitNotifId.current) notifs.dismiss(submitNotifId.current);
    submitNotifId.current = notifs.push({
      id: "submit-loading",
      type: "loading",
      title: "Submitting",
      message: `Locking ${input.label}…`,
      duration: 0,
    });

    try {
      const result = await submitPrediction({
        connection,
        adapter: wallet.adapter,
        input: {
          wallet: walletBase58,
          fixtureId,
          outPlayerId: input.outPlayerId,
          inPlayerId: input.inPlayerId,
          lockMinute: match?.live?.minute ?? 0,
          side: input.side,
          kind: input.kind,
        },
      });
      if (submitNotifId.current) notifs.dismiss(submitNotifId.current);
      notifs.push({
        id: `submit-success-${result.signature}`,
        type: "success",
        title: `${input.label} locked`,
        message: `Locked on Devnet. Signature: ${result.signature.slice(0, 8)}…${result.signature.slice(-4)}`,
        duration: 6000,
        link: {
          href: `${DEVNET_EXPLORER}/${result.signature}?cluster=devnet`,
          label: "View on Solana Explorer",
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setLocked(false);
      const usdcHint = /insufficient funds|0x1|custom program error/i.test(msg)
        ? " — your wallet may need the Soccit mock USDC to pay the entry fee."
        : "";
      if (submitNotifId.current) notifs.dismiss(submitNotifId.current);
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Submission failed",
        message: `${msg}${usdcHint}`,
        duration: 8000,
      });
    } finally {
      setSubmitting(false);
      submitNotifId.current = null;
    }
  }

  async function handleLockSubstitutions(predictions: SubstitutionPrediction[]) {
    setLockedPredictions((prev) => [...prev, ...predictions]);
    for (let i = 0; i < predictions.length; i++) {
      const p = predictions[i];
      await handleSubmit({
        kind: 2,
        side: p.side,
        outPlayerId: p.outPlayerId,
        inPlayerId: p.inPlayerId,
        label: `${p.position} swap (${i + 1}/${predictions.length})`,
      });
    }
  }

  function handleLockScore(score1: number, score2: number) {
    return handleSubmit({
      kind: 3,
      side: 0,
      outPlayerId: score1,
      inPlayerId: score2,
      label: `score ${score1}-${score2}`,
    });
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Loading Arena
          </div>
          <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
            <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !match || !lineup) {
    return (
      <PageShell>
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
      </PageShell>
    );
  }

  const team1 = lineup.teams.find((t) => t.side === 1);
  const team2 = lineup.teams.find((t) => t.side === 2);
  const selectedTeam = lineup.teams.find((t) => t.side === side);

  return (
    <>
      {showEnterTransition && (
        <EventsTransition
          mode="enter"
          logoEnter="/assets/soccit-logo.svg"
          titleEnter="Loading The Field"
          onComplete={() => setShowEnterTransition(false)}
        />
      )}
      <PageShell edgeToEdge hideTicker arenaTabs={arenaTabs}>
      <div className="flex flex-1 flex-col overflow-hidden px-8 pb-8 lg:px-8">
        {model === "sub" && selectedTeam && sideSelected && (
          <PitchArena
            matchPda={pda}
            teamName={selectedTeam.teamName ?? `Team ${side}`}
            side={side}
            starters={selectedTeam.players
              .filter((p) => p.starter)
              .map((p) => ({
                id: p.id,
                name: p.name,
                number: p.number,
                position: p.position,
                positionCode: p.positionCode ?? null,
                gridX: p.gridX ?? null,
                gridY: p.gridY ?? null,
                rating: p.positionId ? 75 + p.positionId * 2 : 78,
                side,
              }))}
            substitutes={selectedTeam.players
              .filter((p) => !p.starter)
              .map((p) => ({
                id: p.id,
                name: p.name,
                number: p.number,
                position: p.position,
                positionCode: p.positionCode ?? null,
                rating: p.positionId ? 72 + p.positionId * 2 : 75,
                side,
              }))}
            onLock={handleLockSubstitutions}
            locked={locked}
            isSubmitting={submitting}
            lockedPredictions={lockedPredictions}
            className="min-h-0"
          />
        )}

        {model === "sub" && !sideSelected && !showTeamPicker && (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <p className="text-muted">Pick a side to manage.</p>
          </div>
        )}

        {model === "score" && (
          <ScorePredictionPanel
            team1Name={team1?.teamName ?? "Home"}
            team2Name={team2?.teamName ?? "Away"}
            currentScore={match.live?.goals ?? { team1: 0, team2: 0 }}
            minute={match.live?.minute ?? 0}
            isLive={match.live?.statusId === 1}
            onLock={handleLockScore}
            locked={locked}
            isSubmitting={submitting}
          />
        )}

        {model === "goalscorer" && (
          <GoalscorerPanel
            team1Name={team1?.teamName ?? "Home"}
            team2Name={team2?.teamName ?? "Away"}
            players={lineup.teams.flatMap((t) =>
              t.players
                .filter((p) => p.positionId !== 1)
                .map((p) => ({
                  id: p.id,
                  name: p.name,
                  number: p.number,
                  position: p.position,
                  rating: p.positionId ? 75 + p.positionId * 2 : 78,
                  side: t.side as 1 | 2,
                }))
            )}
          />
        )}
      </div>

      {showTeamPicker && (
        <TeamPickerModal
          team1={team1?.teamName ?? "Team 1"}
          team2={team2?.teamName ?? "Team 2"}
          onSelect={handleTeamSelected}
          onClose={() => router.push(`/matches/${pda}`)}
        />
      )}

      <Notifications items={notifs.items} onDismiss={notifs.dismiss} />
    </PageShell>
    </>
  );
}
