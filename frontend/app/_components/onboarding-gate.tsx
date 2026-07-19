"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getUser } from "../_lib/api";
import { OnboardingModal } from "./onboarding-modal";

export function OnboardingGate() {
  const { publicKey, connected } = useWallet();
  const [open, setOpen] = useState(false);
  const promptedWallets = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!connected || !publicKey) return;

    const wallet = publicKey.toBase58();
    if (promptedWallets.current.has(wallet)) return;
    promptedWallets.current.add(wallet);

    let cancelled = false;
    getUser(wallet)
      .then(() => {})
      .catch(() => {
        if (!cancelled) setOpen(true);
      });

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey]);

  return (
    <OnboardingModal
      open={open}
      onClose={() => setOpen(false)}
      onSuccess={() => setOpen(false)}
    />
  );
}
