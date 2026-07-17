import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleDot,
  Coins,
  Radio,
  ShieldCheck,
  Trophy,
  WalletCards,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Docs — Soccit",
  description: "How Soccit's live football prediction arena, scoring, match vaults, and Solana settlement work.",
};

const NAV_ITEMS = [
  ["Overview", "overview"],
  ["The match loop", "match-loop"],
  ["Prediction models", "prediction-models"],
  ["Scoring", "scoring"],
  ["Vaults & rewards", "vaults"],
  ["Match lifecycle", "lifecycle"],
  ["Architecture", "architecture"],
  ["Transaction flow", "transaction-flow"],
  ["Live data", "live-data"],
] as const;

const LOOP_STEPS = [
  {
    number: "01",
    title: "Enter a match",
    body: "Open a fixture and review its status, entry fee, current vault, participant count, and prize split. Every fixture has its own arena and competition.",
  },
  {
    number: "02",
    title: "Make the call",
    body: "Predict the final score or switch to the pitch and call a substitution. Every call belongs to one fixture and records when it was locked.",
  },
  {
    number: "03",
    title: "Confirm the read",
    body: "Review the score or the player going out and coming in. The confirmation view makes the complete prediction clear before the wallet opens.",
  },
  {
    number: "04",
    title: "Lock it on-chain",
    body: "Your connected wallet approves the prediction transaction. The signed call is then submitted to Solana, creating a transparent and time-stamped record.",
  },
  {
    number: "05",
    title: "Climb and settle",
    body: "Live events score the prediction. Points move you through the match leaderboard; after the result is final, the vault pays the winning wallets.",
  },
] as const;

