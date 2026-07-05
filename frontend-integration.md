# Soccit Frontend API Reference

This is the complete reference for the Soccit backend HTTP API exposed by `services/api`.
It is written so the frontend team can integrate without reading backend code.

The API is built with [Hono](https://hono.dev/) and serves two parallel surfaces from the
same process:

- A plain **REST/JSON + SSE** surface under `/api/*` and `/healthz`.
- A **tRPC** surface under `/trpc/*` (same business logic, tRPC error envelope).

> Recommendation: unless your app already uses a tRPC client, prefer the REST endpoints. They
> are simpler to call from `fetch`/`EventSource` and require no extra client library. The tRPC
> surface is documented in full below for teams that want end-to-end type safety.

---

## Environment

- **Base URL:** `https://13.213.196.237.sslip.io`
- **Protocol:** HTTPS (HTTP/2). TLS is terminated by Caddy, which reverse-proxies to the API
  container (`api:8787`). SSE responses are flushed immediately (`flush_interval -1`) so there
  is no proxy buffering on streaming endpoints.
- **JSON endpoints** return `Content-Type: application/json`.
- **SSE endpoints** return `Content-Type: text/event-stream` with `Cache-Control: no-cache`.
- **CORS:** fully open. The server sends `Access-Control-Allow-Origin: *` and answers
  `OPTIONS` preflights with `Access-Control-Allow-Methods: GET,HEAD,PUT,POST,DELETE,PATCH`.
  Any browser origin can call the API. (Verified live — see snippets below.)
- **No bearer auth for reads.** All `GET` endpoints are public; no token, cookie, or API key
  is required.
- **User writes require a wallet signature.** `POST /api/user` and `PATCH /api/user/:wallet/avatar`
  require a `message` + `signature` in the request body. The server verifies that the signature
  was produced by the wallet (ed25519 via tweetnacl). There is no session — every write is
  independently signed.

### CORS — verified

```bash
$ curl -X OPTIONS -i https://13.213.196.237.sslip.io/api/avatars \
    -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET"
HTTP/2 204
access-control-allow-methods: GET,HEAD,PUT,POST,DELETE,PATCH
access-control-allow-origin: *
```

---

## Match addressing

The fixture-scoped endpoints (`match`, `leaderboard`, `leaderboard/stream`, `lineup`, `events`)
are keyed by the **match-account PDA** — the on-chain program-derived address of the match — not
by the numeric `fixtureId`. The `:wallet` endpoints are unaffected and still take a base58 wallet
address.

- **What it looks like:** a base58 Solana address, 32–44 chars (the same shape as a wallet
  address), e.g. `CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq`.
- **Where to get it:** call **`GET /api/matches`** (endpoint #2) — the match-discovery list. Every
  row carries its `pda` (route on it, e.g. `/matches/[pda]`) and `fixtureId`. The PDA is also
  returned as `matchAccount` by `POST /api/prediction/prepare`. **Do not hardcode a PDA** — read it
  from the list. The numeric `fixtureId` is still present in every response body
  (`MatchState.fixtureId`, `Leaderboard.fixtureId`, …) for display, but is no longer accepted as a
  path param.
- **How resolution works:** the server keeps a Redis reverse index (`matchpda:<pda>` →
  `fixtureId`) populated during ingestion, so PDA→fixtureId resolution is a cheap lookup with **no
  RPC call**. An unknown PDA returns a clean `404`; a malformed (non-base58) value returns `400`.

> If your client already knows the program ID and `fixtureId`, the PDA is deterministic:
> `findProgramAddress(["match", u64_le(fixtureId)], programId)`. But you normally never need to
> derive it yourself — read `matchAccount` off the prepare-prediction response.

---

## Quick Start

```ts
export const SOCCIT_API_BASE_URL = "https://13.213.196.237.sslip.io";
```

### `fetch` a JSON resource

```ts
const res = await fetch(`${SOCCIT_API_BASE_URL}/api/match/${matchPda}`);
if (res.ok) {
  const match = await res.json(); // MatchState
}
```

### Subscribe with `EventSource` (SSE)

```ts
const source = new EventSource(
  `${SOCCIT_API_BASE_URL}/api/leaderboard/${matchPda}/stream`,
);

source.addEventListener("leaderboard", (event) => {
  const leaderboard = JSON.parse(event.data); // Leaderboard
  // render…
});

source.onerror = () => {
  // The browser reconnects automatically; nothing to do here in most cases.
};
```

### Error-handling helper

```ts
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SOCCIT_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with ${response.status}`);
  }

  return body as T;
}
```

All JSON error responses share the shape `{ "error": string }`, so `body?.error` is always the
human-readable message. (SSE error responses, returned before the stream opens, use the same
shape.)

---

## Shared Types

These types are referenced by multiple endpoints.

```ts
export type AvatarId =
  | "avatar-1"
  | "avatar-2"
  | "avatar-3"
  | "avatar-4"
  | "avatar-5"
  | "avatar-6"
  | "avatar-7"
  | "avatar-8";

