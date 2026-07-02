# UI/UX Spec: The Arena

## Purpose

The Arena is the core prediction interface. Users build a substitute prediction by assigning benched players to one or more formation slots on a virtual pitch, then lock the prediction. It must feel like a premium sports-management HUD combined with a TCG deck builder: a real perspective pitch, holographic magnetic slots, high-fidelity player cards, and a satisfying "lock" gesture.

## Design References

- `design/hyper_motion/the_arena_1/code.html` — 3×3 magnetic grid, ghost silhouettes, TCG cards, Bench Deck sidebar, Lock Predictions CTA
- `design/the_arena_layout/code.html` — perspective pitch, 11 slots, glass HUD panels, iridescent borders, live match feed sidebar
- `design/pitch_side_immersive_direction_prd.html` — 3D pitch, card slots, deck interface, energy glows
- `brand.md` — pitch aesthetic, purple/cyan energy, 0px radius, brutalist display type

## Current Implementation vs Reference

File: `app/_components/pitch-arena.tsx`

**Implemented:**
- 11-slot grid mapped to a 4-3-3 formation, showing starter lineups by default.
- Perspective pitch with field markings (outer border, halfway line, center circle).
- Drag-and-drop from bench to slot (desktop) + tap-to-place fallback (mobile).
- TCG player cards rendered inside slots when a substitute is dropped.
- Rarity system (bronze/gold/iridescent) on bench and slot cards.
- Ghost silhouette / magnetic glow on empty slots and drag-over states.
- "Locked" energy border state on dropped cards.
- Bench deck moved to a vertical left sidebar on desktop; horizontal scroll on mobile.
- Glass scoreboard HUD overlay inside the arena.
- Lock confirmation modal listing every substitution before final slide-to-lock.
- Right-sidebar live feed with tabs for **Match Events** (SSE) and **Leaderboard** (SSE) via shared `LiveMatchFeed` component.
- Connection status badge and manual reconnect button in the feed header.
- Demo mode uses mock feed; real matches open `EventSource` to `/api/events/:pda` and `/api/leaderboard/:pda/stream`.
- Prediction data model now stores `outPlayerId` + `inPlayerId` + `side` + `slotId` + `position`.
- "Full Logs" link in feed footer routes to `/matches/[pda]/logs`.

**Remaining gaps:**
- No formation selector / team chemistry panel yet.
- No countdown timer on lock CTA yet.
- Prediction submission still stubbed; waiting for real `POST /api/prediction/prepare` shape.

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ Navbar (logo, wallet, theme)                                         │
├──────────────────────────────────────────────────────────────────────┤
│ ← Back        [Demo Mode badge]                                      │
├─────────────────────────────┬──────────────────────┬─────────────────┤
│                             │                      │                 │
│  BENCH DECK                 │  Scoreboard Overlay  │  LIVE MATCH FEED│
│  Available Substitutes      │  ◆ 2 - 1 ◆   63' LIVE│  [Events|Leader]│
│                             │                      │                 │
│  ┌───────┐                  │  ┌───────────────┐   │  21:45 Sub ▲   │
│  │  TCG  │                  │  │   THE PITCH   │   │  18:32 Tact    │
│  │ Card  │                  │  │               │   │  15:10 Shot    │
│  ├───────┤                  │  │ LW  ST  RW    │   │  08:47 Card    │
│  │  TCG  │                  │  │               │   │                │
│  │ Card  │                  │  │   LCM CM RCM  │   │                │
│  ├───────┤                  │  │               │   │                │
│  │  TCG  │                  │  │ LB LCB RCB RB │   │                │
│  │ Card  │                  │  │               │   │                │
│  └───────┘                  │  │       GK      │   │                │
│                             │  │               │   │                │
│                             │  └───────────────┘   │                │
│                             │                      │                │
│                             │  [LOCK PREDICTIONS]  │                │
│                             │  (opens confirm      │                │
│                             │   modal with slide)  │                │
└─────────────────────────────┴──────────────────────┴─────────────────┘
```

## Visual Language

### Pitch
- Perspective: `perspective: 1200px`, `rotateX(20–45deg)`, `scale(1.05–1.1)`.
- Surface: gradient from `--pitch-turf` (#122B1E) to `--pitch-deep` (#081A12).
- Border: 10px solid `--pitch-deep`.
- Markings: chalk-white lines (`rgba(248,250,252,0.4)`) with subtle shadow glow:
  - outer border inset
  - halfway line
  - center circle
  - penalty boxes (optional)
- Atmospheric cyan glow behind the pitch surface.

### Slots
- 11 card-shaped slots mapped to formation positions.
- Empty state: dashed `--cyan/40` border, ghost silhouette (player outline icon) at 40% opacity, label.
- Hover / drag-over: ghost opacity 100%, background tints `#F8FAFC` (light) or cyan/5 (dark), dashed border becomes solid cyan.
- Filled state: contains the dropped TCG card.
- Locked state: card wrapped in iridescent gradient border + `--shadow-energy` glow.

