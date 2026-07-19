# Architecture Reference

## End‑to‑end data flow

```
                         TxODDS · TxLINE feed
   ┌───────────────────────────────────────────────────────────┐
   │  /api/fixtures/snapshot   /api/scores/snapshot/{id}         │
   │  /api/scores/stream (SSE)   (+ mainnet subscribe program)   │
   └───────────────┬───────────────────────────────────────────┘
                   │
        backend/services/worker  ── normalize (Action + Clock.Seconds) ──┐
                   │                                              │
        Redis (hot: hash + capped event stream)   Mongo (durable: raw_scores/events/fixtures)
                   │                                              │
   ┌───────────────┴──────────────┐            ┌─────────────────┴───────────────┐
   │   backend/services/scoring            │            │   backend/services/api (Hono + tRPC)     │
   │   predictions × events →      │            │   read model + SSE to frontend   │
   │   live leaderboard (Redis/SSE)│            └─────────────────┬───────────────┘
   └───────────────┬──────────────┘                              │
                   │                                       frontend/ (Next.js)
        backend/services/settlement (keeper)                       wallet-signed enter/predict
                   │
        Solana program  TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v
        create_match → enter_match → place_prediction → resolve → settle_and_payout
```

## Services (`backend/`)

| Service | Role |
|---------|------|
| `backend/services/onchain` | Shared on‑chain client / IDL / addresses (canonical USDC mint, program id). |
| `backend/services/worker` | TxLINE ingest — auth, snapshot backfill, SSE stream, normalize, persist. |
| `backend/services/scoring` | Joins `Prediction` PDAs × live events → ranked leaderboard projector. |
| `backend/services/settlement` | Keeper that drives `resolve` + `settle_and_payout` on‑chain. |
| `backend/services/api` | Hono + tRPC read/stream API for the frontend. |
| `backend/programs/soccit` | Anchor program: vaults, entry, predictions, resolution, payout. |

## Soccit read/stream API surface

The frontend talks to this service (each REST route has a thin tRPC twin where applicable):

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/healthz` | Liveness. |
| `GET` | `/api/config` | Platform fee, prize split, scoring config, USDC decimals. |
| `GET` | `/api/competitions` | Competitions list (World Cup, UCL). |
| `GET` | `/api/competitions/:slug/bracket` | Knockout bracket. |
| `GET` | `/api/assets/:path` | Static assets from MongoDB (`ETag` / `304`). |
| `GET` | `/api/matches` | Match summaries (one `featured` flag). |
| `GET` | `/api/schedule` | Fixtures from TxLINE (`503` if `TXLINE_API_TOKEN` unset). |
| `GET` | `/api/match/:pda` | Single match detail. |
| `POST` | `/api/prediction/prepare` | Build an unsigned `place_prediction` tx. |
| `POST` | `/api/match/enter/prepare` | Build an unsigned `enter_match` tx. |
| `GET` | `/api/matches/:pda/entry/:wallet` | Has this wallet entered? |
| `POST` | `/api/auth/session` | Sign‑once session JWT (profile edits). |
| `POST` / `GET` | `/api/user`, `/api/user/:wallet` | Profile create / read. |
| `GET` | `/api/user/:wallet/matches`, `/portfolio` | User's predictions / holdings. |
| `GET` | `/api/avatars` | Avatar catalogue. |
| `GET` | `/api/leaderboard/:pda` | Ranked leaderboard snapshot. |
| `GET` | `/api/leaderboard/:pda/stream` | **SSE** live leaderboard. |
| `GET` | `/api/lineup/:pda`, `/api/events/:pda` | Lineups / match events. |

## Frontend (`frontend/`)

Next.js 16 App Router. Key routes: `/` (landing), `/matches` + `/matches/events/:slug`,
`/matches/[pda]` (match) with `/arena` (predict), `/logs`, `/settlement` sub‑views,
`/leaderboard`, `/explorer`, `/profile`. Predictions and entries are signed client‑side with
`@solana/wallet-adapter`; live data arrives over the Soccit SSE streams above.

## Deployment topology

* **Solana program:** live on **devnet** (`TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v`),
  official devnet USDC mint. Verified end‑to‑end (create → enter → predict → resolve →
  settle) against the real TxLINE feed.
* **TxLINE `subscribe`:** the only on‑chain action that must run on **mainnet** (that program
  exists only there); the HTTP feed itself is chain‑agnostic.
* **Frontend:** Next.js on Vercel (production on `main`, preview on branches).
