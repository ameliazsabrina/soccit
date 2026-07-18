import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gamepad2,
  Goal,
  ShieldCheck,
  Trophy,
  WalletCards,
} from "lucide-react";
import { KnowledgeContent, KnowledgePage } from "../_components/knowledge-shell";

const APP_MATCHES_URL = "https://play.soccit.fun/matches";

export const metadata: Metadata = {
  title: "Learn Soccit — Product Guide",
  description: "Learn how to enter a match, make a football prediction, earn points, and compete for Soccit match-vault rewards.",
  alternates: { canonical: "https://soccit.fun/docs" },
};

const NAV_ITEMS = [
  ["Start here", "start"],
  ["Your first match", "first-match"],
  ["Prediction types", "predictions"],
  ["Points & ranking", "points"],
  ["Rewards", "rewards"],
  ["Safety", "safety"],
  ["Glossary", "glossary"],
] as const;

function Section({ id, index, title, intro, children }: { id: string; index: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-foreground/15 py-12 sm:py-16">
      <div className="mb-8 grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-8">
        <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-purple">{index}</span>
        <div>
          <h2 className="max-w-3xl font-display text-[clamp(2.3rem,5vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.055em]">{title}</h2>
          <p className="mt-5 max-w-prose font-body text-sm leading-7 text-foreground/70 sm:text-base">{intro}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return <div className="border-l-4 border-cyan bg-surface px-5 py-4 font-body text-sm leading-7 text-foreground/80">{children}</div>;
}

export default function DocsPage() {
  return (
    <KnowledgePage section="Docs">
      <section className="relative overflow-hidden border-b border-foreground/15">
        <div aria-hidden="true" className="pointer-events-none absolute right-[-8rem] top-[-9rem] h-96 w-96 rotate-45 border-[5rem] border-purple/[0.04]" />
        <div className="relative mx-auto max-w-[1500px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24 lg:px-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <div className="mb-6 flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.22em] text-purple">
                <span className="h-2 w-2 rotate-45 bg-cyan" /> Product guide / Read time: 5 minutes
              </div>
              <h1 className="max-w-5xl font-[family-name:var(--font-mona-sans)] text-[clamp(3.3rem,9vw,8.5rem)] font-extrabold uppercase leading-[0.76] tracking-[-0.08em]">
                Learn the arena.<br /><span className="text-purple">Make your first call.</span>
              </h1>
              <p className="mt-8 max-w-2xl font-body text-base leading-7 text-foreground/75 sm:text-lg sm:leading-8">
                Soccit is a football knowledge competition on Solana. You predict match outcomes, lock the call with your wallet, earn points for accuracy, and compete for match-vault rewards.
              </p>
            </div>

            <div className="border border-foreground/15 bg-surface p-5">
              <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-foreground/60">Choose your depth</span>
              <div className="mt-5 space-y-2">
                <a href="#first-match" className="group flex min-h-12 items-center justify-between border border-foreground/15 bg-background px-4 font-tech text-[10px] uppercase tracking-[0.14em] transition-colors duration-100 hover:border-purple hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple">
                  Play walkthrough <ChevronRight size={15} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
                </a>
                <Link href="/whitepaper" className="group flex min-h-12 items-center justify-between border border-foreground/15 bg-background px-4 font-tech text-[10px] uppercase tracking-[0.14em] transition-colors duration-100 hover:border-purple hover:text-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple">
                  Read the protocol <ChevronRight size={15} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <KnowledgeContent navigation={NAV_ITEMS}>
          <Section id="start" index="01 / Start here" title="The whole game in sixty seconds." intro="Every Soccit competition belongs to a real football fixture. Your prediction is judged against the final result or official match event, then converted into leaderboard points.">
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Gamepad2, title: "Choose a match", body: "Review the fixture, status, entry fee, prize pool, and participant count." },
                { icon: Goal, title: "Make a call", body: "Predict the final score or a player substitution from the official lineup." },
                { icon: ShieldCheck, title: "Lock with wallet", body: "Review the complete call, approve it, and record the prediction on Solana." },
                { icon: Trophy, title: "Earn your rank", body: "Correct calls earn points. Accuracy leads; an earlier successful lock breaks ties." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="bg-background p-5 sm:min-h-64">
                  <Icon size={24} strokeWidth={1.6} className="text-purple" aria-hidden="true" />
                  <h3 className="mt-12 font-display text-2xl uppercase tracking-[-0.04em]">{title}</h3>
                  <p className="mt-3 font-body text-sm leading-6 text-foreground/70">{body}</p>
                </div>
              ))}
            </div>
            <div className="mt-5"><Tip>Soccit rewards football reads, not passive odds selection. You compete on the accuracy and timing of a specific prediction.</Tip></div>
          </Section>

          <Section id="first-match" index="02 / Your first match" title="From the match list to a locked prediction." intro="You need a compatible Solana wallet and enough of the match vault’s listed token to cover the entry fee. The confirmation screen shows what will be submitted before your wallet asks for approval.">
            <ol className="border-t border-foreground/20">
              {[
                ["Open Matches", "Go to the arena and choose an OPEN or LIVE fixture. Check the entry fee and match state before continuing."],
                ["Connect your wallet", "Use your own wallet. Soccit does not ask for a seed phrase or private key."],
                ["Choose a prediction", "Stay on Score for a final-score call, or open Pitch to select the team and substitution pair."],
                ["Review the call", "Confirm the teams, selected players or score, entry fee, and match minute. Fix anything that looks wrong."],
                ["Approve and confirm", "Approve the wallet request. Wait for network confirmation before leaving the arena."],
              ].map(([title, body], index) => (
                <li key={title} className="grid gap-3 border-b border-foreground/20 py-6 sm:grid-cols-[4rem_14rem_1fr] sm:gap-6 sm:py-8">
                  <span className="font-tech text-[10px] tracking-[0.18em] text-purple">0{index + 1}</span>
                  <h3 className="font-display text-2xl uppercase leading-none tracking-[-0.04em]">{title}</h3>
                  <p className="font-body text-sm leading-7 text-foreground/70">{body}</p>
                </li>
              ))}
            </ol>
            <a href={APP_MATCHES_URL} className="group mt-7 inline-flex min-h-12 items-center gap-4 bg-purple px-6 font-display text-xs uppercase tracking-[0.14em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">
              Browse matches <ArrowRight size={17} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" />
            </a>
          </Section>

          <Section id="predictions" index="03 / Prediction types" title="Two active ways to read the game." intro="Each model uses information available for that fixture. Predictions are associated with the match and the minute at which they are locked.">
            <div className="grid gap-5 lg:grid-cols-2">
              {[
                { label: "Final score", points: "5 pts max", title: "Call the score", body: "Choose the final goals for the home and away teams. The selector begins from the current score, so a live prediction cannot ignore goals already scored.", checks: ["Exact score: 5 points", "Correct win, draw, or loss: 3 points"] },
                { label: "Substitution", points: "3 pts max", title: "Pitch the subs", body: "Choose a team, then pair one starter going off with one bench player coming on. Available players come from the fixture lineup.", checks: ["Correct player out + player in: 3 points", "One correct side of the pair: 1 point"] },
              ].map((model) => (
                <div key={model.label} className="border border-foreground/15 bg-surface p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-tech text-[10px] uppercase tracking-[0.18em] text-purple">{model.label}</span>
                    <span className="bg-purple px-3 py-1 font-tech text-[9px] uppercase tracking-[0.14em] text-white">{model.points}</span>
                  </div>
                  <h3 className="mt-8 font-display text-4xl uppercase tracking-[-0.05em]">{model.title}</h3>
                  <p className="mt-4 font-body text-sm leading-7 text-foreground/70">{model.body}</p>
                  <ul className="mt-6 space-y-3 border-t border-foreground/15 pt-5">
                    {model.checks.map((item) => <li key={item} className="flex gap-3 font-body text-sm text-foreground/80"><Check size={16} className="mt-0.5 shrink-0 text-purple" aria-hidden="true" />{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-5"><Tip>Goalscorer predictions are planned but are not part of the current active competition. The interface marks unavailable models clearly.</Tip></div>
          </Section>

          <Section id="points" index="04 / Points & ranking" title="Accuracy comes first. Timing settles the tie." intro="The match leaderboard totals points from scored predictions. A player with more points ranks higher; when totals match, the earlier successful lock minute receives the higher position.">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div className="overflow-x-auto border border-foreground/15" data-lenis-prevent>
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead className="bg-surface font-tech text-[10px] uppercase tracking-[0.14em] text-foreground/65"><tr><th className="p-4">Call</th><th className="p-4">Result</th><th className="p-4 text-right">Points</th></tr></thead>
                  <tbody className="font-body text-sm">
                    {[["Score", "Exact final score", "5"], ["Score", "Correct outcome", "3"], ["Substitution", "Both players correct", "3"], ["Substitution", "One player correct", "1"]].map((row) => (
                      <tr key={`${row[0]}-${row[1]}`} className="border-t border-foreground/15"><td className="p-4 font-medium">{row[0]}</td><td className="p-4 text-foreground/70">{row[1]}</td><td className="p-4 text-right font-display text-2xl text-purple">{row[2]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-purple p-6 text-white sm:p-8">
                <Clock3 size={25} className="text-cyan" aria-hidden="true" />
                <h3 className="mt-10 font-display text-3xl uppercase tracking-[-0.04em]">Example tie</h3>
                <p className="mt-4 font-body text-sm leading-7 text-white/85">Alex and Sam both finish on 8 points. Alex’s earliest scoring prediction locked in minute 24; Sam’s locked in minute 31. Alex ranks above Sam.</p>
              </div>
            </div>
          </Section>

          <Section id="rewards" index="05 / Rewards" title="The match vault funds the reward pool." intro="Entry fees accumulate in a fixture-specific vault. Under the current product model, a 20% platform fee is deducted and the remaining 80% becomes the net prize pool.">
            <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
              <div className="border border-foreground/15 bg-surface p-6 sm:p-8">
                <CircleDollarSign size={27} className="text-purple" aria-hidden="true" />
                <h3 className="mt-8 font-display text-4xl uppercase tracking-[-0.05em]">50 / 30 / 20</h3>
                <p className="mt-4 font-body text-sm leading-7 text-foreground/70">The net pool is allocated to first, second, and third place. If fewer than three ranked participants are eligible, the live product may apply a winner-takes-all fallback.</p>
              </div>
              <div className="grid grid-cols-3 border border-foreground/15 text-center">
                {[['1st', '50%'], ['2nd', '30%'], ['3rd', '20%']].map(([rank, share], index) => (
                  <div key={rank} className={`flex min-h-52 flex-col justify-between p-4 sm:p-6 ${index === 1 ? "border-x border-foreground/15" : ""}`}>
                    <span className="font-tech text-[10px] uppercase tracking-[0.16em] text-foreground/60">{rank}</span>
                    <strong className="font-display text-[clamp(2.6rem,5vw,4.5rem)] text-purple">{share}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section id="safety" index="06 / Safety" title="Know what the wallet is approving." intro="Soccit prepares the prediction transaction; your wallet signs it and sends the signed transaction to Solana. The app does not need your private key and cannot sign on your behalf.">
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-3">
              {[
                [WalletCards, "Check the transaction", "Confirm the fixture, prediction, token, and amount before approving."],
                [ShieldCheck, "Protect your keys", "Never enter a seed phrase or private key into Soccit, chat, or a support form."],
                [BookOpen, "Understand the state", "A rejected request submits nothing. A confirmed on-chain action may not be reversible."],
              ].map(([Icon, title, body]) => {
                const SafetyIcon = Icon as typeof ShieldCheck;
                return <div key={title as string} className="bg-background p-5 sm:min-h-60"><SafetyIcon size={24} className="text-purple" aria-hidden="true" /><h3 className="mt-10 font-display text-2xl uppercase tracking-[-0.04em]">{title as string}</h3><p className="mt-3 font-body text-sm leading-6 text-foreground/70">{body as string}</p></div>;
              })}
            </div>
          </Section>

          <Section id="glossary" index="07 / Glossary" title="The terms you will see in the arena." intro="These definitions cover the product language used across match pages, prediction panels, leaderboards, and settlement views.">
            <dl className="border-t border-foreground/20">
              {[
                ["Arena", "The prediction interface for one football fixture."],
                ["PDA", "A Solana program-derived address used as the canonical account and route identifier for a match."],
                ["Lock minute", "The match minute recorded when a prediction is committed."],
                ["Match vault", "The fixture-specific on-chain account that tracks entry conditions, pool state, and winners."],
                ["Net prize pool", "The portion of accumulated entry fees available for participant rewards after the platform fee."],
                ["Settlement", "The final stage in which results and winners are recorded and the payout process completes."],
              ].map(([term, definition]) => (
                <div key={term} className="grid gap-2 border-b border-foreground/20 py-5 sm:grid-cols-[12rem_1fr] sm:gap-8"><dt className="font-display text-xl uppercase tracking-[-0.03em]">{term}</dt><dd className="max-w-prose font-body text-sm leading-7 text-foreground/70">{definition}</dd></div>
              ))}
            </dl>
          </Section>

          <section className="border-t border-foreground/15 py-14">
            <div className="bg-purple p-7 text-white sm:flex sm:items-end sm:justify-between sm:gap-10 sm:p-10">
              <div><span className="font-tech text-[10px] uppercase tracking-[0.18em] text-white/70">You know the loop</span><h2 className="mt-3 max-w-xl font-display text-[clamp(2.5rem,5vw,5rem)] uppercase leading-[0.84] tracking-[-0.055em]">Now make the call.</h2></div>
              <a href={APP_MATCHES_URL} className="group mt-8 inline-flex min-h-12 shrink-0 items-center gap-4 bg-background px-6 font-display text-xs uppercase tracking-[0.14em] text-purple transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background sm:mt-0">Enter the arena <ArrowRight size={17} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" /></a>
            </div>
          </section>
      </KnowledgeContent>
    </KnowledgePage>
  );
}
