"use client";

import type { ReactNode, RefObject } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ChevronRight, Menu, X } from "lucide-react";

const APP_URL = "https://play.soccit.fun";

type KnowledgeNavigation = ReadonlyArray<readonly [label: string, id: string]>;

type SidebarContextValue = {
  closeSidebar: () => void;
  isDesktop: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("Knowledge sidebar must be used inside KnowledgePage.");
  return context;
}

export function KnowledgeHeader({ section }: { section: "Docs" | "Whitepaper" }) {
  const { sidebarOpen, toggleSidebar, triggerRef } = useSidebar();

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-5 py-2 sm:min-h-20 sm:px-8 lg:px-14">
        <Link
          href="/"
          aria-label="Soccit home"
          className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
        >
          <Image src="/assets/soccit-logo-black.svg" alt="" width={48} height={30} className="h-7 w-11 object-contain" priority />
          <span className="hidden border-l border-foreground/20 pl-3 font-tech text-[10px] uppercase tracking-[0.2em] text-foreground/70 min-[420px]:inline">{section}</span>
        </Link>

        <nav className="flex items-center gap-2" aria-label="Knowledge navigation">
          <button
            ref={triggerRef}
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide contents sidebar" : "Show contents sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="knowledge-sidebar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-foreground/25 transition-colors duration-100 hover:bg-purple hover:text-white active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
          >
            {sidebarOpen ? <X size={18} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 border border-foreground/25 px-3 font-tech text-[10px] uppercase tracking-[0.14em] transition-colors duration-100 hover:bg-purple hover:text-white active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:px-4"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </Link>
          <Link
            href={section === "Docs" ? "/whitepaper" : "/docs"}
            className="hidden min-h-11 items-center px-3 font-tech text-[10px] uppercase tracking-[0.14em] text-foreground/75 transition-colors duration-100 hover:text-purple active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple sm:inline-flex sm:px-4"
          >
            {section === "Docs" ? "Whitepaper" : "Docs"}
          </Link>
          <a
            href={APP_URL}
            className="hidden min-h-11 items-center gap-2 bg-purple px-4 font-tech text-[10px] uppercase tracking-[0.14em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 md:inline-flex"
          >
            Enter arena
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}

export function KnowledgeContent({ navigation, children }: { navigation: KnowledgeNavigation; children: ReactNode }) {
  const { closeSidebar, isDesktop, sidebarOpen } = useSidebar();
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sidebarOpen || isDesktop) return;

    const sidebar = sidebarRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar?.querySelector<HTMLAnchorElement>("a[href]")?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;

      const links = [...sidebar.querySelectorAll<HTMLAnchorElement>("a[href]")];
      const first = links[0];
      const last = links[links.length - 1];
      if (!first || !last) return;

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
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSidebar, isDesktop, sidebarOpen]);

  return (
    <div className={`mx-auto grid max-w-[1500px] gap-12 px-5 pb-24 sm:px-8 lg:px-14 ${sidebarOpen ? "lg:grid-cols-[16rem_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
      {sidebarOpen && (
        <>
          {!isDesktop && (
            <button
              type="button"
              aria-label="Close contents sidebar"
              onClick={closeSidebar}
              className="fixed inset-0 top-16 z-40 bg-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple sm:top-20 lg:hidden"
            />
          )}
          <aside
            ref={sidebarRef}
            id="knowledge-sidebar"
            aria-label="Page contents"
            className="fixed bottom-0 left-0 top-16 z-50 w-[min(20rem,calc(100vw-3rem))] overflow-y-auto border-r border-foreground/15 bg-background px-5 py-6 sm:top-20 sm:px-8 lg:static lg:z-auto lg:w-auto lg:overflow-visible lg:border-r-0 lg:bg-transparent lg:px-0 lg:py-0"
          >
            <div className="lg:sticky lg:top-28 lg:border-t lg:border-foreground/20 lg:pt-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-foreground/60">On this page</span>
                {!isDesktop && (
                  <button type="button" onClick={closeSidebar} aria-label="Close contents sidebar" className="inline-flex h-11 w-11 items-center justify-center border border-foreground/25 transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple">
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              <nav aria-label="Page sections">
                {navigation.map(([label, id], index) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => { if (!isDesktop) closeSidebar(); }}
                    className="group flex min-h-11 items-center justify-between border-b border-foreground/10 py-2 font-tech text-[10px] uppercase tracking-[0.09em] text-foreground/75 transition-colors duration-100 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                  >
                    <span><span className="mr-3 text-foreground/45">{String(index + 1).padStart(2, "0")}</span>{label}</span>
                    <ChevronRight size={13} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </>
      )}
      <article className="min-w-0">{children}</article>
    </div>
  );
}

export function KnowledgeFooter() {
  return (
    <footer className="border-t border-foreground/15 px-5 py-8 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/assets/soccit-logo-black.svg" alt="" width={42} height={26} className="h-6 w-9 object-contain dark:hidden" />
          <Image src="/assets/soccit-logo.svg" alt="" width={42} height={26} className="hidden h-6 w-9 object-contain dark:block" />
          <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-foreground/60">Soccit / Season 01 / 2026</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Publication footer">
          {[
            ["Home", "/"],
            ["Docs", "/docs"],
            ["Whitepaper", "/whitepaper"],
            ["Arena", APP_URL],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="inline-flex min-h-10 items-center font-tech text-[10px] uppercase tracking-[0.14em] text-foreground/70 transition-colors duration-100 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function KnowledgePage({ section, children }: { section: "Docs" | "Whitepaper"; children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = (desktop: boolean) => {
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };
    sync(query.matches);
    const handleChange = (event: MediaQueryListEvent) => sync(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  const closeSidebar = () => {
    setSidebarOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <SidebarContext.Provider value={{ closeSidebar, isDesktop, sidebarOpen, toggleSidebar: () => setSidebarOpen((open) => !open), triggerRef }}>
      <main className="min-h-screen bg-background text-foreground">
        <KnowledgeHeader section={section} />
        {children}
        <KnowledgeFooter />
      </main>
    </SidebarContext.Provider>
  );
}
