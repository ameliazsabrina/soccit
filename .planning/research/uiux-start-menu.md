# UI/UX Spec: Start Menu

## Purpose

The Start Menu is the command center a returning user sees after the landing experience. It must surface the featured match, communicate portfolio status, and provide fast navigation to the core loops (Portfolio, Explorer, Leaderboard), establishing the "Hyper-Motion Neo" visual language immediately: brutalist uppercase display type, iridescent purple/cyan energy, liquid silver tiles, and microscopic but satisfying motion.

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
- Fullscreen game-menu layout locked to viewport height (no scroll)
- Inline tabs `[menu] [match] [leaderboard] [profile]` above the grid
- Profile/Connect button top-right with `ProfileDropdown` and custom `ConnectWalletModal`
- 5-column masonry grid on desktop: Featured Match (`col-span-3`), Portfolio (`col-span-2`), Explorer (`col-span-2`), Leaderboard (`col-span-3`)
- Featured Match tile shows Portugal vs Argentina country flags, team names, and `ENTER MATCH` CTA
- Portfolio tile shows portfolio value (or `$0.00` + wallet icon when disconnected) and active positions; links to `/profile`
- Explorer tile (rebranded from Data Logs) links to `/explorer`
- Nav tiles with white icon wells; icon inverts on hover
- Arrows removed from all cards except the Featured Match CTA
- Current Rank shown top-right on Leaderboard tile
- All cards require a connected wallet; disconnected clicks open the wallet modal
- Material Symbols icons loaded globally
- Generated WebP player silhouette placeholders in `/public/assets/cards/`; team flags served via `flagcdn.com`
- Diagonal blue shine sweep + oversized corner images that scale on hover
- Hovered tile jumps above siblings with `z-50`
- Space Grotesk 700 for titles/values; Inter for descriptions and labels

**Remaining gaps:**
- Live ticker still mocked pending market/odds endpoint.
- Portfolio value, active positions, and rank are static mocks until backend data is available.
- Featured match is currently hardcoded to Portugal vs Argentina with plausible World Cup 2026 lineups; needs a real fixture endpoint.
- WebP placeholders are silhouettes; final player photography/illustrations needed.
- Team logos are country flags from a public CDN; production should use a self-managed bucket + CDN for crests/custom logos.

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ Main container max-w-[1200px] mx-auto px-8 lg:px-8 py-8          │
│                                                                  │
│  [menu] [match] [leaderboard] [profile]            [CONNECT]     │
│                                                                  │
│  ┌─────────────────────────────────────────┐  ┌────────────────┐ │
│  │  [🇵🇹] [🇦🇷]                             │  │  PORTFOLIO     │ │
│  │  FEATURED MATCH                         │  │  $14,093.50    │ │
│  │  Portugal vs Argentina · World Cup 2026 │  │  +24.5%        │ │
│  │  [ENTER MATCH →]                        │  │  Active Pos 0  │ │
│  └─────────────────────────────────────────┘  └────────────────┘ │
│  ┌───────────────────┐  ┌─────────────────────────────────────┐  │
│  │  EXPLORER         │  │  GLOBAL LEADERBOARD   [Current Rank]│  │
│  │                   │  │                                     │  │
│  └───────────────────┘  └─────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│ Live Ticker Marquee                                              │
└──────────────────────────────────────────────────────────────────┘
```

### Grid breakpoints
- Desktop (≥1024px): 5 columns, Featured Match spans 3 cols, Portfolio spans 2 cols, Explorer spans 2 cols, Leaderboard spans 3 cols
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
- Body/labels: `Inter` 12–14px (`font-body`), `--muted`, uppercase labels tracking wide

### Shape & Effects
- Radius: `0px` everywhere (brutalist).
- Tile hover: `scale(1.02)`, `box-shadow: 0 20px 40px -10px rgba(15,23,42,0.1)`, gradient border reveal via `background-image` padding-box/border-box trick.
- Icon wells: 40×40 white squares, fill with `--purple` + white icon on tile hover.
- Background orbs: two large blurred circles (`blur-[100px]`), purple top-left, cyan bottom-right, 10–15% opacity.

## Asset Strategy

### Team / Country logos
- **Short-term / demo:** Country flags are loaded from `https://flagcdn.com/<code>.svg` (e.g., `pt.svg`, `ar.svg`). This is a free, fast CDN and avoids shipping image assets for every nation.
- **Production:** Move to a self-managed bucket (AWS S3, Cloudflare R2, or similar) fronted by a CDN (CloudFront / Cloudflare Images). This gives control over caching, availability, and the ability to serve federation crests or custom team logos instead of flags.
- **Implementation note:** logos use a plain `<img>` tag with `h-24 w-auto object-contain` so wide or non-square assets (flags, crests) display without cropping or distortion.

