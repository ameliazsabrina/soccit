# Soccit

**Soccit** is a gamified football prediction market built on **Solana**, powered
end‑to‑end by the **TxODDS TxLINE** live data feed. Instead of betting on the
result, fans predict *what happens inside a match* — substitutions, final scores,
and (soon) goalscorers — lock those predictions into an on‑chain match vault, and
are scored and paid out automatically from the same feed that referees the real
game.

> 🟢 **Live now at [soccit.fun](https://soccit.fun).**

The same data that tells the app a substitution happened is the data that scores
the prediction and triggers the payout — there is no separate oracle and no
manual grading step. The market, the referee, and the settlement engine are the
same pipeline.

## At a glance

| | |
|---|---|
| **Live site** | [soccit.fun](https://soccit.fun) |
| **Category** | Prediction Markets & Settlement (World Cup Track) |
| **Data provider** | TxODDS — TxLINE Soccer feed, Service Level 12 (free real‑time World Cup & International Friendlies) |
| **Chain** | Solana (program live on **devnet**; TxLINE subscription paid once on **mainnet**) |
| **On‑chain program** | `TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v` |
| **Frontend** | Next.js 16 · React 19 · Tailwind 4 · Solana wallet‑adapter |
| **Backend** | Node/TypeScript services — Hono + tRPC API, TxLINE worker, scoring projector, settlement keeper (MongoDB + Redis) |

## The prediction → settlement loop

Every match walks a strict lifecycle, and the UI renders completely differently
per state:

```
OPEN → LIVE → RESOLVED → SETTLED
```

| State | Meaning |
|-------|---------|
| **OPEN** | Vault open; users can enter and lock predictions. |
| **LIVE** | Match kicked off; live score shown; predictions still allowed until lock. |
| **RESOLVED** | Feed reached `game_finalised`; arena locked; awaiting on‑chain settlement. |
| **SETTLED** | Vault settled; winners paid; logs + results shown. |

The TxLINE feed drives the whole thing: fixtures create match vaults, the worker
ingests live scores and events into Redis (hot) and Mongo (durable), the scoring
engine joins on‑chain predictions against live events into a ranked leaderboard,
and the settlement keeper drives `resolve` + `settle_and_payout` on‑chain once
the match finalises.

## Repository layout

Everything lives in one repository, split into three workspaces:

* **[`backend/`](backend/)** — the Anchor program (`backend/programs/soccit`)
  plus the TypeScript services (`backend/services/*`):
  * `onchain` — shared on‑chain client / IDL / addresses.
  * `worker` — TxLINE ingest (auth, snapshot backfill, SSE stream, normalize, persist).
  * `scoring` — joins `Prediction` PDAs × live events into the ranked leaderboard.
  * `settlement` — keeper that drives `resolve` + `settle_and_payout` on‑chain.
  * `api` — Hono + tRPC read/stream API for the frontend.
* **[`frontend/`](frontend/)** — the Next.js app: match arena, live scoreboards,
  leaderboards, vault/settlement views, and wallet‑signed predictions.
* **[`documentation/`](documentation/)** — the brief technical documentation
  (core idea, business & technical highlights, TxLINE endpoints, architecture
  reference). **Start with [`documentation/README.md`](documentation/README.md).**

## On‑chain program

Anchor program `TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v`, five instructions:

| Instruction | Role |
|-------------|------|
| `create_match` | Open a per‑fixture vault. |
| `enter_match` | One‑time entry (USDC entry fee into the vault). |
| `place_prediction` | Lock a prediction on‑chain (free after entry). |
| `resolve` | Record terminal phase + top‑3 winners. |
| `settle_and_payout` | Drain the vault to winners + platform fee. |

Prize split is `40 / 24 / 16` of the gross pool to 1st/2nd/3rd — a gross encoding
of "50 / 30 / 20 of the pool after a 20% platform fee"; solo winner takes 80%.
Entry is pay‑once per match; predictions themselves are free, keeping the game
about skill rather than stake‑spamming.

## Development

### Frontend

```bash
cd frontend
pnpm install
pnpm dev            # http://localhost:3000
```

Deploys to Vercel via GitHub Actions — pushes to `main` ship production, other
branches ship previews. See [`frontend/README.md`](frontend/README.md) for the
one‑time Vercel setup.

### Backend

The backend services (`api`, `scoring`, `worker`, `settlement`) run alongside
Redis and MongoDB via Docker Compose:

```bash
cd backend
docker compose up
```

The Anchor program lives in `backend/programs/soccit` and is currently live on
Solana **devnet**, verified end‑to‑end (create → enter → predict → resolve →
settle) against the real TxLINE feed. See
[`documentation/architecture.md`](documentation/architecture.md) for the full
data flow, service roles, and API surface.

## Learn more

* [Core idea](documentation/core-idea.md) — the product and the prediction loop.
* [Technical highlights](documentation/technical-highlights.md) — how it's built.
* [Business highlights](documentation/business-highlights.md) — why it matters.
* [TxLINE endpoints used](documentation/txline-endpoints.md) — every TxODDS
  endpoint, with method, purpose, and where it lives in the code.
* [Architecture reference](documentation/architecture.md) — end‑to‑end data flow
  and the Soccit read/stream API surface.
