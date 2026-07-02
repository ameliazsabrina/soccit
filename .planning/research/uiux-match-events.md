# UI/UX Spec: Match Events / Events Matrix

## Purpose

The Events Matrix is the match discovery screen and live match feed. It lets users browse active and upcoming fixtures, see the current score/minute, and quickly enter a prediction market. For an individual match, it also serves as a chronological timeline of substitutions, goals, cards, and other events that affect predictions and scoring.

## Design References

- `design/hyper_motion/hyper_motion_neo_direction_prd.html` — Events Matrix section
- `design/hyper_motion/events_matrix/code.html` — reference implementation (filter tabs, match cards, odds badges, slide-out trade panel)
- `design/the_arena_layout/code.html` — live match feed sidebar with event rows
- `frontend-integration.md` — `GET /api/events/:pda` SSE stream

## Current Implementation vs Reference

File: `app/matches/page.tsx`

**Implemented:**
- PDA input to load a real match (validates base58, fetches match + lineup before routing).
- Demo match card with live minute, score, and pool stats.
- Filter tabs (All Events / Live Now / Demo).
- Empty state explaining the missing discovery endpoint and showing a sample PDA format.
- Recently viewed matches persisted in `localStorage` (last 5 PDAs).
- Hyper-motion card styling with hover effects.

**Remaining gaps:**
- No real match discovery list; blocked by missing backend listing endpoint.
- No slide-out trade panel for event-context predictions.

## Layout Structure

### Discovery view (`/matches` or `/events`)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Events Matrix                    PNL: +1,204.50           │
├─────────────────────────────────────────────────────────────┤
│ [All Events] [Live Now] [Premier League] [Champions League] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ● 68'              Man City        2                    │ │
│ │                    Real Madrid     1                    │ │
│ │ ┌ Top Sub Markets ──────────────────────────────┐       │ │
│ │ │ FW  E. Haaland (Bench)        [ +2.4x ]       │       │ │
│ │ │ MF  L. Modric                 [ -1.1x ]       │       │ │
│ │ └───────────────────────────────────────────────┘       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ... more match cards ...                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              End of List                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### In-match feed (right sidebar inside Arena, or dedicated tab)

```
┌────────────────────┐
│ LIVE MATCH FEED    │
│ Prediction round live
├────────────────────┤
│ [Match Events] [Leaderboard]
├────────────────────┤
│ 21:45  Substitution │ 1.72 ↑
│        Odds Boosted │
│ 18:32  Midfielder   │ --
│        Injury Concern
│ 15:10  Shot on Target
│        Home Team    │ 2.15
│ 08:47  Yellow Card  │ 3.40
│        Away Team    │
└────────────────────┘
```

## Visual Language

### Colors
- Background: `#FFFFFF` (light), `#15121b` (dark stadium variant).
- Card surface: white / `--surface-elevated` with 1px `--surface` border.
- Live minute dot: `--rose` pulsing.
- Timestamp text: `--cyan` for active/substitution events, `--rose` for cards/incidents, `--muted` for neutral.
- Odds badge: silver background, text `--emerald` (up), `--rose` (down), `--slate` (flat).
- Active event left border: 4px `--cyan`.
- Incident event background: `--rose/10` with `--rose/30` border.

### Typography
- Screen title: `font-display` 28px uppercase, tracking wide.
- Filter tabs: `Space Grotesk` 14px uppercase bold, active has 2px `--cyan` bottom border.
- Match teams: `font-display` 24px.
- Player / event labels: `Space Grotesk` 14px semibold.
- Timestamps / odds: monospace-style `Space Grotesk` 12–13px.

### Shape & Effects
- Match cards: sharp corners, 1px border, hover shadow-float + cyan tint border.
- Odds badges: 48×24px silver pills (reference uses rounded-sm; keep 0px radius to match brand).
- Slide-out panel: fixed right, max-w-[400px], white, border-l, shadow `[-20px_0_40px_rgba(15,23,42,0.1)]`.

## Components Needed

1. **EventsMatrixHeader** — back button, screen title, PNL summary.
2. **FilterTabs** — horizontal scrollable tabs, active underline.
3. **MatchCard** — teams, score, minute/status, top sub markets list.
4. **OddsBadge** — position badge + player name + multiplier delta.
5. **EventRow** — timestamp, title, subtitle, optional point/odds delta, left accent border.
6. **EventTimeline** — vertical list of `EventRow`s with auto-scroll to newest.
7. **TradeSlidePanel** *(optional future)* — player asset info, stake input, confirm CTA.
8. **EndOfListState** — dashed border, ghost icon, muted text.

## Interactions & Micro-interactions

| Element | Trigger | Effect |
|---------|---------|--------|
| Match card | Hover | card-hover shadow + border cyan/30 |
| Odds badge | Hover | scale(1.02), border cyan/30 |
| Odds badge | Click | open trade panel or navigate to match arena |
| Event row | New event | slide down from top with flash, auto-scroll |
| Filter tab | Click | active underline animates, list refreshes |
| Trade panel | Open | overlay fades in, panel slides from right |

## Responsive Notes (Desktop-First)

- Desktop: 800px centered container, match cards horizontal layout with markets on the right.
- Tablet: markets move below team/score.
- Mobile: full-width cards, stacked layout, slide panel becomes full-screen sheet.
- Ensure filter tabs are horizontally scrollable without visible scrollbar.

## Empty / Error / Loading States

| State | Visual |
|-------|--------|
| Loading | Shimmer rows, skeleton odds badges. |
| No active markets | "NO MARKETS ACTIVE" centered in dashed container. |
| No events yet | "Awaiting kick-off…" or "No match events yet." |
| SSE reconnect | Subtle top banner: "Reconnecting…" with spinner. |
| Error | Rose banner with retry; cache previous events if possible. |

## Data Sources from API

| Field | Source | Endpoint / Transport |
|-------|--------|----------------------|
| Match list | **Not available** — needs new endpoint. | — |
| Live score/minute | `GET /api/match/:pda` | `getMatch` |
| Event timeline | SSE stream | `GET /api/events/:pda?fromId=0-0` via `useMatchEventsStream` |
| Event types | `event.type` from SSE payload | substitution, goal, yellow_card, red_card, injury, etc. |
| Resolved players | `players.out` / `players.in` on event entries | populated by backend lineup index |
| Odds/multipliers | **Not available** — currently mocked. | needs market/odds endpoint |

## Mapping API Events to UI

```ts
// SSE EventEntry
{
  id: "1719662400000-0",
  type: "substitution",
  payload: { side: 1, playerOutId: 5001, playerInId: 5002, minute: 63 },
  players: { out: ResolvedPlayer, in: ResolvedPlayer }
}
```

Render as:
- Timestamp: `63'`
- Title: `Substitution`
- Subtitle: `{in.name} ↔ {out.name}`
- Accent: cyan left border
- Optional: points/odds delta if available

## Open Questions / Blockers

1. **Match listing endpoint:** The frontend cannot build a discovery list without an endpoint that returns upcoming/live matches with their PDAs. Is there an internal/demo index we can expose?
2. **Odds/multiplier data:** Are multipliers computed server-side (and emitted on events) or should the frontend derive them?
3. **PNL summary:** Should PNL come from `GET /api/user/:wallet/matches` or a dedicated portfolio endpoint?
4. **Prediction entry from event card:** Does tapping an odds badge navigate to the Arena pre-filtered to that player, or open a trade panel?
