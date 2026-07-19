"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Loader2,
  X,
  Download,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "../_lib/utils";
import { TeamBadge } from "./team-badge";

// ─── Types ────────────────────────────────────────────────────

export interface PnLData {
  /** 0 = didn't place / lost, 1 = 1st, 2 = 2nd, 3 = 3rd */
  rank: number;
  /** Prize won in USDC base units (0 for lost) */
  prize: number;
  /** Entry fee paid in USDC base units */
  entryFee: string;
  /** Points scored */
  points: number;
  team1Name: string;
  team2Name: string;
  username: string | null;
  wallet: string;
}

// ─── Rank styles ───────────────────────────────────────────────

interface RankStyle {
  label: string;
  shortLabel: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  bgImage: string;
}

const RANK_STYLES: Record<number, RankStyle> = {
  1: {
    label: "1ST PLACE",
    shortLabel: "1st",
    bg: "bg-gold/10",
    text: "text-gold",
    border: "border-gold/40",
    glow: "shadow-[0_0_40px_-8px_rgba(219,161,17,0.5)]",
    bgImage: "/api/assets/assets/pnl-bg-1.webp",
  },
  2: {
    label: "2ND PLACE",
    shortLabel: "2nd",
    bg: "bg-foreground/5",
    text: "text-foreground",
    border: "border-foreground/30",
    glow: "shadow-[0_0_30px_-8px_rgba(255,255,255,0.2)]",
    bgImage: "/api/assets/assets/pnl-bg-2.webp",
  },
  3: {
    label: "3RD PLACE",
    shortLabel: "3rd",
    bg: "bg-bronze/10",
    text: "text-bronze",
    border: "border-bronze/40",
    glow: "shadow-[0_0_30px_-8px_rgba(205,127,50,0.4)]",
    bgImage: "/api/assets/assets/pnl-bg-3.webp",
  },
  0: {
    label: "DIDN'T PLACE",
    shortLabel: "—",
    bg: "bg-rose/10",
    text: "text-rose",
    border: "border-rose/30",
    glow: "shadow-[0_0_30px_-8px_rgba(237,60,72,0.3)]",
    bgImage: "/api/assets/assets/pnl-bg-0.webp",
  },
};

function getRankStyle(rank: number): RankStyle {
  return RANK_STYLES[rank] ?? RANK_STYLES[0];
}

// ─── Helpers ───────────────────────────────────────────────────

