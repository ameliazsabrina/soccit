import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

const APP_URL = "https://play.soccit.fun";

export function KnowledgeHeader({ section }: { section: "Docs" | "Whitepaper" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-5 py-2 sm:min-h-20 sm:px-8 lg:px-14">
        <Link
          href="/"
          aria-label="Back to the Soccit landing page"
          className="inline-flex min-h-11 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
        >
          <Image src="/assets/soccit-logo-black.svg" alt="" width={48} height={30} className="h-7 w-11 object-contain dark:hidden" priority />
          <Image src="/assets/soccit-logo.svg" alt="" width={48} height={30} className="hidden h-7 w-11 object-contain dark:block" priority />
          <span className="border-l border-foreground/20 pl-3 font-tech text-[10px] uppercase tracking-[0.2em] text-foreground/70">{section}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Knowledge navigation">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 border border-foreground/25 px-3 font-tech text-[10px] uppercase tracking-[0.14em] transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:px-4"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Back to landing</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <Link
            href={section === "Docs" ? "/whitepaper" : "/docs"}
            className="inline-flex min-h-11 items-center px-3 font-tech text-[10px] uppercase tracking-[0.14em] text-foreground/75 transition-colors duration-100 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple sm:px-4"
          >
            {section === "Docs" ? "Whitepaper" : "Docs"}
          </Link>
          <a
            href={APP_URL}
            className="hidden min-h-11 items-center gap-2 bg-purple px-4 font-tech text-[10px] uppercase tracking-[0.14em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 md:inline-flex"
          >
            Enter arena
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
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
            ["Landing", "/"],
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
  return (
    <main className="min-h-screen bg-background text-foreground">
      <KnowledgeHeader section={section} />
      {children}
      <KnowledgeFooter />
    </main>
  );
}
