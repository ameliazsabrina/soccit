# Core Idea

## The problem

Traditional football betting is a bet on the *outcome* — who wins, over/under, the final
score. It is passive, it settles once, and the "market" and the "settlement" are two
different, opaque systems you have to trust.

## What Soccit does

Soccit turns the match itself into the market. Instead of betting on the result, fans
predict **what happens on the pitch**:

* **Substitutions** — who comes off and who comes on.
* **Final scores** — exact scoreline and outcome.
* **Goalscorers** — *(coming soon)*.

Predictions are **locked on‑chain** into a per‑match vault, scored live against the real
match as it unfolds, and **settled and paid out automatically** — all from a single source
of truth: the **TxODDS TxLINE** feed. The same data that tells the app a substitution
happened is the data that scores the prediction and triggers the payout. There is no
separate oracle and no manual grading step.

## The prediction → settlement loop

```
        TxLINE feed (TxODDS)
   ┌───────────────┬───────────────┐
   │  fixtures     │  live scores  │
   │  snapshot     │  + events SSE │
   └──────┬────────┴───────┬───────┘
          │                │
   create_match       worker ingests → Redis (hot) + Mongo (durable)
          │                │
   users ENTER  ──►  place_prediction (locked on-chain, USDC vault)
          │                │
          │         scoring engine joins predictions × live events
          │                │  → live leaderboard (Redis + SSE)
          ▼                ▼
      RESOLVE  ◄──── feed reaches `game_finalised`
          │
   settle_and_payout  ──►  winners paid from the vault, platform fee taken
```

Every match walks a strict lifecycle, and the UI renders completely differently per state:

```
OPEN → LIVE → RESOLVED → SETTLED
```

| State | Meaning |
|-------|---------|
| **OPEN** | Vault open; users can enter and lock predictions. |
| **LIVE** | Match kicked off (`live.statusId = 1`); live score shown; predictions still allowed until lock. |
| **RESOLVED** | Feed reached `game_finalised`; arena locked; awaiting on‑chain settlement. |
| **SETTLED** | Vault settled; winners paid; logs + results shown. |

## Why the design is trustworthy

* **Server‑authoritative rules, on‑chain money.** Game rules (what counts, when a pick
  locks) are enforced by the backend against the feed; custody and payout are enforced by
  the Solana program. Neither side can silently change the numbers.
* **One feed, no oracle gap.** Scoring and settlement read the *same* TxLINE events the
  live scoreboard renders, so "what you saw" and "what you were paid for" cannot diverge.
* **Locked‑resolve.** A prediction only scores if it was locked **≥ 5 minutes before** the
  event it predicts — you cannot back‑date a pick after seeing the play.

The result is a prediction market where the market, the referee, and the settlement engine
are the same pipeline.
