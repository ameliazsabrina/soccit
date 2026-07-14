"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, Check } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { formatUsdc, calculatePrizes } from "../_lib/api";
import { submitEnter } from "../_lib/entry";
import { TeamBadge } from "./team-badge";

export interface EnterMatchModalProps {
  open: boolean;
  onClose: () => void;
  entryFee: string;
  poolTotal: string;
  participantCount: number;
  team1Name: string;
  team2Name: string;
  fixtureId: number;
  isDemo: boolean;
  onEntered: () => void;
}

type ModalState = "confirm" | "submitting" | "success" | "error";

export function EnterMatchModal({
  open,
  onClose,
  entryFee,
  poolTotal,
  participantCount,
  team1Name,
  team2Name,
  fixtureId,
  isDemo,
  onEntered,
}: EnterMatchModalProps) {
  const { connected, publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<ModalState>("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setState("confirm");
      setErrorMsg(null);
      setSignature(null);
    }
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && state !== "submitting") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, state, onClose]);

  const prizes = calculatePrizes(poolTotal);
  const feeUsd = formatUsdc(entryFee);
  const poolUsd = formatUsdc(poolTotal);

  async function handleEnter() {
    if (isDemo) {
      setState("success");
      setSignature("demo-transaction");
      setTimeout(() => {
        onEntered();
      }, 1200);
      return;
    }

    if (!connected || !publicKey || !wallet) {
      setErrorMsg("Wallet not connected. Connect first to enter the match.");
      setState("error");
      return;
    }

    setState("submitting");
    setErrorMsg(null);

    try {
      const result = await submitEnter({
        connection,
        adapter: wallet.adapter,
        input: {
          wallet: publicKey.toBase58(),
          fixtureId,
        },
      });
      setSignature(result.signature);
      setState("success");

      // Auto-route to arena after showing success briefly
      setTimeout(() => {
        onEntered();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Entry transaction failed.";
      setErrorMsg(msg);
      setState("error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={state === "submitting" ? undefined : onClose}
        >
          <div className="absolute inset-0 bg-foreground/60" />

          <motion.div
            layout
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ scaleX: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            {/* Close button — hidden during submission */}
            {state !== "submitting" && (
              <button
                onClick={onClose}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}

            {/* ── Confirm state ── */}
            {state === "confirm" && (
              <div className="flex flex-col px-8 py-10 text-center">
                <h2 className="unica-one text-2xl text-foreground">
                  ENTER MATCH
                </h2>

                {/* Teams */}
                <div className="mt-6 flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <TeamBadge name={team1Name} size="lg" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {team1Name}
                    </span>
                  </div>
                  <span className="font-display text-lg text-muted">vs</span>
                  <div className="flex flex-col items-center gap-1">
                    <TeamBadge name={team2Name} size="lg" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {team2Name}
                    </span>
                  </div>
                </div>

                {/* Entry fee */}
                <div className="mt-6 border border-surface bg-surface p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Entry Fee</span>
                    <span className="font-mono font-bold text-foreground">
                      ${feeUsd}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted">Prize Pool</span>
                    <span className="font-mono font-bold text-cyan">
                      ${poolUsd}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted">1st Place Prize</span>
                    <span className="font-mono font-bold text-gold">
                      ${formatUsdc(String(Math.round(prizes.first)))}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted">Players</span>
                    <span className="font-bold text-foreground">
                      {participantCount}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted">
                  {isDemo
                    ? "Demo mode — no real transaction will be sent."
                    : "Confirm the transaction in your wallet to enter. Entry fee is paid once. Predictions are free after entry."}
                </p>

                <button
                  onClick={handleEnter}
                  className="btn-gradient mt-6 flex h-12 items-center justify-center gap-2 px-10 font-display text-base uppercase tracking-[0.1em] text-white"
                >
                  {isDemo ? "Try Demo" : "Enter & Pay"}
                  <ArrowRight size={16} />
                </button>

                {!isDemo && (
                  <p className="mt-4 text-xs uppercase tracking-wider text-muted">
                    Devnet • Solana
                  </p>
                )}
              </div>
            )}

            {/* ── Submitting state ── */}
            {state === "submitting" && (
              <div className="flex flex-col items-center px-8 py-12 text-center">
                <Loader2 size={32} className="animate-spin text-cyan" />
                <h2 className="unica-one mt-4 text-xl text-foreground">
                  CONFIRM IN WALLET
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  Confirm the entry transaction in your wallet to pay the entry
                  fee and join the match.
                </p>
              </div>
            )}

            {/* ── Success state ── */}
            {state === "success" && (
              <div className="flex flex-col items-center px-8 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan/40 bg-cyan/10">
                  <Check size={28} className="text-cyan" />
                </div>
                <h2 className="unica-one mt-4 text-xl text-foreground">
                  ENTERED
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {isDemo
                    ? "Demo entry successful. Redirecting to arena…"
                    : `Entry confirmed on Devnet. Redirecting to arena…`}
                </p>
                {signature && !isDemo && (
                  <p className="mt-2 font-mono text-xs text-muted">
                    {signature.slice(0, 8)}…{signature.slice(-4)}
                  </p>
                )}
              </div>
            )}

            {/* ── Error state ── */}
            {state === "error" && (
              <div className="flex flex-col items-center px-8 py-10 text-center">
                <h2 className="unica-one text-xl text-rose">
                  ENTRY FAILED
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  {errorMsg ?? "Something went wrong. Please try again."}
                </p>
                <button
                  onClick={() => setState("confirm")}
                  className="mt-6 flex h-11 items-center justify-center gap-2 border border-foreground px-8 font-display text-sm uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  Try Again
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}