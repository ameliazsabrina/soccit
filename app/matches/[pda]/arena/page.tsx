"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { PageShell } from "../../../_components/page-shell";
import type { ArenaTab } from "../../../_components/top-nav";
import { EventsTransition } from "../../../_components/events-transition";
import { PitchArena, type ArenaMatchOverview } from "../../../_components/pitch-arena";
import type { PlayerCardData } from "../../../_components/player-card";
import { ScorePredictionPanel } from "../../../_components/score-prediction-panel";
import { GoalscorerPanel } from "../../../_components/goalscorer-panel";
import { TeamPickerModal } from "../../../_components/team-picker-modal";
import { Notifications, useNotifications } from "../../../_components/notifications";
import type { SubstitutionPrediction } from "../../../_components/confirm-subs-modal";
import {
  getMatch,
  getLineup,
  getEntryStatus,
  openMatchEventsStream,
  displayScore,
  isValidPda,
  isTerminalPhase,
  PHASE_LABEL,
  SOCCIT_SEED_FIXTURE_ID,
  SOCCIT_SEED_MATCH_PDA,
  SOCCIT_USDC_MINT,
  type MatchState,
  type Lineup,
  type EventEntry,
} from "../../../_lib/api";
import { submitPrediction } from "../../../_lib/prediction";
import {
  getWalletMatchPredictionsOnChain,
  type OnChainPrediction,
} from "../../../_lib/onchain-predictions";
import { eventPayload } from "../../../_lib/match-events";
import { demoLineup } from "../../../_lib/characters";
import { publicEnv } from "../../../_lib/env";


const DEMO_PDA = "demo";
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
    usdcMint: SOCCIT_USDC_MINT,
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

const DEMO_LINEUP: Lineup = demoLineup();

type ArenaModel = "sub" | "score" | "goalscorer";
type EntryState = "checking" | "entered" | "not-entered" | "error";
type PredictionHydrationState = "idle" | "checking" | "ready" | "error";
type ConfirmedPredictionState = {
  score: { team1: number; team2: number } | null;
  substitutions: SubstitutionPrediction[];
  lockedPlayerIds: number[];
};

type OfficialSubstitution = {
  id: string;
  side: 1 | 2;
  outPlayerId: number;
  inPlayerId: number;
  order: number;
};

function playerRating(positionId: number | null, starter: boolean): number {
  const broadPosition = positionId != null && positionId >= 34
    ? positionId - 33
    : positionId;
  const baseByPosition: Record<number, number> = { 1: 78, 2: 77, 3: 79, 4: 80 };
  return (broadPosition ? baseByPosition[broadPosition] : 77) - (starter ? 0 : 3);
}

function toPlayerCardData(
  player: Lineup["teams"][number]["players"][number],
  side: 1 | 2,
): PlayerCardData {
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    position: player.position,
    positionId: player.positionId,
    positionCode: player.positionCode ?? null,
    gridX: player.gridX ?? null,
    gridY: player.gridY ?? null,
    rating: playerRating(player.positionId, player.starter),
    side,
  };
}

function substitutionFromEvent(entry: EventEntry): OfficialSubstitution | null {
  if (entry.type !== "substitution") return null;
  const payload = eventPayload(entry);
  const outPlayerId = payload.playerOutId ?? entry.players?.out?.id;
  const inPlayerId = payload.playerInId ?? entry.players?.in?.id;
  const side = entry.players?.out?.side ?? entry.players?.in?.side ?? payload.side;
  if (outPlayerId == null || inPlayerId == null || (side !== 1 && side !== 2)) return null;

  return {
    id: payload.eventId == null ? entry.id : String(payload.eventId),
    side,
    outPlayerId,
    inPlayerId,
    order: payload.seq ?? payload.ts ?? (Number.parseInt(entry.id, 10) || 0),
  };
}

