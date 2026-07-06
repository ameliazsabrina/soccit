# Arena Page — `/matches/[pda]/arena`

> Full breakdown, guidance, and context for the Arena page and every component
> and card it renders. Use this as the single source of truth when modifying,
> extending, or onboarding to the Arena experience.

---

## 1. Purpose

The Arena is the **prediction workspace** for a single Soccit match. From here a
user picks one of three prediction models, builds their prediction, and locks it
on-chain (Devnet) or in demo mode.

Route: `/matches/[pda]/arena`

Query params:

| Param | Values | Required | Notes |
|---|---|---|---|
| `model` | `sub` \| `score` \| `goalscorer` | no (defaults to `sub`) | Selects which prediction panel is rendered. |
| `side` | `1` \| `2` | only for `model=sub` | Which team the user manages. If absent, the `TeamPickerModal` is shown. |
| `seed` | `1` | no | Treats the PDA as the seed match (uses `SEED_MATCH` / `DEMO_LINEUP` and skips the API fetch). |
| `fixtureId` | number | no | Resolved from `searchParams` for on-chain submission; falls back to `SOCCIT_SEED_FIXTURE_ID` when `seed=1`. |

The `[pda]` segment is either:

- A real Solana match-account PDA (base58, 32–44 chars), validated by
  `isValidPda()` in `app/_lib/api.ts:452`.
- The literal string `"demo"` → uses an in-file `DEMO_MATCH` + `DEMO_LINEUP`
  (Portugal vs Argentina, 4-3-3, 63rd minute 2–1). No network calls are made.
- The seed match PDA (`SOCCIT_SEED_MATCH_PDA`) → uses `SEED_MATCH` and
  `DEMO_LINEUP`, but **does** support real on-chain submission against Devnet.

---

## 2. File Map

| File | Role |
|---|---|
| `app/matches/[pda]/arena/page.tsx` | The Arena route component. Owns state, data loading, submission, and model routing. |
| `app/_components/pitch-arena.tsx` | The Substitute Manager workspace. Pitch + bench + slip/feed/info sidebar. |
| `app/_components/score-prediction-panel.tsx` | The Final Score prediction panel. |
| `app/_components/goalscorer-panel.tsx` | The Goalscorer prediction panel (currently "Coming Soon"). |
| `app/_components/team-picker-modal.tsx` | Modal that forces the user to pick Home/Away before entering the Sub arena. |
| `app/_components/slide-to-lock.tsx` | The slide-to-lock drag control used by every model to commit a prediction. |
| `app/_components/lock-celebration.tsx` | Full-screen celebration overlay shown after a successful lock. |
| `app/_components/events-transition.tsx` | Tile-flip enter transition shown on first mount of the Arena. |
| `app/_components/page-shell.tsx` | Page chrome (TopNav + ticker). The Arena uses `edgeToEdge hideTicker`. |
| `app/_components/top-nav.tsx` | Global top nav with the Soccit logo, menu/back, and wallet button. |
| `app/_components/player-card.tsx` | The TCG-style player card used by Goalscorer panel and reusable elsewhere. |
| `app/_components/live-match-feed.tsx` | Live events + leaderboard feed embedded in the PitchArena Feed tab. |
| `app/_lib/api.ts` | All REST + SSE helpers, types, and constants (`getMatch`, `getLineup`, …). |
| `app/_lib/prediction.ts` | The on-chain submission flow (`preparePrediction` → sign → send → confirm). |

---

## 3. Page-Level Flow (`ArenaPage`)

The page component lives at `app/matches/[pda]/arena/page.tsx:146`. It runs the
following sequence:

### 3.1 State Initialization

```
rawPda = params.pda
isDemo = rawPda === "demo"
isSeed  = rawPda === SOCCIT_SEED_MATCH_PDA || searchParams.seed === "1"
pda     = isDemo ? "demo" : rawPda
model   = "sub" | "score" | "goalscorer"   (from ?model=, defaults to "sub")
side    = 1 | 2                            (from ?side=, defaults to 1)
fixtureId = Number(searchParams.fixtureId ?? (isSeed ? SOCCIT_SEED_FIXTURE_ID : NaN))
```

Initial `match` / `lineup` state is seeded synchronously for `isDemo` / `isSeed`
so the page can paint instantly without a loading flash. `loading` starts `true`
only for real PDAs.

### 3.2 Data Loading

`useEffect` on `[pda, isDemo, isSeed]` (page.tsx:193):

- For `isDemo` / `isSeed`: **no fetch** — the in-file constants are used.
- Otherwise: `loadMatch()` runs `Promise.all([getMatch(pda), getLineup(pda)])`
  against the Soccit backend (`SOCCIT_API_BASE_URL` in `app/_lib/api.ts:1`).
  - `getMatch(pda)` → `GET /api/match/{pda}` → `MatchState`
  - `getLineup(pda)` → `GET /api/lineup/{pda}` → `Lineup`
  - 10 s timeout per request via `AbortController`.
  - On failure: `error` is set and the **Arena Unavailable** fallback renders.

### 3.3 Loading State

While `loading` is true (page.tsx:313):

```
PageShell
  "Loading Arena" — font-tech uppercase label
  Animated loading bar (CSS class `loading-bar-fill`, purple)
```

### 3.4 Error State

If `error` is set or `match` / `lineup` are null (page.tsx:328):

```
PageShell
  AlertCircle (rose, 48px)
  "Arena Unavailable" — font-display 2xl
  {error message}
  [Retry button] → loadMatch()
```

### 3.5 Enter Transition

On the **first successful render** of the Arena, `showEnterTransition` starts
`true` and `EventsTransition` (mode=`enter`) is mounted **above** `PageShell`.
It plays:

1. **Loading phase** (2200 ms) — Soccit logo + "Loading The Field" title + an
   animated progress bar that counts 0 → 100%.
2. **Fade phase** (400 ms) — logo/title/loading bar fade out.
3. **Flip phase** (1400 ms) — a 6×8 grid of tiles rotates `rotateY(180deg)`
   center-out (staggered by tile distance from the center). Each tile has a
   single front face with `backfaceVisibility: hidden`, so once rotated it
   becomes invisible and reveals the Arena underneath.