function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-foreground/15 py-12 sm:py-16">
      <div className="mb-8 grid gap-3 sm:grid-cols-[9rem_1fr] sm:gap-8">
        <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-purple">{kicker}</span>
        <h2 className="max-w-3xl font-display text-[clamp(2.1rem,5vw,4.75rem)] uppercase leading-[0.84] tracking-[-0.055em] text-foreground">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-4 border-cyan bg-surface px-5 py-4 font-body text-sm leading-7 text-foreground/75">
      {children}
    </div>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-foreground/15 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:h-20 sm:px-8 lg:px-14">
          <Link
            href="/landing"
            aria-label="Soccit landing page"
            className="inline-flex min-h-10 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple"
          >
            <Image src="/assets/soccit-logo-black.svg" alt="" width={48} height={30} className="h-7 w-11 object-contain" priority />
            <span className="border-l border-foreground/20 pl-3 font-tech text-[10px] uppercase tracking-[0.2em] text-foreground/65">Documentation</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/landing"
              className="group inline-flex h-10 items-center gap-2 border border-foreground/25 px-3 font-tech text-[10px] uppercase tracking-[0.16em] transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:px-4"
            >
              <ArrowLeft size={15} className="transition-transform duration-100 group-hover:-translate-x-1" aria-hidden="true" />
              Back
            </Link>
            <Link
              href="/matches"
              className="group hidden h-10 items-center gap-3 bg-purple px-4 font-tech text-[10px] uppercase tracking-[0.16em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2 sm:inline-flex"
            >
              Enter a match
              <ArrowRight size={15} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-foreground/15">
        <div aria-hidden="true" className="pointer-events-none absolute right-[-8rem] top-[-9rem] h-96 w-96 rotate-45 border-[5rem] border-purple/[0.04]" />
        <div className="relative mx-auto max-w-[1500px] px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:px-14 lg:pt-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <div className="mb-6 flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.22em] text-purple">
                <span className="h-2 w-2 rotate-45 bg-cyan" />
                Soccit product guide / Season 01
              </div>
              <h1 className="max-w-5xl font-[family-name:var(--font-mona-sans)] text-[clamp(3.4rem,9.5vw,9.5rem)] font-extrabold uppercase leading-[0.73] tracking-[-0.085em] text-foreground">
                Know the game.<br /><span className="text-purple">Make the call.</span>
              </h1>
              <p className="mt-8 max-w-2xl font-body text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8">
                Soccit is a live football prediction arena on Solana. It turns match knowledge into verifiable calls, points, leaderboard position, and vault rewards.
              </p>
            </div>

            <div className="border border-foreground/15 bg-surface p-5">
              <div className="mb-5 flex items-center justify-between border-b border-foreground/15 pb-4">
                <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-foreground/55">At a glance</span>
                <span className="flex items-center gap-2 font-tech text-[10px] uppercase tracking-[0.16em] text-purple">
                  <span className="h-2 w-2 rounded-full bg-cyan" /> Live system
                </span>
              </div>
              <dl className="space-y-4 font-tech text-[10px] uppercase tracking-[0.14em]">
                <div className="flex justify-between gap-4"><dt className="text-foreground/50">Network</dt><dd>Solana</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-foreground/50">Match data</dt><dd>TxODDS TxLINE</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-foreground/50">Competition</dt><dd>Match + weekly</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-foreground/50">Rewards</dt><dd>Match vaults</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-12 px-5 pb-24 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28 border-t border-foreground/20 pt-5">
            <span className="mb-5 block font-tech text-[10px] uppercase tracking-[0.2em] text-foreground/50">On this page</span>
            <nav className="space-y-1" aria-label="Documentation sections">
              {NAV_ITEMS.map(([label, id], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="group flex min-h-10 items-center justify-between border-b border-foreground/10 py-2 font-tech text-[10px] uppercase tracking-[0.1em] text-foreground/65 transition-colors duration-100 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple"
                >
                  <span><span className="mr-3 text-foreground/35">0{index + 1}</span>{label}</span>
                  <ChevronRight size={13} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0">
          <Section id="overview" kicker="01 / Overview" title="Football instinct becomes a verifiable result.">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { icon: CircleDot, title: "Predict live", body: "Read the fixture and lock a score or substitution call while the match is active." },
                { icon: ShieldCheck, title: "Prove the lock", body: "A wallet-approved transaction records the prediction and the minute it was made." },
                { icon: Trophy, title: "Compete for rank", body: "Correct calls earn points, move the leaderboard, and determine vault winners." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="border border-foreground/15 bg-white p-5">
                  <Icon size={23} strokeWidth={1.6} className="mb-8 text-purple" aria-hidden="true" />
                  <h3 className="font-display text-xl uppercase tracking-[-0.03em]">{title}</h3>
                  <p className="mt-3 font-body text-sm leading-6 text-foreground/65">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 bg-purple p-6 text-white sm:p-8 lg:grid-cols-[1fr_1.15fr]">
              <h3 className="font-display text-[clamp(2rem,4vw,3.8rem)] uppercase leading-[0.86] tracking-[-0.05em]">Not a sportsbook.<br />A knowledge arena.</h3>
              <div className="space-y-4 font-body text-sm leading-7 text-white/80">
                <p>Soccit is built around specific football reads rather than a passive odds slip. A player calls what will happen, commits before the event, and competes on accuracy.</p>
                <p>Each match has its own arena, live data, points table, and prize vault. A weekly global leaderboard connects performance across fixtures and resets for the next reward cycle.</p>
              </div>
            </div>
          </Section>

          <Section id="match-loop" kicker="02 / The match loop" title="From entry to settlement in five moves.">
            <div className="border-t border-foreground/20">
              {LOOP_STEPS.map((step) => (
                <div key={step.number} className="grid gap-3 border-b border-foreground/20 py-6 sm:grid-cols-[4rem_13rem_1fr] sm:gap-6 sm:py-8">
                  <span className="font-tech text-[10px] tracking-[0.18em] text-purple">{step.number}</span>
                  <h3 className="font-display text-2xl uppercase leading-none tracking-[-0.04em]">{step.title}</h3>
                  <p className="font-body text-sm leading-7 text-foreground/65">{step.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="prediction-models" kicker="03 / Prediction models" title="Two ways to read the match.">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="border border-foreground/15 bg-surface p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-purple">Final score</span>
                  <span className="bg-purple px-3 py-1 font-tech text-[9px] uppercase tracking-[0.14em] text-white">5 pts max</span>
                </div>
                <h3 className="font-display text-4xl uppercase tracking-[-0.05em]">Call the score</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/65">Set the final goals for both teams. An exact result earns the maximum score, while the correct winner or draw still earns points when the goal totals differ.</p>
                <p className="mt-6 border-t border-foreground/15 pt-5 font-body text-sm leading-7 text-foreground/65">The score selector starts from the live match state, so the prediction always reflects what was known at the time of the call.</p>
              </div>

              <div className="border border-foreground/15 bg-surface p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-purple">Substitution</span>
                  <span className="bg-purple px-3 py-1 font-tech text-[9px] uppercase tracking-[0.14em] text-white">3 pts max</span>
                </div>
                <h3 className="font-display text-4xl uppercase tracking-[-0.05em]">Pitch the subs</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/65">Choose the home or away team, then pair one starter going out with one bench player coming in. The pitch uses the official lineup for that fixture.</p>
                <p className="mt-6 border-t border-foreground/15 pt-5 font-body text-sm leading-7 text-foreground/65">A complete pair earns the most points. Reading only the outgoing or incoming player correctly can still contribute to the leaderboard.</p>
              </div>
            </div>
            <div className="mt-5"><Note>Goalscorer predictions are planned for a future arena update. The current active experience focuses on final scores and substitutions.</Note></div>
          </Section>

          <Section id="scoring" kicker="04 / Scoring" title="Accuracy creates points. Timing breaks the tie.">
            <div className="overflow-x-auto border border-foreground/15 bg-white" data-lenis-prevent>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead className="bg-surface font-tech text-[10px] uppercase tracking-[0.16em] text-foreground/55">
                  <tr><th className="p-4">Prediction</th><th className="p-4">Result</th><th className="p-4 text-right">Points</th></tr>
                </thead>
                <tbody className="font-body text-sm">
                  {[
                    ["Final score", "Exact score", "5 pts"],
                    ["Final score", "Correct win, draw, or loss", "3 pts"],
                    ["Substitution", "Correct outgoing and incoming players", "3 pts"],
                    ["Substitution", "Correct outgoing player only", "1 pt"],
                    ["Substitution", "Correct incoming player only", "1 pt"],
                  ].map((row) => (
                    <tr key={`${row[0]}-${row[1]}`} className="border-t border-foreground/15">
                      <td className="p-4 font-medium">{row[0]}</td><td className="p-4 text-foreground/65">{row[1]}</td><td className="p-4 text-right font-display text-xl text-purple">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Note>Match rankings sort players by total points. When players are tied, the earlier successful prediction wins the higher position.</Note>
              <Note>The global competition combines performance across matches. It runs in weekly cycles so every reset creates another chance to reach the reward zone.</Note>
            </div>
          </Section>

          <Section id="vaults" kicker="05 / Vaults & rewards" title="Every match carries its own prize pool.">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="border border-foreground/15 bg-surface p-6 sm:p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-purple">Settlement model</span>
                    <h3 className="mt-3 font-display text-4xl uppercase leading-none tracking-[-0.05em]">80% net prize pool</h3>
                  </div>
                  <Coins size={30} strokeWidth={1.5} className="text-cyan" aria-hidden="true" />
                </div>
                <p className="mt-5 font-body text-sm leading-7 text-foreground/65">Entry fees accumulate in the fixture&apos;s vault. At settlement, the platform fee is removed and the remaining pool is divided among the top three wallets.</p>
                <div className="mt-7 grid grid-cols-3 border border-foreground/15 text-center">
                  <div className="p-4"><span className="block font-tech text-[9px] uppercase text-foreground/50">1st</span><strong className="mt-2 block font-display text-3xl text-purple">50%</strong></div>
                  <div className="border-x border-foreground/15 p-4"><span className="block font-tech text-[9px] uppercase text-foreground/50">2nd</span><strong className="mt-2 block font-display text-3xl text-purple">30%</strong></div>
                  <div className="p-4"><span className="block font-tech text-[9px] uppercase text-foreground/50">3rd</span><strong className="mt-2 block font-display text-3xl text-purple">20%</strong></div>
                </div>
              </div>

              <div className="border border-foreground/15 bg-white p-6 sm:p-8">
                <WalletCards size={27} strokeWidth={1.5} className="mb-8 text-purple" aria-hidden="true" />
                <h3 className="font-display text-3xl uppercase tracking-[-0.04em]">What a vault represents</h3>
                <ul className="mt-6 space-y-4 font-body text-sm text-foreground/70">
                  {["One specific football fixture", "Its entry fee and reward currency", "The accumulated prize pool", "The number of participants", "The current match state", "The three winning wallets after settlement"].map((item) => (
                    <li key={item} className="flex gap-3 border-b border-foreground/10 pb-3"><span className="text-purple">+</span>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section id="lifecycle" kicker="06 / Match lifecycle" title="The arena follows the state of the fixture.">
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-4">
              {[
                ["01", "Open", "The vault and arena are available. Players can enter and lock predictions."],
                ["02", "Live", "Score, minute, events, and leaderboard positions update as the match unfolds."],
                ["03", "Resolved", "The final result is known. New calls stop while settlement is prepared."],
                ["04", "Settled", "Winners and results are final, and the match vault payout is complete."],
              ].map(([number, title, body]) => (
                <div key={title} className="bg-white p-5 sm:min-h-64">
                  <span className="font-tech text-[10px] text-purple">{number}</span>
                  <h3 className="mt-16 font-display text-3xl uppercase tracking-[-0.04em]">{title}</h3>
                  <p className="mt-3 font-body text-sm leading-6 text-foreground/60">{body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="architecture" kicker="07 / Architecture" title="Three layers keep the arena synchronized.">
            <div className="space-y-3">
              {[
                { icon: ShieldCheck, title: "Solana", tag: "Truth & settlement", body: "Records match accounts, prediction locks, vault state, winner addresses, and final settlement." },
                { icon: Radio, title: "TxODDS TxLINE", tag: "Live football data", body: "Supplies fixtures, official lineups, player identities, live events, score, minute, and match status." },
                { icon: Zap, title: "Soccit backend", tag: "Orchestration", body: "Connects live football data to the on-chain match, prepares wallet actions, and serves profiles, events, and leaderboards." },
              ].map(({ icon: Icon, title, tag, body }, index) => (
                <div key={title} className="grid gap-4 border border-foreground/15 bg-white p-5 sm:grid-cols-[3rem_12rem_10rem_1fr] sm:items-center">
                  <Icon size={24} strokeWidth={1.5} className="text-purple" aria-hidden="true" />
                  <h3 className="font-display text-2xl uppercase tracking-[-0.04em]">{title}</h3>
                  <span className="font-tech text-[9px] uppercase tracking-[0.14em] text-foreground/50">0{index + 1} / {tag}</span>
                  <p className="font-body text-sm leading-6 text-foreground/65">{body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="transaction-flow" kicker="08 / Transaction flow" title="The wallet stays in control.">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="bg-purple p-6 text-white sm:p-8">
                <ShieldCheck size={27} strokeWidth={1.5} className="mb-8 text-cyan" aria-hidden="true" />
                <h3 className="font-display text-3xl uppercase tracking-[-0.04em]">Soccit prepares. You approve.</h3>
                <p className="mt-4 font-body text-sm leading-7 text-white/80">Soccit prepares the complete prediction action from the selected fixture, team, players, score, and lock minute. Nothing is submitted until the connected wallet approves it.</p>
              </div>
              <div className="border border-foreground/15 bg-surface p-6 sm:p-8">
                <WalletCards size={27} strokeWidth={1.5} className="mb-8 text-purple" aria-hidden="true" />
                <h3 className="font-display text-3xl uppercase tracking-[-0.04em]">The signed call goes direct.</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/65">After approval, the signed action is sent directly to Solana and confirmed by the network. Soccit never needs custody of the player&apos;s wallet or permission to sign on their behalf.</p>
              </div>
            </div>
            <div className="mt-5"><Note>If a player rejects the wallet request, the prediction remains unlocked and nothing is submitted. They can review the call and try again.</Note></div>
          </Section>

          <Section id="live-data" kicker="09 / Live data" title="The arena reacts as the match changes.">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {["Fixtures", "Lineups", "Live events", "Score & minute"].map((item, index) => (
                <div key={item} className="border border-foreground/15 bg-white p-5">
                  <span className="font-tech text-[9px] text-purple">0{index + 1}</span>
                  <h3 className="mt-10 font-display text-2xl uppercase tracking-[-0.04em]">{item}</h3>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="border border-foreground/15 bg-surface p-6">
                <Radio size={25} strokeWidth={1.5} className="mb-6 text-purple" aria-hidden="true" />
                <h3 className="font-display text-3xl uppercase tracking-[-0.04em]">Match updates</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/65">Goals, substitutions, cards, and status changes stream into the arena. The score, timeline, and pitch state update without a page reload.</p>
              </div>
              <div className="border border-foreground/15 bg-surface p-6">
                <Trophy size={25} strokeWidth={1.5} className="mb-6 text-purple" aria-hidden="true" />
                <h3 className="font-display text-3xl uppercase tracking-[-0.04em]">Rank updates</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/65">Point changes stream separately so every successful call can move the table immediately. The leaderboard stays connected to the live match result.</p>
              </div>
            </div>
          </Section>

          <section className="border-t border-foreground/15 py-14">
            <div className="bg-purple p-7 text-white sm:flex sm:items-end sm:justify-between sm:gap-10 sm:p-10">
              <div>
                <BookOpen size={26} strokeWidth={1.5} className="mb-8 text-cyan" aria-hidden="true" />
                <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-white/65">End of the guide</span>
                <h2 className="mt-3 max-w-xl font-display text-[clamp(2.4rem,5vw,5rem)] uppercase leading-[0.83] tracking-[-0.055em]">Ready to make the call?</h2>
              </div>
              <Link href="/matches" className="group mt-8 inline-flex h-13 shrink-0 items-center gap-4 bg-white px-6 font-display text-xs uppercase tracking-[0.14em] text-purple transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:mt-0">
                Enter the arena <ArrowRight size={17} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </article>
      </div>

      <footer className="border-t border-foreground/15 px-5 py-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/assets/soccit-logo-black.svg" alt="" width={42} height={26} className="h-6 w-9 object-contain" />
            <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-foreground/55">Soccit / Season 01</span>
          </div>
          <a href="https://x.com/playsoccit" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center font-tech text-[10px] uppercase tracking-[0.16em] text-foreground/65 transition-colors duration-100 hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple">Follow on X</a>
        </div>
      </footer>
    </main>
  );
}
