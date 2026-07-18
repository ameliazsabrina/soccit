# Soccit Brand

## Status

Active. Hyper-Motion Neo Direction with real-pitch stadium HUD influences.

## Voice

Fast, competitive, match-day energy. Brutalist sports-tech. No fluff.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-purple` | `#034694` | Primary brand blue, gradient start |
| `--color-cyan` | `#DBA111` | Accent yellow, gradient end, highlights |
| `--color-white` | `#FFFFFF` | Light theme background |
| `--color-silver` | `#E8EAED` | Cards, tiles, surfaces in light theme |
| `--color-slate` | `#0A1628` | Primary text |
| `--color-ghost` | `#8A8D90` | Secondary text, ghost silhouettes |
| `--color-rose` | `#ED1C24` | Errors, drops, aggressive actions |
| `--color-bronze` | `#DBA111` | Rarity tier |
| `--color-gold` | `#DBA111` | Rarity tier |

### Event Campaign Palette

Used for the events banner on `/matches` and the bracket page at `/matches/events`.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-wc-blue` | `#034694` | Primary event blue |
| `--color-wc-cyan` | `#DBA111` | Accent yellow |
| `--color-wc-yellow` | `#DBA111` | Energy yellow |
| `--color-wc-lime` | `#DBA111` | Field accent |
| `--color-wc-red` | `#ED1C24` | Passion red |
| `--color-wc-orange` | `#ED1C24` | Sunset red |
| `--color-wc-purple` | `#034694` | Night blue |

## Typography

- **Display:** `Unica One`, uppercase, tight/negative tracking for headlines.
- **Menu card titles:** `Mona Sans`, weight 700, for clear high-impact navigation labels.
- **Body/tech:** `Space Grotesk`, geometric, high legibility.
- **Small labels:** `Space Grotesk` 500, 12px, uppercase, wide tracking.

### World Cup 2026 Campaign

- **Display/headlines:** `FWC2026 Normal Black` (local `@font-face` at `/fonts/fwc2026/FWC2026-Normal-Black.woff2`).
- **Support/body:** `Noto Sans` (Google Fonts), weights 400–700.
- Headlines are uppercase, heavy, and tight-tracked; body copy uses Noto Sans for legibility.

## Shape & Effects

- Default radius: `0px` (brutalist/sharp) for primary surfaces.
- Real-pitch HUD elements may use small radii (`0.5rem`) when helpful.
- Heavy use of blurred iridescent orbs behind crisp glass panels.
- Micro-interactions: `scale(1.02)`, gradient border reveals, neon box-shadows.

## Theme

Light theme is default (hyper_motion). A dark/stadium variant is supported via toggle; it keeps the same purple/cyan gradient system and swaps backgrounds to deep turf greens/stadium blacks.

## Pitch Aesthetic

- Real field markings: center line, halfway circle, penalty boxes.
- Turf surface: deep greens with chalk-white lines.
- Magnetic dashed slots mapped to an 11-player formation.
