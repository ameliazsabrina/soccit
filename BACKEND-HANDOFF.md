# Backend Handoff — Enter-Once Model + Prediction Flow

**Date:** July 15, 2026
**Author:** Frontend
**For:** Backend dev
**Status:** Frontend scaffold complete — waiting on backend endpoints

---

## Model change summary

**Old model (pay-per-prediction):** Every `place_prediction` tx transfers `entryFee` USDC to the match vault. Users pay N × entryFee for N predictions.

**New model (enter-once):** User pays `entryFee` once via a separate `enter_match` tx. After that, all predictions are free (no USDC transfer, just prediction account creation).

---

## What the frontend has built

### 1. `POST /api/match/enter/prepare` — scaffolded, needs backend

**Frontend file:** `app/_lib/entry.ts` → `submitEnter()`
**Types:** `app/_lib/api.ts` → `EnterMatchInput`, `EnterMatchOutput`, `prepareEnter()`
**UI:** `app/_components/enter-match-modal.tsx` — modal with 4 states (confirm/submitting/success/error)

The frontend `submitEnter()` flow is:
1. `POST /api/match/enter/prepare` → get unsigned base64 tx
2. `VersionedTransaction.deserialize(txBytes)`
3. `wallet.adapter.signTransaction(tx)` → wallet approval popup
4. `connection.sendRawTransaction(signedTx.serialize())`
5. `connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight })`

**Request:**
```ts
type EnterMatchInput = {
  wallet: string;       // base58 — becomes tx fee payer + signer
  fixtureId: number;    // from GET /api/matches row.fixtureId
}
```

**Response (200):**
```ts
type EnterMatchOutput = {
  transaction: string;           // base64 unsigned versioned tx
  fixtureId: number;
  matchAccount: string;          // match PDA (base58)
  userUsdcAta: string;           // user's USDC ATA (created idempotently by tx)
  entryFee: string;              // USDC base units (6 dp)
  blockhash: string;
  lastValidBlockHeight: number;
}
```

**On-chain tx should contain:**
1. Idempotent create-USDC-ATA instruction (same as current `preparePrediction`)
2. `enter_match` program instruction that:
   - Transfers `entryFee` USDC from `userUsdcAta` to match vault token account
   - Creates a `Participant`/`Entry` account (PDA: `[wallet, matchPDA]`)
   - Increments `participantCount` on the match account

**Error statuses:**
| Status | Body | When |
|--------|------|------|
| 400 | `{ "error": "invalid body" }` | Bad wallet/fixtureId |
| 404 | `{ "error": "No match found for fixture <id>" }` | No on-chain Match account |
| 409 | `{ "error": "Match <id> is not open for entry (status: <label>)" }` | Match not OPEN |
| 409 | `{ "error": "Wallet already entered this match" }` | Idempotent — return success or 409 |

---

### 2. `GET /api/matches/{pda}/entry/{wallet}` — scaffolded, needs backend

**Frontend file:** `app/_lib/api.ts` → `getEntryStatus()`
**Types:** `EntryStatus`

The frontend calls this on page load to determine whether to show "Enter Match" or "Arena" on the match page, and to gate the arena page.

**Response (200):**
```ts
type EntryStatus = {
  fixtureId: number;
  wallet: string;
  entered: boolean;       // has this wallet paid the entry fee?
  enteredAt?: number;     // epoch ms when entry tx confirmed
}
```

**Where the frontend uses it:**
- `app/matches/[pda]/page.tsx` — on load, sets `hasEntered` state (decides Enter button text: "Enter Match" vs "Arena")
- `app/matches/[pda]/arena/page.tsx` — on load, gates access (shows "Entry Required" screen if not entered)

**Current stopgap:** `?entered=1` URL param. This is fragile (lost on refresh). Must be replaced with this endpoint.

---

### 3. `POST /api/prediction/prepare` — EXISTS, needs modification

**Frontend file:** `app/_lib/prediction.ts` → `submitPrediction()`
**Arena page:** `app/matches/[pda]/arena/page.tsx` → `handleSubmit()`

**Current behavior:** tx contains two instructions:
1. Idempotent create-USDC-ATA
2. `place_prediction` instruction that **transfers `entryFee`** USDC to match vault

**Required change:** The `place_prediction` instruction should:
- **NOT transfer the entry fee** — entry is paid once via `enter_match`
- Verify the wallet has a `Participant`/`Entry` account (reject if not entered)
- Only create the prediction account

**New error status:**
| Status | Body | When |
|--------|------|------|
| 403 | `{ "error": "Wallet has not entered this match" }` | Must call `enter_match` first |

---

### 4. SSE Event Stream — `GET /api/events/{pda}`

**Frontend issue found:** The frontend listened for named SSE event types `["goal", "status", "substitution", "red_card"]` but was missing `"yellow_card"`. **Fixed on frontend** — `yellow_card` is now in `MATCH_EVENT_TYPES`.

**Backend question:** Does the SSE stream emit events as named events (e.g. `event: goal\ndata: {...}`) or as unnamed events (`data: {...}`)? The frontend only listens for named events via `source.addEventListener(type, handle)`. If the backend sends unnamed events, they'd be silently dropped. Please confirm the SSE format matches the `MATCH_EVENT_TYPES` list.

---

## Full flow audit — Enter → Predict → Settle → Share PnL