function currentRoster(
  team: Lineup["teams"][number] | undefined,
  substitutions: OfficialSubstitution[],
) {
  if (!team) return { starters: [] as PlayerCardData[], substitutes: [] as PlayerCardData[] };

  const cards = new Map(
    team.players.map((player) => [player.id, toPlayerCardData(player, team.side)]),
  );
  const activeSlots = team.players
    .filter((player) => player.starter)
    .map((player) => ({ initialId: player.id, currentId: player.id }));

  for (const substitution of substitutions
    .filter((event) => event.side === team.side)
    .sort((a, b) => a.order - b.order)) {
    const slot = activeSlots.find((candidate) => candidate.currentId === substitution.outPlayerId);
    if (!slot || !cards.has(substitution.inPlayerId)) continue;
    slot.currentId = substitution.inPlayerId;
  }

  const activeIds = new Set(activeSlots.map((slot) => slot.currentId));
  const starters = activeSlots.flatMap((slot) => {
    const current = cards.get(slot.currentId);
    const initial = cards.get(slot.initialId);
    if (!current) return [];
    return [{
      ...current,
      gridX: initial?.gridX ?? current.gridX,
      gridY: initial?.gridY ?? current.gridY,
    }];
  });
  const substitutes = team.players
    .filter((player) => !activeIds.has(player.id))
    .map((player) => cards.get(player.id))
    .filter((player): player is PlayerCardData => Boolean(player));

  return { starters, substitutes };
}