4. `onComplete` fires → `setShowEnterTransition(false)` unmounts the portal.

The transition is rendered via `createPortal` into `document.body` at
`z-[9999]`, so it sits above everything including modals.

### 3.6 Main Render

Once data is ready and the enter transition is done:

```
PageShell(edgeToEdge hideTicker)
  Team name block (left, below TopNav) — only when model=sub && sideSelected
  Wallet-connect warning (gold)        — only when !isDemo && !connected
  Lock error banner (rose)             — when lockError is set
  Submitting banner (cyan)             — when submitting is true
  Signatures list (emerald)            — when signatures.length > 0 && !submitting
  Demo lock banner (cyan)              — when isDemo && lockMessage && no signatures

  Model router:
    model === "sub"        → PitchArena
    model === "score"      → ScorePredictionPanel
    model === "goalscorer" → GoalscorerPanel
    model === "sub" && !sideSelected && !showTeamPicker → "Pick a side" placeholder

  TeamPickerModal (overlay)  — when showTeamPicker is true
  LockCelebration (overlay)  — when celebrating is true
```

`PageShell edgeToEdge` puts `TopNav` inside the normal `max-w-[1200px]` container
but lets the Arena body stretch **edge-to-edge** below it. `hideTicker` removes
the bottom `TickerMarquee` so the pitch owns the full viewport height.

### 3.7 Submission Flow

The page owns the **on-chain submission** pipeline. Every model eventually calls
`handleSubmit({ kind, side, outPlayerId, inPlayerId, label })` (page.tsx:218).

```
handleSubmit
  ├─ setLocked(true), clear signatures, set lockMessage = "Locking {label}…"
  ├─ if isDemo:
  │     lockMessage = "Demo prediction locked locally. No on-chain transaction."
  │     setCelebrating(true)
  │     return
  ├─ if !isSeed:
  │     lockError = "No fixture loaded that supports on-chain submission."
  │     setLocked(false); return
  ├─ if !connected || !publicKey || !wallet:
  │     lockError = "Connect your wallet to submit a real prediction."
  │     setLocked(false); return
  ├─ if Number.isNaN(fixtureId):
  │     lockError = "Could not resolve fixtureId for this match."
  │     setLocked(false); return
  └─ setSubmitting(true)
       submitPrediction({ connection, adapter, input })  // app/_lib/prediction.ts
         1. POST /api/prediction/prepare  → unsigned base64 tx
         2. VersionedTransaction.deserialize
         3. adapter.signTransaction(tx)
         4. connection.sendRawTransaction
         5. connection.confirmTransaction
       → on success: push signature, lockMessage = "{label} locked on Devnet.",
                     setCelebrating(true)
       → on failure: lockError = msg (+ USDC hint when program error pattern matches)
       → finally: setSubmitting(false)
```

`handleLockSubstitutions` (page.tsx:289) iterates the SubstitutionPrediction[]
and calls `handleSubmit` **sequentially** for each swap with `kind=2`. Each
signature is appended to `signatures`.

`handleLockScore(score1, score2)` (page.tsx:303) calls `handleSubmit` once with
`kind=3, side=0, outPlayerId=score1, inPlayerId=score2`.

### 3.8 Banner Cards

These are the inline alert cards that appear above the Arena body, in order:

#### Wallet-Connect Warning (gold)

- Shows when `!isDemo && !connected`.
- Style: `border-gold/30 bg-gold/5 text-gold`, centered, `text-sm`.
- Message: "Connect your wallet to submit real predictions. Demo mode skips the
  chain."

#### Lock Error (rose)

- Shows when `lockError` is set.
- Style: `border-rose/30 bg-rose/5 text-rose`, `AlertCircle` icon left.
- Error message includes a USDC hint when the error matches
  `/insufficient funds|0x1|custom program error/i`.

#### Submitting (cyan)

- Shows when `submitting` is true.
- Style: `border-cyan/30 bg-cyan/5 text-cyan`, `Loader2` spin icon left.
- Body: `lockMessage ?? "Submitting…"`.

#### Signatures List (emerald)

- Shows when `!submitting && signatures.length > 0`.
- Style: `border-emerald-500/30 bg-emerald-500/5 text-emerald-600`.
- Header: `CheckCircle2` + `lockMessage ?? "{n} prediction(s) locked"`.
- Body: `<ul>` of signatures, each row shows the base58 signature (truncated,
  `font-mono`) and a "View" link to
  `https://explorer.solana.com/tx/{sig}?cluster=devnet` with `ExternalLink`
  icon.

#### Demo Lock Message (cyan, demo-only)

