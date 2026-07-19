# TxLINE Endpoints Used

This is the exact TxODDS / TxLINE surface Soccit consumes. **Base URL:**
`https://txline.txodds.com` · **Service Level 12** (free real‑time World Cup &
International Friendlies).

TxLINE is used in two layers: a one‑time **on‑chain subscription** that unlocks access, and
the **HTTP data feed** that every read goes through.

## HTTP data endpoints

| # | Method | Endpoint | Purpose | Used in |
|---|--------|----------|---------|---------|
| 1 | `POST` | `/auth/guest/start` | Start a guest session → short‑lived JWT. Refreshed automatically on `401`. | `backend/services/worker/src/txline/auth.ts`, `backend/services/api/src/txline.ts` |
| 2 | `POST` | `/api/token/activate` | Activate the on‑chain `subscribe` txSig into a long‑lived **API token**. | `backend/services/worker/src/txline/auth.ts` |
| 3 | `GET` | `/api/fixtures/snapshot?epochDay={day}` | Fixtures/schedule snapshot for a day — powers the match schedule. | `backend/services/worker/src/txline/fixtures.ts`, `backend/services/api/src/modules/schedule/schedule.service.ts` |
| 4 | `GET` | `/api/scores/snapshot/{fixtureId}?asOf={ts}` | Per‑fixture score + event **backfill** on boot so restarts/gaps never lose state. | `backend/services/worker/src/txline/snapshot.ts` |
| 5 | `GET` | `/api/scores/stream?fixtureId={id}` | **SSE** live stream of scores + events (goals, subs, red cards, `game_finalised`). | `backend/services/worker/src/txline/stream.ts` |

### Authentication

All data endpoints (3–5) are called with **both**:

```http
Authorization: Bearer <guest-JWT>      # from /auth/guest/start
X-Api-Token:   <activated-API-token>   # from /api/token/activate
```

On a `401`, the JWT is discarded and re‑minted from `/auth/guest/start`, then the request is
retried once (see `txlineGet` in `backend/services/api/src/txline.ts`).

### Feed wire format (what we parse from the stream/snapshots)

* **`Action`** — the event discriminator we dispatch on (goal / substitution / status /
  red card).
* **`Clock.Seconds`** — top‑level match minute for every event.
* **`game_finalised`** — the terminal action that moves a match to RESOLVED (the feed's
  `GameState` stays `"scheduled"` throughout, so we rely on this action, not `GameState`).
* Substitutions arrive in **two beats** (preliminary, then complete with both players) — only
  the complete beat is emitted. **Red cards are a distinct action, never a substitution.**

## On‑chain subscription (mainnet)

Access to the feed is paid for once with a Solana transaction, then activated via endpoint #2.

| Item | Value |
|------|-------|
| TxLINE `subscribe` program | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` |
| TxL mint (Token‑2022) | `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL` |
| Service level | **12** — World Cup & International Friendlies |
| Minimum term | 4 weeks |
| Cost | **0 TxL** (SL12) + ~5000‑lamport network fee |
| Built in | `backend/services/worker/src/txline/program.ts` (`buildSubscribeInstruction`) |
| Sent by | `backend/services/worker/scripts/subscribe-onchain.ts` → activated by `backend/services/worker/scripts/subscribe.ts` |

> The `subscribe` transaction must land on **real mainnet** (that's the only place TxLINE's
> program exists and the only signature `/api/token/activate` will accept). A
> [Surfpool](https://surfpool.run) mainnet fork is used to prove the instruction is correct
> for free before the single real send.

## Configuration

```bash
TXLINE_BASE_URL=https://txline.txodds.com   # default
TXLINE_API_TOKEN=<activated token>          # paste, OR…
TXLINE_TX_SIG=<mainnet subscribe signature> # …let the worker activate itself on boot
TXLINE_LEAGUES=<comma-separated league ids> # optional filter
```

The Soccit read API also needs `TXLINE_API_TOKEN` — without it `GET /api/schedule` returns
`503` (there is no guest‑only fallback for schedule data).
