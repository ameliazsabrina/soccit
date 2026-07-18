"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, Menu, Volume2, VolumeX, X } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { HoverRevealButton } from "./hover-reveal";
import { SOCCIT_APP_URL } from "../_lib/app-urls";

const ACTS = ["ARRIVAL", "THE CALL", "THE XI", "THE TABLE", "KICK-OFF"];
const X_URL = "https://x.com/playsoccit";

const MENU_ITEMS = [
  {
    label: "Connect",
    type: "wallet",
    image: "/assets/cards/player-hero.webp",
    imageAlt: "Soccit player ready to enter the arena",
  },
  {
    label: "Enter",
    type: "link",
    href: SOCCIT_APP_URL,
    image: "/assets/cards/player-arena.webp",
    imageAlt: "Soccit arena match",
  },
  {
    label: "How it works",
    type: "link",
    href: "#how-it-works",
    image: "/assets/cards/player-events.webp",
    imageAlt: "Soccit prediction flow",
  },
  {
    label: "Ecosystem",
    type: "link",
    href: "#about-us",
    image: "/assets/cards/player-leaderboard.webp",
    imageAlt: "Soccit ecosystem and community",
  },
  {
    label: "Docs",
    type: "link",
    href: "/docs",
    image: "/assets/cards/player-logs.webp",
    imageAlt: "Soccit product documentation",
  },
  {
    label: "Whitepaper",
    type: "link",
    href: "/whitepaper",
    image: "/assets/cards/player-hero.webp",
    imageAlt: "Soccit product and protocol whitepaper",
  },
] as const;