// A player resolved against the stored lineup index.
export type ResolvedPlayer = {
  id: number;
  name: string;
  number: string | null;
  positionId: number | null;
  position: string | null;
  side: 1 | 2;
};
```

Prediction `kind` values (shared across leaderboard and participation):

| `kind` | Meaning            | `outPlayerId` / `inPlayerId` mean… | `side` |
| ------ | ------------------ | ---------------------------------- | ------ |
| `0`    | OUT (player out)   | player subbed OUT / unused         | 1 or 2 |
| `1`    | IN (player in)     | unused / player subbed IN          | 1 or 2 |
| `2`    | COMBO (out + in)   | player OUT / player IN             | 1 or 2 |
| `3`    | SCORE (final score)| **score1 (team1) / score2 (team2)**| `0`    |

For substitution picks (`kind` 0/1/2) `side` is `1` (team 1 / home) or `2` (team 2 / away). A
**score prediction** (`kind` 3) is about the whole match, so it carries `side: 0` and reuses the
`outPlayerId`/`inPlayerId` fields to hold the predicted scoreline: `outPlayerId` = team-1 goals,
`inPlayerId` = team-2 goals (each `0..99`).

**Scoring:** substitution picks score against the live substitution feed (OUT/IN = +1 each, COMBO
both = 3). A score pick is graded only at 90-min full-time: **exact scoreline = 3 pts, correct
outcome (right win/draw/loss, wrong goals) = 1 pt, else 0**. Before full-time a score pick shows 0
points (provisional). One wallet can mix substitution and score picks in the same match.

---

## REST Endpoints

### 1. `GET /healthz`

Liveness + ingestion-health probe. `ok` reflects the API process itself; `worker` and `feed`
are best-effort probes of the background TxLINE ingestor (read from Redis).

- **Path params:** none
- **Query params:** none
- **Success:** `200` → `Health`

```ts
type Health = {
  ok: true; // the API process is up
  worker: null | {
    alive: boolean; // true if the ingestor refreshed its heartbeat in the last ~35s
    heartbeatAgeMs: number | null; // ms since the last worker heartbeat (null if never seen)
  };
  feed: null | {
    lastBeatAgeMs: number | null; // ms since the feed last delivered a real beat (null if never)
  };
};
```

**Interpreting it:**

- `worker.alive === true` → the ingestor process is running.
- `worker.alive === false` (or `worker === null`) → the ingestor is **down / crash-looping** —
  live scores and events will be stale. This is the alarm to watch.
- `feed.lastBeatAgeMs` is **data freshness**, not health: it stays high when no match is currently
  live (the feed is legitimately quiet between fixtures), so a large value with `worker.alive: true`
  is normal. A large value with `worker.alive: false` means ingestion is actually broken.
- `worker`/`feed` are `null` when the API can't reach Redis; `ok` is still `true` (API is up).

> This is a health/observability endpoint — you generally don't need it for the app UI. It's here
> so ops (and a status page) can tell a healthy-but-idle backend from a frozen one.

**Verified live** (`worker.alive: true` = ingestor healthy; the large `lastBeatAgeMs` here just
means no match was live in the last few hours — expected, not a fault):

```bash
$ curl https://13.213.196.237.sslip.io/healthz
{"ok":true,"worker":{"alive":true,"heartbeatAgeMs":7694},"feed":{"lastBeatAgeMs":16846120}}
```

---

### 2. `GET /api/matches`

The **match-discovery list**: every match that exists on-chain, newest and most active first. This
is how the frontend finds matches to display and bet on — **route on the `pda` from each row instead
of hardcoding one**.

- **Path params:** none
- **Query params:** none
- **Request body:** none
- **Success:** `200` → `MatchSummary[]`

```ts
type MatchSummary = {
  pda: string; // match-account address — use for /api/match, /lineup, /events, /leaderboard
  fixtureId: number; // use for POST /api/prediction/prepare
  onchain: {
    // always present — this list is sourced from on-chain accounts
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string; // stringified integer, USDC base units (6 dp → "5000000" = 5 USDC)
    poolTotal: string; // stringified integer, USDC base units
    participantCount: number;
    startTime: number; // kickoff (unix seconds); 0 = no entry gate. Entries open 10 min before.
    team1Id: number;
    team2Id: number;
    usdcMint: string; // the mint the entry fee must be paid in
    winners: [string | null, string | null, string | null];
  };
  live: null | {
    // present once the feed has ingested this fixture; null otherwise
    statusId: number | null;
    minute: number | null;
    goals: { team1: number; team2: number };
    ts: number | null;
  };
  teamNames: null | {
    // display names from the ingested lineup; null until lineups are ingested
    team1: string | null;
    team2: string | null;
  };
};
```

**Ordering:** `OPEN` first, then `RESOLVED`, then `SETTLED`; within each status the newest
`fixtureId` (highest) first.

**Notes:**

- `onchain` is **never null** here (unlike `GET /api/match/:pda`, whose `onchain` can be null): the
  list is built by scanning on-chain Match accounts, so an entry only exists if the account does.
- `live` and `teamNames` are `null` until the worker has ingested that fixture from the live feed.
  Fall back to `team1Id`/`team2Id` for labelling until `teamNames` is populated.
- This endpoint reads on-chain state over Solana RPC (`getProgramAccounts`). Treat `5xx` as
  **retryable**; the shape is always a JSON array on success (possibly empty `[]`).

**Success shape example:**

```json
[
  {
    "pda": "AH9SCugMfwgFYAxBLMBuSmjvrKnSbLxbHAtDhM5k4gQ7",
    "fixtureId": 18172379,
    "onchain": {
      "status": 0,
      "statusLabel": "OPEN",
      "settled": false,
      "entryFee": "5000000",
      "poolTotal": "0",
      "participantCount": 0,
      "startTime": 1782446400,
      "team1Id": 3220,
      "team2Id": 1619,
      "usdcMint": "2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac",
      "winners": [null, null, null]
    },
    "live": { "statusId": 4, "minute": 90, "goals": { "team1": 2, "team2": 0 }, "ts": 1782958444741 },
    "teamNames": { "team1": "USA", "team2": "Bosnia & Herzegovina" }
  }
]
```

**tRPC equivalent:** `match.list` (query, no input).

---

### 3. `GET /api/match/:pda`

Returns the combined on-chain + live state for a fixture.

- **Path params:**
  - `pda` — the match-account address (base58 PDA). See [Match addressing](#match-addressing).
- **Query params:** none
- **Request body:** none
- **Success:** `200` → `MatchState`

```ts
type MatchState = {
  fixtureId: number;
  onchain: null | {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string; // stringified integer (lamports/base units)
    poolTotal: string; // stringified integer
    participantCount: number;
    startTime: number; // kickoff (unix seconds); 0 = no entry gate. Entries open 10 min before.
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  };
  live: null | {
    statusId: number | null;
    minute: number | null;
    goals: { team1: number; team2: number };
    ts: number | null;
  };
  updatedAt: number; // epoch ms
};
```

**Error statuses:**

| Status | Body                                                          | When                                          |
| ------ | ------------------------------------------------------------- | --------------------------------------------- |
| `400`  | `{ "error": "invalid match address" }`                        | `pda` is not a valid base58 address.          |
| `404`  | `{ "error": "No match found for match account <pda>" }`       | PDA is unknown (not in the reverse index).    |
| `404`  | `{ "error": "No match found for fixture <id>" }`              | PDA resolved, but no on-chain or live state.  |
| `500`  | `Internal Server Error` (plain text)                          | RPC lookup failed while fetching chain state. |

> **PDA resolution is RPC-free.** An unknown PDA now resolves against the Redis reverse index and
> returns a clean **`404`** — it no longer 500s. A `500` is still possible *after* resolution
> because this endpoint reads on-chain state over Solana RPC; treat `5xx` as retryable.

**Examples (illustrative — not re-verified against production):**

```bash
$ curl -i https://13.213.196.237.sslip.io/api/match/not-a-pda
HTTP/2 400
{"error":"invalid match address"}

