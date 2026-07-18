"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { HoverRevealButton } from "./hover-reveal";
import { SOCCIT_MATCHES_URL } from "../_lib/app-urls";

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
          const delta = currentY - lastScrollY.current;
          if (currentY < 80) {
            setHidden(false);
            lastScrollY.current = currentY;
          } else if (delta > 12 && currentY > 120) {
            setHidden(true);
            lastScrollY.current = currentY;
          } else if (delta < -12) {
            setHidden(false);
            lastScrollY.current = currentY;
          }
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
      className={`site-nav fixed left-1/2 top-4 z-[75] -translate-x-1/2 transition-transform duration-300 ease-out sm:top-6 ${
        hidden ? "-translate-y-[180%]" : "translate-y-0"
      }`}
      aria-label="Primary actions"
    >
      <div className="flex h-9 items-center border border-foreground/15 bg-white/80 p-1 shadow-[0_10px_35px_rgba(10,22,40,0.08)] backdrop-blur-xl sm:h-10">
        <Link
          href={SOCCIT_MATCHES_URL}
          className="group/reveal relative inline-flex h-full items-center justify-center overflow-hidden bg-purple px-4 font-display text-[10px] uppercase tracking-[0.14em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:px-5"
        >
          <HoverRevealButton>Enter Arena</HoverRevealButton>
        </Link>

        <button
          onClick={handleWalletClick}
          className="group/reveal relative inline-flex h-full items-center justify-center overflow-hidden px-3 font-tech text-[9px] uppercase tracking-[0.16em] text-foreground transition-colors duration-100 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple sm:px-4"
        >
          <HoverRevealButton>{walletLabel}</HoverRevealButton>
        </button>

        <Link
          href="#how-it-works"
          className="hidden h-full items-center justify-center px-4 font-tech text-[9px] uppercase tracking-[0.16em] text-muted transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple lg:flex"
        >
          How it works
        </Link>
      </div>
    </nav>
  );
}
