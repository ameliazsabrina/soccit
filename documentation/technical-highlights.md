# Technical Highlights

## 1. TxLINE is consumed *two* ways — HTTP data **and** on‑chain access

Soccit uses the TxODDS surface in full:

* **On‑chain subscription (mainnet).** Access to the feed is paid for with a single Solana
  transaction to TxLINE's `subscribe` program
  (`9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`), Service Level 12 (World Cup /
  International Friendlies). SL12 costs **0 TxL** — only the ~5000‑lamport network fee. The
  TxL mint is **Token‑2022** (`Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL`), so the payer's
  ATA is created under that program automatically.
* **HTTP data feed (chain‑agnostic).** That one signature is activated into a long‑lived API
  token, which authenticates every fixtures / scores / stream call.

Full endpoint list in **[TxLINE Endpoints Used](txline-endpoints.md)**.

## 2. Resilient ingest worker (`backend/services/worker`)

The worker turns the raw feed into Soccit's read model:

* **Auth** — guest JWT (`/auth/guest/start`) + API token (`/api/token/activate`), with
  automatic JWT refresh on `401`. The token can be pasted (`TXLINE_API_TOKEN`) or minted at
  boot from the on‑chain `subscribe` txSig (`TXLINE_TX_SIG`).
* **Backfill then stream** — snapshots each fixture on boot (`/api/scores/snapshot/{id}`) so
  restarts and stream gaps never lose state, then tails the SSE stream
  (`/api/scores/stream`) with heartbeat drops, capped‑backoff reconnect, and `Last-Event-ID`
  resume.
* **Normalize** — dispatch is on the feed's `Action` discriminator; the match minute comes
  from the top‑level `Clock.Seconds`. Substitutions arrive in two beats (preliminary, then
  complete) — only the complete beat is emitted. Terminal state is the `game_finalised`
  action (the feed's `GameState` stays `"scheduled"` throughout). **Red cards are their own
  action — never mis‑read as a substitution.**
* **Persist** — Redis hash + capped per‑fixture event stream (hot path for live SSE); Mongo
  append‑only `raw_scores` / `events` / `fixtures` (durable).

## 3. On‑chain program (Anchor, Solana)

Program `TbxGzvqiuNfeV8GAoP2unFwjTu1Ry7hjnaesCorJm9v`, five instructions:

| Instruction | Role |
|-------------|------|
| `create_match` | Open a per‑fixture vault. |
| `enter_match` | One‑time entry (USDC entry fee into the vault). |
| `place_prediction` | Lock a prediction on‑chain (free after entry). |
| `resolve` | Record terminal phase + top‑3 winners. |
| `settle_and_payout` | Drain the vault to winners + platform fee. |

* **Prize split** — `40 / 24 / 16` of the gross pool to 1st/2nd/3rd — a gross encoding of
  "**50 / 30 / 20** of the pool **after a 20% platform fee**"; solo winner takes 80%.
  Verified end‑to‑end on devnet: a 15 USDC pool paid **6.0 / 3.6 / 2.4** to winners **+ 3.0**
  to the platform, vault drained to 0.
* **Enter‑once model** — pay to enter a match once; predictions themselves are free, which
  keeps the game about skill, not stake‑spamming.

## 4. Live scoring engine (`backend/services/scoring`)

Joins on‑chain `Prediction` accounts with the off‑chain TxLINE event stream and projects a
live ranked leaderboard (Redis key + pub/sub channel, optional Mongo durability):

* **Score model** — exact score **+5**, correct outcome **+3**.
* **Substitution model** — a sub scores a pick on the same side only if it was locked **≥ 5
  min before** the sub (`lockMinute ≤ subMinute − 5`); OUT/IN match **+1**, COMBO both legs
  **3**, single leg **1**.
* Rank by points desc, tiebreak on earliest scoring lock minute, then owner. Winners = top‑3
  owners with points > 0.

## 5. Read/stream API (`backend/services/api`)

A **Hono + tRPC** service (schema‑first, Zod‑validated) exposes the read model to the
frontend: config, competitions, brackets, schedule, matches, per‑match detail, lineups,
events, user profiles/portfolios, avatars, and **SSE leaderboard streams**. Static assets
are served from MongoDB with `ETag` / `304` caching. See
**[Architecture Reference](architecture.md)** for the full route table.

## 6. Frontend (`frontend/`)

* **Next.js 16 (App Router) · React 19 · Tailwind 4 · framer‑motion.**
* **Solana wallet‑adapter** (`@solana/wallet-adapter-react` + `@solana/web3.js`): users sign
  entries and predictions with their own wallet; profile edits use a sign‑once JWT (no gas).
* State‑driven arena that renders per match lifecycle state, live scoreboards fed by the
  Soccit SSE stream, leaderboards, and vault/settlement result views.

## Testing & verification

* On‑chain: LiteSVM lifecycle tests (payout split verified) + a live **devnet e2e** that
  drives create → enter → predict → resolve → settle and asserts the exact payouts.
* Backend: unit + integration tests across api / scoring / worker services (128+ api tests).
