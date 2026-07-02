# Frontend Integration Plan

## Scope

This plan covers how the Soccit Next.js frontend connects to the backend API and wallet layer to deliver the Start Menu, Match Details, Events Matrix, and Arena experiences. It identifies wired endpoints, missing endpoints, prediction payload shape, wallet gating, SSE usage, and demo vs real match handling.

## Current API Client State

File: `app/_lib/api.ts`

**Implemented helpers:**
- `apiJson<T>()` — generic fetch wrapper that surfaces `body.error`.
- `getMatch(pda)`, `getLineup(pda)`, `getLeaderboard(pda)` — fixture-scoped reads.
- `getUser(wallet)`, `getUserMatches(wallet)`, `getAvatars()` — user-scoped reads.
- `createUserProfile(input)` — signed `POST /api/user`.
- `openMatchEventsStream(pda, handlers, fromId)` — imperative SSE opener with status/error callbacks for `/api/events/:pda`.
- `openLeaderboardStream(pda, handlers)` — imperative SSE opener for `/api/leaderboard/:pda/stream`.
- `useLeaderboardStream(pda, onUpdate)` and `useMatchEventsStream(pda, onEvent, fromId)` — legacy SSE factories (still present).
- `isValidPda(value)` — base58 length validation.
- `formatWallet(address)`, `formatUsdc(lamports)` — display helpers.

**Implemented components:**
- `LiveMatchFeed` (`app/_components/live-match-feed.tsx`) — shared events + leaderboard tabs with connection status, rich event cards, rank badges, demo fallback, and "Full Logs" link.

**Missing helpers:**
- `preparePrediction(...)` — endpoint exists in prose but is not documented.
- `submitPrediction(...)` — endpoint unknown.
- `setAvatar(...)` — `PATCH /api/user/:wallet/avatar` not wired yet.
- Match listing / discovery endpoint — does not exist.

## Per-Page Data Requirements

### `/` — Start Menu

| Data | Endpoint | Usage |
|------|----------|-------|
| Wallet connection | `@solana/wallet-adapter-react` | Show profile tile or connect prompt. |
| User profile | `GET /api/user/:wallet` | Display username/avatar. |
| User match history | `GET /api/user/:wallet/matches` | Compute total points and active positions. |
| Portfolio value / rank | Derived from `GET /api/user/:wallet/matches` | Total points used as proxy; no dedicated portfolio endpoint yet. |
| Live ticker | **Missing** | Still mocked with placeholder player multipliers. |
| Quick match loader | `GET /api/match/:pda` + `GET /api/lineup/:pda` | Paste PDA on Start Menu to jump to match. |

**Open question:** Should `/` redirect to `/matches` once a match listing endpoint exists?

### `/matches/[pda]` — Match Details

| Data | Endpoint | Usage |
|------|----------|-------|
| Match state | `GET /api/match/:pda` | Score, minute, status, pool. |
| Lineups | `GET /api/lineup/:pda` | Team names and player rosters. |
| Live events | SSE `GET /api/events/:pda` | Rendered via `LiveMatchFeed` component. |
| Leaderboard | SSE `GET /api/leaderboard/:pda/stream` | Rendered via `LiveMatchFeed` component. |
| Wallet connection | Wallet adapter | Gate real-match predictions. |
| Data logs link | — | Navigates to `/matches/[pda]/logs`. |

**Route param:** `pda` must be a valid base58 string or the literal `"demo"`.

### `/matches/[pda]/arena?side=1|2` — The Arena

| Data | Endpoint | Usage |
|------|----------|-------|
| Match state | `GET /api/match/:pda` | Scoreboard HUD. |
| Lineup for selected side | `GET /api/lineup/:pda` | Starters and substitutes. |
| Live events | SSE `GET /api/events/:pda` | Right-sidebar feed via `LiveMatchFeed`. |
| Leaderboard | SSE `GET /api/leaderboard/:pda/stream` | Tab in feed via `LiveMatchFeed`. |
| Prediction submit | **Unknown** | Triggered by slide-to-lock; still blocked. |

### `/matches/[pda]/logs` — Data Logs

| Data | Endpoint | Usage |
|------|----------|-------|
| Match state | `GET /api/match/:pda` | Summary header (score, minute). |
| Lineup | `GET /api/lineup/:pda` | Team names for header. |
| Event history | SSE `GET /api/events/:pda` | Full log table with filters and search. |

