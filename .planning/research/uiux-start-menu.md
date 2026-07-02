# UI/UX Spec: Start Menu

## Purpose

The Start Menu is the command center a returning user sees after the landing experience. It must communicate portfolio status, provide fast navigation to the core loops (Arena, Events Matrix, Logs, Leaderboard), and establish the "Hyper-Motion Neo" visual language immediately: brutalist uppercase display type, iridescent purple/cyan energy, liquid silver tiles, and microscopic but satisfying motion.

## Design References

- `design/hyper_motion/hyper_motion_neo_direction_prd.html` — design system, Start Menu section
- `design/hyper_motion/start_menu/code.html` — reference implementation (light theme, masonry grid, portfolio ticker, nav tiles)
- `design/the_arena_layout/code.html` — alternative stadium-HUD treatment for stats/rank tiles
- `brand.md` — Hyper-Motion Neo direction, Unica One / Space Grotesk, 0px radius, purple/cyan energy

## Current Implementation vs Reference

File: `app/page.tsx`

**Implemented:**
- Atmospheric orbs background
- Live ticker marquee at bottom of screen
- Fullscreen game-menu layout with no top navbar
- Inline tabs `[menu] [match] [leaderboard] [profile]` above the grid
- Profile/Connect button top-right with `ProfileDropdown` and custom `ConnectWalletModal`
- Masonry grid with portfolio hero tile, Arena, Events Matrix, Data Logs, Global Leaderboard
- `Enter Arena` gradient CTA
- Nav tiles with white icon wells; icon inverts on hover
- Material Symbols icons loaded globally
- Generated WebP player silhouette placeholders in `/public/assets/cards/`
- Diagonal blue shine sweep + oversized corner images that scale on hover
- Mini-chart decoration on Leaderboard tile
- Space Grotesk 700 display typography (`unica-one`)

**Remaining gaps:**
- Live ticker still mocked pending market/odds endpoint.
- Portfolio value, active positions, and rank are static mocks until backend data is available.
- WebP placeholders are silhouettes; final player photography/illustrations needed.

## Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ Main container max-w-[1200px] mx-auto px-4 lg:px-8 py-12     │
│                                                              │
│  [menu] [match] [leaderboard] [profile]        [CONNECT]     │
│                                                              │
│  ┌─────────────────────────────────────┐  ┌───────────────┐ │
│  │                                     │  │  THE ARENA    │ │
│  │  Total Portfolio Value              │  │               │ │
│  │  $14,093.50  +24.5%                 │  ├───────────────┤ │
│  │                                     │  │  EVENTS       │ │
│  │  Active Positions 0                 │  │  MATRIX       │ │
│  │  [ENTER ARENA →]                    │  │               │ │
│  │                                     │  └───────────────┘ │
│  └─────────────────────────────────────┘                   │ │
│  ┌───────────────┐  ┌─────────────────────────────────────┐ │
│  │  DATA LOGS    │  │  GLOBAL LEADERBOARD        [mini ▄] │ │
│  │               │  │                                     │ │
│  └───────────────┘  └─────────────────────────────────────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Live Ticker Marquee                                          │
└──────────────────────────────────────────────────────────────┘
```

### Grid breakpoints
- Desktop (≥1024px): 3 columns, hero spans 2 cols, leaderboard spans 2 cols
- Tablet (768–1023px): 2 columns, all tiles 1 col
- Mobile (<768px): 1 column, tiles stack, ticker still visible

## Visual Language

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#FFFFFF` | page background |
| `--surface` / `--silver` | `#F3F4F6` | tile backgrounds |
| `--foreground` / `--slate` | `#0F172A` | headlines, body |
| `--muted` / `--ghost` | `#94A3B8` | labels, secondary text |
| `--purple` | `#8B5CF6` | primary energy, icon-well hover |
| `--cyan` | `#06B6D4` | secondary energy, hover borders, positive delta |
| `--rose` | `#F43F5E` | empty/warning states, negative delta |

### Typography
- Page label: `font-display` 12px uppercase, `--muted`, tracking `[0.2em]`
- Page title: `font-display` 40–64px, `--foreground`, `tracking-tight`
- Portfolio value: `font-display` 64–96px, `--foreground`, `leading-none tracking-tighter`
- Tile title: `font-display` 24px, uppercase, `--foreground`
- Body/labels: `Space Grotesk` 12–14px, `--muted`, uppercase labels tracking wide