### TCG Player Cards
- Size: 160×240px (compact bench) or 180×252px (arena slot).
- Shape: chamfered clip-path polygon (8 points) for a collectible card feel.
- Rarity backgrounds:
  - **Bronze** `#CD7F32` — lower-rated subs, subtle metallic texture
  - **Gold** `#D4AF37` — high-rated subs, liquid gold texture
  - **Iridescent** — special edition, purple/cyan holographic mesh
- Anatomy:
  - Top-left: position badge (ST, CM, CB…) + Overall Rating
  - Center: player silhouette/initials
  - Bottom: glassmorphic pill with multiplier + price/number
- Hover (bench): `translateY(-10px) scale(1.05)`, brightness boost.
- Dragging: rotate 3deg, drop shadow float.

### Bench Deck Sidebar
- Fixed width 320px on desktop.
- Header: "Bench Deck" + "Available Substitutes".
- Vertical scrollable list of TCG cards.
- Each card draggable.
- Mobile: becomes bottom sheet/drawer or horizontal scroll.

### HUD Panels
- Left panel: Formation selector, Team Chemistry meter.
- Top-center: glass scoreboard pill with team badges and score.
- Bottom-right: Lock CTA + countdown timer + slot-fill counter.
- Right panel: Live Match Feed (SSE-driven).

### Lock CTA
- Gradient purple-to-cyan button, sharp corners.
- Inactive: muted gray, disabled.
- Active: gradient, `--shadow-neon`, hover scale(1.05).
- Include countdown timer until lock deadline.
- Consider keeping the `SlideToLock` component but styled larger and more central.

## Components Needed

1. **ArenaLayout** — full-screen shell with header, left bench, center pitch, right feed.
2. **PerspectivePitch** — 3D transformed turf with markings.
3. **FormationSlot** — empty/filled/locked states, drag handlers, ghost silhouette.
4. **PlayerCard** — full TCG component with rarity variant.
5. **BenchDeck** — vertical list of draggable `PlayerCard`s.
6. **ScoreboardHUD** — glass pill overlay with live score/minute.
7. **LeftHUDPanel** — formation select, chemistry meter.
8. **LockActionBar** — gradient CTA, timer, fill count.
9. **LiveMatchFeed** — SSE-driven event list (reuses Events Matrix row component).
10. **PredictionSummarySheet** *(optional)* — review selected substitutions before locking.

## Prediction Data Model

Implemented in `app/_components/pitch-arena.tsx`.

A substitute prediction pairs the starter being replaced with the substitute coming on:

```ts
interface SubstitutionPrediction {
  slotId: string;        // e.g. "lw", "cm", "gk"
  position: string;      // e.g. "Forward", "Midfielder"
  outPlayerId: number;   // starter currently in this slot
  inPlayerId: number;    // substitute from bench being predicted
  side: 1 | 2;
}

type PredictionDraft = Record<string, SubstitutionPrediction>;
```

This matches the backend `kind: 2` (COMBO) prediction structure in `Leaderboard`:

```ts
{
  kind: 2,
  side: 1,
  outPlayerId: 5001,
  inPlayerId: 5002,
  points: 12,
  players: { out: ResolvedPlayer, in: ResolvedPlayer }
}
```