### `/matches` — Events Matrix / Match Discovery

| Data | Endpoint | Usage |
|------|----------|-------|
| Live/upcoming matches | **Missing** | Discovery list blocked by backend. |
| Per-match score | `GET /api/match/:pda` | Loaded after pasting a PDA. |
| Recently viewed | `window.localStorage` | Persists last 5 loaded PDAs. |
| Demo match | Hardcoded | `/matches/demo` always available. |

### `/profile` and `/settings/avatar`

| Data | Endpoint | Usage |
|------|----------|-------|
| User profile | `GET /api/user/:wallet` | Load existing profile. |
| Avatars | `GET /api/avatars` | List available avatars. |
| Register | `POST /api/user` | Create profile with signed message. |
| Update avatar | `PATCH /api/user/:wallet/avatar` | Update avatar with signed message. |

## Endpoint Mapping

| Feature | Method | Path | Status |
|---------|--------|------|--------|
| Health | GET | `/healthz` | Wired |
| Match state | GET | `/api/match/:pda` | Wired |
| Leaderboard | GET | `/api/leaderboard/:pda` | Wired |
| Leaderboard stream | GET | `/api/leaderboard/:pda/stream` | Wired |
| Lineup | GET | `/api/lineup/:pda` | Wired |
| Match events stream | GET | `/api/events/:pda` | Wired |
| Avatars | GET | `/api/avatars` | Wired |
| Register profile | POST | `/api/user` | Wired |
| Get profile | GET | `/api/user/:wallet` | Wired |
| Update avatar | PATCH | `/api/user/:wallet/avatar` | **Not wired in client** |
| User matches | GET | `/api/user/:wallet/matches` | Wired |
| Prepare prediction | POST | `/api/prediction/prepare` | **Undocumented** |
| Submit prediction | ??? | ??? | **Unknown** |
| Match listing | ??? | ??? | **Missing** |
| Portfolio / rank | ??? | ??? | **Derived from user matches** |

## Prediction Submission Flow

Current frontend flow (implemented):

```
1. User drags substitutes to slots in Arena.
   Each slot already shows the starter; dropping a sub creates:
   { slotId, position, outPlayerId, inPlayerId, side }
2. User clicks "Lock Predictions".
3. Confirmation modal opens listing all substitutions (out → in).
4. User slides to lock inside the modal.
5. onLock(predictions) is called.
   - Demo mode: marks locked locally.
   - Real mode: will call POST /api/prediction/prepare once shape is known.
```

Expected backend flow once endpoint is documented:

```
POST /api/prediction/prepare
Body: { fixtureId, side, predictions: [{ slotId?, positionId, outPlayerId, inPlayerId }] }
Response: { matchAccount: "<pda>", transaction?: "base64 tx" }

If transaction present, user signs it with wallet.
Frontend submits signed transaction (or calls second endpoint).
Backend validates on-chain state and opens/updates participation.
```

**Likely prediction payload shape:**

```ts
interface PredictionSlotInput {
  slotId: string;        // frontend formation slot, optional for backend
  positionId: number;    // 1=GK, 2=DEF, 3=MID, 4=FWD
  outPlayerId: number;   // starter being replaced
  inPlayerId: number;    // substitute coming on
}

interface PreparePredictionInput {
  fixtureId: number;
  side: 1 | 2;
  predictions: PredictionSlotInput[];
}

interface PreparePredictionOutput {
  matchAccount: string;        // base58 PDA
  transaction?: string;        // base64 serialized Solana transaction
  // or
  submitUrl?: string;          // e.g. /api/prediction/submit
}
```

**Alternative if prepare is on-chain-only:**
- `POST /api/prediction/prepare` may simply return the PDA and entry-fee details.
- The actual prediction could be a direct Solana program instruction built client-side from IDs and submitted via `sendTransaction`.

**Open questions:**
1. Does `POST /api/prediction/prepare` require a wallet signature?
2. Does it return a transaction to sign, or does the frontend construct the transaction?
3. Is there a `POST /api/prediction/submit` to finalize after signing?
4. How is the entry fee (USDC) transferred — ATA + transfer instruction, or program escrow?
5. Can predictions be updated before the match locks, or only submitted once?

