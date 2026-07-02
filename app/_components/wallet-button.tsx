"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";
import { formatWallet } from "../_lib/api";

export function WalletButton() {
  const { publicKey, connected, connect, disconnect } = useWallet();

  if (connected && publicKey) {
    return (
      <button
        onClick={disconnect}
        className="flex h-10 items-center gap-2 px-4 text-sm font-medium text-foreground transition-colors hover:text-purple focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
      >
        <Wallet size={18} />
        <span className="font-mono">{formatWallet(publicKey.toBase58())}</span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="btn-gradient flex h-10 items-center gap-2 px-5 text-sm font-bold uppercase tracking-wider text-white focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2"
    >
      <Wallet size={18} />
      Connect Wallet
    </button>
  );
}
