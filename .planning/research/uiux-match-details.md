# UI/UX Spec: Match Details

## Purpose

Match Details is the pre-game / in-game lobby for a single fixture. It shows the scoreboard, on-chain pool status, and available prediction models. It is the gateway into the Arena for the substitute prediction flow. The page must feel like a premium match-day broadcast overlay, not a generic dashboard.

## Design References

- `design/the_arena_layout/code.html` — glass scoreboard overlay, team badges, pool/entry info
- `design/hyper_motion/hyper_motion_neo_direction_prd.html` — Events Matrix card styling
- `frontend-integration.md` — `GET /api/match/:pda`, `GET /api/lineup/:pda`
- `brand.md` — Hyper-Motion Neo color palette

## Current Implementation vs Reference

File: `app/matches/[pda]/page.tsx`

**Implemented:**
- Loads real `match` and `lineup` data from API (or demo data).
- Glass scoreboard HUD with iridescent purple/cyan team badges and live pulse.
- Pool info rendered as three HUD stat blocks.
- Wallet gate banner for real matches.
- Prediction model cards with active / coming-soon / disabled states.
- Demo mode badge and no-wallet bypass.
- Team picker modal routes to `/matches/[pda]/arena?side=X`.
- On-chain status rendered in scoreboard (e.g. "Open for Predictions").
- Live `LiveMatchFeed` component embedded below model cards, showing real SSE events + leaderboard.
- "Full Logs" link routes to `/matches/[pda]/logs`.

**Remaining gaps:**
- Model cards still use Lucide icons; could be replaced with Material Symbols or custom icon wells.
- No pitch preview or lineup preview on this screen yet.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar (logo, wallet, theme)                                │
├─────────────────────────────────────────────────────────────┤
│ Main container max-w-5xl mx-auto px-4 py-12                 │
│                                                              │
│  MATCH DETAILS                                               │
│  Prediction Models                                           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [●] 63' LIVE                                       │    │
│  │  ◆ 0  -  0  ◆                                       │    │
│  │  Home FC          Away United                       │    │
│  │  Pool: $50.00  Entry: $1.00  Participants: 5        │    │
│  │  Status: OPEN                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  [Wallet gate banner if real match + not connected]         │
│                                                              │
  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
  │  │ Substitute  │  │ Guess the   │  │ First       │         │
  │  │ Prediction  │  │ Score       │  │ Goalscorer  │         │
  │  │ [ACTIVE]    │  │ Coming Soon │  │ Coming Soon │         │
  │  └─────────────┘  └─────────────┘  └─────────────┘         │
  │                                                              │
  │  MATCH STREAM — Live Events / Leaderboard [Full Logs →]     │
  │                                                              │
  │  [Demo Mode badge]                                          │
  └─────────────────────────────────────────────────────────────┘
```

## Visual Language

### Scoreboard
- Floating glass panel (`glass` class) with `backdrop-blur(12px)`.
- Team badge: 48–56px square with iridescent gradient border (`iridescent-border`), team initials.
- Score bars: two vertical bars between badge and score, showing team momentum or just decorative.
- Score: `font-display` 56px, `--foreground`.
- Live minute: `--rose` pulsing dot + `font-mono` uppercase.
- Pool stats: three small HUD blocks below scoreboard or inline.

### Prediction Model Cards
- Large clickable tiles, sharp corners, 1px `--surface` border.
- Active card: hover gradient border, icon well inverts to purple, scale(1.02).
- Coming-soon card: 60% opacity, muted icon well, no hover scale.
- Disabled (no wallet on real match): opacity 50%, `cursor-not-allowed`.
- Title: `font-display` 24px uppercase.
- Description: `Space Grotesk` 14px `--muted`.

### Side Selection Modal
- Backdrop blur overlay.
- Modal: white/surface, sharp corners, max-w-2xl.
- Two large team buttons with badge, name, and hover-reveal "Select Team X" label.
- Team A hover: purple energy shadow. Team B hover: cyan energy shadow.

## Components Needed

1. **MatchScoreboard** — glass panel with team badges, score, minute, live indicator, pool stats.
2. **PoolStatsBar** — Entry Fee / Pool Total / Participants in compact HUD blocks.
3. **OnchainStatusBadge** — OPEN (cyan), RESOLVED (purple), SETTLED (gold), UNKNOWN (muted).
4. **PredictionModelCard** — active/coming-soon/disabled states.
5. **TeamPickerModal** — select home/away side before entering arena.
6. **WalletGateBanner** — real matches require wallet connection.
7. **DemoBadge** — gold accent badge when `pda === "demo"`.

## Interactions & Micro-interactions

| Element | Trigger | Effect |
|---------|---------|--------|
| Scoreboard | Mount | fade + slight scale-in |
| Live dot | Always | pulse animation |
| Active model card | Hover | gradient border, scale(1.02), shadow-float |
| Active model card | Click | open TeamPickerModal |
| Team button | Hover | energy glow shadow, "Select" label fades in |
| Retry button | Error | rotate icon + reload data |

## Responsive Notes (Desktop-First)

- Desktop: scoreboard horizontal (badge-team / score / team-badge), model cards 3-column.
- Tablet: scoreboard stacks vertically, model cards 2-column.
- Mobile: scoreboard full-width stacked, model cards 1-column, modal becomes full-screen sheet.
- Pool stats: horizontal inline on desktop, stacked on mobile.

## Empty / Error / Loading States

| State | Visual |
|-------|--------|
| Loading | Centered spinner on page shell; avoid layout shift by reserving scoreboard height. |
| Invalid PDA | Error page: "Invalid match address." with back link. |
| 404 / not ready | Friendly "Match data is not available yet" with retry and suggestion to try demo. |
| 500 / RPC failure | Retryable error banner with exponential backoff retry. |
| No lineup | Scoreboard still shows; model cards disabled with tooltip "Lineup loading". |

## Data Sources from API

| Field | Source | Endpoint |
|-------|--------|----------|
| Score, minute, status | `MatchState.live`, `MatchState.onchain` | `GET /api/match/:pda` |
| Team names | `Lineup.teams[].teamName` | `GET /api/lineup/:pda` |
| Entry fee, pool, participants | `MatchState.onchain` | `GET /api/match/:pda` |
| On-chain status | `MatchState.onchain.statusLabel` | `GET /api/match/:pda` |
| Wallet connection | Client adapter state | `@solana/wallet-adapter-react` |
| Demo flag | `params.pda === "demo"` | route param |

## Prediction Model → Arena Mapping

When the user selects **Substitute Prediction** and picks a side, route to:

```
/matches/[pda]/arena?side=1|2
```

Pass to Arena:
- `match` (for scoreboard overlay)
- `lineup` filtered to selected `side`
- `side` (1 or 2)

The Arena then renders the pitch from the selected team's perspective (slots mapped to that team's formation).

## Open Questions / Blockers

1. Should the Match Details page also display a mini lineup preview or recent events to help users choose a side?
2. How should the page behave once the match is `RESOLVED` or `SETTLED`? Disable predictions, show results/leaderboard tab by default?
3. Are there future prediction models (score, goalscorer) on the roadmap, or should we remove those cards to reduce scope?