### Phase 1: Enter Match
```
/matches/{pda} → user clicks "Enter Match"
  → EnterMatchModal opens (entry fee, prize pool, teams shown)
  → user clicks "Enter & Pay"
  → submitEnter() calls POST /api/match/enter/prepare
  → wallet.signTransaction(tx) — WALLET APPROVAL POPUP HERE
  → connection.sendRawTransaction → confirm
  → setHasEntered(true) → router.push(/matches/{pda}/arena?model=score&entered=1)
```
**Frontend status:** Fully scaffolded. `submitEnter()` is wired and will call the real endpoint when it exists. Currently will throw a network error (404) since the endpoint doesn't exist yet — the modal shows the error state.
**Blocker:** Needs `POST /api/match/enter/prepare` + `GET /api/matches/{pda}/entry/{wallet}`.

### Phase 2: Arena — Place Predictions
```
/matches/{pda}/arena → gated by hasEntered
  → Score model: user picks score, SlideToLock
  → handleSubmit() → submitPrediction() → POST /api/prediction/prepare
  → wallet.signTransaction(tx) — WALLET APPROVAL POPUP HERE (CURRENTLY ALSO PAYS FEE)
  → connection.sendRawTransaction → confirm
  → Toast: "Score locked" + Explorer link
```
**Frontend status:** Working for current pay-per-prediction model.
**Blocker:** Backend must remove `entryFee` transfer from `place_prediction` tx. Add 403 check for non-entered wallets. Until this changes, users pay the fee on every prediction.
**Issue:** `handleSubmit` doesn't pre-check entry status — will add once `GET /api/matches/{pda}/entry/{wallet}` exists.

### Phase 3: Settlement
```
Match ends → backend settles on-chain (status → SETTLED, winners posted)
  → /matches/{pda}/settlement loads: match state, lineup, leaderboard
  → PnLResultCard computes rank from leaderboard.ranking.findIndex(r => r.owner === wallet)
  → Rank 1/2/3 → winner card (gold/silver/bronze) with prize + PnL %
  → Rank 4+ → "Didn't Place" card (rose) with -100% PnL
  → Not in ranking → Prize Breakdown fallback card
  → User clicks "Share PnL" → PnLShareModal opens
```
**Frontend status:** Fully working. No blockers.
**Settlement is server-rolled** — no client claim tx. Backend posts winners on-chain and distributes payouts.

### Phase 4: Share PnL
```
PnLShareModal → wide 16:9 banner card (screenshotable)
  → Download: saves PNG to device
  → Copy: copies PNG to clipboard
  → Share to X:
    → Mobile: navigator.share({ files: [image] }) → native share sheet with image attached
    → Desktop: opens twitter.com/intent/tweet + auto-downloads PNG for manual attach
```
**Frontend status:** Fully working.

---

## Issues found in the audit

### 1. `place_prediction` still transfers entry fee (HIGH)
**Where:** Backend `/api/prediction/prepare` builds the tx; `app/_lib/prediction.ts:52` calls it.
**Problem:** Every prediction tx pays the entry fee. Wallet approval fires on every prediction because the tx moves USDC.
**Fix:** Backend removes entry fee transfer from `place_prediction`, adds `require! entered` check.

### 2. `hasEntered` not persisted across refresh (HIGH)
**Where:** `app/matches/[pda]/page.tsx` uses `useState(false)`; arena uses `?entered=1` URL param.
**Fix:** Add `GET /api/matches/{pda}/entry/{wallet}`. Frontend will call it on page load and replace the URL param.

### 3. Arena `handleSubmit` doesn't check entry status (MEDIUM)
**Where:** `app/matches/[pda]/arena/page.tsx:236-340`.
**Problem:** Non-entered users get opaque on-chain errors instead of a "Enter first" message.
**Fix:** Add entry pre-check once the status endpoint exists. Frontend will add this.

### 4. `yellow_card` missing from SSE event types (FIXED)
**Where:** `app/_lib/api.ts` → `MATCH_EVENT_TYPES`.
**Fix:** Added `"yellow_card"` to the list. Frontend now listens for it.

### 5. Demo events not shown in arena sidebar (FIXED)
**Where:** `app/_components/pitch-arena.tsx` — LiveMatchFeed wasn't receiving `demoEvents` prop.
**Fix:** Now passes `DEMO_EVENTS` and `DEMO_LEADERBOARD` when `matchPda === "demo"`.

---

## Summary — what the backend needs to ship

| # | Endpoint | Status | Priority |
|---|----------|--------|----------|
| 1 | `POST /api/match/enter/prepare` | Frontend scaffolded, needs backend | HIGH |
| 2 | `GET /api/matches/{pda}/entry/{wallet}` | Frontend scaffolded, needs backend | HIGH |
| 3 | `POST /api/prediction/prepare` (modify) | Exists, needs fee removal + entry check | HIGH |
| 4 | Settlement (post winners + distribute) | Already works | — |
| 5 | SSE named events format confirmation | Needs backend confirmation | MEDIUM |

**On-chain program changes needed:**
1. New `enter_match` instruction — pays fee, creates participant account (PDA: `[wallet, matchPDA]`)
2. Modified `place_prediction` instruction — no fee transfer, requires participant account exists
3. Participant/Entry account type

**Frontend files ready for backend wiring:**
- `app/_lib/api.ts` — `EnterMatchInput`, `EnterMatchOutput`, `EntryStatus`, `prepareEnter()`, `getEntryStatus()`
- `app/_lib/entry.ts` — `submitEnter()` (full sign + send + confirm flow)
- `app/_components/enter-match-modal.tsx` — UI modal, calls `submitEnter()` on "Enter & Pay" click
- `app/matches/[pda]/page.tsx` — `hasEntered` state, EnterMatchModal wired
- `app/matches/[pda]/arena/page.tsx` — entry gate via `?entered=1` (to be replaced with `getEntryStatus()`)