### Mapping slots to predictions

For each `FORMATION_SLOTS` entry:
- `slotId` → unique key
- `position` → used to find the starter currently occupying the slot
- `outPlayerId` → starter player's `id` (from `lineup` filtered by `starter === true` and matching position/formation mapping)
- `inPlayerId` → dragged substitute player's `id`
- `side` → the team's side selected on Match Details

### Lock flow

1. User drags substitutes onto slots.
2. Clicking **Lock Predictions** opens a confirmation modal listing every substitution (`out` → `in`).
3. User slides to lock inside the modal.
4. `onLock(Object.values(predictions))` is called on the page; demo mode marks locked immediately, real mode will call the prediction endpoint once documented.

## Interactions & Micro-interactions

| Element | Trigger | Effect |
|---------|---------|--------|
| Bench card | Hover | lift + scale(1.05) + brightness |
| Bench card | Drag start | rotate 3deg, heavy shadow, opacity 0.95 |
| Slot | Drag over | ghost silhouette pulses to 100%, border solid cyan, bg tint |
| Slot | Drop | card snaps to center with spring, ghost crossfades out, energy burst |
| Slot | Click (mobile) | if sub selected, place it; if filled, clear |
| Clear button | Click | card shrinks out, slot returns to empty |
| Lock button | Hover | scale(1.05), neon shadow |
| Lock succeed | Lock | all filled cards get gradient energy border, CTA text changes to "LOCKED" |
| New feed event | SSE | row slides in from top, subtle flash |

## Responsive Notes (Desktop-First)

- Desktop (≥1280px): vertical bench sidebar left, pitch center, feed sidebar right.
- Tablet (768–1279px): bench collapses to bottom horizontal scroll, feed below pitch or hidden behind tab.
- Mobile (<768px): 2D pitch (reduce rotateX), bottom sheet for bench, tap-to-place only, lock action pinned to bottom.
- Ensure pitch remains usable on small screens: scale down, reduce slot sizes, simplify markings.

## Empty / Error / Loading States

| State | Visual |
|-------|--------|
| Loading | Pitch surface visible but slots show ghost silhouettes pulsing; bench skeleton cards. |
| No substitutes | Bench empty state: "No bench data available." |
| Not your turn / locked | Lock CTA disabled, tooltip "Predictions locked for this match." |
| Wallet not connected (real match) | Overlay or banner: "Connect wallet to lock predictions." |
| SSE feed empty | "No events yet. Awaiting kick-off…" |
| SSE reconnect | Subtle pulse on feed header. |

## Data Sources from API

| Field | Source | Endpoint |
|-------|--------|----------|
| Team lineups | `Lineup.teams[]` | `GET /api/lineup/:pda` |
| Starters | `players.filter(p => p.starter)` | `GET /api/lineup/:pda` |
| Substitutes | `players.filter(p => !p.starter)` | `GET /api/lineup/:pda` |
| Live score/minute | `MatchState` | `GET /api/match/:pda` |
| Match events | SSE | `GET /api/events/:pda` |
| Leaderboard | SSE | `GET /api/leaderboard/:pda/stream` |
| Prediction submit | **Unknown / not documented** | likely `POST /api/prediction/prepare` + subsequent on-chain transaction |

## Open Questions / Blockers

1. **Prediction submission endpoint:** What is the full request/response shape of `POST /api/prediction/prepare`? Does it return a transaction to sign, or does it just prepare state? Is there a separate `POST /api/prediction/submit`?
2. **On-chain transaction flow:** Does locking require the user to sign a Solana transaction after sliding to lock? How is the entry fee (USDC) transferred?
3. **Multiple predictions:** Can a user submit predictions for multiple slots in one transaction, or one per slot?
4. **Rarity data:** Is player rarity/multiplier provided by the API, or should the frontend derive it from rating?
5. **Formation mapping:** The backend returns `positionId` and `position` strings but not formation coordinates. The frontend owns the 4-3-3 mapping. Is this acceptable, or should formations be data-driven?