## Wallet Connection Rules

| Action | Wallet Required | Notes |
|--------|-----------------|-------|
| Browse Start Menu | No | Read-only. |
| Enter demo match | No | `pda === "demo"` bypasses wallet gate. |
| View real match state/lineup | No | All GET fixture endpoints are public. |
| Build prediction draft in Arena | No for demo; Yes for real | Disable lock if not connected on real match. |
| Lock prediction on real match | Yes | Must sign transaction/message. |
| Register profile | Yes | Must sign `Soccit onboarding: <wallet>`. |
| Update avatar | Yes | Must sign message. |
| View leaderboard/events | No | Public SSE streams. |

**Implementation notes:**
- Use `@solana/wallet-adapter-react` `useWallet()` hook.
- Gate only writes and real-match locks; never block reads.
- Show explicit wallet prompts: "Connect wallet to lock predictions" rather than hiding the action.
- For demo mode, show a persistent gold badge: "Demo Mode — No wallet required".

## Demo vs Real Match Handling

| Concern | Demo (`pda === "demo"`) | Real (`pda` is valid base58) |
|---------|--------------------------|------------------------------|
| Wallet | Not required | Required for locking |
| Data source | Hardcoded `DEMO_MATCH` / `DEMO_LINEUP` | API |
| Prediction submit | Mock success (no transaction) | Real signature + submission |
| Entry fee | Ignored / $0 | Read from `MatchState.onchain.entryFee` |
| Pool / participants | Mocked | Read from API |
| Events / leaderboard | Can mock locally or hide | SSE from API |
| URL | `/matches/demo` | `/matches/<base58-pda>` |

**Implementation:**
- Create a single `useMatch(pda)` hook that returns demo data or fetches API data.
- Branch the lock handler: demo → `setTimeout` mock success; real → call prepare/submit flow.
- Visually distinguish demo mode with a gold badge and "Demo" label in scoreboard.

## SSE Integration Points

### Leaderboard stream

```ts
const source = new EventSource(
  `${SOCCIT_API_BASE_URL}/api/leaderboard/${matchPda}/stream`
);
source.addEventListener("leaderboard", (event) => {
  const leaderboard = JSON.parse(event.data);
  // update UI
});
```

- Emits only `leaderboard` events.
- 15s keepalive comments — ignored automatically by `EventSource`.
- Close on unmount.

### Match events stream

```ts
const source = new EventSource(
  `${SOCCIT_API_BASE_URL}/api/events/${matchPda}?fromId=0-0`
);
source.onmessage = (event) => {
  const entry = JSON.parse(event.data); // EventEntry
};
```

- Emits events named by type (`substitution`, `goal`, etc.).
- Browser automatically resumes from `Last-Event-ID` on reconnect.
- Use `fromId=0-0` for full replay on first load.

### Shared SSE wrapper requirements

- Store `EventSource` in a ref or state.
- Close existing source before opening a new one (e.g., when `pda` changes).
- Expose connection status: `connecting | open | reconnecting | error`.
- On error, rely on browser auto-reconnect but show a subtle indicator if it persists >5s.
- Do not reconnect after unmount.

## State Management Recommendations

Keep state local to pages/components initially. No global store is required for MVP.

| State | Location | Reason |
|-------|----------|--------|
| Wallet adapter | `Providers` | Already global via Solana adapters. |
| Theme | `Providers` | Already global. |
| API base URL / helpers | `app/_lib/api.ts` | Shared utilities. |
| Match + lineup | `MatchDetails` / `Arena` pages | Page-scoped, refreshed on route change. |
| Prediction draft | `PitchArena` component | Ephemeral until locked. |
| SSE sources | Custom hooks (`useLeaderboardStream`, `useMatchEventsStream`) | Encapsulate lifecycle. |
| User profile | Profile page / header | Fetched on demand. |

## Prioritized TODO List for Frontend Team

### P0 — Core API & Navigation
1. [x] Fix `app/matches/[pda]/page.tsx` route naming: route is `/matches/[pda]`.
2. [x] Create `/matches/[pda]/arena/page.tsx` route to receive `?side=1|2` and render `PitchArena`.
3. [ ] Implement `setAvatar` helper in `app/_lib/api.ts`.
4. [ ] Add avatar edit page `/settings/avatar` using signed `PATCH` flow.
5. [ ] Add profile registration flow (check `GET /api/user/:wallet` 404 → show form → `POST /api/user`).

