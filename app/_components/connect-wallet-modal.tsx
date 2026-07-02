"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "../_lib/utils";

export function ConnectWalletModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { wallets, select, connect, connected } = useWallet();
  const [mode, setMode] = useState<"notify" | "wallets">("notify");

  useLayoutEffect(() => {
    if (open) setMode("notify");
  }, [open]);

  useEffect(() => {
    if (connected && open) onClose();
  }, [connected, open, onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  async function handleSelect(walletName: string) {
    try {
      select(walletName as Parameters<typeof select>[0]);
      await connect();
    } catch {
      // wallet adapter handles its own errors / not-installed state
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
            className={cn(
              "relative w-full overflow-hidden border border-cyan/40 bg-background shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]",
              mode === "notify" ? "max-w-2xl" : "max-w-xs"
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {mode === "notify" ? (
              <div className="flex flex-col items-center px-8 py-10 text-center">
                <h2 className="unica-one text-2xl text-foreground">
                  CONNECT WALLET
                </h2>

                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Connect a Solana wallet to enter the Arena and lock your predictions on-chain.
                </p>

                <button
                  onClick={() => setMode("wallets")}
                  className="btn-gradient mt-6 flex h-12 items-center px-10 font-display text-base uppercase tracking-[0.1em] text-white"
                >
                  Connect
                </button>

                <p className="mt-5 text-xs uppercase tracking-wider text-muted">
                  Devnet • Solana
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center px-6 py-7 text-center">
                <h2 className="unica-one text-xl text-foreground">
                  SELECT WALLET
                </h2>

                <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                  Choose a wallet
                </p>

                <div className="mt-5 flex w-full flex-col gap-2">
                  {wallets.map((wallet) => (
                    <button
                      key={wallet.adapter.name}
                      onClick={() => handleSelect(wallet.adapter.name)}
                      className="group flex items-center gap-3 border border-surface bg-surface p-3 text-left transition-all hover:border-cyan hover:bg-surface-elevated"
                    >
                      {wallet.adapter.icon ? (
                        <img
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          className="h-6 w-6 object-contain"
                        />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center bg-background text-[10px] text-muted">
                          {wallet.adapter.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-tech text-xs font-bold uppercase tracking-wider text-foreground">
                        {wallet.adapter.name}
                      </span>
                      <span className="material-symbols-outlined ml-auto text-base text-muted transition-colors group-hover:text-foreground">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setMode("notify")}
                  className="mt-4 text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
                >
                  ← Back
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