# A syntactically valid but unknown PDA:
$ curl -i https://13.213.196.237.sslip.io/api/match/CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq
HTTP/2 404
{"error":"No match found for match account CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq"}
```

Schema example of a populated success response (no seeded fixture available to fetch live):

```json
{
  "fixtureId": 900001,
  "onchain": {
    "status": 0,
    "statusLabel": "OPEN",
    "settled": false,
    "entryFee": "1000000",
    "poolTotal": "5000000",
    "participantCount": 5,
    "startTime": 1782446400,
    "team1Id": 101,
    "team2Id": 202,
    "usdcMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "winners": [null, null, null]
  },
  "live": {
    "statusId": 1,
    "minute": 37,
    "goals": { "team1": 1, "team2": 0 },
    "ts": 1719662400000
  },
  "updatedAt": 1719662400000
}
```

_(schema example — not fetched from production)_

---

### 4. `POST /api/prediction/prepare`

Builds the **on-chain "place a prediction" transaction** for a wallet — the core betting action.
The API is **non-custodial**: it returns an **unsigned** transaction whose fee payer is the user's
wallet. The frontend deserializes it, has the wallet sign it, and submits it to Solana itself
(`sendRawTransaction`). **The API never signs and never holds a key**, and there is no
`/submit` endpoint — submission is entirely client-side.

- **Path params:** none
- **Request body:** `PreparePredictionInput`

```ts
type PreparePredictionInput = {
  wallet: string; // 32–44 char base58 wallet; becomes the tx fee payer + signer
  fixtureId: number; // positive int (from GET /api/matches → row.fixtureId)
  side: 0 | 1 | 2; // 1/2 for substitution picks; 0 for a score pick
  kind: 0 | 1 | 2 | 3; // 0 = OUT, 1 = IN, 2 = COMBO, 3 = SCORE (see Shared Types)
  outPlayerId: number; // uint32; sub-OUT player id, OR (kind 3) team-1 goals (0..99)
  inPlayerId: number; // uint32; sub-IN player id, OR (kind 3) team-2 goals (0..99)
  lockMinute: number; // uint16; match minute the prediction locks at
  // NOTE: no slotIndex — the server derives the next free slot from the wallet's on-chain entry.
};
```

- **Success:** `200` → `PreparePredictionOutput`

```ts
type PreparePredictionOutput = {
  transaction: string; // base64 unsigned legacy tx — deserialize, sign with wallet, submit
  fixtureId: number;
  prediction: string; // the Prediction account PDA this will create
  matchAccount: string; // the match PDA (same value used by the read endpoints)
  userUsdcAta: string; // the wallet's USDC associated-token account (created idempotently by the tx)
  usdcMint: string; // the mint the entry fee is charged in
  entryFee: string; // fee THIS tx charges (pay-per-match): full fee on the wallet's first pick, "0" after
  slotIndex: number; // server-derived slot this pick occupies (0 for the first pick)
  startTime: number; // kickoff (unix seconds); 0 = no entry gate. Entries open 10 min before this.
  blockhash: string; // recent blockhash baked into the tx
  lastValidBlockHeight: number; // submit before this height or the blockhash expires
};
```

**Behavior notes:**

- The transaction contains **two instructions**: an *idempotent* create-associated-token-account
  (so a first-time user with no USDC account doesn't fail — a no-op if it already exists), then the
  `place_prediction` program instruction.
- **Pay-per-match, not per-pick:** a wallet is charged the entry fee **once**, on its first pick in
  a match. Later picks (up to 5 slots per match, any mix of substitution and score) are free — for
  those, `prepare` returns `entryFee: "0"` and the tx transfers nothing. Show the user the returned
  `entryFee` so they know whether this pick costs anything.
- On the paying (first) pick the wallet **must already hold at least `entryFee` of `usdcMint`**,
  plus a little SOL for network fees. `usdcMint` is whatever mint the match was created with — read
  it from the response (do not assume mainnet USDC).
- **Do not track slots client-side** — the server reads the wallet's on-chain entry and returns the
  correct `slotIndex`/`prediction` PDA. Just call `prepare` again for each additional pick.
- **Entry window (opens 10 min before kickoff):** a match's room becomes entry-able at
  `startTime − 600s` and stays open in-play (it closes only when the match is resolved). Calling
  `prepare` earlier than that returns **`409`** (see below) with the `startTime` — use it to render
  a countdown. `startTime: 0` means the gate is disabled (always open). The on-chain program
  enforces the same window, so a tx submitted too early is rejected on-chain regardless.
- The returned `blockhash`/`lastValidBlockHeight` bound the tx's lifetime — sign and submit
  promptly; if it expires, call `prepare` again for a fresh blockhash.

**Error statuses:**

| Status | Body                                                                     | When                                             |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `400`  | `{ "error": "invalid body" }`                                           | Body fails schema validation (bad wallet/fields).|
| `404`  | `{ "error": "No match found for fixture <id>" }`                        | No on-chain Match account for that `fixtureId`.  |
| `409`  | `{ "error": "Match <id> is not open for predictions (status: <label>)" }` | Match exists but status is not `OPEN`.         |
| `409`  | `{ "error": "Entries for match <id> open 10 minutes before kickoff (starts at <ts>)" }` | Called before the entry window opens (>10 min before kickoff). |
| `500`  | `Internal Server Error` (plain text)                                    | Solana RPC failed (fetching match / blockhash).  |

**Verified live (validation + open match):**

```bash
# missing/invalid body → 400
$ curl -i -X POST https://13.213.196.237.sslip.io/api/prediction/prepare \
    -H "content-type: application/json" -d '{}'
HTTP/2 400
{"error":"invalid body"}

# valid substitution pick against an OPEN match → 200 with a base64 tx
$ curl -s -X POST https://13.213.196.237.sslip.io/api/prediction/prepare \
    -H "content-type: application/json" \
    -d '{"wallet":"G6vSMwTKg9ZvF1dP8T5tN2jEZkvzaErw8SkEqcBAdu9R","fixtureId":18172379,
         "side":1,"kind":0,"outPlayerId":0,"inPlayerId":0,"lockMinute":45}'
{"transaction":"AQAAAAAAAA…","fixtureId":18172379,"prediction":"…","matchAccount":"AH9SCug…",
 "userUsdcAta":"…","usdcMint":"2SJtTmJJ83maUrmoDMc6ZYgGM9migp9FjEKMbARm4cac","entryFee":"5000000",
 "slotIndex":0,"blockhash":"…","lastValidBlockHeight":…}

# a score prediction (final score 2–1) → side 0, kind 3, goals in out/in
$ curl -s -X POST https://13.213.196.237.sslip.io/api/prediction/prepare \
    -H "content-type: application/json" \
    -d '{"wallet":"G6vSMwTKg9ZvF1dP8T5tN2jEZkvzaErw8SkEqcBAdu9R","fixtureId":18172379,
         "side":0,"kind":3,"outPlayerId":2,"inPlayerId":1,"lockMinute":45}'
# second pick by the same wallet → entryFee "0", slotIndex 1 (pay-per-match)
```

**Frontend flow (submit is client-side):**

```ts
import { Connection, Transaction } from "@solana/web3.js";

const prep = await apiJson<PreparePredictionOutput>("/api/prediction/prepare", {
  method: "POST",
  body: JSON.stringify({
    wallet, fixtureId, side, kind,
    outPlayerId, inPlayerId, lockMinute, // no slotIndex — server derives it
  }),
});
// prep.entryFee is "0" when this pick is free (pay-per-match); prep.slotIndex is the slot used.

const tx = Transaction.from(Buffer.from(prep.transaction, "base64"));
const signed = await wallet.signTransaction(tx); // wallet adapter
const connection = new Connection(DEVNET_RPC_URL, "confirmed");
const sig = await connection.sendRawTransaction(signed.serialize());
await connection.confirmTransaction(
  { signature: sig, blockhash: prep.blockhash, lastValidBlockHeight: prep.lastValidBlockHeight },
  "confirmed",
);
// The Prediction account (prep.prediction) now exists; the leaderboard will pick it up.
```

**tRPC equivalent:** `prediction.prepare` (mutation).

---

### 5. `GET /api/leaderboard/:pda`

Returns the enriched leaderboard (rankings + per-owner predictions + resolved player and user
profile data) for a fixture.

- **Path params:**
  - `pda` — the match-account address (base58 PDA). See [Match addressing](#match-addressing).
- **Query params:** none
- **Success:** `200` → `Leaderboard`

```ts
type Leaderboard = {
  fixtureId: number;
  updatedAt: number; // epoch ms
  final: boolean; // true once results are finalized
  winners: [string | null, string | null, string | null]; // wallet addresses, ranks 1–3
  ranking: Array<{
    owner: string; // wallet address
    points: number;
    earliestScoringLockMinute: number | null;
    user: null | {
      username: string;
      avatar: AvatarId | null;
    };
    predictions: Array<{
      kind: 0 | 1 | 2 | 3; // 3 = SCORE
      points: number;
      side: 0 | 1 | 2; // 0 for a score pick
      outPlayerId: number; // sub-OUT player id, OR (kind 3) team-1 goals
      inPlayerId: number; // sub-IN player id, OR (kind 3) team-2 goals
      players: {
        // resolved for substitution picks; both null for a score pick
        out: ResolvedPlayer | null;
        in: ResolvedPlayer | null;
      };
      // populated only for a score pick (kind 3); null for substitution picks
      score: { score1: number; score2: number } | null;
    }>;
  }>;
};
```

**Error statuses:**

| Status | Body                                                              | When                                       |
| ------ | ---------------------------------------------------------------- | ------------------------------------------ |
| `400`  | `{ "error": "invalid match address" }`                           | `pda` is not a valid base58 address.       |
| `404`  | `{ "error": "No match found for match account <pda>" }`          | PDA is unknown (not in the reverse index). |
| `404`  | `{ "error": "No leaderboard available yet for fixture <id>" }`   | PDA resolved, leaderboard not computed.    |

**Examples (illustrative — not re-verified against production):**

```bash
$ curl -i https://13.213.196.237.sslip.io/api/leaderboard/not-a-pda
HTTP/2 400
{"error":"invalid match address"}