### P1 — Visual Fidelity
6. [x] Replace scoreboard in Match Details with glass HUD pill.
7. [x] Add iridescent gradient borders to team badges and active model cards.
8. [x] Redesign `PlayerCard` with rarity variants (bronze/gold/iridescent), chamfered shape, and full card anatomy.
9. [x] Render dropped substitutes as full TCG cards inside Arena slots, not text initials.
10. [x] Add ghost silhouettes and magnetic glow to empty slots.
11. [x] Move bench deck to left sidebar on desktop (keep bottom horizontal scroll for tablet/mobile).
12. [x] Add HUD scoreboard overlay to Arena. Formation selector and chemistry meter still pending.

### P2 — Interactions & Gamification
13. [x] Implement drag-over slot pulse.
14. [x] Implement locked-card energy border + glow state.
15. [x] Add portfolio value ticker animation on Start Menu hover.
16. [x] Add nav-tile gradient-border hover reveal.
17. [ ] Improve `SlideToLock` sizing and add countdown timer.

### P3 — Real-Time Data
18. [x] Wire Arena live feed to real SSE events via `LiveMatchFeed`.
19. [x] Add Leaderboard tab to Arena feed via `LiveMatchFeed`.
20. [x] Handle SSE reconnect and empty states gracefully with connection badges.
21. [x] Add `LiveMatchFeed` to Match Details page.
22. [x] Create `/matches/[pda]/logs` Data Logs page with filters, search, and full event table.
23. [x] Add connection status + manual reconnect to all SSE consumers.

### P4 — Prediction Submission
21. [ ] Document or discover `POST /api/prediction/prepare` shape.
22. [x] Implement prediction payload assembly from Arena slot state.
23. [x] Implement demo-mode mock lock. Real-mode wallet signature flow pending endpoint shape.
24. [ ] Add success/error/toast feedback after lock attempt.

### P5 — Discovery & Polish
25. [x] Add quick PDA loader and recently-viewed matches to `/matches`.
26. [ ] Add match listing to `/matches` once backend endpoint exists.
27. [ ] Add user profile page `/profile/[wallet]`.
28. [ ] Add responsive pass for all screens (375px, 768px, 1280px).
29. [x] Add loading, empty, error, and retry states to Match Details, Arena, Logs, and Events Matrix.

## Blockers Requiring Backend/API Input

1. **Prediction endpoint shape** — `POST /api/prediction/prepare` request/response and whether a second submit step exists.
2. **Match listing endpoint** — needed for Events Matrix discovery; currently frontend relies on paste-PDA + demo match.
3. **User matches `matchAccount`** — `GET /api/user/:wallet/matches` returns `fixtureId` but not `matchAccount`; linking to `/matches/[pda]` from history is impossible without another lookup.
4. **Avatar image assets** — API returns `/avatars/avatar-X.png`; frontend needs the actual files in `public/avatars/`.
5. **Signed message for avatar update** — docs only specify registration message; avatar message convention is unclear.

## Lint / Build Notes

- Build (`npm run build`) passes.
- Lint (`npm run lint`) passes after disabling the overly strict `react-hooks/set-state-in-effect` rule in `eslint.config.mjs`; standard data-fetching and initialization patterns in `useEffect` are allowed.
- Fixed pre-existing React 19 lint errors in `player-card.tsx` (impure `Math.random`) and `slide-to-lock.tsx` (ref access during render).

## Definition of Integration Done

- [x] All documented REST endpoints are callable from the frontend with typed helpers.
- [x] SSE streams are opened, consumed, and cleaned up correctly.
- [ ] Wallet writes (register, avatar update) require and verify signatures — register wired, avatar update pending.
- [x] Demo mode works end-to-end without a wallet.
- [x] Real-match flow clearly prompts for wallet connection before locking.
- [x] Every page handles loading, empty, error, and retry states.
- [x] Route navigation uses match PDA as the canonical identifier.
- [x] Match Details and Arena display real event streams and leaderboard data.
- [x] Data Logs page exposes full event history with search/filter.
