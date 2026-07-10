"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { HoverRevealButton } from "./hover-reveal";

export function BottomNav() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY > lastScrollY.current && currentY > 120) {
            setHidden(true);
          } else {
            setHidden(false);
          }
          lastScrollY.current = currentY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWalletClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const walletLabel = connected
    ? `${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)}`
    : "Connect Wallet";

  return (
    <nav
      className={`site-nav fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-transform duration-500 ease-[cubic-bezier(0.5,0,0,1)] ${
        hidden ? "translate-y-[150%]" : "translate-y-0"
      }`}
      aria-label="Primary actions"
    >
      <div className="flex items-center gap-1 rounded-full border border-muted/20 bg-background/70 p-2 shadow-lg backdrop-blur-xl">
        <Link
          href="/matches"
          className="btn-gradient relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-6 font-display text-sm uppercase tracking-wider text-white transition-shadow hover:shadow-[0_0_30px_rgba(219,161,17,0.35)]"
        >
          <HoverRevealButton>Enter Arena</HoverRevealButton>
        </Link>

        <button
          onClick={handleWalletClick}
          className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-surface px-5 font-tech text-xs uppercase tracking-wider text-foreground transition-colors hover:bg-surface-elevated"
        >
          <HoverRevealButton>{walletLabel}</HoverRevealButton>
        </button>

        <Link
          href="#how-it-works"
          className="hidden h-12 items-center justify-center px-4 font-tech text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground sm:flex"
        >
          How it works
        </Link>
      </div>
    </nav>
  );
}
