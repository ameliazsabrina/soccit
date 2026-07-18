import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { KnowledgeContent, KnowledgePage } from "../_components/knowledge-shell";

export const metadata: Metadata = {
  title: "Soccit Whitepaper — Verifiable Football Knowledge Markets",
  description: "The formal Soccit product and protocol paper: system model, architecture, prediction rules, incentives, settlement, security boundaries, and roadmap.",
  alternates: { canonical: "https://soccit.fun/whitepaper" },
};

const SECTIONS = [
  ["Abstract", "abstract"],
  ["Problem", "problem"],
  ["Design objectives", "objectives"],
  ["System model", "system-model"],
  ["Protocol lifecycle", "lifecycle"],
  ["Predictions & scoring", "scoring"],
  ["Economics", "economics"],
  ["Architecture", "architecture"],
  ["Trust & security", "security"],
  ["Limitations", "limitations"],
  ["Roadmap", "roadmap"],
  ["Conclusion", "conclusion"],
] as const;

function PaperSection({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-foreground/20 py-12 sm:py-16">
      <div className="grid gap-5 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-10">
        <span className="font-tech text-[10px] uppercase tracking-[0.2em] text-purple">{number}</span>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-mona-sans)] text-[clamp(2.1rem,4.5vw,4.25rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.055em]">{title}</h2>
          <div className="mt-7 max-w-[75ch] space-y-5 font-body text-[15px] leading-8 text-foreground/80 sm:text-base">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-t border-foreground/15 py-4 sm:grid sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="font-tech text-[10px] uppercase tracking-[0.16em] text-purple">{term}</dt>
      <dd className="mt-2 text-sm leading-7 text-foreground/75 sm:mt-0">{children}</dd>
    </div>
  );
}

function Formula({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-foreground/15 bg-surface p-5 sm:p-6">
      <span className="font-tech text-[9px] uppercase tracking-[0.18em] text-purple">{label}</span>
      <div className="mt-3 overflow-x-auto font-mono text-sm leading-7 text-foreground">{children}</div>
    </div>
  );
}