- Shows when `!submitting && isDemo && lockMessage && signatures.length === 0`.
- Style: `border-cyan/30 bg-cyan/5 text-cyan`, centered.
- Body: `lockMessage` (e.g. "Demo prediction locked locally. No on-chain
  transaction.").

---

## 4. Team Name Block

Added directly below `TopNav` on the **left** side (page.tsx:364). Renders only
when `model === "sub" && selectedTeam && sideSelected`:

```
px-8 pb-2
  font-display text-lg leading-tight text-foreground  → {teamName}
  text-[10px] font-bold uppercase tracking-wider text-muted → "Home" | "Away"
```

The team name is `selectedTeam.teamName ?? \`Team ${side}\``. This replaces the
old "Substitute Manager" header row that used to live inside `PitchArena`.

---

## 5. `PitchArena` — Substitute Manager Workspace

Source: `app/_components/pitch-arena.tsx`. This is the most complex component in
the Arena. It is a two-column grid that fills the available viewport:

```
grid h-full grid-cols-1 gap-5 lg:grid-cols-[1fr_40%]
├─ LEFT (1fr):  Pitch surface + Bench strip
└─ RIGHT (40%): Sidebar with Slip / Feed / Info tabs
```

On screens below `lg` the grid collapses to a single column.

### 5.1 Layout Grid

| Region | Width | Height | Contents |
|---|---|---|---|
| Pitch | `1fr` (left) | flex-1 (grows) | Trapezoid pitch + player tokens + instruction overlay |
| Bench | `1fr` (left) | `h-64` fixed | Bench header + horizontal row of `BenchCard`s |
| Sidebar tabs | `40%` (right) | `h-16` | Slip / Feed / Info tab buttons |
| Sidebar body | `40%` (right) | flex-1 | Active tab content |

### 5.2 Pitch Surface

The pitch is rendered inside a `relative` container with
`aspectRatio: "995 / 449"` (the wireframe's pitch bounding box). It is composed
of three stacked layers:

#### 5.2.1 Trapezoid Turf

```jsx
<div className="pitch-surface absolute inset-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
     style={{ clipPath: "polygon(14.5% 0%, 85.5% 0%, 100% 100%, 0% 100%)" }} />
```

- `pitch-surface` is defined in `app/globals.css:238`:
  `background: linear-gradient(to bottom, var(--pitch-turf), var(--pitch-deep));`
- The `clipPath` creates the perspective trapezoid (narrow at the top = opponent
  goal, wide at the bottom = user's goal).
- A large soft shadow grounds the pitch on the page.

#### 5.2.2 Pitch Markings (SVG)

An `<svg viewBox="0 0 995 449" preserveAspectRatio="none">` overlay draws:

- **Outer boundary** — `<polygon points="144,0 851,0 995,449 0,449">`,
  strokeWidth 3, `text-pitch-line`.
- **Halfway line** — vertical line at `x=497.5`, strokeWidth 2.
- **Center circle** — `<circle cx="497.5" cy="224.5" r="48">`, strokeWidth 2.

All strokes use `currentColor` so the `text-pitch-line` Tailwind class on the
`<svg>` controls line color via the `--pitch-line` CSS variable.

#### 5.2.3 Player Tokens Layer

A full-size `absolute inset-0` container holds the 11 starter tokens. Each
starter is positioned by `getSlot(player)`:

```
function getSlot(player):
  if player.gridX != null && player.gridY != null:
    return { gridX: player.gridX, gridY: player.gridY }
  code = player.positionCode?.toUpperCase()
  return FORMATION_SLOTS[code] ?? { gridX: 50, gridY: 50 }
```

`FORMATION_SLOTS` (pitch-arena.tsx:53) is a hard-coded 4-3-3 fallback mapped
from `ARENASUBS.svg`. Each starter's token is wrapped in a div positioned with
`left: {gridX}% top: {gridY}%` and `-translate-x-1/2 -translate-y-1/2` so the
token centers on its slot.

Each starter div handles:

- `onDragOver` → `e.preventDefault()` + `setDragOverPlayer(starter.id)`
- `onDragLeave` → `setDragOverPlayer(null)`
- `onDrop` → `handleDropOnStarter(e, starter)` (parses the sub JSON from the
  dataTransfer and calls `assignSubToStarter`)
- `onClick` → `handleStarterClick(starter)`:
  - If a sub is selected in the bench → assign it to this starter.
  - Else if a prediction already exists for this starter → clear it.

### 5.3 PlayerToken (on-pitch chip)

A small square chip (~48–56 px) representing one starter on the pitch. Lives in
`pitch-arena.tsx:398`. Two visual modes:

#### Unassigned (no sub predicted)

- Shape: `h-12 w-12 sm:h-14 sm:w-14`, `border-2`.
- Color: from `posColor(displayPlayer.position)`:
  - Goalkeeper / Defender → `bg-purple/20 border-purple/50 text-purple`
  - Midfielder → `bg-gold/10 border-gold/40 text-gold`
  - Forward → `bg-rose/10 border-rose/40 text-rose`
  - Unknown → `bg-surface border-surface text-muted`
- Contents (column, centered):
  - Position code (`posCode`) — `text-[10px] font-bold uppercase`. Resolved as
    `player.positionCode ?? player.position.slice(0,2).toUpperCase() ?? "??"`.
  - Last name — `text-[7px] sm:text-[8px] font-bold uppercase truncate`.
- Drag-over state: `scale-110 ring-2 ring-cyan ring-offset-2 ring-offset-pitch-turf`.

#### Assigned (sub predicted)

- Same chip body but represents the **sub** (`displayPlayer = sub ?? player`).
- Wraps in `motion.div` with `initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}`.
- Adds `animate-slot-flash` class when `flashed` is true (set for 600 ms after a
  successful drop/tap assignment).
- **Multiplier badge** — `absolute -top-1 -right-1 h-4 w-4 bg-cyan text-[8px]`
  showing `getMultiplier(sub).toFixed(1)x`.
- **Clear button** — `absolute -right-2 -top-2 h-5 w-5 bg-rose` with an `X`
  icon. `e.stopPropagation()` prevents the parent starter `onClick` from firing.
  Calls `onClear()` which removes the prediction.

### 5.4 Instruction Overlay

Top-left of the pitch (pitch-arena.tsx:268):

```
absolute left-4 top-4 text-[10px] font-bold uppercase tracking-wider text-muted
  Crosshair (purple, 12px)
  selectedSub ? `Tap a player to swap in {subLastName}` : "Drag a sub onto a player"
```

This is the persistent onboarding hint that adapts to the current selection
state.

### 5.5 Bench Strip

Bottom of the left column (pitch-arena.tsx:277):

```
h-64 flex-shrink-0 border-t border-surface bg-surface/10 px-3 py-3
```

#### Bench Header

- Left: small `User` icon in a 5×5 surface box, "Bench" label, count
  `({substitutes.length})` in `text-muted/60`.
- Right (only when `selectedSub` is set): "Cancel selection" cyan link that
  clears `selectedSub`.

#### Bench Cards Row

A horizontal flex row (`flex h-[calc(100%-2rem)] items-center justify-center
gap-3`) of up to 5 sub cards (`bench = substitutes.slice(0, 5)`). Each card is
wrapped in a div with:

- `onClick` → `handleBenchClick(sub)` (toggles `selectedSub`).
- `onDoubleClick` → `handleBenchDetails(sub)` (opens `SubDetailSheet` on
  mobile).
- `hover:-translate-y-1` lift.
- When selected: `-translate-y-2 scale-105`.
- Per-card constraints: `maxWidth: 180px minWidth: 100px`.

Empty state: "No substitutes available." in `text-xs text-muted`.

### 5.6 BenchCard (large portrait chip)

Lives in `pitch-arena.tsx:465`. A larger, vertical card used in the bench strip.

```
relative flex h-full w-full flex-col items-center justify-between border-2 p-2
  posCls (color from position)
  — posCode (top, text-xs font-bold uppercase)
  — column: last name (text-[10px] truncate) + #{number} (text-[9px] text-muted)
  — multiplier bar: h-5 w-full bg-background/40 text-[10px] font-bold → "{mult}x"
```

- `draggable` prop + `onDragStart` triggers `handleDragStart` in `PitchArena`,
  which sets `e.dataTransfer.setData("application/json", JSON.stringify(player))`
  with `effectAllowed = "copy"`.

### 5.7 SubDetailSheet (mobile bottom sheet)

Lives in `pitch-arena.tsx:629`. Only renders on `lg:hidden` (mobile) when a sub
is double-clicked from the bench. Uses framer-motion:

- Backdrop: `motion.div` fade in/out, `bg-background/80 backdrop-blur-sm`,
  click closes.
- Sheet: `motion.div` slides from `y: "100%"` to `y: 0` with spring
  (`stiffness: 300, damping: 30`), `bg-surface`, `border-t`.

Contents:

- Header row: position label (`text-xs uppercase tracking-wider text-muted`) +
  player name (`font-display text-2xl`) on the left; `X` close button on the
  right.
- 3-column stat grid:
  - **Rating** — `font-display text-xl`, `player.rating ?? "—"`.
  - **Number** — `#{player.number ?? "—"}`.
  - **Multiplier** — cyan `font-display text-xl`, `multiplier.toFixed(1)x`.
- Primary CTA: full-width purple button "Select for Substitution" → calls
  `onSelect` which sets the sub as `selectedSub` and closes the sheet.

### 5.8 Sidebar Tabs

The right column header (pitch-arena.tsx:322) is a 64-px tall row of three
equal-width tab buttons:

| Tab | Key | Icon | Badge |
|---|---|---|---|
| Slip | `slip` | `Sparkles` | Purple count badge when `predictionList.length > 0` |
| Feed | `feed` | `Radio` | — |
| Info | `info` | `Info` | — |

Active tab: `border-b-2 border-purple bg-surface/40 text-foreground`.
Inactive: `border-b-2 border-transparent text-muted hover:text-foreground`.

The badge is a `h-4 w-4 bg-purple text-[8px] text-white` square showing
`predictionList.length`.

### 5.9 SlipTab

Lives in `pitch-arena.tsx:507`. The slip is the user's "bet slip" — the list of
substitution predictions they've built before locking.

#### Empty State

Centered column:

- `Crosshair` icon (32 px, `text-muted/40`).
- "No subs selected yet." (`text-sm text-muted`).
- "Drag a bench card onto a player on the pitch." (`text-xs text-muted/60`).

#### Prediction List

Vertical `space-y-2` of prediction rows. Each row:

```
flex items-center gap-2 border border-surface bg-background/50 p-2.5
  └─ flex flex-1 items-center gap-2
       outPlayer last name (truncate, text-xs font-bold text-muted)
       ArrowRightLeft icon (12px, text-muted)
       sub last name (truncate, text-xs font-bold text-foreground)
  └─ multiplier badge: text-[10px] font-bold text-cyan → "{mult}x"
```

Below the list: a centered "Potential payout: **{sum}x**" line in cyan, where
`potentialPayout` is the sum of `getMultiplier(sub)` for every predicted sub.

#### SlideToLock Footer

Bottom of the Slip tab, `flex-shrink-0 border-t border-surface p-4`, contains
the `SlideToLock` control (see §6). Disabled when `predictions.length === 0 ||
locked || isSubmitting`. Label cycles between "SLIDE TO LOCK", "SUBMITTING…",
and "LOCKED".

### 5.10 Feed Tab

Renders `<LiveMatchFeed pda={matchPda} isDemo={matchPda === "demo"}
className="h-full border-0" showViewLogsLink />`.

`LiveMatchFeed` (in `live-match-feed.tsx`) is a self-contained component that
opens two SSE streams against the Soccit backend:

- `openMatchEventsStream(pda, …)` → `GET /api/events/{pda}?fromId=0-0`
- `openLeaderboardStream(pda, …)` → `GET /api/leaderboard/{pda}/stream`

It has its own internal `events` / `leaderboard` sub-tabs and renders a
scrollable event timeline plus a ranked leaderboard table with prize splits.
When `isDemo` is true it skips the streams and renders whatever
`demoEvents` / `demoLeaderboard` were passed in (empty by default in the Arena).

`showViewLogsLink` adds a "View Logs" link that routes to the match's
settlement/debug page.

### 5.11 InfoTab

Lives in `pitch-arena.tsx:579`. A scrollable "How to Play" panel.

- Header: `Trophy` icon (gold) + "How to Play" (`font-display text-sm uppercase
  tracking-wider`).
- 4-step guide, each step is a row with a numbered purple square
  (`h-5 w-5 bg-purple text-[9px] text-white`) and a short instruction:
  1. "Pick a sub from the bench below the pitch."
  2. "Drag or tap to place them onto a starting player."
  3. "Each correct sub earns points based on the player multiplier."
  4. "Lock your prediction slip to submit on-chain."
- Team label block: "Team" label + `{teamName}` in `font-display text-sm`.
- Position color legend — three small cards showing the position → color
  mapping:
  - "GK / DEF" → purple swatch
  - "MID" → gold swatch
  - "FWD" → rose swatch

### 5.12 Multiplier Logic

`getMultiplier(player)` (pitch-arena.tsx:693):

```
if !player: 1
if player.multiplier: return player.multiplier   // explicit override
rating = player.rating ?? 75
if rating >= 86: 4.0    // iridescent
if rating >= 80: 2.5    // gold
else:            1.2    // bronze
```

This matches the rarity tiers in `app/_lib/api.ts:517` (`playerRarity`).

### 5.13 LockCelebration (inside PitchArena)

`PitchArena` mounts its own `LockCelebration` with `subtitle={teamName}` that
fires when the inner `handleLock` resolves. The page **also** mounts a
`LockCelebration` with `subtitle={meta.title}`. Both are gated by their own
`celebrating` state so they don't double-fire in practice — the page's
celebration covers the on-chain submission result, while the PitchArena's covers
the local lock interaction.

---

## 6. `SlideToLock` — Drag-to-Commit Control

Source: `app/_components/slide-to-lock.tsx`. A swipe-right-to-confirm control
used by the Sub and Score panels.

### 6.1 Anatomy

```
relative h-16 w-full overflow-hidden border border-surface bg-surface/50
  ├─ motion.div (fill) — backgroundColor animates from transparent purple → solid purple
  ├─ label (centered, pointer-events-none) — "SLIDE TO LOCK" | "LOCKED"
  └─ motion.button (thumb) — 56×56, Lock icon, drag="x"
```

### 6.2 Behavior

- `measure()` on mount + resize: `max = containerWidth - thumbWidth - 8`.
- `progress = useTransform(x, [0, max], [0, 1])`.
- `bg = useTransform(progress, [0, 1], ["rgba(3,70,148,0)", "rgba(3,70,148,1)"])`.
- While dragging: thumb turns purple. On release before 95%: spring back to 0.
- When `progress >= 0.95 && !unlocked && !disabled`: set `unlocked = true`,
  animate thumb to the right edge, call `onLock()`.
- After unlock: thumb turns cyan, label becomes "LOCKED", thumb disabled.

### 6.3 Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onLock` | `() => void` | — | Fires once when the slide completes. |
| `disabled` | `boolean` | `false` | Disables drag and locks the trigger. |
| `label` | `string` | `"SLIDE TO LOCK"` | Override the pre-unlock label. |

---

## 7. `ScorePredictionPanel` — Final Score Model

Source: `app/_components/score-prediction-panel.tsx`. Renders when
`model === "score"`.

### 7.1 Layout

A centered `max-w-2xl` card with `border-2 border-surface bg-surface/10 p-6
md:p-10`, animated in with `motion.div initial={{ opacity: 0, y: 16 }}`.

### 7.2 Header

- Title: "Call the Score" (`font-display text-3xl md:text-4xl`).
- Subtitle: "Predict the final whistle scoreline." (`text-sm text-muted`).

### 7.3 TeamScore Controls

Two `TeamScore` components separated by a "VS" block:

```
TeamScore(team1)  —  VS  —  TeamScore(team2)
```

The "VS" block shows `font-display text-2xl text-muted` "VS" and, when the match
is not live, a "Full Time" label below it.

Each `TeamScore`:

- Team name (centered, `max-w-[120px] font-display text-sm uppercase`).
- Row of `[−] [score box] [+]`:
  - Minus button: `h-10 w-10 border border-surface bg-background`, `Minus` icon.
  - Score box: `h-16 w-16 border-2 border-surface bg-background`, score in
    `font-display text-4xl`.
  - Plus button: same style as minus, `Plus` icon.
- Score clamped to `[0, 99]` via `Math.max(0, Math.min(99, s + delta))`.

### 7.4 Predicted Outcome Card

Below the score row:

```
border border-surface bg-background/50 p-4 text-center
  "Predicted Outcome" label
  outcome = score1 === score2 ? "Draw"
          : score1 > score2  ? `${team1Name} wins`
          :                    `${team2Name} wins`
```

### 7.5 Payout Grid

Two columns:

| Card | Border | Icon | Label | Value |
|---|---|---|---|---|
| Exact Score | `gold/30 bg-gold/5` | `Trophy` | "Exact Score" | **5 pts** |
| Correct Outcome | `cyan/30 bg-cyan/5` | `TrendingUp` | "Correct Outcome" | **3 pts** |

### 7.6 Lock

`SlideToLock` with `onLock={() => onLock(score1, score2)}`. Disabled when
`locked || isSubmitting`. Label cycles: "SLIDE TO LOCK SCORE" / "SUBMITTING…" /
"LOCKED".

---

## 8. `GoalscorerPanel` — Goalscorer Model (Coming Soon)

Source: `app/_components/goalscorer-panel.tsx`. Renders when
`model === "goalscorer"`. Currently a **non-interactive teaser** — the whole
panel is wrapped in `pointer-events-none opacity-40`.

### 8.1 Header

- "Coming Soon" badge: `border border-surface bg-background` + `Lock` icon.
- Title: "Goalscorer" (`font-display text-3xl md:text-4xl`).
- Subtitle: "Pick the players who will score. Each correct prediction earns 2
  points."

### 8.2 Payout Grid (faded)

Two columns, `pointer-events-none opacity-40`:

| Card | Label | Value |
|---|---|---|
| Gold | "Per Scorer" | **2 pts** |
| Cyan | "Live Grading" | "Goal by Goal" |

### 8.3 Team Player Rows (faded)

For each team (`team1Name`, `team2Name`):

- Section header: `Users` icon (purple for team 1, cyan for team 2) + team name.
- Horizontal scrollable row of up to 5 `PlayerCard` components in `compact`
  mode.

`players` is built in the page (page.tsx:483) by flattening both teams' players
and **excluding goalkeepers** (`positionId !== 1`).

### 8.4 `PlayerCard` (TCG card)

Source: `app/_components/player-card.tsx`. A trading-card-style player card.

- Shape: `h-60 w-40` (or `h-48 w-32` when `compact`), chamfered corners via
  `clipPath: polygon(10% 0, 90% 0, 100% 10%, …)`.
- Card art: `tcgCardImage(position, rating)` returns
  `/assets/cards/players/{fw|md|df|gk}-{bronze|gold|iridescent}.webp`. Loaded
  via `next/image` with `fill` and `unoptimized`.
- Fallback: if the image errors, a gradient based on rarity fills the card
  (`from-purple via-cyan to-purple` for iridescent, gold tones for gold, bronze
  tones for bronze).
- Texture overlay: a subtle 4×4 SVG noise pattern at `opacity-20`.
- Iridescent glow: an animated `bg-gradient-to-tr from-purple/20 to-cyan/20`
  pulse overlay when rarity is iridescent.
- Top-left overlay: position code (`text-[10px]`) + rating
  (`font-display text-2xl`), both with `drop-shadow-md`.
- Center: 64×64 circular avatar with the player's initials, `border-white/20
  bg-black/30 backdrop-blur-sm`.
- Bottom: full player name (truncate, uppercase) + a row with multiplier
  (`{mult}x`) and squad number (`#{number}`).
- Right edge: 1.5 px wide vertical stripe — purple for side 1, cyan for side 2.
- Locked overlay: when `locked` is true, a `bg-background/60 backdrop-blur-[2px]`
  overlay with a purple "Locked" pill in the center.
- Hover/tap: `whileHover={{ y: -6, scale: 1.03 }}`, `whileTap={{ scale: 0.98 }}`.
- Selection ring: `ring-2 ring-cyan ring-offset-2 scale-105` when `selected`.

Rarity tiers (`playerRarity` in api.ts:517):

| Rating | Rarity | Multiplier |
|---|---|---|
| ≥ 86 | iridescent | 4.0x |
| ≥ 80 | gold | 2.5x |
| < 80 | bronze | 1.2x |

---

## 9. `TeamPickerModal`

Source: `app/_components/team-picker-modal.tsx`. A full-screen modal shown when
`model === "sub"` and no `side` query param is set (page.tsx:183 sets
`showTeamPicker` on init).

### 9.1 Anatomy

- Backdrop: `motion.div` fade, `bg-background/80 backdrop-blur-sm`, click →
  `onClose` (routes back to `/matches/{pda}`).
- Modal: `max-w-2xl border border-surface bg-surface/95 p-6 shadow-2xl`,
  scale+fade in.
- Close button: top-right `X` (calls `onClose`).
- Eyebrow: "Substitute Prediction" (`text-xs uppercase tracking-[0.2em]
  text-muted`).
- Title: "Pick Your Side" (`font-display text-3xl`).

### 9.2 Team Buttons

A `grid-cols-1 md:grid-cols-2 gap-6` of two buttons:

| Button | Hover border | Hover glow | Icon bg | Select label |
|---|---|---|---|---|
| Team 1 (Home) | `border-purple` | `0_0_30px_rgba(3,70,148,0.35)` | `bg-purple/10 → bg-purple` | "Select Team A" |
| Team 2 (Away) | `border-cyan` | `0_0_30px_rgba(219,161,17,0.35)` | `bg-cyan/10 → bg-cyan` | "Select Team B" |

Each button shows a 64×64 square with the first 2 letters of the team name, the
full team name in `font-display text-xl`, and a hover-revealed "Select Team X"
label. Clicking calls `onSelect(1 | 2)` which updates the URL with
`?side={n}` and closes the modal.

---

## 10. `LockCelebration`

Source: `app/_components/lock-celebration.tsx`. A full-screen, 2.2-second
celebration overlay shown after a successful lock.

- Backdrop: `bg-background/90 backdrop-blur-sm`, fade in/out.
- `celebration-burst` div (CSS animation defined in `globals.css`).
- Center: 80×80 cyan square with `Sparkles` icon (40 px) and a
  `0_0_40px_rgba(219,161,17,0.5)` glow.
- Title: `{title ?? "LOCKED IN"}` (`font-display text-4xl md:text-6xl`).
- Subtitle: `{subtitle}` (`text-sm font-bold uppercase tracking-wider
  text-muted`).
- Auto-dismiss: `setTimeout(onDone, 2200)` on open.

The page passes `title="LOCKED IN" subtitle={meta.title}`. PitchArena passes
`subtitle={teamName}`.

---

## 11. `EventsTransition` (Enter Transition)

Source: `app/_components/events-transition.tsx`. Used by the Arena in `enter`
mode with `logoEnter="/assets/soccit-logo.svg" titleEnter="Loading The Field"`.

### 11.1 Phases

| Phase | Duration | What happens |
|---|---|---|
| `loading` | 2200 ms | Logo + title + progress bar animate 0 → 100%. |
| `fading` | 400 ms | Logo/title/loading bar fade out (`opacity 0`). |
| `flipping` | 1400 ms | 6×8 tile grid rotates `rotateY(180deg)` center-out. |
| `done` | — | `onComplete` fires; portal unmounts. |

### 11.2 Tile Grid

- `gridTemplateColumns: repeat(8, 1fr)`, `gridTemplateRows: repeat(6, 1fr)`.
- Each tile has `perspective: 800px` and a single face with
  `backfaceVisibility: hidden`. When flipped, the face rotates away and becomes
  invisible, revealing the Arena underneath.
- Stagger: `distance = sqrt((row - 3)^2 + (col - 4)^2)`, `stagger = distance * 65`
  ms. Tiles closer to the center flip first.

### 11.3 Loading Content

Centered column on top of the tiles (z-10):

- Logo: `h-24 w-24 sm:h-32 sm:w-32`, object-contain.
- Title: `font-wc text-4xl sm:text-5xl md:text-6xl`.
- Progress block: a 256–320 px wide bar with "Loading bracket" / "{pct}%" labels
  and a row of 5 pulsing dots (`wc-pulse` keyframe, staggered 120 ms).

For `enter` mode the face/text colors use the standard Soccit palette
(`bg-background`, `text-foreground`, `text-muted`, `bg-surface`, `bg-foreground`).

---

## 12. `PageShell` and `TopNav` (Arena configuration)

### 12.1 PageShell

Source: `app/_components/page-shell.tsx`. The Arena uses
`<PageShell edgeToEdge hideTicker>`.

`edgeToEdge` mode:

- `TopNav` is wrapped in a `max-w-[1200px] px-8 pt-8` container (so the nav
  itself stays at the standard width).
- The children render in a `flex w-full flex-1 flex-col` main with **no
  max-width and no horizontal padding** — the Arena body stretches edge-to-edge.

`hideTicker` mode: the `TickerMarquee` at the bottom is not rendered, giving
the Arena the full viewport height.

Background orbs (`pointer-events-none fixed inset-0`) are still present: a
purple blur in the top-left and a cyan blur in the bottom-right.

### 12.2 TopNav

Source: `app/_components/top-nav.tsx`. Layout:

```
mb-6 flex items-start justify-between gap-4
  ├─ left cluster: flex items-center gap-8
  │     ├─ Soccit logo (img, h-10 w-10)  ← always visible
  │     └─ nav (flex flex-wrap items-center gap-2)
  └─ right cluster: ProfileDropdown | Connect button
```

The nav cluster renders one of three variants:

| Variant / state | Renders |
|---|---|
| `variant="worldcup"` | "Back" button → `/matches?event_exit={slug}` |
| `isNested` (path depth > 1) | "Back" button → `router.back()` |
| top-level | The four TABS links: menu / match / leaderboard / profile |

The Arena route (`/matches/[pda]/arena`) has depth 3, so `isNested` is true and
the **Back** button is shown. Clicking it calls `router.back()` which returns
the user to `/matches/[pda]`.

The Soccit logo is rendered as an `<img>` from `/assets/soccit-logo.svg` at
`h-10 w-10`, separated from the nav buttons by `gap-8` so there's a clear visual
gap while the overall nav container width stays at `max-w-[1200px]`.

---

## 13. Data Types Reference

### 13.1 `MatchState` (api.ts:64)

```ts
{
  fixtureId: number;
  onchain: {
    status: number;
    statusLabel: "OPEN" | "RESOLVED" | "SETTLED" | "UNKNOWN";
    settled: boolean;
    entryFee: string;        // USDC base units (6 dp)
    poolTotal: string;
    participantCount: number;
    team1Id: number;
    team2Id: number;
    usdcMint: string;
    winners: [string | null, string | null, string | null];
  } | null;
  live: {
    statusId: number | null;
    minute: number | null;
    goals: { team1: number; team2: number };
    ts: number | null;
  } | null;
  updatedAt: number;
}
```

### 13.2 `Lineup` (api.ts:118)

```ts
{
  fixtureId: number;
  updatedAt: number;
  teams: Array<{
    side: 1 | 2;
    teamId: number;
    teamName: string | null;
    formation?: string | null;
    players: Array<{
      id: number;
      name: string;
      number: string | null;
      starter: boolean;
      positionId: number | null;   // 1=GK, 2=DEF, 3=MID, 4=FWD
      position: string | null;
      positionCode?: string | null;
      gridX?: number | null;       // 0-100, left→right
      gridY?: number | null;       // 0-100, top(attack)→bottom(defense)
      onPitch?: boolean | null;
      warmingUp?: boolean | null;
    }>;
  }>;
  names: Record<string, string>;
}
```

### 13.3 `PlayerCardData` (player-card.tsx:9)

```ts
{
  id: number;
  name: string;
  number: string | null;
  position: string | null;
  positionCode?: string | null;
  gridX?: number | null;
  gridY?: number | null;
  rating?: number;
  multiplier?: number;
  side: 1 | 2;
}
```

The Arena page maps `Lineup.players` → `PlayerCardData` and synthesizes a
`rating` from `positionId` (`75 + positionId * 2` for starters, `72 + positionId
* 2` for subs) when the backend doesn't provide one.

### 13.4 `SubstitutionPrediction` (pitch-arena.tsx:22)

```ts
{
  slotId: string;        // String(starter.id)
  position: string;      // starter.position ?? "Player"
  outPlayerId: number;   // starter going out
  inPlayerId: number;    // sub coming in
  side: 1 | 2;
}
```

### 13.5 `PreparePredictionInput` (api.ts:325)

```ts
{
  wallet: string;        // base58 signer wallet; tx fee payer
  fixtureId: number;
  outPlayerId: number;   // starter out (0 unused) OR team1 goals for kind=3
  inPlayerId: number;    // sub in (0 unused) OR team2 goals for kind=3
  lockMinute: number;
  side: 0 | 1 | 2;       // 1=home, 2=away, 0=score
  kind: 0 | 1 | 2 | 3;   // 0=OUT, 1=IN, 2=COMBO, 3=SCORE
}
```

The Arena currently submits `kind=2` (COMBO) for substitution pairs and
`kind=3` (SCORE) for the score model.

---

## 14. Visual Token Reference

| Token | Hex | Used for |
|---|---|---|
| `--pitch-turf` | (see globals.css) | Top of pitch gradient |
| `--pitch-deep` | (see globals.css) | Bottom of pitch gradient |
| `--pitch-line` | (see globals.css) | Pitch markings stroke |
| `purple` | `#034694` | Primary actions, team 1, GK/DEF |
| `cyan` | `#DBA111` (gold-ish in this codebase) | Multipliers, team 2, success |
| `gold` | `#DBA111` | Warnings, exact-score payout |
| `rose` | `#ED1C24` | Errors, forwards, clear buttons |
| `surface` | (dark) | Borders, secondary backgrounds |
| `muted` | (muted text) | Secondary text |

> Note: in this codebase `cyan` and `gold` resolve to the same `#DBA111` per
> `brand.md`. Check `tailwind.config` / CSS variables before relying on a
> visual distinction.

---

## 15. Edge Cases & Gotchas

1. **Demo vs Seed vs Real** — three distinct paths. Demo (`pda === "demo"`)
   never touches the network. Seed (`pda === SOCCIT_SEED_MATCH_PDA` or
   `?seed=1`) uses in-file data **but** supports on-chain submission. Real PDAs
   fetch from the API and currently can't submit (the page rejects with "No
   fixture loaded that supports on-chain submission." unless `isSeed`).
2. **Sequential submission** — `handleLockSubstitutions` awaits each
   `handleSubmit` in a loop, so a 5-swap slip produces 5 separate Solana
   transactions. If swap 3 fails, swaps 1–2 are already on-chain and 4–5 are
   skipped (the loop doesn't catch per-iteration; the outer `try` in
   `handleSubmit` sets `lockError` and returns, but the `for` loop in
   `handleLockSubstitutions` doesn't check for errors between iterations).
3. **`fixtureId` resolution** — when not provided via query string and not in
   seed mode, `fixtureId` is `NaN` and submission is blocked with a clear
   error. The page never reads `match.fixtureId` for submission — it relies on
   the query param.
4. **Double celebration** — both `PitchArena` and the page mount a
   `LockCelebration`. In practice the page's `celebrating` state is the one
   driven by `handleSubmit`'s success path; PitchArena's internal
   `setCelebrating(true)` fires inside its own `handleLock` which `await`s the
   page's `onLock` callback. They can briefly both be true.
5. **`edgeToEdge` + `hideTicker`** — only the Arena uses this combination.
   Other pages should keep the default shell.
6. **Bench cap** — `bench = substitutes.slice(0, 5)`. Extra subs are dropped
   from the UI even if the backend returns more.
7. **Goalkeeper exclusion in Goalscorer** — `positionId !== 1` filter is
   applied in the page before passing players to `GoalscorerPanel`.
8. **Multiplier override** — `PlayerCardData.multiplier` (if set) takes
   precedence over the rating-derived tier. The Arena doesn't set it, so the
   tier logic always runs.
9. **`EventsTransition` remount** — the component keys its phase timers off
   internal state, so it cleanly restarts on remount. The Arena only shows it
   once per mount via `showEnterTransition`.
10. **PDA validation** — `isValidPda` is a regex check
    (`/^[1-9A-HJ-NP-Za-km-z]{32,44}$/`), not a chain fetch. Invalid PDAs short-
    circuit to the error state without hitting the backend.

---

## 16. Extending the Arena

Common modifications and where to make them:

| Want to… | Edit |
|---|---|
| Add a new prediction model | Add to `ArenaModel` union + `MODEL_META` in `app/matches/[pda]/arena/page.tsx`, then add a `{model === "x" && <NewPanel />}` branch. |
| Change pitch markings | The `<svg>` block in `pitch-arena.tsx:206`. |
| Change fallback formation | `FORMATION_SLOTS` in `pitch-arena.tsx:53`. |
| Change bench capacity | `bench = substitutes.slice(0, 5)` in `pitch-arena.tsx:189`. |
| Change payout scoring | `ScorePredictionPanel`'s "5 pts" / "3 pts" cards (score-prediction-panel.tsx:82) and `GoalscorerPanel`'s "2 pts" card. |
| Change celebration duration | `setTimeout(onDone, 2200)` in `lock-celebration.tsx:17`. |
| Change enter-transition timing | `LOADING_DURATION`, `FADE_DURATION`, `FLIP_DURATION` in `events-transition.tsx:12-14`. |
| Change slide-to-lock threshold | `if (v >= 0.95 && …)` in `slide-to-lock.tsx:41`. |
| Add on-chain submission for real PDAs | Remove the `!isSeed` early return in `handleSubmit` (page.tsx:236) and ensure `fixtureId` is resolved from `match.fixtureId`. |
| Change TopNav logo / spacing | `app/_components/top-nav.tsx` — the `gap-8` between logo and nav, and the `h-10 w-10` on the logo. |

---

## 17. Component Hierarchy (full tree)

```
ArenaPage (app/matches/[pda]/arena/page.tsx)
├─ EventsTransition (enter, portal)            [while showEnterTransition]
└─ PageShell (edgeToEdge hideTicker)
   ├─ TopNav
   │   ├─ Soccit logo (img)
   │   ├─ nav: Back button (isNested)
   │   └─ ProfileDropdown | ConnectWalletModal trigger
   ├─ Team name block                          [model=sub && sideSelected]
   ├─ Wallet-connect warning                   [!isDemo && !connected]
   ├─ Lock error banner                        [lockError]
   ├─ Submitting banner                        [submitting]
   ├─ Signatures list                          [signatures.length > 0 && !submitting]
   ├─ Demo lock banner                         [isDemo && lockMessage && !signatures]
   ├─ Model router
   │   ├─ PitchArena                           [model=sub && selectedTeam && sideSelected]
   │   │   ├─ Pitch surface
   │   │   │   ├─ Trapezoid turf (clipPath)
   │   │   │   ├─ SVG markings
   │   │   │   ├─ PlayerToken × 11
   │   │   │   └─ Instruction overlay
   │   │   ├─ Bench strip
   │   │   │   ├─ Bench header
   │   │   │   └─ BenchCard × up to 5
   │   │   ├─ Sidebar
   │   │   │   ├─ Tab header (Slip / Feed / Info)
   │   │   │   ├─ SlipTab
   │   │   │   │   ├─ Empty state | prediction rows + payout
   │   │   │   │   └─ SlideToLock
   │   │   │   ├─ LiveMatchFeed                [tab=feed]
   │   │   │   │   ├─ Events sub-tab
   │   │   │   │   └─ Leaderboard sub-tab
   │   │   │   └─ InfoTab                      [tab=info]
   │   │   │       ├─ How to Play steps
   │   │   │       ├─ Team label
   │   │   │       └─ Position color legend
   │   │   ├─ SubDetailSheet (mobile, portal)  [showSubDetail]
   │   │   └─ LockCelebration                  [celebrating]
   │   ├─ ScorePredictionPanel                 [model=score]
   │   │   ├─ Header
   │   │   ├─ TeamScore × 2 + VS
   │   │   ├─ Predicted Outcome card
   │   │   ├─ Payout grid (Exact Score / Correct Outcome)
   │   │   └─ SlideToLock
   │   ├─ GoalscorerPanel                      [model=goalscorer]
   │   │   ├─ Coming Soon badge
   │   │   ├─ Payout grid (faded)
   │   │   └─ Team player rows (faded)
   │   │       └─ PlayerCard × up to 5 per team
   │   └─ "Pick a side" placeholder            [model=sub && !sideSelected]
   ├─ TeamPickerModal (overlay)                [showTeamPicker]
   └─ LockCelebration (overlay)                [celebrating]
```
