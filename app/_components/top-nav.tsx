"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowLeft,
  ChartNoAxesColumnIncreasing,
  CircleDot,
  ClipboardList,
  Compass,
  Crosshair,
  LayoutGrid,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { ProfileDropdown } from "./profile-dropdown";
import { SettingsDropdown } from "./settings-dropdown";
import { ConnectWalletModal } from "./connect-wallet-modal";
import { cn } from "../_lib/utils";
import { useState, useEffect } from "react";

const TABS = [
  { label: "menu", mobileLabel: "Home", href: "/", icon: LayoutGrid },
  { label: "match", mobileLabel: "Match", href: "/matches", icon: Trophy },
  {
    label: "leaderboard",
    mobileLabel: "Rank",
    href: "/leaderboard",
    icon: ChartNoAxesColumnIncreasing,
  },
  { label: "profile", mobileLabel: "Me", href: "/profile", icon: UserRound },
  { label: "explorer", mobileLabel: "Search", href: "/explorer", icon: Compass },
];

const ARENA_ICONS: Record<string, LucideIcon> = {
  score: Crosshair,
  sub: UsersRound,
  goalscorer: CircleDot,
  logs: ClipboardList,
  settlement: ShieldCheck,
};

const MOBILE_LABELS: Record<string, string> = {
  Goalscorer: "Scorer",
  Settlement: "Settle",
};

interface TopNavProps {
  variant?: "default" | "worldcup";
  arenaTabs?: ArenaTab[];
}

export interface ArenaTab {
  model: string;
  label: string;
  href: string;
  active: boolean;
}

export function TopNav({ variant = "default", arenaTabs }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const { connected } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const eventSlug =
    pathname.startsWith("/matches/events/") && typeof params.slug === "string"
      ? params.slug
      : "worldcup";

  const pathDepth = pathname.split("/").filter(Boolean).length;
  const isNested = pathDepth > 1;
  // Back button goes to the parent route (strip last segment):
  // /matches/demo/arena → /matches/demo, /matches/demo → /matches
  const parentPath = "/" + pathname.split("/").filter(Boolean).slice(0, -1).join("/");
  const backHref =
    variant === "worldcup" ? `/matches?event_exit=${eventSlug}` : parentPath;

  const mobileItems =
    variant === "worldcup"
      ? []
      : isNested
        ? (arenaTabs ?? []).map((tab) => ({
            label: tab.label,
            mobileLabel: MOBILE_LABELS[tab.label] ?? tab.label,
            href: tab.href,
            active: tab.active,
            icon: ARENA_ICONS[tab.model] ?? CircleDot,
          }))
        : TABS.map((tab) => ({
            ...tab,
            active: tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href),
          }));

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  return (
    <>
      <div className="mb-0 flex items-start justify-between gap-4 md:mb-6">
        <div className="hidden items-center gap-8 md:flex">
          <Image
            src="/api/assets/assets/soccit-logo.svg"
            alt="Soccit"
            width={40}
            height={40}
            className="h-10 w-10 flex-shrink-0"
          />
          <nav className="flex flex-wrap items-center gap-2">
          {variant === "worldcup" ? (
            <button
              onClick={() => router.push(`/matches?event_exit=${eventSlug}`)}
              className="flex items-center gap-2 border border-white/10 bg-white/5 px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] text-white/70 transition-all hover:border-purple hover:bg-purple hover:text-white"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : isNested ? (
            <>
              <button
                onClick={() => router.push(parentPath)}
                className="flex items-center gap-2 border border-surface bg-surface px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] text-muted transition-all hover:border-purple hover:bg-purple hover:text-white"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              {arenaTabs?.map((tab) => (
                <Link
                  key={tab.model}
                  href={tab.href}
                  className={cn(
                    "border px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
                    tab.active
                      ? "border-purple bg-purple text-white"
                      : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </>
          ) : (
            TABS.map((tab) => {
              const active =
                tab.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "border px-5 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all",
                    active
                      ? "border-purple bg-purple text-white"
                      : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })
          )}
        </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <SettingsDropdown variant={variant} />
          {connected ? (
            <ProfileDropdown variant={variant} />
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                "flex items-center gap-2 border px-4 py-2.5 font-tech text-xs font-bold uppercase tracking-[0.15em] transition-all focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2",
                variant === "worldcup"
                  ? "border-white/10 bg-white/5 text-white/70 hover:border-purple hover:bg-purple hover:text-white"
                  : "border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white"
              )}
            >
              <span className="material-symbols-outlined" aria-hidden="true">wallet</span>
              CONNECT
            </button>
          )}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[70] flex justify-center px-4 md:hidden">
        <div className="pointer-events-auto flex max-w-full items-center gap-2">
          <nav
            aria-label="Mobile navigation"
            className={cn(
              "flex max-w-full items-center gap-1 rounded-2xl p-1 shadow-lg backdrop-blur-xl",
              variant === "worldcup"
                ? "bg-slate-950/95 shadow-black/40"
                : "bg-background/95 shadow-slate-950/20",
            )}
          >
            {isNested && (
              <MobileNavItem
                href={backHref}
                label="Back"
                icon={ArrowLeft}
                showLabel={mobileItems.length === 0}
                variant={variant}
              />
            )}

            {mobileItems.map((item) => (
              <MobileNavItem
                key={item.href}
                href={item.href}
                label={item.mobileLabel}
                icon={item.icon}
                active={item.active}
                showLabel={item.active}
                variant={variant}
              />
            ))}
          </nav>

          <SettingsDropdown variant={variant} mobile />

          {connected ? (
            <Link
              href="/profile"
              aria-label="Open wallet profile"
              className={cn(
                "relative flex h-14 w-14 flex-none items-center justify-center rounded-2xl shadow-lg transition-[background-color,color,transform] duration-100 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2",
                variant === "worldcup"
                  ? "bg-wc-cyan text-slate-950 shadow-black/40"
                  : "bg-purple text-white shadow-slate-950/20",
              )}
            >
              <WalletCards size={21} strokeWidth={2} aria-hidden="true" />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-white ring-2",
                  variant === "worldcup" ? "ring-wc-cyan" : "ring-purple",
                )}
              />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={cn(
                "flex h-14 w-14 flex-none items-center justify-center rounded-2xl shadow-lg transition-[background-color,color,transform] duration-100 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2",
                variant === "worldcup"
                  ? "bg-wc-cyan text-slate-950 shadow-black/40"
                  : "bg-purple text-white shadow-slate-950/20",
              )}
              aria-label="Connect wallet"
            >
              <WalletCards size={21} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <ConnectWalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

interface MobileNavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  showLabel?: boolean;
  variant: "default" | "worldcup";
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active = false,
  showLabel = false,
  variant,
}: MobileNavItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-12 min-w-10 flex-none items-center justify-center gap-1.5 rounded-xl px-2 font-tech text-xs font-bold transition-[background-color,color,transform] duration-100 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-inset",
        active
          ? variant === "worldcup"
            ? "bg-wc-cyan text-slate-950"
            : "bg-purple text-white"
          : variant === "worldcup"
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon size={19} strokeWidth={2} aria-hidden="true" />
      <span
        className={
          showLabel
            ? "hidden max-w-16 truncate min-[420px]:inline"
            : "sr-only"
        }
      >
        {label}
      </span>
    </Link>
  );
}
