# Business Highlights

## The market we open

Soccit reframes match‑day engagement. Outcome betting is a small, saturated market with a
single settlement moment. Soccit sells **in‑play micro‑prediction**: dozens of scoreable
moments per match (subs, scores, and soon goalscorers), each a reason to stay in the app for
all 90 minutes. Every minute of the match is inventory.

## Why it is differentiated

* **Feed‑native settlement.** The market, the referee, and the payout engine are one
  pipeline driven by TxODDS. There is no third‑party oracle to trust, no manual grading, and
  no gap between "what happened" and "what got paid." This is the core of the World Cup
  Track's *Prediction Markets & Settlement* brief.
* **Skill over stake.** The enter‑once model (pay once, predict free) makes Soccit a game of
  football knowledge rather than a bankroll contest — better retention, cleaner leaderboards,
  and a friendlier regulatory story than pure wagering.
* **Transparent economics.** Custody and payout are on‑chain and auditable: `40 / 24 / 16`
  to the podium, `20%` platform fee, every settlement verifiable on Solana.

## Revenue model

* **Platform fee** — a fixed **20%** of each match pool, taken automatically at settlement.
  Revenue scales directly with participation and requires no manual reconciliation.
* Scales per fixture: World Cup and International Friendlies today (TxLINE SL12 is **free**,
  so data cost is ~$0), with a clear path to paid competitions and higher service levels.
* **Multi‑league expansion.** The World Cup is the launch fixture, not the ceiling — the same
  create → enter → predict → resolve → settle pipeline runs on any competition on the feed.
  The roadmap opens matches for other leagues (domestic top flights, continental cups, and
  club competitions), turning a seasonal event into a year‑round calendar of inventory.

## Cost structure that favours a bootstrapped launch

* **Data:** TxLINE **Service Level 12 is free** — one ~$0.001 mainnet transaction unlocks the
  full World Cup feed. No per‑call data bill during the event.
* **Chain:** Solana keeps entry, prediction, and settlement fees at fractions of a cent, so
  micro‑predictions are economically viable.
* **Infra:** stateless services over Redis (hot) + MongoDB (durable); horizontally scalable
  per fixture.

## Go‑to‑market

* **World Cup as launch moment.** SL12 is purpose‑built for exactly the fixtures with the
  largest global audience — the product and the free feed are aligned to the same calendar.
* **Viral, shareable moments.** Locked predictions, live leaderboards, and match‑result
  cards (the frontend ships `html-to-image` share cards) turn every correct call into
  social proof.
* **Composable on Solana.** On‑chain vaults, predictions, and settlement are open primitives
  other builders can index, extend, or build markets on top of.

## Traction context

The listing shows **142 submissions** competing for an **18,000 USDT** pool
(12k / 4k / 2k). Soccit's edge is completeness: a *working* on‑chain settlement pipeline —
create → enter → predict → resolve → settle — verified end‑to‑end on devnet against the real
TxLINE feed, not a mock.