export function StadiumFrame({ audioTracks, visible }: { audioTracks: string[]; visible: boolean }) {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [act, setAct] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const [audioMuted, setAudioMuted] = useState(false);
  const [volume, setVolume] = useState(45);
  const [trackIndex, setTrackIndex] = useState(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const currentTrack = audioTracks[trackIndex];

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setAct(Math.min(ACTS.length - 1, Math.floor(latest * ACTS.length)));
  });

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  const openMenu = () => {
    setActiveMenuIndex(0);
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      panel.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("button, a[href]")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeMenu, menuOpen]);

  useEffect(() => {
    setTrackIndex(audioTracks.length > 1 ? Math.floor(Math.random() * audioTracks.length) : 0);
  }, [audioTracks]);

  useEffect(() => {
    const player = audio.current;
    if (!player || !currentTrack) return;

    player.volume = volume / 100;
    player.muted = audioMuted;

    const removePlaybackFallbacks = () => {
      window.removeEventListener("pointerdown", startPlayback, true);
      window.removeEventListener("keydown", startPlayback, true);
      window.removeEventListener("touchstart", startPlayback, true);
      window.removeEventListener("wheel", startPlayback, true);
    };
    const startPlayback = () => {
      void player.play().then(removePlaybackFallbacks).catch(() => undefined);
    };

    startPlayback();
    window.addEventListener("pointerdown", startPlayback, true);
    window.addEventListener("keydown", startPlayback, true);
    window.addEventListener("touchstart", startPlayback, true);
    window.addEventListener("wheel", startPlayback, true);

    return removePlaybackFallbacks;
  }, [audioMuted, currentTrack, volume]);

  const handleWallet = () => {
    closeMenu();
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const toggleAudio = () => {
    const player = audio.current;
    if (!player || !currentTrack) return;
    const nextMuted = !audioMuted;
    player.muted = nextMuted;
    setAudioMuted(nextMuted);
    if (!nextMuted && player.paused) void player.play().catch(() => undefined);
  };

  const changeVolume = (nextVolume: number) => {
    const normalizedVolume = Math.min(100, Math.max(0, nextVolume));
    setVolume(normalizedVolume);
    if (audio.current) audio.current.volume = normalizedVolume / 100;
  };

  const playRandomNextTrack = () => {
    const player = audio.current;
    if (!player || audioTracks.length === 0) return;

    if (audioTracks.length === 1) {
      player.currentTime = 0;
      void player.play().catch(() => undefined);
      return;
    }

    setTrackIndex((current) => {
      const offset = 1 + Math.floor(Math.random() * (audioTracks.length - 1));
      return (current + offset) % audioTracks.length;
    });
  };

  const walletLabel = connected
    ? `Disconnect ${publicKey?.toString().slice(0, 4)}…${publicKey?.toString().slice(-4)}`
    : "Connect";
  const activeItem = MENU_ITEMS[activeMenuIndex];
  const overlayEase = [0.65, 0.05, 0, 1] as [number, number, number, number];

  return (
    <>
      <audio
        ref={audio}
        src={currentTrack}
        autoPlay
        loop={audioTracks.length === 1}
        playsInline
        preload="auto"
        onEnded={playRandomNextTrack}
      />
      {visible && (
      <div className="pointer-events-none fixed inset-0 z-[80] text-foreground">
      <div aria-hidden="true">
        <div className="landing-frame-corner landing-frame-corner--tl" />
        <div className="landing-frame-corner landing-frame-corner--tr" />
        <div className="landing-frame-corner landing-frame-corner--bl" />
        <div className="landing-frame-corner landing-frame-corner--br" />

        <div className="absolute left-4 top-4 flex h-10 items-center gap-2.5 bg-white/85 px-3 backdrop-blur-md sm:left-6 sm:top-6">
          <Image src="/assets/soccit-logo-black.svg" alt="" width={36} height={23} className="h-5 w-8 object-contain" />
          <span className="font-[family-name:var(--font-mona-sans)] text-sm font-extrabold leading-none tracking-[-0.02em]">SOCCIT</span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 sm:bottom-6 sm:left-6 sm:right-6">
          <div className="hidden w-36 sm:block">
            <div className="mb-2 flex justify-between font-tech text-[9px] uppercase tracking-[0.18em] text-muted">
              <span>Match day</span><span>0{act + 1}/05</span>
            </div>
            <div className="h-px bg-foreground/15">
              <motion.div className="h-px origin-left bg-cyan" style={{ scaleX: shouldReduceMotion ? scrollYProgress : progress }} />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-tech text-[9px] uppercase tracking-[0.2em] text-muted">Act 0{act + 1}</span>
            <span className="font-display text-xs uppercase tracking-[0.06em] sm:text-sm">{ACTS[act]}</span>
            <span className="h-2 w-2 rotate-45 bg-cyan" />
          </div>
        </div>

        <div className="landing-scanlines absolute inset-0 opacity-20" />
      </div>

      <button
        ref={menuButton}
        type="button"
        onClick={openMenu}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="landing-menu"
        className="pointer-events-auto absolute right-4 top-4 inline-flex h-10 min-w-10 items-center justify-center gap-3 border border-foreground/15 bg-white/85 px-3 backdrop-blur-md transition-colors duration-150 hover:bg-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:right-6 sm:top-6 sm:px-4"
      >
        <span className="hidden font-tech text-[10px] uppercase tracking-[0.18em] sm:block">Menu</span>
        <Menu size={18} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.aside
            ref={panel}
            id="landing-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Soccit menu"
            data-lenis-prevent
            initial={{ y: shouldReduceMotion ? 0 : "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: shouldReduceMotion ? 0 : "-100%" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.58, ease: overlayEase }}
            className="pointer-events-auto fixed inset-0 z-20 overflow-y-auto bg-purple text-white"
          >
            <Link
              href="/"
              onClick={closeMenu}
              aria-label="Soccit landing page"
              className="absolute left-5 top-5 z-30 inline-flex h-12 w-14 items-center justify-center transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-8 sm:top-7"
            >
              <Image src="/assets/soccit-logo.svg" alt="Soccit" width={54} height={34} className="h-8 w-12 object-contain" />
            </Link>
            <div className="absolute right-5 top-5 z-30 flex items-center gap-2 sm:right-8 sm:top-7">
              <div className="flex h-12 items-center border border-white/50 px-1 text-white">
                <button
                  type="button"
                  onClick={toggleAudio}
                  disabled={!currentTrack}
                  aria-label={audioMuted ? "Unmute landing music" : "Mute landing music"}
                  aria-pressed={audioMuted}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center transition-colors duration-100 hover:bg-white hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {!audioMuted && volume > 0 ? <Volume2 size={20} strokeWidth={1.8} aria-hidden="true" /> : <VolumeX size={20} strokeWidth={1.8} aria-hidden="true" />}
                </button>
                <label className="flex h-10 items-center px-2">
                  <span className="sr-only">Landing music volume</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={volume}
                    disabled={!currentTrack}
                    onChange={(event) => changeVolume(Number(event.target.value))}
                    aria-label="Landing music volume"
                    className="landing-volume-slider w-20 sm:w-24"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="group/reveal inline-flex h-12 w-12 items-center justify-center border border-white/50 text-white transition-colors duration-100 hover:bg-white hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={21} strokeWidth={1.8} className="transition-transform duration-150 group-hover/reveal:rotate-90" aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-full lg:grid-cols-[0.44fr_0.56fr]">
              <div className="relative min-h-[34svh] overflow-hidden bg-purple pt-20 lg:min-h-full lg:pt-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeItem.image}
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.06, clipPath: "inset(100% 0 0 0)" }}
                    animate={{ opacity: 1, scale: 1, clipPath: "inset(0% 0 0 0)" }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, clipPath: "inset(0 0 100% 0)" }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: overlayEase }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={activeItem.image}
                      alt={activeItem.imageAlt}
                      fill
                      sizes="(max-width: 1023px) 100vw, 44vw"
                      className="object-contain object-bottom drop-shadow-[0_30px_32px_rgba(0,0,0,0.25)]"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="landing-title-grid pointer-events-none absolute inset-0 opacity-30" />
                <div className="absolute bottom-5 left-5 flex items-center gap-3 font-tech text-[8px] uppercase tracking-[0.2em] text-white/70 sm:bottom-8 sm:left-8">
                  <span className="h-2 w-2 rotate-45 bg-cyan" />
                  0{activeMenuIndex + 1} / 06
                </div>
              </div>

              <div className="flex min-h-0 flex-col bg-purple px-5 pb-6 pt-3 text-white sm:px-8 sm:pb-8 lg:px-12 lg:pb-10 lg:pt-24">
                <nav className="flex flex-1 flex-col border-t border-white/30" aria-label="Landing menu">
                  {MENU_ITEMS.map((item, index) => {
                    const content = (
                      <>
                        <span className="flex min-w-0 items-baseline gap-4 sm:gap-7">
                          <span className="font-tech text-[8px] text-white/60">0{index + 1}</span>
                          <HoverRevealButton className="max-w-full">{item.type === "wallet" ? walletLabel : item.label}</HoverRevealButton>
                        </span>
                        <ArrowRight size={24} strokeWidth={1.5} className="shrink-0 transition-transform duration-200 group-hover/reveal:translate-x-2 group-focus-visible/reveal:translate-x-2 sm:h-8 sm:w-8" aria-hidden="true" />
                      </>
                    );
                    const className = "group/reveal flex flex-1 items-center justify-between gap-5 border-b border-white/30 px-2 py-4 text-left font-display text-[clamp(1.7rem,4vw,4.75rem)] uppercase leading-none tracking-[-0.055em] text-white transition-colors duration-150 hover:bg-white hover:text-purple focus-visible:bg-white focus-visible:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset sm:px-4";
                    const activate = () => setActiveMenuIndex(index);

                    if (item.type === "wallet") {
                      return (
                        <button key={item.label} type="button" onClick={handleWallet} onPointerEnter={activate} onFocus={activate} className={className}>
                          {content}
                        </button>
                      );
                    }

                    return (
                      <Link key={item.href} href={item.href} onClick={closeMenu} onPointerEnter={activate} onFocus={activate} className={className}>
                        {content}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-6 flex shrink-0 items-end justify-between gap-6 pt-5">
                  <p className="max-w-xs font-body text-xs leading-relaxed text-white/70 sm:text-sm">
                    Football instinct, turned into verifiable competition.
                  </p>
                  <a href={X_URL} target="_blank" rel="noreferrer" className="group/reveal inline-flex h-11 items-center border border-white/50 px-4 font-tech text-[9px] uppercase tracking-[0.2em] text-white transition-colors duration-150 hover:bg-white hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    <HoverRevealButton>X</HoverRevealButton>
                  </a>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      </div>
      )}
    </>
  );
}