function formatPnLPercent(prizeBase: number, entryFeeBase: string): string {
  const fee = Number(entryFeeBase);
  if (!fee || fee === 0) return "+0%";
  const pnl = ((prizeBase - fee) / fee) * 100;
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}${pnl.toFixed(1)}%`;
}

function formatUsd(base: number | string): string {
  const n = typeof base === "string" ? Number(base) : base;
  if (Number.isNaN(n)) return "$0.00";
  return `$${(n / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildShareText(data: PnLData): string {
  const pnlPct = formatPnLPercent(data.prize, data.entryFee);
  const rankStr =
    data.rank === 1 ? "1st" : data.rank === 2 ? "2nd" : data.rank === 3 ? "3rd" : "didn't place";
  return `I finished ${rankStr} on @soccit in ${data.team1Name} vs ${data.team2Name} — ${pnlPct} PnL 🏆`;
}

// ─── Wide banner card (inside modal, screenshotable, 16:9 social) ─

export function PnLBannerCard({
  data,
  isDemo,
  cardRef,
}: {
  data: PnLData;
  isDemo?: boolean;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const style = getRankStyle(data.rank);
  const pnlPct = formatPnLPercent(data.prize, data.entryFee);
  const pnlPositive = !pnlPct.startsWith("-");

  return (
    <div ref={cardRef} className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
      {/* BG image slot — wide banner background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${style.bgImage}')` }}
      />
      {/* Gradient fallback layer when image is missing */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background opacity-90" />

      <div className={cn("relative flex h-full border bg-surface/85 backdrop-blur-sm", style.border, style.glow)}>
        {/* Left section — rank badge + label */}
        <div className="flex w-1/3 flex-col items-center justify-center border-r border-muted/20 p-6">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border-2", style.bg, style.border)}>
            <span className={cn("font-display text-2xl", style.text)}>
              {data.rank === 0 ? "×" : data.rank}
            </span>
          </div>
          <p className={cn("mt-3 font-display text-lg tracking-wider", style.text)}>
            {style.label}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
            {data.points} pts
          </p>
        </div>

        {/* Right section — teams + stats */}
        <div className="flex w-2/3 flex-col justify-between p-6">
          {/* Top: header + teams */}
          <div>
            <div className="flex items-center justify-between">
              <span className="unica-one text-sm tracking-wider text-foreground" style={{ fontWeight: 700 }}>
                SOCCIT
              </span>
              {isDemo && (
                <span className="rounded-sm bg-cyan/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan">
                  Demo
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <TeamBadge name={data.team1Name} size="md" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  {data.team1Name}
                </span>
              </div>
              <span className="font-display text-sm text-muted">vs</span>
              <div className="flex flex-col items-center gap-1">
                <TeamBadge name={data.team2Name} size="md" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted">
                  {data.team2Name}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom: stats + footer */}
          <div>
            <div className="grid grid-cols-3 gap-2 border-t border-muted/20 pt-4">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted">Prize</p>
                <p className={cn("mt-1 font-mono text-base font-bold", style.text)}>
                  {formatUsd(data.prize)}
                </p>
              </div>
              <div className="text-center border-x border-muted/20">
                <p className="text-[9px] uppercase tracking-wider text-muted">Entry</p>
                <p className="mt-1 font-mono text-base font-bold text-foreground">
                  {formatUsd(data.entryFee)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted">PnL</p>
                <p className={cn("mt-1 font-mono text-base font-bold", pnlPositive ? "text-cyan" : "text-rose")}>
                  {pnlPct}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-muted">
                {data.username ?? `${data.wallet.slice(0, 4)}...${data.wallet.slice(-4)}`}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted">
                World Cup 2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Share modal (download / copy / tweet) ─────────────────────

export function PnLShareModal({
  data,
  isDemo,
  open,
  onClose,
}: {
  data: PnLData;
  isDemo?: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function generatePng(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      cacheBust: true,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await generatePng();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soccit-pnl-rank-${data.rank}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (busy) return;
    setBusy(true);
    setCopied(false);
    try {
      const blob = await generatePng();
      if (!blob) return;
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTweet() {
    if (busy) return;
    setBusy(true);
    const shareText = buildShareText(data);

    try {
      const blob = await generatePng();
      if (blob) {
        const file = new File([blob], "soccit-pnl.png", { type: "image/png" });

        // Web Share API with files — on mobile this opens the native share
        // sheet which includes X, and the image IS attached to the tweet.
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Soccit PnL",
            text: shareText,
            files: [file],
          });
          return;
        }
      }
    } catch {
      // navigator.share can throw AbortError if user dismisses the sheet —
      // fall through to the tweet intent + download fallback below.
    }

    // Desktop fallback: open X tweet intent with text, auto-download
    // the image so the user can manually attach it to the tweet.
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(intent, "_blank", "noopener,noreferrer");

    // Auto-trigger download so the image is ready to attach
    try {
      const blob2 = await generatePng();
      if (blob2) {
        const url = URL.createObjectURL(blob2);
        const a = document.createElement("a");
        a.href = url;
        a.download = `soccit-pnl-rank-${data.rank}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      // download is best-effort — the tweet intent already opened
    } finally {
      setBusy(false);
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
          onClick={onClose}
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
            className="relative w-full max-w-3xl overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Banner card preview */}
            <div className="p-6 pb-0">
              <PnLBannerCard data={data} isDemo={isDemo} cardRef={cardRef} />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 p-6 sm:flex-row">
              <button
                onClick={handleDownload}
                disabled={busy}
                className="btn-gradient flex h-11 flex-1 items-center justify-center gap-2 font-display text-xs uppercase tracking-[0.1em] text-white disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download
              </button>
              <button
                onClick={handleCopy}
                disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 border border-surface bg-surface font-display text-xs uppercase tracking-[0.1em] text-foreground transition-colors hover:border-cyan hover:bg-surface-elevated disabled:opacity-50"
              >
                {copied ? <Check size={14} className="text-cyan" /> : busy ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleTweet}
                disabled={busy}
                className="flex h-11 flex-1 items-center justify-center gap-2 border border-surface bg-surface font-display text-xs uppercase tracking-[0.1em] text-foreground transition-colors hover:border-cyan hover:bg-surface-elevated disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Share to X
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Inline result card (settles into the greenhouse grid) ──────

export function PnLResultCard({
  data,
  onShare,
}: {
  data: PnLData;
  onShare: () => void;
}) {
  const style = getRankStyle(data.rank);
  const pnlPct = formatPnLPercent(data.prize, data.entryFee);
  const pnlPositive = !pnlPct.startsWith("-");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col bg-surface p-8"
    >
      <div className="mb-6 flex items-center gap-2">
        <div className={cn("flex h-10 w-10 items-center justify-center bg-background", style.text)}>
          <span className="font-display text-lg">{data.rank === 0 ? "×" : data.rank}</span>
        </div>
        <h2 className="font-display text-xl text-foreground">Your Result</h2>
      </div>

      {/* Rank badge */}
      <div className="flex items-center gap-3">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border", style.bg, style.border)}>
          <span className={cn("font-display text-xl", style.text)}>
            {data.rank === 0 ? "×" : data.rank}
          </span>
        </div>
        <div>
          <p className={cn("font-display text-lg tracking-wider", style.text)}>
            {style.label}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted">
            {data.points} pts
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-muted/20 pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Prize</p>
          <p className={cn("mt-1 font-mono text-sm font-bold", style.text)}>
            {formatUsd(data.prize)}
          </p>
        </div>
        <div className="border-x border-muted/20 pl-2">
          <p className="text-[10px] uppercase tracking-wider text-muted">Entry</p>
          <p className="mt-1 font-mono text-sm font-bold text-foreground">
            {formatUsd(data.entryFee)}
          </p>
        </div>
        <div className="pl-2">
          <p className="text-[10px] uppercase tracking-wider text-muted">PnL</p>
          <p className={cn("mt-1 font-mono text-sm font-bold", pnlPositive ? "text-cyan" : "text-rose")}>
            {pnlPct}
          </p>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={onShare}
        className="btn-gradient mt-6 flex h-11 w-full items-center justify-center gap-2 font-display text-xs uppercase tracking-[0.1em] text-white"
      >
        <Share2 size={14} />
        Share PnL
      </button>
    </motion.div>
  );
}