function confirmedPredictionState(
  predictions: OnChainPrediction[],
): ConfirmedPredictionState {
  // getWalletMatchPredictionsOnChain returns oldest lock-minute first. Legacy
  // data can contain duplicate scores; display the earliest known prediction
  // while treating the existence of any score account as locked.
  const score = predictions.find((prediction) => prediction.kind === 3);
  const substitutions = new Map<string, SubstitutionPrediction>();
  const lockedPlayerIds = new Set<number>();

  for (const prediction of predictions) {
    if (prediction.kind === 0) lockedPlayerIds.add(prediction.outPlayerId);
    if (prediction.kind === 1) lockedPlayerIds.add(prediction.inPlayerId);
    if (prediction.kind !== 2 || (prediction.side !== 1 && prediction.side !== 2)) continue;
    lockedPlayerIds.add(prediction.outPlayerId);
    lockedPlayerIds.add(prediction.inPlayerId);
    const key = `${prediction.side}:${prediction.outPlayerId}:${prediction.inPlayerId}`;
    substitutions.set(key, {
      slotId: String(prediction.outPlayerId),
      position: "Player",
      outPlayerId: prediction.outPlayerId,
      inPlayerId: prediction.inPlayerId,
      side: prediction.side,
    });
  }

  return {
    score: score
      ? { team1: score.outPlayerId, team2: score.inPlayerId }
      : null,
    substitutions: [...substitutions.values()],
    lockedPlayerIds: [...lockedPlayerIds],
  };
}

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
    : "score";

  const sideParam = searchParams.get("side");
  const sideSelected = sideParam === "1" || sideParam === "2";
  const side: 1 | 2 = sideParam === "2" ? 2 : 1;

  function buildModelHref(m: string) {
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete("entered");
    qs.set("model", m);
    return `/matches/${pda}/arena?${qs.toString()}`;
  }
  const arenaTabs: ArenaTab[] = [
    { model: "score", label: "Score", href: buildModelHref("score"), active: model === "score" },
    { model: "sub", label: "Pitch", href: buildModelHref("sub"), active: model === "sub" },
    { model: "goalscorer", label: "Goalscorer", href: buildModelHref("goalscorer"), active: model === "goalscorer" },
  ];

  const [match, setMatch] = useState<MatchState | null>(() =>
    isDemo ? DEMO_MATCH : isSeed ? SEED_MATCH : null
  );
  const [lineup, setLineup] = useState<Lineup | null>(() =>
    isDemo || isSeed ? DEMO_LINEUP : null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Confirmed on-chain state restored before prediction controls are rendered.
  const [restoredScore, setRestoredScore] = useState<{ team1: number; team2: number } | null>(null);
  const [predictionHydrationState, setPredictionHydrationState] = useState<PredictionHydrationState>(
    isDemo ? "ready" : "idle",
  );
  const [predictionReloadKey, setPredictionReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [lockedPredictions, setLockedPredictions] = useState<SubstitutionPrediction[]>([]);
  const [officialSubstitutions, setOfficialSubstitutions] = useState<OfficialSubstitution[]>([]);
  const [showTeamPicker, setShowTeamPicker] = useState(model === "sub" && !sideSelected);
  const [showLoadingTransition, setShowLoadingTransition] = useState(true);
  const [entryState, setEntryState] = useState<EntryState>(
    isDemo ? "entered" : "checking",
  );
  const notifs = useNotifications();
  const submitNotifId = useRef<string | null>(null);

  // Resolve the on-chain fixtureId: prefer an explicit ?fixtureId= override, then
  // the loaded match (GET /api/match always carries fixtureId), then the seed
  // fallback. This lets any real ingested match — not just the seed — submit.
  const fixtureId = useMemo(
    () =>
      Number(
        searchParams.get("fixtureId") ??
          match?.fixtureId ??
          (isSeed ? SOCCIT_SEED_FIXTURE_ID : Number.NaN)
      ),
    [searchParams, match?.fixtureId, isSeed]
  );

  // A match supports on-chain submission when it has a resolvable fixtureId and is
  // OPEN + unsettled on-chain — the same contract the backend enforces (prepare
  // returns 409 for a non-OPEN match). Mirrors it client-side to fail fast.
  const canSubmitOnChain =
    Number.isFinite(fixtureId) &&
    !!match?.onchain &&
    match.onchain.statusLabel === "OPEN" &&
    !match.onchain.settled;

  // Sync team picker when model/side changes (e.g. switching from Score to Pitch tab)
  useEffect(() => {
    setShowTeamPicker(model === "sub" && !sideSelected);
  }, [model, sideSelected]);

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
    params.delete("entered");
    params.set("side", String(selectedSide));
    router.replace(`/matches/${pda}/arena?${params.toString()}`);
    setShowTeamPicker(false);
  }

  useEffect(() => {
    if (isDemo || isSeed) {
      // Brief loading screen for demo/seed too — shows the logo + loading bar
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
    if (!isValidPda(pda)) {
      setError("Invalid match address.");
      setLoading(false);
      return;
    }
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pda, isDemo, isSeed]);

  async function loadEntryStatus() {
    if (isDemo) {
      setEntryState("entered");
      return;
    }
    if (!connected || !publicKey || !isValidPda(pda)) {
      setEntryState("not-entered");
      return;
    }

    setEntryState("checking");
    try {
      const entry = await getEntryStatus(pda, publicKey.toBase58());
      setEntryState(entry.entered ? "entered" : "not-entered");
    } catch {
      setEntryState("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      setEntryState("entered");
      return;
    }
    if (!connected || !publicKey || !isValidPda(pda)) {
      setEntryState("not-entered");
      return;
    }

    setEntryState("checking");
    getEntryStatus(pda, publicKey.toBase58())
      .then((entry) => {
        if (!cancelled) setEntryState(entry.entered ? "entered" : "not-entered");
      })
      .catch(() => {
        if (!cancelled) setEntryState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, pda, isDemo]);

  const readConfirmedPredictionState = useCallback(async () => {
    if (!publicKey || !isValidPda(pda)) {
      throw new Error("A valid wallet and match are required to check predictions.");
    }
    const predictions = await getWalletMatchPredictionsOnChain(
      connection,
      publicKey.toBase58(),
      pda,
    );
    return confirmedPredictionState(predictions);
  }, [connection, publicKey, pda]);

  // Restore confirmed program accounts before rendering editable controls.
  // Projection endpoints can lag behind a confirmed transaction, so they are
  // deliberately not used as a prediction lock source.
  useEffect(() => {
    let cancelled = false;
    if (isDemo) {
      setPredictionHydrationState("ready");
      return;
    }
    if (
      entryState !== "entered" ||
      !connected ||
      !publicKey ||
      !isValidPda(pda) ||
      !Number.isFinite(fixtureId)
    ) {
      setPredictionHydrationState("idle");
      return;
    }

    setPredictionHydrationState("checking");
    setRestoredScore(null);
    setLockedPredictions([]);

    readConfirmedPredictionState()
      .then((confirmedState) => {
        if (cancelled) return;
        setRestoredScore(confirmedState.score);
        setLockedPredictions(confirmedState.substitutions);
        setPredictionHydrationState("ready");
      })
      .catch(() => {
        if (!cancelled) setPredictionHydrationState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [
    connected,
    publicKey,
    pda,
    fixtureId,
    isDemo,
    entryState,
    predictionReloadKey,
    readConfirmedPredictionState,
  ]);

  // The lineup endpoint is a pre-match snapshot. Replay official substitution
  // events so the field and bench reflect who is actually on the pitch now.
  useEffect(() => {
    if (isDemo || isSeed || !isValidPda(pda)) return;
    setOfficialSubstitutions([]);
    const source = openMatchEventsStream(pda, {
      onEvent: (entry) => {
        const substitution = substitutionFromEvent(entry);
        if (!substitution) return;
        setOfficialSubstitutions((previous) => {
          const index = previous.findIndex((item) => item.id === substitution.id);
          if (index < 0) return [...previous, substitution];
          const next = [...previous];
          next[index] = substitution;
          return next;
        });
      },
    });
    return () => source.close();
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

  async function refreshConfirmedPredictionState(): Promise<ConfirmedPredictionState | null> {
    try {
      const confirmedState = await readConfirmedPredictionState();
      setRestoredScore(confirmedState.score);
      setLockedPredictions(confirmedState.substitutions);
      return confirmedState;
    } catch {
      notifs.push({
        id: "prediction-preflight-error",
        type: "error",
        title: "Prediction check failed",
        message: "Confirmed on-chain predictions could not be verified. Submission remains locked.",
        duration: 8000,
      });
      return null;
    }
  }

  async function handleSubmit(input: {
    kind: 0 | 1 | 2 | 3;
    side: 0 | 1 | 2;
    outPlayerId: number;
    inPlayerId: number;
    label: string;
  }): Promise<boolean> {
    if (isDemo) {
      notifs.push({
        id: "demo-lock",
        type: "info",
        title: "Demo locked",
        message: "Demo prediction locked locally. No on-chain transaction.",
        duration: 5000,
      });
      return true;
    }

    if (!canSubmitOnChain) {
      const notOpen =
        !!match?.onchain && match.onchain.statusLabel !== "OPEN";
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Cannot submit",
        message: notOpen
          ? `This match is not open for predictions (status: ${match!.onchain!.statusLabel}).`
          : "No fixture loaded that supports on-chain submission.",
        duration: 6000,
      });
      return false;
    }

    if (!connected || !publicKey || !wallet) {
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Wallet not connected",
        message: "Connect your wallet to submit a real prediction.",
        duration: 6000,
      });
      return false;
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
      const entry = await getEntryStatus(pda, walletBase58);
      if (!entry.entered) {
        setEntryState("not-entered");
        throw new Error("Enter this match before submitting a prediction.");
      }
      setEntryState("entered");

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
          href: `${publicEnv.solanaExplorerUrl}/${result.signature}?cluster=${publicEnv.solanaNetwork}`,
          label: "View on Solana Explorer",
        },
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      if (submitNotifId.current) notifs.dismiss(submitNotifId.current);
      notifs.push({
        id: "submit-error",
        type: "error",
        title: "Submission failed",
        message: msg,
        duration: 8000,
      });
      return false;
    } finally {
      setSubmitting(false);
      submitNotifId.current = null;
    }
  }

  async function handleLockSubstitutions(predictions: SubstitutionPrediction[]) {
    const confirmedState = isDemo
      ? {
          score: restoredScore,
          substitutions: lockedPredictions,
          lockedPlayerIds: lockedPredictions.flatMap((prediction) => [
            prediction.outPlayerId,
            prediction.inPlayerId,
          ]),
        }
      : await refreshConfirmedPredictionState();
    if (!confirmedState) return false;

    const usedPlayerIds = new Set(confirmedState.lockedPlayerIds);
    const batchPlayerIds = new Set<number>();
    const hasConflict = predictions.some((prediction) => {
      const conflict =
        prediction.outPlayerId === prediction.inPlayerId ||
        usedPlayerIds.has(prediction.outPlayerId) ||
        usedPlayerIds.has(prediction.inPlayerId) ||
        batchPlayerIds.has(prediction.outPlayerId) ||
        batchPlayerIds.has(prediction.inPlayerId);
      batchPlayerIds.add(prediction.outPlayerId);
      batchPlayerIds.add(prediction.inPlayerId);
      return conflict;
    });
    if (hasConflict) {
      notifs.push({
        id: "duplicate-substitution",
        type: "error",
        title: "Player already locked",
        message: "A player can only be used in one substitution prediction for this match.",
        duration: 7000,
      });
      return false;
    }

    for (let i = 0; i < predictions.length; i++) {
      const p = predictions[i];
      const confirmed = await handleSubmit({
        kind: 2,
        side: p.side,
        outPlayerId: p.outPlayerId,
        inPlayerId: p.inPlayerId,
        label: `${p.position} swap (${i + 1}/${predictions.length})`,
      });
      if (!confirmed) return false;
      usedPlayerIds.add(p.outPlayerId);
      usedPlayerIds.add(p.inPlayerId);
      setLockedPredictions((previous) => previous.some((lockedPrediction) =>
        lockedPrediction.outPlayerId === p.outPlayerId &&
        lockedPrediction.inPlayerId === p.inPlayerId &&
        lockedPrediction.side === p.side
      ) ? previous : [...previous, p]);
    }
    return true;
  }

  async function handleLockScore(score1: number, score2: number) {
    if (!isDemo) {
      const confirmedState = await refreshConfirmedPredictionState();
      if (!confirmedState) return false;
      if (confirmedState.score) {
        notifs.push({
          id: "score-already-locked",
          type: "warning",
          title: "Score already locked",
          message: "Your confirmed score prediction for this match cannot be changed.",
          duration: 7000,
        });
        return false;
      }
    } else if (restoredScore) {
      return false;
    }

    const confirmed = await handleSubmit({
      kind: 3,
      side: 0,
      outPlayerId: score1,
      inPlayerId: score2,
      label: `score ${score1}-${score2}`,
    });
    if (confirmed) setRestoredScore({ team1: score1, team2: score2 });
    return confirmed;
  }

  const loadingTransition = showLoadingTransition ? (
    <EventsTransition
      mode="enter"
      experience="match"
      logoEnter="/api/assets/assets/soccit-logo-black.webp"
      onComplete={() => setShowLoadingTransition(false)}
    />
  ) : null;

  if (loading) {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/assets/assets/soccit-logo-black.webp"
              alt="Soccit"
              className="h-24 w-auto object-contain sm:h-32"
            />
            <div className="relative h-3 w-full max-w-xs overflow-hidden border border-surface bg-surface/30">
              <div className="loading-bar-fill absolute inset-y-0 left-0 bg-purple" />
            </div>
            <div className="font-tech text-[10px] uppercase tracking-widest text-muted/60">
              Loading match
            </div>
          </div>
        </PageShell>
      </>
    );
  }

  if (error || !match || !lineup) {
    return (
      <>
        {loadingTransition}
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
      </>
    );
  }

  // ── Entry gate ──────────────────────────────────────────────
  // The backend status endpoint is authoritative; URL state never grants access.
  if (entryState === "checking") {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <RefreshCw size={28} className="animate-spin text-cyan" />
            <h2 className="font-display text-2xl text-foreground">Checking Entry</h2>
            <p className="text-sm text-muted">Verifying this wallet&apos;s match access…</p>
          </div>
        </PageShell>
      </>
    );
  }

  if (entryState === "error") {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="mb-4 text-rose" size={48} />
            <h2 className="font-display text-2xl text-foreground">Entry Check Failed</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              We couldn&apos;t verify your entry. Arena access remains locked until the backend confirms it.
            </p>
            <button
              onClick={loadEntryStatus}
              className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
            >
              <RefreshCw size={16} /> Retry Check
            </button>
          </div>
        </PageShell>
      </>
    );
  }

  if (entryState !== "entered") {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center border-2 border-rose/30 bg-rose/10">
              <Lock size={28} className="text-rose" />
            </div>
            <h2 className="font-display text-2xl text-foreground">Entry Required</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              You haven&apos;t entered this match yet. Return to the match page to
              pay the entry fee and join the arena.
            </p>
            <button
              onClick={() => router.push(`/matches/${pda}`)}
              className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
            >
              <ArrowLeft size={16} /> Back to Match
            </button>
          </div>
        </PageShell>
      </>
    );
  }

  if (predictionHydrationState === "idle" || predictionHydrationState === "checking") {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <RefreshCw size={28} className="animate-spin text-cyan" />
            <h2 className="font-display text-2xl text-foreground">Checking Predictions</h2>
            <p className="text-sm text-muted">Reading this wallet&apos;s confirmed Devnet locks…</p>
          </div>
        </PageShell>
      </>
    );
  }

  if (predictionHydrationState === "error") {
    return (
      <>
        {loadingTransition}
        <PageShell>
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="mb-4 text-rose" size={48} />
            <h2 className="font-display text-2xl text-foreground">Prediction Check Failed</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              We couldn&apos;t read your confirmed on-chain predictions, so submission stays locked to prevent duplicates.
            </p>
            <button
              onClick={() => setPredictionReloadKey((key) => key + 1)}
              className="mt-6 flex items-center gap-2 border border-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-foreground hover:text-background"
            >
              <RefreshCw size={16} /> Retry Check
            </button>
          </div>
        </PageShell>
      </>
    );
  }

  const team1 = lineup.teams.find((t) => t.side === 1);
  const team2 = lineup.teams.find((t) => t.side === 2);
  const selectedTeam = lineup.teams.find((t) => t.side === side);
  const team1Roster = currentRoster(team1, officialSubstitutions);
  const team2Roster = currentRoster(team2, officialSubstitutions);
  const selectedRoster = side === 1 ? team1Roster : team2Roster;
  const terminal = match.phase
    ? isTerminalPhase(match.phase)
    : Boolean(match.onchain?.settled);
  const overview: ArenaMatchOverview = {
    score: displayScore(match),
    minute: match.live?.minute ?? null,
    statusLabel: match.phase
      ? PHASE_LABEL[match.phase]
      : match.live
        ? "Live"
        : match.onchain?.settled
          ? "Settled"
          : match.onchain?.statusLabel === "OPEN"
            ? "Open for Predictions"
            : "Scheduled",
    isLive: match.phase === "LIVE" || Boolean(match.live),
    isTerminal: terminal,
    teams: [
      {
        side: 1,
        name: team1?.teamName ?? "Home",
        starters: team1Roster.starters,
        substitutes: team1Roster.substitutes,
      },
      {
        side: 2,
        name: team2?.teamName ?? "Away",
        starters: team2Roster.starters,
        substitutes: team2Roster.substitutes,
      },
    ],
  };

  return (
    <>
      {loadingTransition}
      <PageShell edgeToEdge hideTicker arenaTabs={arenaTabs}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-8 lg:overflow-hidden lg:px-8">
        {model === "sub" && selectedTeam && sideSelected && (
          <PitchArena
            matchPda={pda}
            side={side}
            starters={selectedRoster.starters}
            substitutes={selectedRoster.substitutes}
            onLock={handleLockSubstitutions}
            isSubmitting={submitting}
            lockedPredictions={lockedPredictions}
            overview={overview}
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
            // Remount when the async restore lands so the panel's initial
            // useState seeds from the restored scoreline, not the live score.
            key={restoredScore ? `sc-${restoredScore.team1}-${restoredScore.team2}` : "sc-live"}
            team1Name={team1?.teamName ?? "Home"}
            team2Name={team2?.teamName ?? "Away"}
            currentScore={match.live?.goals ?? { team1: 0, team2: 0 }}
            predictedScore={restoredScore}
            minute={match.live?.minute ?? 0}
            isLive={match.phase === "LIVE"}
            onLock={handleLockScore}
            locked={restoredScore !== null}
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
          onClose={() => router.push(`/matches/${pda}/arena?model=score`)}
        />
      )}

      <Notifications items={notifs.items} onDismiss={notifs.dismiss} />
    </PageShell>
    </>
  );
}
