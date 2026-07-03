# Soccit Frontend Build Brief

Generated from [`frontend-integration.md`](frontend-integration.md) on 2026-07-01.

## One-line Direction

Build Soccit as a live match companion and prediction room, not as a landing page. The first screen should help a fan enter or resume a match, connect a wallet, see live match state, track substitutions/events, and follow a real-time leaderboard.

## Product Shape

Soccit should feel like a focused match-day app:

- Fast, data-dense, and readable during a live football match.
- Built around match-account PDA routes, not numeric fixture IDs.
- Public for reading match state, lineup, events, leaderboard, avatars, and profiles.
- Wallet-gated only for profile writes and future prediction actions.
- Real-time where it matters, using SSE for leaderboard and match events.
- Clear about data that is "not ready yet" instead of treating every 404 as failure.

## Recommended Frontend Stack

Use the current repo stack:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- REST fetch helpers for JSON endpoints
- Native `EventSource` wrappers for SSE streams

Prefer REST over tRPC for this frontend unless the app later adopts a full tRPC client. The API document explicitly recommends REST for simpler `fetch` and `EventSource` integration.

Before implementation work, follow the repo instruction in `AGENTS.md`: install dependencies if needed and read the relevant Next.js guide under `node_modules/next/dist/docs/`, because this project uses a newer Next.js version with changed conventions.

## Core User Flows

### 1. Enter or Resume a Match

The API is PDA-first. The frontend should route match pages as:

```text
/matches/[pda]
```

Match discovery is done through **`GET /api/matches`**. The `/matches` page should:

- Call `GET /api/matches` on load and display the returned list.
- Route each row to `/matches/[pda]` using the row's `pda`.
- Use `row.fixtureId` as the input for `POST /api/prediction/prepare`.
- Keep a fallback "Paste match PDA" tile for direct entry and local testing.
- Surface retryable errors cleanly and show an empty state when no matches exist on-chain.

### 2. Live Match Room

The match page should be the main product surface. It should combine:

- Match state from `GET /api/match/:pda`
- Lineup from `GET /api/lineup/:pda`
- Leaderboard snapshot from `GET /api/leaderboard/:pda`
- Live leaderboard updates from `GET /api/leaderboard/:pda/stream`
- Live match events from `GET /api/events/:pda`

The top of the page should show:

- Team IDs or names when available
- Score
- Match minute
- On-chain status label: `OPEN`, `RESOLVED`, `SETTLED`, or `UNKNOWN`
- Entry fee, pool total, participant count, and winners when present
- A subtle "live" or "updated" indicator based on `updatedAt`

Below that, use compact tabs or sections:

- Leaderboard
- Lineup
- Event timeline
- My prediction / participation

### 3. Wallet Profile Onboarding

The frontend should include wallet-aware onboarding:

- Connect wallet.
- Fetch `GET /api/user/:wallet`.
- If 404, show profile creation.
- Fetch avatars from `GET /api/avatars`.
- Let the user choose username and avatar.
- Sign the exact message `Soccit onboarding: <wallet>`.
- Submit `POST /api/user`.

Username validation should happen before submission:

```text
3-20 chars, only letters, numbers, and underscore
```

Profile writes must never pretend to be session-based. Every write needs a fresh `message` and base58 `signature`.

### 4. Avatar Editing

For existing users:

- Fetch avatars from `GET /api/avatars`.
- Show current avatar and username.
- Let the user choose a new avatar.
- Sign a wallet message.
- Submit `PATCH /api/user/:wallet/avatar`.

The API returns avatar `src` values such as `/avatars/avatar-1.png`, but the backend does not serve the image binaries. The frontend must provide those files under `public/avatars/`.

### 5. User Match History

Use:

```text
GET /api/user/:wallet/matches
```

This returns `200` with `[]` for no matches, so render a friendly empty state.

Important limitation: the response includes `fixtureId`, but not `matchAccount`. Since the app routes by PDA, this screen needs either:

- a backend response update that includes `matchAccount`, or
- a separate lookup endpoint, or
- a local/demo mapping for MVP testing.

## Suggested Route Map

```text
/                         Match entry / dashboard
/matches/[pda]            Live match room
/profile                  Connected wallet profile
/profile/[wallet]         Public profile view
/settings/avatar          Avatar picker/edit flow
```

Keep the initial app small. The match room should get the most craft because it is the core experience.

## Key Components