export default function WhitepaperPage() {
  return (
    <KnowledgePage section="Whitepaper">
      <section className="border-b border-foreground/20 bg-surface">
        <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 sm:py-24 lg:px-14">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div>
              <div className="mb-7 flex items-center gap-3 font-tech text-[10px] uppercase tracking-[0.22em] text-purple">
                <FileText size={15} aria-hidden="true" /> Product & protocol paper / Version 1.0
              </div>
              <h1 className="max-w-6xl font-[family-name:var(--font-mona-sans)] text-[clamp(3.2rem,8.5vw,8.25rem)] font-extrabold uppercase leading-[0.76] tracking-[-0.085em]">
                Verifiable football<br /><span className="text-purple">knowledge markets.</span>
              </h1>
              <p className="mt-8 max-w-3xl font-body text-base leading-8 text-foreground/75 sm:text-lg">
                A formal specification of Soccit’s competitive prediction model, its division of responsibilities across Solana, live football data, and application services, and the economic and security assumptions under which the product operates.
              </p>
            </div>
            <dl className="border-t border-foreground/20 font-tech text-[10px] uppercase tracking-[0.14em]">
              {[['Publication', '18 July 2026'], ['Status', 'Season 01'], ['Network', 'Solana'], ['Scope', 'Product + protocol']].map(([term, value]) => <div key={term} className="flex justify-between gap-5 border-b border-foreground/20 py-4"><dt className="text-foreground/55">{term}</dt><dd>{value}</dd></div>)}
            </dl>
          </div>
        </div>
      </section>

      <KnowledgeContent navigation={SECTIONS}>
          <PaperSection id="abstract" number="01 / Abstract" title="A market for football judgment, settled as competition.">
            <p>Soccit is a competitive football prediction application in which participants commit fixture-specific forecasts, receive points when those forecasts match official results or events, and compete for rewards held in match-specific vaults.</p>
            <p>The system is designed around three properties: predictions must be attributable to a wallet, their lock conditions must be auditable, and competition outcomes must follow an explicit scoring and settlement policy. Solana provides account state, transaction authorization, and settlement rails; a live-football data provider supplies fixtures, lineups, scores, and events; Soccit services reconcile these sources into the application experience.</p>
            <p>This paper describes the intended Season 01 system. It is a product and protocol specification, not a claim that every dependency is decentralized or trustless. Where off-chain data, orchestration, or administrative settlement remains necessary, those boundaries are stated directly.</p>
          </PaperSection>

          <PaperSection id="problem" number="02 / Problem" title="Football expertise is abundant. Verifiable competition is fragmented.">
            <p>Football audiences continually form high-resolution judgments: the likely final score, which starter will be replaced, when a tactical change will occur, or how a match state will evolve. Conventional prediction products often compress that knowledge into an odds selection, while informal competitions lack durable proof of when a call was made and how the winner was determined.</p>
            <p>Soccit treats a prediction as a time-bound competitive action. The participant expresses a specific football claim; the claim is associated with a fixture and wallet; the result is evaluated under a published rule; and the reward outcome is tied to the corresponding match competition.</p>
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-3">
              {[['Expression', 'Support predictions beyond a binary winner selection.'], ['Proof', 'Record who committed a call and under which match conditions.'], ['Outcome', 'Turn accuracy into transparent points, rank, and reward allocation.']].map(([title, body]) => <div key={title} className="bg-background p-5"><strong className="font-display text-xl uppercase tracking-[-0.03em]">{title}</strong><p className="mt-3 text-sm leading-7 text-foreground/70">{body}</p></div>)}
            </div>
          </PaperSection>

          <PaperSection id="objectives" number="03 / Design objectives" title="Specific rules, user custody, and legible state.">
            <ol className="space-y-5">
              {[
                ["Deterministic competition rules", "Prediction types, point values, tie-break behavior, fee treatment, and prize shares should be explicit before participation."],
                ["User-controlled authorization", "The participant’s wallet approves the transaction. Soccit does not require custody of the wallet or authority to sign on the user’s behalf."],
                ["Fixture-scoped state", "Every competition is associated with one football fixture, its match account, entry conditions, participant set, and settlement state."],
                ["Live legibility", "The interface must surface the current score, minute, lineup, match status, transaction state, and leaderboard state without implying stronger finality than exists."],
                ["Composable data boundaries", "On-chain state, official sports data, and application services remain separable so each source can be audited and improved independently."],
              ].map(([title, body], index) => <li key={title} className="grid gap-2 border-t border-foreground/15 pt-5 sm:grid-cols-[3rem_13rem_1fr] sm:gap-6"><span className="font-tech text-[10px] text-purple">0{index + 1}</span><strong className="font-display text-xl uppercase tracking-[-0.03em]">{title}</strong><span className="text-sm leading-7 text-foreground/75">{body}</span></li>)}
            </ol>
          </PaperSection>

          <PaperSection id="system-model" number="04 / System model" title="Actors, accounts, and authoritative sources.">
            <p>The system comprises participants, application services, a live-data source, Solana programs and accounts, and an operator responsible for ingestion and settlement operations. These roles do not carry equal authority.</p>
            <dl>
              <Definition term="Participant">A user represented by a Solana wallet. The wallet authorizes entry and prediction transactions and is the destination identity for rewards.</Definition>
              <Definition term="Match account">A program-derived Solana account associated with a fixture. It records competition parameters such as teams, entry fee, pool state, status, settlement flag, and winner addresses.</Definition>
              <Definition term="Prediction account">A wallet- and fixture-associated record containing the encoded prediction and lock context used for scoring and ranking.</Definition>
              <Definition term="Live-data source">The provider of fixture metadata, official lineups, match status, goals, substitutions, cards, and match timing consumed by Soccit’s ingestion services.</Definition>
              <Definition term="Soccit services">The API, ingestion workers, caches, profile services, leaderboard computation, transaction preparation, and server-sent event streams exposed to the client.</Definition>
              <Definition term="Operator">The entity responsible for maintaining data ingestion, resolving operational exceptions, initiating permitted lifecycle transitions, and executing settlement procedures.</Definition>
            </dl>
            <p>A numeric fixture identifier maps to a canonical match-account PDA. Client routes and fixture-scoped API calls use that PDA, avoiding ambiguity between external provider identifiers and the on-chain competition account.</p>
          </PaperSection>

          <PaperSection id="lifecycle" number="05 / Protocol lifecycle" title="Open, live, resolved, settled.">
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Open', 'The competition account is available. Entry conditions are visible and eligible predictions may be submitted.'],
                ['Live', 'The underlying fixture is in progress. Live score, minute, events, and rankings update as data is ingested.'],
                ['Resolved', 'The football result is known and new prediction activity stops while final scoring and settlement are prepared.'],
                ['Settled', 'Winner addresses and terminal state are recorded; the competition is presented as final and reward distribution completes.'],
              ].map(([title, body], index) => <div key={title} className="bg-background p-5"><span className="font-tech text-[9px] text-purple">0{index + 1}</span><h3 className="mt-10 font-display text-2xl uppercase tracking-[-0.04em]">{title}</h3><p className="mt-3 text-sm leading-7 text-foreground/70">{body}</p></div>)}
            </div>
            <p>The application distinguishes on-chain competition status from live fixture status. A match account can remain open while the external fixture is live, and a finished fixture can enter a resolved interval before on-chain settlement. Interfaces should expose these states rather than collapsing them into a single “live/not live” flag.</p>
          </PaperSection>

          <PaperSection id="scoring" number="06 / Predictions & scoring" title="Finite claims evaluated under published rules.">
            <p>Season 01 supports final-score and substitution predictions. Each record includes the fixture, prediction kind, encoded values, team side where applicable, and lock minute.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Formula label="Final-score encoding"><code>kind = 3; side = 0; outPlayerId = homeGoals; inPlayerId = awayGoals</code></Formula>
              <Formula label="Substitution encoding"><code>kind = 2; side = home | away; outPlayerId = starter; inPlayerId = substitute</code></Formula>
            </div>
            <div className="overflow-x-auto border border-foreground/15" data-lenis-prevent>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead className="bg-surface font-tech text-[10px] uppercase tracking-[0.14em] text-foreground/65"><tr><th className="p-4">Model</th><th className="p-4">Evaluation</th><th className="p-4 text-right">Points</th></tr></thead>
                <tbody className="text-sm">{[["Final score", "Exact home and away totals", "5"], ["Final score", "Correct win, draw, or loss only", "3"], ["Substitution", "Correct outgoing and incoming players", "3"], ["Substitution", "Correct outgoing player only", "1"], ["Substitution", "Correct incoming player only", "1"]].map((row) => <tr key={`${row[0]}-${row[1]}`} className="border-t border-foreground/15"><td className="p-4 font-medium">{row[0]}</td><td className="p-4 text-foreground/70">{row[1]}</td><td className="p-4 text-right font-mono font-semibold text-purple">{row[2]}</td></tr>)}</tbody>
              </table>
            </div>
            <Formula label="Ranking order"><code>rank(a, b) = points descending, then earliestScoringLockMinute ascending</code></Formula>
            <p>The tie-break rewards an earlier prediction only when that prediction contributes to scoring. This avoids granting priority merely for entering early without producing a correct football read.</p>
          </PaperSection>

          <PaperSection id="economics" number="07 / Economics" title="Fixture-specific pools with explicit fee and reward shares.">
            <p>Each match account exposes an entry fee and pool total denominated in the configured token’s base units. Under the current model, 20% of the accumulated pool is allocated as the platform fee and 80% is treated as the net prize pool.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Formula label="Net prize pool"><code>P_net = P_gross × (1 − 0.20) = P_gross × 0.80</code></Formula>
              <Formula label="Standard allocation"><code>R_1 = P_net × 0.50; R_2 = P_net × 0.30; R_3 = P_net × 0.20</code></Formula>
            </div>
            <p>The client currently presents a winner-takes-all fallback when fewer than three ranked participants are available. Production settlement logic must apply the same published eligibility rule used by the interface; any future change to fee rate, rank shares, minimum participation, refund policy, or token denomination should be versioned and displayed before entry.</p>
            <p>No native token is specified by this paper. Participation and rewards use the mint configured for the match account. The economic model is therefore a competition-pool design rather than a token issuance model.</p>
          </PaperSection>

          <PaperSection id="architecture" number="08 / Architecture" title="Three layers, each with a distinct responsibility.">
            <div className="space-y-3">
              {[
                ['01', 'Solana layer', 'Match and prediction accounts, transaction authorization, configured token transfers, lifecycle state, winner addresses, and settlement records.'],
                ['02', 'Football data layer', 'Fixtures, teams, lineups, official match events, current score, match minute, and terminal fixture status.'],
                ['03', 'Application layer', 'Data ingestion, PDA indexing, API aggregation, user profiles, unsigned transaction preparation, scoring, leaderboards, caches, and real-time SSE delivery.'],
              ].map(([number, title, body]) => <div key={title} className="grid gap-3 border border-foreground/15 bg-background p-5 sm:grid-cols-[3rem_13rem_1fr] sm:items-center sm:gap-6"><span className="font-tech text-[10px] text-purple">{number}</span><strong className="font-display text-2xl uppercase tracking-[-0.04em]">{title}</strong><span className="text-sm leading-7 text-foreground/70">{body}</span></div>)}
            </div>
            <p>The transaction-preparation endpoint returns a serialized unsigned transaction and its relevant addresses and expiry context. The client deserializes it, requests the participant’s signature through the connected wallet, and submits the signed transaction to Solana. There is no server-side participant signing step.</p>
            <p>Leaderboard and event streams use server-sent events. These streams improve responsiveness but do not redefine finality: clients should treat the on-chain competition account and confirmed settlement state as the durable competition record.</p>
          </PaperSection>

          <PaperSection id="security" number="09 / Trust & security" title="The system is non-custodial at signing, not trustless in every input.">
            <p>Soccit’s wallet flow preserves participant authorization: a wallet can reject a prepared transaction, and the service cannot sign as the participant. This is a meaningful custody boundary, but it does not eliminate dependence on application code, RPC infrastructure, live-data ingestion, scoring logic, operator permissions, or the upstream sports-data provider.</p>
            <div className="border border-foreground/15 bg-surface p-5 sm:p-7">
              <h3 className="font-display text-2xl uppercase tracking-[-0.04em]">Primary trust assumptions</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-foreground/75">
                {[
                  'The displayed transaction accurately represents the participant’s selected prediction and configured entry conditions.',
                  'The upstream football data and Soccit ingestion pipeline identify official events and terminal results correctly.',
                  'The scoring implementation applies the published rules consistently to all participants.',
                  'Authorized lifecycle and settlement operations are executed against the correct fixture and winner set.',
                  'The deployed Solana program and configured token accounts match the addresses presented by official Soccit interfaces.',
                ].map((item) => <li key={item} className="flex gap-3"><span className="text-purple">—</span><span>{item}</span></li>)}
              </ul>
            </div>
            <p>Recommended controls include program audits before material value is placed at risk, multisignature or constrained authority for privileged operations, replay-resistant wallet messages, simulation and human-readable transaction review, monitored ingestion with reconciliation, idempotent settlement, public program and mint disclosure, incident procedures, and versioned rule publication.</p>
          </PaperSection>

          <PaperSection id="limitations" number="10 / Limitations" title="Current boundaries are part of the specification.">
            <ul className="space-y-4">
              {[
                'Final-score and substitution predictions are active; goalscorer predictions remain planned.',
                'Sports outcomes originate off-chain and require trusted ingestion before they can influence scoring and settlement.',
                'Real-time interfaces can temporarily diverge from confirmed on-chain state because of provider, network, cache, or RPC latency.',
                'The current fee and payout policy is a Season 01 product rule and may require jurisdiction-specific review before broader availability.',
                'Wallet authorization prevents unauthorized participant signing but does not by itself verify the fairness of upstream data or scoring software.',
                'This paper does not constitute financial, legal, or investment advice and does not guarantee rewards or uninterrupted availability.',
              ].map((item) => <li key={item} className="flex gap-4 border-t border-foreground/15 pt-4 text-sm leading-7 text-foreground/75"><span className="font-tech text-[10px] text-purple">LIMIT</span><span>{item}</span></li>)}
            </ul>
          </PaperSection>

          <PaperSection id="roadmap" number="11 / Roadmap" title="Advance from legibility to stronger verifiability.">
            <div className="grid gap-px bg-foreground/15 sm:grid-cols-2">
              {[
                ['Phase A', 'Season 01 hardening', 'Align interface rules with settlement code, publish canonical addresses, improve reconciliation, and validate operational controls.'],
                ['Phase B', 'Prediction expansion', 'Introduce goalscorer and additional football knowledge models only after scoring inputs and eligibility rules are explicit.'],
                ['Phase C', 'Transparency', 'Expose richer transaction, match-account, scoring, and settlement evidence so participants can independently inspect outcomes.'],
                ['Phase D', 'Governance maturity', 'Constrain privileged actions, formalize upgrade and incident procedures, and evaluate independent audits and distributed data attestations.'],
              ].map(([phase, title, body]) => <div key={phase} className="bg-background p-5 sm:min-h-60"><span className="font-tech text-[9px] uppercase tracking-[0.16em] text-purple">{phase}</span><h3 className="mt-10 font-display text-2xl uppercase tracking-[-0.04em]">{title}</h3><p className="mt-3 text-sm leading-7 text-foreground/70">{body}</p></div>)}
            </div>
            <p>Roadmap items describe intended direction rather than guaranteed delivery. A future paper revision should record material changes to prediction semantics, economic parameters, authorities, data providers, or settlement design.</p>
          </PaperSection>

          <PaperSection id="conclusion" number="12 / Conclusion" title="Make the prediction specific. Make the outcome inspectable.">
            <p>Soccit’s central proposition is simple: football judgment becomes more valuable as a competition when the claim is precise, its commitment is attributable, and its scoring rule is known in advance. The product combines an expressive match interface with wallet authorization, fixture-scoped accounts, live sports data, and explicit leaderboard and reward policies.</p>
            <p>The long-term quality of the system depends less on spectacle than on alignment: the interface, transaction, on-chain state, official result, scoring engine, and settlement output must tell the same story. Season 01 establishes that structure and makes its present trust boundaries visible.</p>
            <div className="flex flex-wrap gap-3 pt-3">
              <Link href="/docs" className="group inline-flex min-h-12 items-center gap-4 border border-purple px-6 font-display text-xs uppercase tracking-[0.14em] text-purple transition-colors duration-100 hover:bg-purple hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">Read the product guide <ArrowRight size={17} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" /></Link>
              <a href="https://play.soccit.fun/matches" className="group inline-flex min-h-12 items-center gap-4 bg-purple px-6 font-display text-xs uppercase tracking-[0.14em] text-white transition-colors duration-100 hover:bg-cyan hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2">Enter the arena <ArrowRight size={17} className="transition-transform duration-100 group-hover:translate-x-1" aria-hidden="true" /></a>
            </div>
          </PaperSection>
      </KnowledgeContent>
    </KnowledgePage>
  );
}