$ curl -i https://13.213.196.237.sslip.io/api/leaderboard/CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq
HTTP/2 404
{"error":"No match found for match account CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq"}
```

Schema example of a populated success response (no seeded fixture available to fetch live):

```json
{
  "fixtureId": 900001,
  "updatedAt": 1719662400000,
  "final": false,
  "winners": [null, null, null],
  "ranking": [
    {
      "owner": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PB5wsfV",
      "points": 12,
      "earliestScoringLockMinute": 31,
      "user": { "username": "alice", "avatar": "avatar-3" },
      "predictions": [
        {
          "kind": 2,
          "points": 9,
          "side": 1,
          "outPlayerId": 5001,
          "inPlayerId": 5002,
          "players": {
            "out": {
              "id": 5001,
              "name": "J. Doe",
              "number": "9",
              "positionId": 4,
              "position": "Forward",
              "side": 1
            },
            "in": {
              "id": 5002,
              "name": "M. Smith",
              "number": "17",
              "positionId": 4,
              "position": "Forward",
              "side": 1
            }
          },
          "score": null
        },
        {
          "kind": 3,
          "points": 3,
          "side": 0,
          "outPlayerId": 2,
          "inPlayerId": 1,
          "players": { "out": null, "in": null },
          "score": { "score1": 2, "score2": 1 }
        }
      ]
    }
  ]
}
```

_(schema example — not fetched from production)_

---

### 6. `GET /api/leaderboard/:pda/stream`

Server-Sent Events stream of leaderboard updates for a fixture. The current leaderboard (if any)
is emitted immediately on connect, then every subsequent recomputation is pushed.

- **Path params:**
  - `pda` — the match-account address (base58 PDA). See [Match addressing](#match-addressing).
- **Query params:** none
- **Success:** `200`, opens an SSE stream
  (`Content-Type: text/event-stream`, `Cache-Control: no-cache`).

**Error statuses:**

| Status | Body                                                     | When                                       |
| ------ | -------------------------------------------------------- | ------------------------------------------ |
| `400`  | `{ "error": "invalid match address" }`                   | `pda` is not a valid base58 address.       |
| `404`  | `{ "error": "No match found for match account <pda>" }`  | PDA is unknown (not in the reverse index). |

> Both the `400` and the `404` are resolved **before the stream opens**, so they arrive as
> ordinary JSON responses. Once the stream is open the connection always reports `200`.

**SSE event format:**

```text
event: leaderboard
data: <Leaderboard JSON>
```

Only `leaderboard` events are emitted on this stream. Keepalive comments are sent periodically:

```text
: keepalive
```

(Keepalive interval is 15 seconds. Ignore any line starting with `:`.)

**Frontend example:**

```ts
const source = new EventSource(
  `${SOCCIT_API_BASE_URL}/api/leaderboard/${matchPda}/stream`,
);

source.addEventListener("leaderboard", (event) => {
  const leaderboard = JSON.parse(event.data);
  // render…
});

source.onerror = () => {
  // Browser will retry automatically.
};
```

**Response headers (schematic):**

```bash
$ curl -i -N --max-time 4 https://13.213.196.237.sslip.io/api/leaderboard/<matchPda>/stream
HTTP/2 200
content-type: text/event-stream
cache-control: no-cache
# (no leaderboard event until one is computed; only keepalives once per 15s)
```

---

### 7. `GET /api/lineup/:pda`

Returns the resolved team lineups for a fixture.

- **Path params:**
  - `pda` — the match-account address (base58 PDA). See [Match addressing](#match-addressing).
- **Query params:** none
- **Success:** `200` → `Lineup`

```ts
type Lineup = {
  fixtureId: number;
  updatedAt: number; // epoch ms
  teams: Array<{
    side: 1 | 2;
    teamId: number;
    teamName: string | null;
    players: Array<{
      id: number;
      name: string;
      number: string | null;
      starter: boolean;
      positionId: number | null;
      position: string | null;
      onPitch?: boolean | null;
      warmingUp?: boolean | null;
    }>;
  }>;
  names: Record<string, string>; // playerId (string) -> player name
};
```

**Error statuses:**

| Status | Body                                                          | When                                       |
| ------ | ------------------------------------------------------------ | ------------------------------------------ |
| `400`  | `{ "error": "invalid match address" }`                       | `pda` is not a valid base58 address.       |
| `404`  | `{ "error": "No match found for match account <pda>" }`      | PDA is unknown (not in the reverse index). |
| `404`  | `{ "error": "No lineup available yet for fixture <id>" }`    | PDA resolved, lineup not ingested yet.     |

**Examples (illustrative — not re-verified against production):**

```bash
$ curl -i https://13.213.196.237.sslip.io/api/lineup/not-a-pda
HTTP/2 400
{"error":"invalid match address"}

$ curl -i https://13.213.196.237.sslip.io/api/lineup/CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq
HTTP/2 404
{"error":"No match found for match account CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq"}
```

Schema example of a populated success response (no seeded fixture available to fetch live):

```json
{
  "fixtureId": 900001,
  "updatedAt": 1719662400000,
  "teams": [
    {
      "side": 1,
      "teamId": 101,
      "teamName": "Home FC",
      "players": [
        {
          "id": 5001,
          "name": "J. Doe",
          "number": "9",
          "starter": true,
          "positionId": 4,
          "position": "Forward",
          "onPitch": true,
          "warmingUp": false
        }
      ]
    },
    {
      "side": 2,
      "teamId": 202,
      "teamName": "Away United",
      "players": [
        {
          "id": 6001,
          "name": "A. Roe",
          "number": "1",
          "starter": true,
          "positionId": 1,
          "position": "Goalkeeper",
          "onPitch": true,
          "warmingUp": null
        }
      ]
    }
  ],
  "names": { "5001": "J. Doe", "6001": "A. Roe" }
}
```

_(schema example — not fetched from production)_

---

### 8. `GET /api/events/:pda`

Server-Sent Events stream of match events (goals, substitutions, etc.) for a fixture. On connect
the server backfills historical events from the cursor, then tails live events.

- **Path params:**
  - `pda` — the match-account address (base58 PDA). See [Match addressing](#match-addressing).
- **Query params:**
  - `fromId` — optional Redis stream cursor; default `"0-0"` (replay from the start).
- **Headers:**
  - `Last-Event-ID` — optional. If present it overrides `fromId` and is used as the cursor.
    The browser sets this automatically on reconnect (see SSE Reconnect Guidance).
- **Success:** `200`, opens an SSE stream
  (`Content-Type: text/event-stream`, `Cache-Control: no-cache`).

**Error statuses:**

| Status | Body                                                     | When                                       |
| ------ | -------------------------------------------------------- | ------------------------------------------ |
| `400`  | `{ "error": "invalid match address" }`                   | `pda` is not a valid base58 address.       |
| `404`  | `{ "error": "No match found for match account <pda>" }`  | PDA is unknown (not in the reverse index). |

> Both the `400` and the `404` are resolved **before the stream opens**, so they arrive as
> ordinary JSON responses. Once the stream is open the connection always reports `200`.

**SSE event format:**

```text
id: <redis stream id>
event: <event type>
data: <EventEntry JSON>
```

- `id` is the Redis stream id of the event (e.g. `1719662400000-0`) and becomes the
  `Last-Event-ID` on reconnect.
- `event` is the backend event type string (e.g. `substitution`, `goal`). Use
  `source.onmessage` to receive all events, or `addEventListener("<type>", …)` for a specific
  one.

```ts
type EventEntry = {
  id: string;
  type: string;
  payload: unknown; // shape depends on `type`
  players?: {
    out: ResolvedPlayer | null;
    in: ResolvedPlayer | null;
  };
};
```

The `players` field is populated for player-related events (e.g. substitutions) when the lineup
index is available.

**Frontend example:**

```ts
const source = new EventSource(
  `${SOCCIT_API_BASE_URL}/api/events/${matchPda}?fromId=0-0`,
);

