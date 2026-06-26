# @soccit/worker — TxLINE ingestor (Phase 2)

Off-chain worker for Soccit. This phase ingests the **TxLINE Soccer feed** (Service
Level 12 — free real-time World Cup & International Friendlies), normalizes it into
Soccit's read model, and persists it. Scoring, the leaderboard projector, and the
settlement keeper land in later phases.

```
TxLINE SSE  ─▶ stream.ts ─┐
                          ├─▶ normalize.ts ─▶ Store (Redis hot + Mongo durable)
TxLINE snap ─▶ snapshot.ts┘
```

## Pipeline

1. **Auth** (`txline/auth.ts`) — guest JWT (`/auth/guest/start`) + long-lived API
   token (`/api/token/activate`). The token is either pasted (`TXLINE_API_TOKEN`)
   or minted from a one-time on-chain `subscribe` txSig (`TXLINE_TX_SIG`). Refreshes
   the JWT on `401`.
2. **Backfill** (`txline/snapshot.ts`) — `/api/scores/snapshot/{fixtureId}` on boot
   so restarts / stream gaps don't lose state.
3. **Stream** (`txline/stream.ts`) — tails `/api/scores/stream` (SSE), drops
   heartbeats, reconnects with capped backoff, resumes via `Last-Event-ID`.
4. **Normalize** (`domain/normalize.ts`) — raw feed events → `substitution` /
   `goal` / `status` / `red_card`. Dispatch is on the feed's `Action`
   discriminator; the match minute comes from the top-level `Clock.Seconds`.
   Substitutions arrive in two beats (a preliminary `{Participant}` event, then
   the complete one with both players) — only the complete beat is emitted.
   Terminal state is the `game_finalised` action (the feed's `GameState` stays
   `"scheduled"` throughout). **Red cards are a distinct action — never a sub.**
5. **Persist** (`store/`) — Redis hash per fixture + a capped per-fixture event
   stream (for Phase 3 live SSE); Mongo append-only `raw_scores` / `events` /
   `fixtures` (optional — disabled if `MONGO_URL` is unset).

## Setup

```bash
cd services/worker
pnpm install
cp .env.example .env        # then fill in credentials
```

### Credentials (one-time, free)

**Stage 1 — on-chain `subscribe`** (`scripts/subscribe-onchain.ts`). Sends TxLINE's
mainnet `subscribe` (Service Level 12, 4 weeks). SL12 costs **0 TxL**; you only pay
the ~5000-lamport network fee. The TxL mint is **Token-2022**, so the user's TxL ATA
is created under that program automatically. Develop/verify for free against a
[Surfpool](https://surfpool.run) mainnet fork, then run once for real:

```bash
# terminal 1 — fork mainnet headless, RPC on :8899
surfpool start --no-tui --no-deploy -u https://api.mainnet-beta.solana.com

# terminal 2 — simulate, then send against the fork (free)
pnpm subscribe:onchain --rpc http://127.0.0.1:8899 --simulate
pnpm subscribe:onchain --rpc http://127.0.0.1:8899

# for real (one transaction, ~$0.001 network fee)
pnpm subscribe:onchain --rpc https://api.mainnet-beta.solana.com
```

The real run prints your `txSig` on stdout.

> Note: a Surfpool-fork signature is local-only — it can't activate a real API
> token (TxLINE verifies the subscribe tx on real mainnet). Use the fork to prove
> the instruction lands; use mainnet for the signature you actually activate.

**Stage 2 — activate** (`scripts/subscribe.ts`). Turn that txSig into the API token:
```bash
pnpm subscribe <txSig>     # prints the API token on stdout
```
Put it in `.env` as `TXLINE_API_TOKEN`, **or** set `TXLINE_TX_SIG=<sig>` and let the
worker activate itself on boot.

## Network topology (devnet submission)

The Soccit program (escrow/predict/resolve/settle) deploys to **devnet** with a mock
USDT mint. The TxLINE data feed is chain-agnostic HTTP — only the one-time on-chain
`subscribe` must happen on **mainnet** (TxLINE's program only exists there).

| Component | Network | Notes |
|---|---|---|
| TxLINE `subscribe` (one-time) | Mainnet | Their program, ~$0.001 |
| TxLINE API/SSE feed | HTTP | Just needs the API token |
| Soccit program | **Devnet** | Mock USDT, devnet SOL |
| Worker ingestor | HTTP → devnet | Reads feed, writes devnet |
| Resolver/settlement | **Devnet** | Calls Soccit program |

## Run

```bash
pnpm test          # unit tests for the normalizer (no network/creds needed)
pnpm typecheck
pnpm dev           # watch mode
pnpm start         # one-shot
```

Set `TXLINE_FIXTURE_ID` to focus a single match (recommended during the World Cup).