### Player / card art
- Player silhouette placeholders live in `/public/assets/cards/` as WebP files.
- For production, replace with licensed photography or generated illustrations and serve from the same CDN/bucket.

## Components Needed

1. **StartMenuShell** — orbs, bottom ticker, grid wrapper, inline tabs, profile/connect button. Locked to `100vh` with `overflow-hidden`.
2. **LiveTicker** — infinite horizontal marquee of substitute price movements. Each row: `Name - POS: <value> <▲▼▬>`. Green up, rose down, muted flat. Duplicate content for seamless loop.
3. **FeaturedMatchTile** — large hero card showing:
   - top-left: home + away country flags and team names (Portugal vs Argentina)
   - title "FEATURED MATCH" and fixture info
   - `ENTER MATCH` gradient CTA linking to the featured match arena
   - requires wallet connection (opens modal if disconnected)
   - Hover: blue gradient bg, white text, diagonal shine, corner image scale.
4. **PortfolioTile** — portrait card (same height as hero) showing:
   - wallet icon at top-left
   - connected: "Total Portfolio Value", large value, 24h delta
   - disconnected: `$0.00` and a prompt to connect wallet
   - "Active Positions" summary
   - links to `/profile`; requires wallet connection (opens modal if disconnected)
   - Hover: rapid value ticks, blue gradient bg, white text, shine sweep, corner image scale.
5. **NavTile** — silver tile with:
   - top row: icon well + optional rank block (no arrows)
   - bottom row: title + description
   - requires wallet connection (opens modal if disconnected)
   - hover: blue gradient bg, white text/icons, shine sweep, corner image scale, `z-50` lift
6. **ExplorerTile** — NavTile linking to `/explorer` (rebranded Data Logs).
7. **LeaderboardTile** — NavTile with `Current Rank` top-right and no chart graphic.
8. **ProfileDropdown** — top-right wallet menu with Profile link and Disconnect.
9. **ConnectWalletModal** — custom two-stage modal (notification → wallet selector).
10. **WebP card assets** — player silhouette + team logo placeholders in `/public/assets/cards/`.

## Interactions & Micro-interactions

| Element | Trigger | Effect | Duration |
|---------|---------|--------|----------|
| Portfolio value | Hover | Randomize digits 5× then settle | 50ms per tick |
| Portfolio tile | Hover | scale(1.02), `z-50`, blue gradient bg, white text/icons, shine sweep | 150ms |
| Featured Match tile | Hover | scale(1.02), `z-50`, blue gradient bg, white text/icons, shine sweep | 150ms |
| Nav tile | Hover | scale(1.02), `z-50`, blue gradient bg, white text/icons, shine sweep, corner image scale | 150ms |
| Icon well | Tile hover | bg white, icon blue (#034694); accent variants keep brand color | 150ms |
| Corner image | Tile hover | grayscale → color, scale per `imageClassName`, origin bottom | 300ms |
| Shine | Tile hover | diagonal 315° sweep, lighter-blue edges + #034694 core | 450ms |
| Enter Match CTA | Hover | gradient position shift, neon shadow | 300ms |
| Any card | Click while disconnected | Open wallet connect modal | instant |
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
| No active positions | Portfolio tile shows `0` and rose text "NO ACTIVE POSITIONS." |
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
| Featured match | **Hardcoded** to Portugal vs Argentina; needs fixture listing or canonical match endpoint. |
| Team/country logos | **flagcdn.com** for demo; production should use self-managed CDN. |
| Live ticker values | **Not yet available** — currently mocked. Needs market/odds endpoint. |

## Open Questions / Blockers

1. What endpoint returns the user's global rank, portfolio value, and active positions?
2. What endpoint returns the featured / upcoming match (fixture, team names, logos) for the Featured Match tile?
3. Should `/explorer` aggregate events across all matches or remain scoped to a single canonical match?
4. What is the production asset strategy for team logos — S3/R2 + CloudFront/Cloudflare Images, or a sports-data provider with image rights?