- `ApiProvider` or API module with `SOCCIT_API_BASE_URL`
- `apiJson<T>()` helper that surfaces `{ error: string }`
- `useEventSource()` wrapper with cleanup on unmount
- `useLeaderboardStream(matchPda)`
- `useMatchEvents(matchPda, fromId?)`
- `getMatches()` and `MatchSummary` type
- `MatchList` / `MatchCard` for discovery
- `MatchStatusHeader`
- `ScoreStrip`
- `OnchainPoolSummary`
- `LeaderboardTable`
- `PredictionList`
- `LineupPanel`
- `EventTimeline`
- `WalletProfileGate`
- `ProfileRegistrationForm`
- `AvatarPicker`
- `NotReadyState`
- `RetryableErrorState`
- `SkeletonMatchRoom`

## Data Handling Rules

### Match PDA

Validate PDA-like inputs before calling fixture-scoped endpoints:

```text
base58-looking Solana address, generally 32-44 chars
```

Malformed values should be blocked client-side and shown as form validation errors. Do not call the API repeatedly with obviously invalid PDA values.

### REST Errors

Handle errors based on meaning, not only status code:

- `400`: frontend validation bug or malformed input. Show inline validation copy.
- `401`: wallet signature verification failed. Re-prompt the user to sign with the correct wallet.
- `404` on match, lineup, or leaderboard: often means data is not ready yet. Render "not available yet" or "waiting for match data".
- `404` on user profile: profile does not exist. Offer registration.
- `409`: duplicate username or wallet profile. Surface the server message.
- `5xx`: retryable server/RPC failure. Show retry with backoff.

### SSE

Use native `EventSource`:

- `leaderboard/:pda/stream` emits only `leaderboard` events.
- `events/:pda` emits event names such as `substitution` or `goal`.
- Browser reconnect is automatic.
- `Last-Event-ID` is handled automatically for match events.
- Close streams on component unmount.
- Keep a visible connection state only when useful, such as "reconnecting".

## State Requirements

Every data-driven screen needs these states:

- Initial
- Loading with skeletons
- Empty
- Not ready
- Error with retry or recovery action
- Success
- Reconnecting for SSE-backed sections

Specific empty states:

- No leaderboard rows yet: "No predictions scored yet."
- No user matches: "No matches played yet."
- No lineup: "Lineup is not available yet."
- No events: "No match events yet."

## Visual Direction

Use a restrained sports-dashboard style:

- High contrast, fast scanning, and compact spacing.
- Live status indicators for minute, score, and stream state.
- Tables/lists for leaderboard and predictions.
- Side-by-side team lineup on desktop, stacked on mobile.
- Cards only for repeated items or real panels; avoid card-inside-card layouts.
- Keep radii modest, around 8px or less.
- Avoid a marketing hero. The product should open directly into match entry or a match room.

Because no `brand.md` exists yet, use neutral Tailwind/shadcn-style tokens until brand colors are chosen. A future brand pass could add a football-pitch green, signal yellow, and scoreboard charcoal, but keep semantic colors meaningful: green for success/live, yellow for warning, red for destructive/error.

## Accessibility and Interaction Requirements

- Use real `<button>`, `<a>`, `<input>`, and form elements.
- Keep all touch targets at least 40px by 40px.
- Provide visible focus rings.
- Put filters, selected tabs, and match PDA in URL state where shareable.
- Do not rely on hover-only controls.
- Use concise, active copy.
- Do not hide unavailable actions; disable them with an explanation.
- Keep wallet signing prompts explicit about what message is being signed.

## MVP Build Order

1. API client module: base URL, `apiJson<T>()`, validators, error normalization.
2. Match discovery via `GET /api/matches` and match-list screen (`/matches`).
3. Match PDA entry fallback tile for direct access.
4. `/matches/[pda]` shell with match header and loading/error/not-ready states.
5. Lineup and leaderboard snapshots.
6. SSE wrappers for leaderboard and event timeline.
7. Wallet connect integration.
8. Profile registration and avatar selection.
9. User profile and match history.
10. Prediction preparation and client-side submission via `POST /api/prediction/prepare`.

## Backend/API Questions Before Full Product Build

- ~~What endpoint lists upcoming/live matches?~~ Answered: `GET /api/matches`.
- Are team crests/logos available, or should the frontend continue using `flagcdn.com` for country fixtures?
- Should `GET /api/user/:wallet/matches` return `matchAccount` so the frontend can link to `/matches/[pda]`?
- What exact signed message should be used for avatar updates?
- Where should official avatar image files come from?

## Definition of Done

- A user can open the app, see a list of on-chain matches from `GET /api/matches`, and enter a match room.
- The match list and match room handle not-ready, empty, and retryable states without crashing.
- Leaderboard and events update live over SSE.
- A connected wallet can register a profile with username and avatar.
- Existing profiles can be loaded and avatar edits can be submitted with signature verification.
- The app is usable at 375px, 768px, and 1280px widths.
- All user-facing API errors are translated into clear recovery paths.