### Shape & Effects
- Radius: `0px` everywhere (brutalist).
- Tile hover: `scale(1.02)`, `box-shadow: 0 20px 40px -10px rgba(15,23,42,0.1)`, gradient border reveal via `background-image` padding-box/border-box trick.
- Icon wells: 40×40 white squares, fill with `--purple` + white icon on tile hover.
- Background orbs: two large blurred circles (`blur-[100px]`), purple top-left, cyan bottom-right, 10–15% opacity.

## Components Needed

1. **StartMenuShell** — orbs, bottom ticker, grid wrapper, inline tabs, profile/connect button.
2. **LiveTicker** — infinite horizontal marquee of substitute price movements. Each row: `Name - POS: <value> <▲▼▬>`. Green up, rose down, muted flat. Duplicate content for seamless loop.
3. **PortfolioTile** — hero card showing:
   - label "Total Portfolio Value"
   - large value with decimal in muted
   - 24h delta with icon
   - "Active Positions" summary
   - `ENTER ARENA` gradient CTA
   - Hover: rapid value ticks, blue gradient bg, white text, diagonal shine, corner image scale.
4. **NavTile** — silver tile with:
   - top row: icon well + arrow outward icon
   - bottom row: title + description
   - optional `extra` node (rank, mini-chart)
   - hover: blue gradient bg, white text/icons, shine sweep, corner image scale
5. **ProfileDropdown** — top-right wallet menu with Profile link and Disconnect.
6. **ConnectWalletModal** — custom two-stage modal (notification → wallet selector).
7. **WebP card assets** — player silhouette placeholders in `/public/assets/cards/`.

## Interactions & Micro-interactions

| Element | Trigger | Effect | Duration |
|---------|---------|--------|----------|
| Portfolio value | Hover | Randomize digits 5× then settle | 50ms per tick |
| Portfolio tile | Hover | scale(1.02), blue gradient bg (#034694 → #1e40af), white text/icons, shine sweep | 150ms |
| Nav tile | Hover | scale(1.02), blue gradient bg, white text/icons, shine sweep, corner image scale | 150ms |
| Icon well | Tile hover | bg white, icon blue (#034694); Arena accent keeps purple icon | 150ms |
| Corner image | Tile hover | opacity 0.4 → 0.8, scale 1 → 1.25, origin bottom | 300ms |
| Shine | Tile hover | diagonal 315° sweep, lighter-blue edges + #034694 core | 450ms |
| Enter Arena CTA | Hover | gradient position shift, neon shadow | 300ms |
| Ticker | Always | translateX marquee loop | 25s linear |
| Tiles on mount | Mount | stagger fade-in + translateY(12px→0) | 300ms |

## Responsive Notes (Desktop-First)

- Desktop: 3-column grid, large type, all tiles visible.
- Tablet: 2-column grid, portfolio tile full width.
- Mobile: 1-column stack, reduce portfolio value to 48px, hide mini-chart on leaderboard tile, keep ticker but reduce font size.
- Touch: tiles must remain 44×44mm effective tap targets; hover states translate to active-press states (`active:scale-[0.99]`).

## Empty / Error / Loading States

| State | Visual |
|-------|--------|
| Loading | Silver pulsing skeleton blocks inside every tile; ticker hidden or static placeholder. |
| No active positions | Portfolio tile shows `0` and rose text "NO ACTIVE POSITIONS. ENTER THE ARENA." |
| Wallet not connected | Top-right Connect button opens custom wallet modal. |
| API error | Top banner rose background, retry button. Skeletons remain until first success. |

## Data Sources from API

| Field | Source | Endpoint |
|-------|--------|----------|
| Wallet connection | Client-side Solana wallet adapter | `@solana/wallet-adapter-react` |
| User profile | `GET /api/user/:wallet` | `app/_lib/api.ts#getUser` |
| Avatars | `GET /api/avatars` | `getAvatars` |
| User match history / points | `GET /api/user/:wallet/matches` | `getUserMatches` |
| Portfolio value | **Not yet available from API** — currently mocked. |
| Active positions | **Not yet available from API** — currently mocked. |
| Current rank | **Not yet available** — currently mocked. |
| Live ticker values | **Not yet available** — currently mocked. Needs market/odds endpoint. |

## Open Questions / Blockers

1. What endpoint returns the user's global rank, portfolio value, and active positions?
2. Is there a public match listing endpoint for the "Events Matrix" tile to preview live matches?