source.onmessage = (event) => {
  const entry = JSON.parse(event.data); // EventEntry
};

source.addEventListener("substitution", (event) => {
  const entry = JSON.parse(event.data);
  // entry.players?.out / entry.players?.in are ResolvedPlayer | null
});
```

**Response headers (schematic):**

```bash
$ curl -i -N --max-time 4 https://13.213.196.237.sslip.io/api/events/<matchPda>?fromId=0-0
HTTP/2 200
content-type: text/event-stream
cache-control: no-cache
# (no events until the match has any; only keepalives once per 15s)
```

Schema example of an emitted event (no seeded fixture available to fetch live):

```text
id: 1719662400000-0
event: substitution
data: {"id":"1719662400000-0","type":"substitution","payload":{"side":1,"playerOutId":5001,"playerInId":5002,"minute":63},"players":{"out":{"id":5001,"name":"J. Doe","number":"9","positionId":4,"position":"Forward","side":1},"in":{"id":5002,"name":"M. Smith","number":"17","positionId":4,"position":"Forward","side":1}}}
```

_(schema example — not fetched from production)_

---

### 9. `GET /api/avatars`

Returns the list of available avatars and their image sources.

- **Path params:** none
- **Query params:** none
- **Success:** `200` → `AvatarsResponse`

```ts
type AvatarDescriptor = {
  id: AvatarId;
  src: string; // relative path, e.g. "/avatars/avatar-1.png"
};

type AvatarsResponse = AvatarDescriptor[];
```

> `src` is a relative path (`/avatars/<id>.png`). The frontend is responsible for hosting/serving
> those images; the API does not serve the image binaries.

**Verified live:**

```bash
$ curl https://13.213.196.237.sslip.io/api/avatars
[{"id":"avatar-1","src":"/avatars/avatar-1.png"},
 {"id":"avatar-2","src":"/avatars/avatar-2.png"},
 ...
 {"id":"avatar-8","src":"/avatars/avatar-8.png"}]
```

---

### 10. `POST /api/user`

Registers a user profile. The request must be signed by the wallet.

- **Path params:** none
- **Request body:**

```ts
type RegisterUserInput = {
  wallet: string; // 32–44 chars (base58 wallet address)
  username: string; // 3–20 chars, /^[a-zA-Z0-9_]+$/
  avatar?: AvatarId; // optional
  message: string; // the signed message
  signature: string; // base58 ed25519 signature of `message` by `wallet`
};
```

- **Success:** `200` → `UserProfile`

```ts
type UserProfile = {
  wallet: string;
  username: string;
  avatar: AvatarId | null;
  createdAt: number; // epoch ms
};
```

**Error statuses:**

| Status | Body                                                       | When                                                  |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------- |
| `400`  | `{ "error": "invalid body" }`                              | Body fails schema validation (bad wallet/username).   |
| `401`  | `{ "error": "Wallet signature verification failed" }`      | `signature` does not verify against `wallet`+`message`. |
| `409`  | `{ "error": "Username <username> is already taken" }`      | Username already registered.                          |
| `409`  | `{ "error": "Wallet <wallet> already has a profile" }`     | Wallet already registered.                            |

**Example request:**

```bash
curl -X POST https://13.213.196.237.sslip.io/api/user \
  -H "content-type: application/json" \
  -d '{
    "wallet": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PB5wsfV",
    "username": "alice",
    "avatar": "avatar-3",
    "message": "Soccit onboarding: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PB5wsfV",
    "signature": "<base58 ed25519 signature>"
  }'
```

**Example success response:**

```json
{
  "wallet": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PB5wsfV",
  "username": "alice",
  "avatar": "avatar-3",
  "createdAt": 1719662400000
}
```

_(schema example — requires a valid wallet signature, not fetched from production)_

**Verified live (validation path):**

```bash
$ curl -i -X POST https://13.213.196.237.sslip.io/api/user \
    -H "content-type: application/json" -d '{"bad":"data"}'
HTTP/2 400
{"error":"invalid body"}
```

> The signed `message` convention used by the backend is `"Soccit onboarding: <wallet>"`. Sign
> that exact string with the wallet to register.

---

### 11. `GET /api/user/:wallet`

Returns a user profile by wallet.

- **Path params:**
  - `wallet` — 32–44 char wallet string.
- **Success:** `200` → `UserProfile` (see above)

**Error statuses:**

| Status | Body                                                  | When                              |
| ------ | ---------------------------------------------------- | --------------------------------- |
| `400`  | `{ "error": "invalid wallet" }`                      | `wallet` not 32–44 chars.         |
| `404`  | `{ "error": "No profile found for wallet <wallet>" }` | No profile registered.           |

**Examples (verified live):**

```bash
$ curl -i https://13.213.196.237.sslip.io/api/user/short
HTTP/2 400
{"error":"invalid wallet"}

$ curl -i https://13.213.196.237.sslip.io/api/user/11111111111111111111111111111111
HTTP/2 404
{"error":"No profile found for wallet 11111111111111111111111111111111"}
```

---

### 12. `PATCH /api/user/:wallet/avatar`

Updates a user's avatar. The request must be signed by the wallet.

- **Path params:**
  - `wallet` — 32–44 char wallet string. The path `wallet` is merged into the validated body
    server-side (so you do not repeat it in the JSON body).
- **Request body:**

```ts
type SetAvatarInput = {
  avatar: AvatarId;
  message: string;
  signature: string;
};
```

- **Success:** `200` → `UserProfile` (see above)

**Error statuses:**

| Status | Body                                                  | When                                        |
| ------ | ---------------------------------------------------- | ------------------------------------------- |
| `400`  | `{ "error": "invalid body" }`                        | Body/path fails schema validation.          |
| `401`  | `{ "error": "Wallet signature verification failed" }` | Signature does not verify.                  |
| `404`  | `{ "error": "No profile found for wallet <wallet>" }` | No profile to update.                       |

**Example request:**

```bash
curl -X PATCH https://13.213.196.237.sslip.io/api/user/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PB5wsfV/avatar \
  -H "content-type: application/json" \
  -d '{
    "avatar": "avatar-5",
    "message": "<signed message>",
    "signature": "<base58 ed25519 signature>"
  }'
```

**Verified live (validation path):**

```bash
$ curl -i -X PATCH https://13.213.196.237.sslip.io/api/user/11111111111111111111111111111111/avatar \
    -H "content-type: application/json" -d '{}'
HTTP/2 400
{"error":"invalid body"}
```

---

### 13. `GET /api/user/:wallet/matches`

Returns all known match-participation records for a wallet. The array may be empty.

- **Path params:**
  - `wallet` — 32–44 char wallet string.
- **Success:** `200` → `UserMatchesResponse`

```ts
type UserMatchesResponse = Array<{
  wallet: string;
  fixtureId: number;
  points: number;
  final: boolean;
  rank: number | null; // 1–3 or null
  predictions: Array<{
    kind: 0 | 1 | 2 | 3; // 3 = SCORE
    points: number;
    side: 0 | 1 | 2; // 0 for a score pick
    outPlayerId: number; // sub-OUT player id, OR (kind 3) team-1 goals
    inPlayerId: number; // sub-IN player id, OR (kind 3) team-2 goals
  }>;
}>;
```

**Error statuses:**

| Status | Body                            | When                      |
| ------ | ------------------------------- | ------------------------- |
| `400`  | `{ "error": "invalid wallet" }` | `wallet` not 32–44 chars. |

> Note: there is **no 404** here. A valid wallet with no participation returns `200` and `[]`.

**Examples (verified live):**

```bash
$ curl -i https://13.213.196.237.sslip.io/api/user/short/matches
HTTP/2 400
{"error":"invalid wallet"}

$ curl -i https://13.213.196.237.sslip.io/api/user/11111111111111111111111111111111/matches
HTTP/2 200
[]
```

---

### 14. `GET /api/schedule`

The **fixture schedule**: TxLINE's confirmed upcoming-fixture calendar, fetched live from the feed
(`/api/fixtures/snapshot`) and trimmed to display fields. This is distinct from `GET /api/matches`
(#2): `/api/matches` lists only fixtures that already have an on-chain prediction market, whereas
`/api/schedule` is the raw feed calendar of everything scheduled — use it to show upcoming games
before a market exists. It is **not** keyed by a match PDA; it takes optional day/competition
filters instead.

- **Path params:** none
- **Query params:**
  - `startEpochDay` — optional non-negative int. Ordinal days since 1970 (UTC). Returns fixtures
    starting at or within ~30 days after that day. Defaults to the current UTC day.
  - `competitionId` — optional int. Filter to a single competition.
- **Request body:** none
- **Success:** `200` → `ScheduleFixture[]`, sorted by kickoff time (soonest first)

```ts
type ScheduleFixture = {
  fixtureId: number;
  startTime: number | null; // kickoff, epoch seconds as delivered by the TxLINE feed
  competition: string | null;
  competitionId: number | null;
  team1: { id: number | null; name: string | null };
  team2: { id: number | null; name: string | null };
  team1IsHome: boolean | null;
};
```

**Notes:**

- This endpoint proxies the **live TxLINE feed** (not Redis / not on-chain). The server holds the
  TxLINE credentials; the frontend passes no token.
- Malformed rows from the feed are silently dropped rather than failing the whole response; a valid
  request with nothing scheduled returns `200` and `[]`.
- `team*.id`/`name` and `startTime` can be `null` when the feed omits them — fall back gracefully.
- `startTime` is passed through exactly as the feed delivers it (TxOdds epoch seconds); verify the
  unit against a known kickoff before doing date math, and treat it as UTC.

**Error statuses:**

| Status | Body                                                                        | When                                                       |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `400`  | `{ "error": "invalid query" }`                                              | `startEpochDay`/`competitionId` is not a valid number.     |
| `503`  | `{ "error": "TxLINE is not configured: set TXLINE_API_TOKEN to enable schedule data" }` | The API has no TxLINE API token configured. |
| `500`  | `Internal Server Error` (plain text)                                        | Upstream TxLINE call failed (auth/network). Retryable.     |

**Example:**

```bash
$ curl -s 'https://13.213.196.237.sslip.io/api/schedule?competitionId=7'
[
  {
    "fixtureId": 18172379,
    "startTime": 1700000000,
    "competition": "World Cup",
    "competitionId": 7,
    "team1": { "id": 3220, "name": "USA" },
    "team2": { "id": 1619, "name": "Bosnia & Herzegovina" },
    "team1IsHome": true
  }
]
```

_(schema example — a `503` is returned until `TXLINE_API_TOKEN` is set on the API service.)_

**tRPC equivalent:** `schedule.list` (query, optional `{ startEpochDay?, competitionId? }` input).

---

## tRPC API

The same backend mounts a tRPC router at:

```text
/trpc/*
```

It runs the identical business logic as the REST endpoints, but returns the standard tRPC error
envelope instead of `{ "error": string }`. Procedures map 1:1 to the REST routes:

| tRPC procedure       | REST equivalent                          | Type         |
| -------------------- | ---------------------------------------- | ------------ |
| `match.list`         | `GET /api/matches`                        | query        |
| `match.get`          | `GET /api/match/:pda`                     | query        |
| `schedule.list`      | `GET /api/schedule`                       | query        |
| `prediction.prepare` | `POST /api/prediction/prepare`            | mutation     |
| `leaderboard.get`    | `GET /api/leaderboard/:pda`               | query        |
| `leaderboard.stream` | `GET /api/leaderboard/:pda/stream`        | subscription |
| `events.stream`      | `GET /api/events/:pda`                    | subscription |
| `lineup.get`         | `GET /api/lineup/:pda`                    | query        |
| `user.register`      | `POST /api/user`                         | mutation     |
| `user.get`           | `GET /api/user/:wallet`                  | query        |
| `user.setAvatar`     | `PATCH /api/user/:wallet/avatar`         | mutation     |
| `user.matches`       | `GET /api/user/:wallet/matches`          | query        |
| `user.avatars`       | `GET /api/avatars`                       | query        |

> Subscriptions (`leaderboard.stream`, `events.stream`) require a tRPC client transport that
> supports streaming (e.g. `httpSubscriptionLink` / SSE link). If you are not already using a
> tRPC client, the REST SSE endpoints (#6 and #8) are the simpler path.

### Procedures

#### `match.list`

- **Input:** none
- **Output:** `MatchSummary[]` (same shape as REST #2)
- **Errors:** none expected (empty list when no matches exist)

#### `match.get`

- **Input:** `{ pda: string }` (base58 match-account address)
- **Output:** `MatchState` (same shape as REST #3)
- **Errors:** `MatchNotFoundError → NOT_FOUND`

#### `schedule.list`

- **Input:** optional `{ startEpochDay?: number; competitionId?: number }` (same as REST #14 query)
- **Output:** `ScheduleFixture[]` (same shape as REST #14), sorted by kickoff ascending
- **Errors:** `TxlineNotConfiguredError → PRECONDITION_FAILED` (no API token); upstream failure →
  `INTERNAL_SERVER_ERROR`

#### `prediction.prepare`

- **Input:** `PreparePredictionInput` (same shape as REST #4 body)
- **Output:** `PreparePredictionOutput` (same shape as REST #4)
- **Errors:** `MatchNotFoundError → NOT_FOUND`; `MatchNotOpenError → CONFLICT`

#### `leaderboard.get`

- **Input:** `{ pda: string }` (base58 match-account address)
- **Output:** `Leaderboard` (same shape as REST #5)
- **Errors:** `MatchNotFoundError → NOT_FOUND` (unknown PDA); `LeaderboardNotReadyError → NOT_FOUND`

#### `leaderboard.stream`

- **Input:** `{ pda: string }` (base58 match-account address)
- **Output:** async stream of `Leaderboard` values (initial snapshot then updates)
- **Errors:** validation → `BAD_REQUEST`; runtime → `INTERNAL_SERVER_ERROR`

#### `events.stream`

- **Input:** `{ pda: string; fromId?: string }` (`fromId` default `"0-0"`)
- **Output:** async stream of `EventEntry` values (backfill then live tail)
- **Errors:** validation → `BAD_REQUEST`; runtime → `INTERNAL_SERVER_ERROR`

#### `lineup.get`

- **Input:** `{ pda: string }` (base58 match-account address)
- **Output:** `Lineup` (same shape as REST #7)
- **Errors:** `MatchNotFoundError → NOT_FOUND` (unknown PDA); `LineupNotReadyError → NOT_FOUND`

#### `user.register`

- **Input:** `RegisterUserInput` (same shape as REST #10 body)
- **Output:** `UserProfile`
- **Errors:** `InvalidSignatureError → UNAUTHORIZED`;
  `UsernameTakenError → CONFLICT`; `WalletAlreadyRegisteredError → CONFLICT`

#### `user.get`

- **Input:** `{ wallet: string }` (32–44 chars)
- **Output:** `UserProfile`
- **Errors:** `UserNotFoundError → NOT_FOUND`

#### `user.setAvatar`

- **Input:** `{ wallet: string; avatar: AvatarId; message: string; signature: string }`
- **Output:** `UserProfile`
- **Errors:** `InvalidSignatureError → UNAUTHORIZED`; `UserNotFoundError → NOT_FOUND`

#### `user.matches`

- **Input:** `{ wallet: string }` (32–44 chars)
- **Output:** `UserMatchesResponse` (array; possibly empty)
- **Errors:** validation → `BAD_REQUEST`

#### `user.avatars`

- **Input:** none
- **Output:** `AvatarsResponse`
- **Errors:** none expected

### tRPC error mapping

The backend maps domain errors to tRPC codes (`services/api/src/server/trpc.ts`):

| Domain error                                                                          | tRPC code               | HTTP status |
| ------------------------------------------------------------------------------------- | ----------------------- | ----------- |
| `MatchNotFoundError`, `LeaderboardNotReadyError`, `LineupNotReadyError`, `UserNotFoundError` | `NOT_FOUND`        | 404         |
| `InvalidSignatureError`                                                               | `UNAUTHORIZED`          | 401         |
| `UsernameTakenError`, `WalletAlreadyRegisteredError`, `MatchNotOpenError`              | `CONFLICT`              | 409         |
| `TxlineNotConfiguredError`                                                            | `PRECONDITION_FAILED`   | 412         |
| anything else                                                                         | `INTERNAL_SERVER_ERROR` | 500         |

Input validation failures (malformed PDA / wallet) produce tRPC `BAD_REQUEST` (400) from Zod.

> ⚠️ **Older deployments return `500` here.** Before the error-mapping fix, the middleware
> unwrapped Zod's `BAD_REQUEST` to the raw `ZodError` and re-classified it as
> `INTERNAL_SERVER_ERROR`. If you hit a `500` on a clearly malformed tRPC `input`, the API has not
> yet been redeployed — treat it as a `400` (client bug), not a retryable server failure.

**tRPC error envelope shape (illustrative — input is now a match PDA):**

```bash
$ curl 'https://13.213.196.237.sslip.io/trpc/leaderboard.get?input=%7B%22pda%22%3A%22CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq%22%7D'
{"error":{"message":"No match found for match account CJJfxXRnagAc35PCVcnqYeU34VysGx4u93Hd75dGHFyq",
  "code":-32004,
  "data":{"code":"NOT_FOUND","httpStatus":404,"path":"leaderboard.get"}}}
```

> **REST is likely the simpler choice for the current frontend** unless the app already wires up
> a tRPC client. The REST endpoints cover every read and write with plain `fetch`/`EventSource`.

---

## Frontend Error Handling

Use the `apiJson` helper from Quick Start. General rules:

- **`404`** for `match`, `lineup`, and `leaderboard` usually means **data is not ready yet** for
  that fixture (not seeded / not yet computed), not a client bug. Render a "not started / not
  available yet" state and optionally poll or open the SSE stream.
- **`404`** on `GET /api/match/:pda` for an unknown PDA is resolved RPC-free against the Redis
  reverse index — render "not available yet". A **`500`** is only possible *after* resolution,
  when Solana RPC fails while reading on-chain state for a known PDA; treat `5xx` as **retryable**.
- **`400`** means a **frontend validation bug or malformed input** (malformed match PDA / wallet /
  body). Fix client-side validation; do not retry blindly.
- **`401`** means **wallet signature verification failed**. Re-prompt the user to sign the
  message with the correct wallet.
- **`409`** means a **state conflict**: a duplicate username or wallet on registration, or a
  **match not open** for predictions on `POST /api/prediction/prepare`. Surface the specific
  message to the user.
- **`5xx`** should be treated as **retryable / server failure** with backoff.

---

## SSE Reconnect Guidance

- The browser `EventSource` **reconnects automatically** on connection drop. You rarely need to
  do anything in `onerror`.
- For `GET /api/events/:pda`, the browser automatically sends the last received `id:` back as the
  `Last-Event-ID` header on reconnect, so the stream resumes from where it left off. You can also
  drive the cursor explicitly with the `fromId` query param (default `"0-0"` replays from the
  start). `Last-Event-ID`, when present, takes precedence over `fromId`.
- **Keepalive comments** are sent as `: keepalive` (every 15 seconds). These are SSE comment
  lines — `EventSource` ignores them automatically and your `onmessage`/event listeners never
  fire for them. If you parse the raw stream yourself, **ignore any line starting with `:`**.
- The **leaderboard stream emits only `leaderboard` events** — listen with
  `addEventListener("leaderboard", …)`.
- The **match-events stream emits events named after the backend event type** (e.g.
  `substitution`, `goal`). Use `onmessage` to catch all of them, or
  `addEventListener("<type>", …)` for a specific type.

---

## Endpoint Status Matrix

| Endpoint                         | Method | Status | Meaning                                  | Response shape                                                  |
| -------------------------------- | ------ | ------ | ---------------------------------------- | -------------------------------------------------------------- |
| `/healthz`                       | GET    | 200    | API alive + ingestor health probe        | `{ "ok": true, "worker": { alive, heartbeatAgeMs } \| null, "feed": { lastBeatAgeMs } \| null }` |
| `/api/matches`                   | GET    | 200    | Match-discovery list (possibly empty)    | `MatchSummary[]`                                              |
| `/api/matches`                   | GET    | 500    | RPC lookup failed scanning chain state   | `Internal Server Error` (plain text)                          |
| `/api/schedule`                  | GET    | 200    | Fixture schedule (possibly empty)        | `ScheduleFixture[]`                                          |
| `/api/schedule`                  | GET    | 400    | Invalid query param                      | `{ "error": "invalid query" }`                               |
| `/api/schedule`                  | GET    | 503    | TxLINE API token not configured          | `{ "error": "TxLINE is not configured: …" }`                 |
| `/api/schedule`                  | GET    | 500    | Upstream TxLINE call failed              | `Internal Server Error` (plain text)                         |
| `/api/match/:pda`                 | GET    | 200    | Match state returned                     | `MatchState`                                                   |
| `/api/match/:pda`                 | GET    | 400    | Invalid match address                    | `{ "error": "invalid match address" }`                        |
| `/api/match/:pda`                 | GET    | 404    | Unknown PDA / no match state             | `{ "error": "No match found for match account <pda>" }`       |
| `/api/match/:pda`                 | GET    | 500    | RPC lookup failed fetching chain state   | `Internal Server Error` (plain text)                          |
| `/api/prediction/prepare`        | POST   | 200    | Unsigned tx built                        | `PreparePredictionOutput`                                     |
| `/api/prediction/prepare`        | POST   | 400    | Invalid body                             | `{ "error": "invalid body" }`                                |
| `/api/prediction/prepare`        | POST   | 404    | No on-chain match for fixtureId          | `{ "error": "No match found for fixture <id>" }`             |
| `/api/prediction/prepare`        | POST   | 409    | Match not open for predictions           | `{ "error": "Match <id> is not open for predictions (status: <label>)" }` |
| `/api/prediction/prepare`        | POST   | 500    | RPC failed (match / blockhash fetch)     | `Internal Server Error` (plain text)                         |
| `/api/leaderboard/:pda`           | GET    | 200    | Leaderboard returned                     | `Leaderboard`                                                 |
| `/api/leaderboard/:pda`           | GET    | 400    | Invalid match address                    | `{ "error": "invalid match address" }`                        |
| `/api/leaderboard/:pda`           | GET    | 404    | Unknown PDA, or not computed yet         | `{ "error": "No match found for match account <pda>" }` / `"No leaderboard available yet for fixture <id>"` |
| `/api/leaderboard/:pda/stream`    | GET    | 200    | SSE stream opened                        | `text/event-stream` (`event: leaderboard`)                   |
| `/api/leaderboard/:pda/stream`    | GET    | 400    | Invalid match address                    | `{ "error": "invalid match address" }`                        |
| `/api/leaderboard/:pda/stream`    | GET    | 404    | Unknown PDA (before stream opens)        | `{ "error": "No match found for match account <pda>" }`       |
| `/api/lineup/:pda`                | GET    | 200    | Lineup returned                          | `Lineup`                                                      |
| `/api/lineup/:pda`                | GET    | 400    | Invalid match address                    | `{ "error": "invalid match address" }`                        |
| `/api/lineup/:pda`                | GET    | 404    | Unknown PDA, or not ingested yet         | `{ "error": "No match found for match account <pda>" }` / `"No lineup available yet for fixture <id>"` |
| `/api/events/:pda`                | GET    | 200    | SSE stream opened                        | `text/event-stream` (`event: <type>`)                        |
| `/api/events/:pda`                | GET    | 400    | Invalid match address                    | `{ "error": "invalid match address" }`                        |
| `/api/events/:pda`                | GET    | 404    | Unknown PDA (before stream opens)        | `{ "error": "No match found for match account <pda>" }`       |
| `/api/avatars`                   | GET    | 200    | Avatar list returned                     | `AvatarDescriptor[]`                                          |
| `/api/user`                      | POST   | 200    | Profile registered                       | `UserProfile`                                                 |
| `/api/user`                      | POST   | 400    | Invalid body                             | `{ "error": "invalid body" }`                                |
| `/api/user`                      | POST   | 401    | Signature verification failed            | `{ "error": "Wallet signature verification failed" }`        |
| `/api/user`                      | POST   | 409    | Username taken                           | `{ "error": "Username <username> is already taken" }`        |
| `/api/user`                      | POST   | 409    | Wallet already registered                | `{ "error": "Wallet <wallet> already has a profile" }`       |
| `/api/user/:wallet`              | GET    | 200    | Profile returned                         | `UserProfile`                                                 |
| `/api/user/:wallet`              | GET    | 400    | Invalid wallet                           | `{ "error": "invalid wallet" }`                              |
| `/api/user/:wallet`              | GET    | 404    | No profile for wallet                    | `{ "error": "No profile found for wallet <wallet>" }`        |
| `/api/user/:wallet/avatar`       | PATCH  | 200    | Avatar updated                           | `UserProfile`                                                 |
| `/api/user/:wallet/avatar`       | PATCH  | 400    | Invalid body                             | `{ "error": "invalid body" }`                                |
| `/api/user/:wallet/avatar`       | PATCH  | 401    | Signature verification failed            | `{ "error": "Wallet signature verification failed" }`        |
| `/api/user/:wallet/avatar`       | PATCH  | 404    | No profile for wallet                    | `{ "error": "No profile found for wallet <wallet>" }`        |
| `/api/user/:wallet/matches`      | GET    | 200    | Participation array (possibly empty)     | `UserMatchesResponse`                                         |
| `/api/user/:wallet/matches`      | GET    | 400    | Invalid wallet                           | `{ "error": "invalid wallet" }`                              |
| `/trpc/*`                        | ALL    | 2xx/4xx/5xx | tRPC procedures                     | tRPC envelope (`{ "result": … }` / `{ "error": … }`)         |

---

## Frontend Integration Checklist

- [ ] **Configure base URL** — `export const SOCCIT_API_BASE_URL = "https://13.213.196.237.sslip.io";`
- [ ] **Implement the JSON helper** — use `apiJson<T>()` so every error surfaces `body.error`.
- [ ] **Implement an `EventSource` wrapper** — for the leaderboard and events streams; ignore
      `:` comment/keepalive lines; clean up (`source.close()`) on unmount.
- [ ] **Discover matches, don't hardcode** — call `GET /api/matches` (#2) to list matches; route on
      each row's `pda` for `match`, `leaderboard`, `lineup`, and `events`, and use its `fixtureId`
      for `POST /api/prediction/prepare`. (The PDA is also on the prepare response as `matchAccount`.)
      See [Match addressing](#match-addressing).
- [ ] **Place predictions client-side** — `POST /api/prediction/prepare` (#4) returns an *unsigned*
      base64 tx; deserialize it, have the wallet sign, and submit with `sendRawTransaction`. The API
      never signs and there is no `/submit`. Ensure the wallet holds `entryFee` of the returned
      `usdcMint` (+ SOL for fees). Handle `409` ("not open") and expired-blockhash by re-preparing.
- [ ] **Handle 404 "not ready" states** — for `match`, `lineup`, and `leaderboard`, render a
      "not available yet" UI rather than an error. A `404` here can mean either an unknown PDA or
      data not computed yet (`match` may still `500` if Solana RPC is down — treat `5xx` as retry).
- [ ] **Validate client-side before calling** — match PDA / wallet are both base58, 32–44 chars;
      username 3–20 chars matching `/^[a-zA-Z0-9_]+$/`; avatar one of `avatar-1`…`avatar-8`.
- [ ] **Sign register/avatar messages** — sign the expected message
      (`Soccit onboarding: <wallet>` for registration) with the wallet and send `message` +
      base58 `signature` in the body. Handle `401` by re-prompting the signature.
- [ ] **Render empty states** — `user/:wallet/matches` returns `[]` (200) and a leaderboard may
      have an empty `ranking`. Show friendly empty-state UI.
- [ ] **Retry transient server failures** — back off and retry on `5xx`.

---

_Source of truth: `services/api/src/index.ts`, `services/api/src/server/root.ts`,
`services/api/src/server/trpc.ts`, `services/api/src/modules/match/pda.ts`,
`services/api/src/modules/match/match.service.ts`, `services/api/src/onchain/program.ts`,
`services/api/src/modules/prediction/prediction.service.ts`, the module `*.schema.ts` /
`*.errors.ts` files, `Caddyfile`, and `docker-compose.yml`. Live
verification of the REST/SSE surface was performed against `https://13.213.196.237.sslip.io` on
2026-06-29; examples for the PDA-keyed fixture endpoints (`match`, `leaderboard`, `lineup`,
`events`) were updated for the fixtureId→PDA migration on 2026-06-30 and are illustrative pending
re-verification. The `GET /api/matches` discovery endpoint (#2) was added on 2026-07-02 and its
success shape verified against devnet + a local API instance; deploy the `api` service to expose it
on the staging URL. The `POST /api/prediction/prepare` endpoint (#4) was documented on 2026-07-02
(verified live: `400` validation + `200` unsigned tx against OPEN match `18172379`); the same change
mapped `MatchNotOpenError` to tRPC `CONFLICT` so `prediction.prepare` matches the REST `409` — redeploy
`api` for that parity. The `GET /api/schedule` endpoint (#14) was added on 2026-07-04
(`services/api/src/modules/schedule/*`, `services/api/src/txline.ts`): a live passthrough to the
TxLINE fixtures snapshot, mapping `TxlineNotConfiguredError` to REST `503` / tRPC `PRECONDITION_FAILED`.
It requires `TXLINE_API_TOKEN` on the `api` service (returns `503` until set) — verified via unit +
route integration tests, pending live verification on the staging URL. On 2026-07-04 `GET /healthz`
(#1) was extended from `{ ok: true }` to also carry best-effort `worker` (ingestor liveness via a
Redis heartbeat) and `feed` (data-freshness) probes, after the TxLINE worker was found silently
crash-looping on a poison beat and freezing ingestion; the worker now isolates per-beat failures and
writes `txline:worker:heartbeat` / `txline:scores:lastBeatAt`. The added fields are backward
compatible (`ok` unchanged) — verified via the `/healthz` route integration test and live on the
staging URL on 2026-07-04 (`worker.alive: true` after the crash-loop fix deployed)._
