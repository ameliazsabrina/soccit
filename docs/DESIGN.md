# Soccit — UI/UX Design Specification

Complete design system, page layout spec, component spec, asset inventory, motion grammar, interaction models and responsive strategy for the Soccit frontend.

---

## 1. Brand

| Token | Value | Usage |
|-------|-------|-------|
| `--purple` | `#034694` | Primary brand, buttons, links, active states |
| `--cyan` | `#dba111` | Secondary brand, accents, highlights, badge |
| `--rose` | `#ed1c24` | Destructive, errors, live indicator |
| `--gold` | `#dba111` | Leaderboard first place, vault accent |
| `--bronze` | `#dba111` | Leaderboard third place |
| `--pitch-turf` | `#122b1e` | Field surface top gradient |
| `--pitch-deep` | `#081a12` | Field surface bottom gradient |
| `--pitch-line` | `rgba(248,250,252,0.45)` | Pitch markings |
| `--background` | `#ffffff` (light) / `#0a0a0a` (dark) | App background |
| `--foreground` | `#0a1628` (light) / `#f8fafc` (dark) | Text color |
| `--surface` | `#f4f4f4` (light) / `#15121b` (dark) | Card surface |
| `--surface-elevated` | `#ffffff` (light) / `#211e27` (dark) | Card elevated / hover |
| `--muted` | `#8a8d90` (light) / `#958ea0` (dark) | Subdued text |
| `--radius` | `0px` | Global corner radius — entirely flat. No rounding on cards, buttons, or inputs. |

### Font System

| Font class | Family | Weights | Use case |
|-----------|--------|---------|----------|
| `font-display` / `.unica-one` | Space Grotesk | 700 (uppercase, -0.02em tracking) | Headlines, team names, score display |
| `font-tech` | Space Grotesk | regular | Labels, status text |
| `font-body` | Inter | 400/500/600 | Paragraph text, descriptions |
| `font-wc` | FWC 2026 (loaded from `/public/fonts/fwc2026/FWC2026-Normal-Black.woff2`) | 900 | World Cup event campaign |
| `font-wc-support` | Noto Sans | 400–700 | World Cup supporting text |
| `material-symbols-outlined` | Google Material Symbols Outlined | 400 | UI icons (wallet, arrow_forward, etc.) |

All Google fonts loaded via `next/font/google` in `app/layout.tsx`. FWC 2026 via `@font-face` in `globals.css`. Material Symbols via `<link>` to `fonts.googleapis.com`.

### Gradient buttons

`.btn-gradient` — sliding linear gradient from `--purple` via `--cyan` back to `--purple` with 200% background-size. On hover the gradient shifts rightward and gains a `0 0 20px rgba(6,182,212,0.4)` glow.

### Top accent strip

Header cards carry a 1px gradient strip at top: `bg-gradient-to-r from-purple via-cyan to-purple`.

### Card shine

Cards marked with `.card-shine::before` show a blue diagonal streak on hover that slides from right `+120%` to left `-120%` over 0.45s. Purely cosmetic on hover.

### App background

Body uses `bg-cover bg-center bg-no-repeat bg-fixed` + `background-image: url('/app-bg.webp')`. Substitute: `bg-background` fallback for missing image. Events sub-pages keep their themed `bg-slate-950` + orbs.

---

## 2. Layout System

### Page height

Two layout modes via `PageShell`:

* `edgeToEdge` — TopNav in its own 32px-top padded container, children flow edge-to-edge. Used by the arena.
* **Default** — TopNav + content share `max-w-[1200px] mx-auto px-8 py-8 lg:px-8`.

### Vertical rhythm

| Token | Value | Use |
|-------|-------|-----|
| Gap between herosection + content cards | `gap-6` (24px) | All pages |
| Gap between content grid items | `gap-6` | | 
| Gap inside sidebar card | varies by sub-section |
| Padding on cards | `p-6` main, `p-5` sidebar, `p-4` inner |
| Card corner radius | `0px` (flat) |
| Tab bar height | `h-14` (56px) |
| Bench card container | auto, cards `aspect-[2/3]` |

### Page widths

| Page | max-width |
|------|-----------|
| Menu, Match list, Leaderboard, Profile, Explorer, Settlement, Logs, Match PDA | `max-w-[1200px]` |
| Score model | `max-w-2xl` (672px) |
| Goalscorer model | full arena flex |
| Match Hero card | `min-h-[260px] sm:min-h-[300px]` |

### Ticker

Horizontal marquee bar fixed at bottom: `fixed bottom-0 left-0 z-30`, sized `max-w-[1200px] mx-auto px-8`. 12px gap between items.

### Scrollbar

6px wide, muted thumb, rounded `9999px`, transparent track. Within scroll-x containers use `[&::-webkit-scrollbar]:hidden [scrollbar-width:none]` to hide.

---

## 3. Page Specifications

### 3.1 Menu `(/)`

**Layout:** default PageShell, ticker at bottom.

**Hero card** (`min-h-[420px]`): 
- Large gradient score display (5xl–7xl)
- Team flag/logo images from `flagcdn.com` at 24vh height with `object-contain`
- Player portraits at right using `object-contain object-bottom card-image-gray` (grayscale until hover)
- Card has `card-shine` and a gradient top bar

**Feature grid** below hero: 2 columns default — larger `lg:col-span-3` wide hero, `lg:col-span-2` side card, plus a row of 3 `min-h-[188px]` cards with icon, title, description, meta, and an arrow that translates-x on hover. All cards use `bg-surface` + `card-shine`.

### 3.2 Matches `(/matches)`

**Featured banner:** carousel auto-advancing every 6s, 260–300px min-height, `bg-cover` background, dark overlay, centered logo + label + enter button + pagination dots.

**Filter tabs** below banner: All Markets / Live Now / Open / Resolved / Settled.

**Match cards grid** `sm:grid-cols-2`:
- 1 flex column (left): live indicator or "Open for Predictions", team flag (`size="lg"` `object-contain`) + name + score row, then team 2 row
- 1 right section (`sm:w-48`): pool / entry / players with right-aligned mono numbers, and "Enter" button + `EnterButton` component
- Card has `card-shine`, `hover:-translate-y-0.5`, `hover:bg-surface/70`, `hover:shadow-[...]`

### 3.3 Match Details `(/matches/{pda})`

**Scoreboard MatchHero** (`min-h-[260px] sm:min-h-[300px]`):
- Live indicator (pulsing rose circle) or open status text
- Two team columns: `TeamBadge size="xl"` at `h-20 w-20 md:h-24 md:w-24` with name below at `text-sm md:text-base`
- Score display center: 5xl–7xl gradient text-white
- Tags row below: Demo / Devnet / Connect

**Open/Live layout:** two cards `sm:grid-cols-2 gap-6`
1. **VaultCard** — gold top accent bar, icon, pool/entry/players/prizes, hover `bg-surface-elevated`, click opens VaultModal
2. **EnterCard** — purple-cyan top accent bar, "Enter Live Match" + "Enter" button, hover `bg-surface-elevated`, entire card clickable

**Settled layout:** two cards `sm:grid-cols-2 gap-6`
1. **LogsPreviewCard** — 5 events listed + "View Full Logs" link
2. **ResultsPreviewCard** — final score, winner, prize pool, top winners + "View Full Results" link

**VaultModal** (connect-wallet style):
- `bg-foreground/60` backdrop, `scaleX 0→1` 0.18s animation
- `border border-cyan/40`, `bg-background`
- Pool / Entry / Participants / Platform Fee (20%) / Net Pool rows
- Prize distribution 1st/2nd/3rd with medal colors

### 3.4 Arena `(/matches/{pda}/arena)`

**Top nav:** Back button → parent route + model tabs: **Score | Pitch | Goalscorer** (default=Score).

**Loading:** `EventsTransition` overlay — 6×8 tile grid flip with "Loading Match" title + `soccit-logo-black.webp` logo, progress bar, fade-out when done. Falls back to logo + loading-bar screen if needed.

**Score model** (`max-w-2xl`):
- `bg-surface p-6 md:p-10` card with "Call the Score" header, team flags `size="xl"`, +/- score controls, predicted outcome panel, 5pts exact / 3pts outcome boxes, SlideToLock.

**Pitch model:**
- TeamPicker modal → pick team → SlideToLock → field loads
- Grid layout `lg:grid-cols-[1fr_40%]` gap-6
- Left column: PitchCard (top) + bench label+row (bottom) gap-4
- Right column: Sidebar (40% width)

**PitchCard** (`h-[300px] sm:h-[380px] lg:h-[440px]`):
- `object-fill` on `field.webp` (stretches edge-to-edge)
- Team name overlay top-left (`bg-background/40 backdrop-blur-sm`)
- 11 tokens at `w-12 sm:w-14 aspect-[2/3]` positioned by `gridX/gridY`
- Each token: TCG WebP + number (top-right) + name bar (bottom)
- With sub assigned: multiplier badge + clear-X button (unless locked)

**Bench** (no card box):
- "Bench (N)" label + "Cancel selection" link
- Scrollable horizontal row of TCG cards `aspect-[2/3] w-[130px] sm:w-[150px] shrink-0 snap-start`
- Hidden scrollbar
- Hover `hover:-translate-y-1`, selected `-translate-y-2 scale-105`

**Sidebar:**
- Three tabs: Events / Prediction / Rank
- Events has **sub-tabs: Overview | Streams**
  - Overview: team name + starters text list (numbered, name + position code)
  - Streams: live event feed
- Prediction: pending + locked predictions list (no multiplier)
- Rank: leaderboard view
- Surface: `bg-surface`, tab active = `border-b-2 border-purple bg-background text-foreground`

### 3.5 Logs `(/matches/{pda}/logs)`

- `max-w-[1200px]` content
- Summary cards: Match / Score / Minute (3 columns on sm)
- Filter/search bar: `bg-surface p-3` with search input + filter pills
- Timeline: `bg-surface p-4 max-h-[50vh] overflow-y-auto`
- Events listed as rows with minute badge, colored icon, type, player swap
- PageShell wraps everything, TopNav + ticker visible

### 3.6 Settlement `(/matches/{pda}/settlement)`

- 3-col hero grid: Final score, Match winner, Prize pool (each `min-h-[200px]`)
- Below:
  1. **Top Finishers** (`lg:col-span-2`) — gold/foreground/bronze ranking with prize amounts
  2. **Prize Breakdown** (`lg:col-span-1`) — 50% / 30% / 20% distribution with net pool note

### 3.7 Explorer `(/explorer)`

- `max-w-[1200px]` content
- Summary cards
- Search + filter dropdown bar
- Event table `max-h-[55vh] overflow-y-auto` with sticky header
- **Pagination**: 20 events per page, prev/next chevron buttons, page counter
- Reset page on filter/search change

### 3.8 Leaderboard `(/leaderboard)`

- 3-col grid: "Your Rank", stats cards, achievement streaks
- All cards `bg-surface p-8` flat style

### 3.9 Profile `(/profile)`

- Avatar + username display
- Entry fee / points / predictions counters
- Activity feed
- All `bg-surface p-8`

---

## 4. Component Specs

### 4.1 PageShell
- `relative flex h-screen flex-col overflow-hidden`
- variant default: `bg-background bg-cover bg-center bg-no-repeat bg-fixed` + inline style `background-image: url('/app-bg.webp')`
- variant worldcup: `bg-slate-950` + orbs kept
- Optional `edgeToEdge`, `fullWidth`, `hideTicker`, `arenaTabs`
- Ticker visible when `!hideTicker`

### 4.2 TopNav
Home logo (`h-10 w-10`), 5 nav tabs (menu/match/leaderboard/profile/explorer) shown at root path, Back button + arenaTabs on nested paths.
- Tabs: `border px-5 py-2.5 font-tech text-xs uppercase tracking-[0.15em]`
- Active: `border-purple bg-purple text-white`
- Inactive: `border-surface bg-surface text-muted hover:border-purple hover:bg-purple hover:text-white`
- Back: navigates to parent route (strips last URL segment)
- Right side: `ProfileDropdown` (connected) or `CONNECT` button (disconnected)

### 4.3 TeamBadge
- Auto-detect country code → `flagcdn.com/{code}.svg` with `object-contain`
- Sizes: `sm` 24px, `md` 28px, `lg` 40px, `xl` up to 96px (responsive)
- Fallback: initials in `bg-surface` square

### 4.4 Pitch Arena
- Grid: `lg:grid-cols-[1fr_40%]`
- Bench: scrollable TCG row, no container card
- Token size: `w-12 sm:w-14`
- Hover: `hover:scale-110`
- Locked: `grayscale opacity-70 hover:scale-100` + lock icon

### 4.5 TCG WebP Cards
- Path: `/assets/cards/players/{fw|md|df|gk}.webp`
- Size: 1023×1537 px (2:3 portrait), no alpha
- Perspective rendering info baked in: position code top-left (no overlay needed)
- Overlay text: player number top-right, name centered in name bar
- Bench card name: `text-[11px] sm:text-sm` bold uppercase white with drop-shadow

### 4.6 TeamPicker Modal
- Pick team → SlideToLock in same modal
- On close: navigate to score mode

### 4.7 LockedWarningModal
- Standard modal: Lock icon, "Prediction Locked" title, OK button

### 4.8 SlideToLock
- 14×14 thumb dragging along horizontal
- Background fills cyan as thumb reaches right
- On 95% progress triggers `onLock()`

### 4.9 Modals (all share connect-wallet-modal pattern)
- Backdrop: `bg-foreground/60` (no blur)
- Panel: `scaleX 0→1` 0.18s from center, `originX: 0.5`
- Surface: `border border-cyan/40 bg-background`
- Shadow: `shadow-[0_20px_40px_-10px_rgba(15,23,42,0.15)]`
- Close: X top-right `h-8 w-8`, ESC key, click outside
- Used by: connect-wallet, onboarding, team-picker, vault, confirm-subs, locked-warning

### 4.10 EventsTransition
- 6×8 tile grid perspective flip (center-out stagger)
- Loading phase 2.2s → fade 400ms → flip 1.4s
- Configurable logo (`logoEnter`) and title (`titleEnter`)

### 4.11 Sound Effects
- Hover: `/sounds/hover.wav` (120ms, 22% volume)
- Click: `/sounds/click.wav` (150ms, 45% volume)
- Delegated globally, 70ms hover cooldown + 500ms per-element cooldown
- Mute persisted to localStorage

---

## 5. Motion Grammar

| Motion | Duration | Easing | Use |
|--------|----------|--------|-----|
| Page transitions (PageTransition) | see component | based on index | Stagger card appearances |
| Modal open | 0.18s | `cubic-bezier(0.4,0,0.2,1)` | scaleX from center |
| Modal backdrop fade | 0.12s | linear | Opacity 0→1 |
| Card hover lift | 0.15s | default | `-translate-y-0.5` |
| Token hover scale | instant | — | `hover:scale-110` |
| Field token drop flash | 0.55s ease-out | `slot-flash` | Radial gold burst on placement |
| SlideToLock thumb spring | 0.2s | — | On release or lock |
| Loading bar | 1.8s cubic-bezier(0.45,0,0.55,1) infinite | — | `loading-bar-fill` class |
| Tile flip (EventsTransition) | 700ms each + stagger 65ms/distance | center-out | Match arena entry/exit |
| Celebration burst | 2.2s ease-out forwards | radial-gradient | After slide lock |
| Card shine | 0.45s cubic-bezier(0.4,0,0.2,1) | — | Diagonal streak on hover |
| Marquee | 25s linear infinite | — | Ticker bottom bar |
| Reduced motion: all 0.01ms | — | — | `prefers-reduced-motion` |

---

## 6. Responsive Strategy

| Breakpoint | Tailwind | What changes |
|-----------|----------|--------------|
| Mobile (< 640px) | base | 1 column grids, `w-[130px]` bench cards, `h-[300px]` PitchCard, no sidebar visible without tab switch |
| sm (≥ 640px) | `sm:` | 2-column grids, `sm:w-[150px]` bench cards, `sm:h-[380px]` PitchCard |
| lg (≥ 1024px) | `lg:` | 3-column layouts, `lg:h-[440px]` PitchCard, `lg:grid-cols-[1fr_40%]` arena split |
| md (≥ 768px) | `md:` | Header text scaled up, score 6xl–7xl |

### Specific responsive rules

- Cards get `sm:` and `md:` text sizes; tokens get `sm:` width bump (not `md:`)
- `object-fill`/`object-cover`/`object-contain` used by asset ratio
- Bench row uses `overflow-x-auto` with hidden scrollbar (only horizontal swipe)
- Field `min-w-[560px]` forces horizontal scroll on very narrow screens
- Ticker bar always `px-8 lg:px-8` regardless of viewport
- Modals `max-w-2xl` shrink to `w-full` with `p-4` padding

---

## 7. Public Assets Inventory

### `public/` root

| Path | Dimensions / Format | Purpose | Replace? |
|------|---------------------|---------|----------|
| `/field.webp` | 1200×900 (4:3) | Pitch background image. Rendered `object-fill` to stretch into PitchCard. | Yes — author at 1200×900 (or larger 2400×1800 for retina). 3:2 aspect recommended. See `field-template.svg` for markings reference. |
| `/field-template.svg` | 1200×700 (≈3:2) | Reference SVG of pitch markings (trapezoid, penalty areas, goals). | Use as overlay base when recreating `field.webp`. |
| `/app-bg.webp` | 1672×941 | App background image. Rendered `bg-cover bg-fixed`. | Yes — replace with branded background. |
| `/sounds/hover.wav` | 120ms PCM | Hover sound effect (silent placeholder). | Yes — author 50–120ms soft attack. |
| `/sounds/click.wav` | 150ms PCM | Click sound effect (silent placeholder). | Yes — author 80–180ms punchy attack. |

### `public/assets/`

| Path | Dimensions | Purpose |
|------|-----------|---------|
| `/assets/soccit-logo.svg` | 1544×954, white fills | Main logo, used in TopNav (`h-10 w-10`) |
| `/assets/soccit-logo-black.webp` | placeholder (was file path) | Black logo, used on loading screen (`h-24 sm:h-32`). Replace with real black logo `.webp` |
| `/assets/soccit-logo-black.svg` | 1544×954, black fills | Black logo SVG variant. |
| `/assets/Vector.png` | ⚠️ (unused) — remove or document | |
| `/assets/app-bg.webp` | current app-bg variant | Duplicate of root `app-bg.webp` — merged via root path. Can be removed. |

### `public/assets/cards/players/`

TCG player card WebPs. One per position class (no rarity variants currently).

| Path | Dimensions | Color theme | Position |
|------|-----------|-------------|----------|
| `/assets/cards/players/fw.webp` | 1023×1537 (2:3) | Red (#8d0000) | Forward |
| `/assets/cards/players/md.webp` | 1023×1537 | Green (#043011) | Midfielder |
| `/assets/cards/players/df.webp` | 1023×1537 | Blue (#001e9f) | Defender |
| `/assets/cards/players/gk.webp` | 1023×1537 | Gold (#e4a900) | Goalkeeper |

**Card layout (baked into image):**
- Position code ("FW"/"MD"/"DF"/"GK") rendered top-left (no overlay needed)
- Player number should appear in top-right dark area (frontend overlay)
- Player name centered on bottom bright band (82.4%–97.1% height)
- Center area (20%–78% height) is player silhouette/picture — currently empty; designed to hold animal character art later

**Recommended for creation:** Animal art lions (fw: lion/panther, md: wolf, df: bear, gk: eagle) drawn at 1023×1537 transparent PNG then exported as WebP, with safe margin around the baked frame edges.

### `public/assets/cards/`

Non-TCG card art, used for hero cards on home page and other section heroes.

| Path | Purpose |
|------|---------|
| `/assets/cards/player-arena.webp` | Player portrait for arena entry section |
| `/assets/cards/player-events.webp` | Player portrait for events section |
| `/assets/cards/player-hero.webp` | Player portrait for hero section |
| `/assets/cards/player-leaderboard.webp` | Player portrait for leaderboard section |
| `/assets/cards/player-logs.webp` | Player portrait for logs section |
| `/assets/cards/team-home.webp` | Home team bundled card |
| `/assets/cards/team-away.webp` | Away team bundled card |

### `public/assets/events/`

| Path | Purpose |
|------|---------|
| `/assets/events/fwc-banner-bg.webp` | Featured background for World Cup event banner |
| `/assets/events/fwc-logo-black.svg` | Black World Cup logo (EventsTransition exit) |
| `/assets/events/fwc-logo-white.svg` | White World Cup logo |
| `/assets/events/ucl-banner-bg.webp` | Featured background for UCL event banner |
| `/assets/events/ucl-logo-black.svg` | Black UCL logo |
| `/assets/events/ucl-logo-white.svg` | White UCL logo |
| `/assets/events/ucl-logo-white.webp` | White UCL logo `.webp` variant |

### `public/avatars/`

User profile avatar art. Loaded as `avatar-N.webp` where N is 0–11.

| Path |
|------|
| `/avatars/avatar-0.webp` through `avatar-11.webp` |

All 12 files present.

### `public/fonts/`

| Path | Format | Purpose |
|------|--------|---------|
| `/fonts/fwc2026/FWC2026-Normal-Black.woff2` | woff2 | World Cup 2026 official font (Black weight 900). Loaded via `@font-face` in `globals.css`. |

### `app/icon.webp` (Next.js favicon)

- Path: `app/icon.webp`
- Dimensions: 1920×1920 (1:1)
- Next.js auto-favicon convention. Replace with branded icon.

### `app/favicon.svg`

- Path: `app/favicon.svg`
- Dimensions: 1920×1920
- Soccit logo on `#034694` purple background, rounded square.
- Contains the 3-path Soccit "S" mark in white.
- Keep in sync with brand color updates.

### Library images (unused or for reference)

| Path | Status |
|------|--------|
| `/public/file.svg`, `/public/globe.svg`, `/public/next.svg`, `/public/vercel.svg`, `/public/window.svg` | Default Next.js scaffolding. Safe to remove. |

---

## 8. Color Usage Patterns

### For interactivity

- Hover surface rest: `hover:bg-surface-elevated` (`#ffffff`) on `bg-surface` (`#f4f4f4`)
- Hover text active: `hover:text-foreground` on `text-muted`
- Active state: `bg-purple text-white`
- Active border: `border-b-2 border-purple` on tab underline
- Focus: `focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2`

### For match status

- LIVE: rose (#ed1c24) pulsing circle + `{minute}' LIVE` in rose
- OPEN: cyan (#dba111) "Open for Predictions"
- SETTLED: muted "Settled"

### For ranking

| Rank | Badge color | Text |
|------|------------|------|
| 1st | `bg-gold text-background` | Gold (#dba111) |
| 2nd | `bg-foreground text-background` | Dark inverted |
| 3rd | `bg-bronze text-background` | Bronze (#dba111) |
| Other | `bg-surface text-foreground` | Neutral |

### For prediction state

| State | Visual |
|-------|--------|
| Default | Normal color |
| Pending swap | Cyan border highlight + multiplier cyan badge top-right |
| Locked | `grayscale opacity-70` + lock icon bottom-right, no hover scale |
| Drag-over (starter) | `scale-110 ring-2 ring-cyan ring-offset-2 ring-offset-pitch-turf` |
| Drag start (bench) | Card initially grayed to indicate draggable |

### For destructive

- All clear/remove buttons: `bg-rose text-white`
- Error banners: `border border-rose/30 bg-rose/5 text-rose`

---

## 9. Accessibility

- `prefers-reduced-motion`: all animations clamped to 0.01ms.
- Focus rings: `focus-visible:ring-2 ring-purple ring-offset-2` on interactive cards/buttons.
- All icons (`material-symbols-outlined`) have text fallback via aria-label on parent.
- TeamBadge uses `<img>` with `alt={name}` for country flags.
- Color contrast: foreground `#0a1628` on `#f4f4f4` surface = 12.3:1 (AAA). Muted `#8a8d90` on surface = 3.4:1 (AA for large text only).

---

## 10. Demo Data

Two hand-crafted demo matches in `app/_lib/demo-data.ts`:

**Portugal vs Argentina** — PDA `"demo"`, 63' live 2-1. Real player names. Used to verify the live arena flow end to end. Full lineups (17 players per team) with all grid coordinates.

**France vs Spain** — PDA `"demo-settled"`, final 2-1 France. Used to verify settlement page, logs page, and settlement cards. Minimal lineups (team name only).

These demo constants are used across:
- `app/matches/page.tsx` (match list)
- `app/matches/[pda]/page.tsx` (match detail)
- `app/matches/[pda]/arena/page.tsx` (arena)
- `app/matches/[pda]/logs/page.tsx` (logs)
- `app/matches/[pda]/settlement/page.tsx` (settlement)

The seed match (`SOCCIT_SEED_MATCH_PDA`) is the devnet on-chain match used for real transaction testing.

---

## 11. Key Style Decisions

1. **Flat radius** (`--radius: 0px`) across the entire app — no rounded corners on any element. This is deliberate for the "techy" aesthetic and sets Soccit apart from softer web apps.

2. **`object-contain` on all flags/logos** — country flags are wider than tall; `object-contain` prevents crop. Container sizes are fixed (not `aspect-ratio` based).

3. **`object-fill` on the field WebP** — chosen so the pitch image stretches edge-to-edge to fill the card without any gaps. The field is an abstract trapezoid, so distortion is visually acceptable.

4. **`object-cover` on TCG WebP cards** — fills the container 1:1 (card ratio 2:3 matches image 1023×1537). Never distorts, minifies faithfully.

5. **`grayscale` for locked predictions** — full `0` saturation + 70% opacity visually communicates "frozen / no longer editable" without hiding the card identity. Lock icon confirms.

6. **Modal consistency** — all modals share the connect-wallet-modal pattern (`scaleX` open, `bg-foreground/60` backdrop, `border-cyan/40`). This avoids visual jump between modals.

7. **Sound delegation** — global event listeners on `document` for `mouseover` and `click`, no per-component wiring. Works automatically on any element matching interactive selectors.

8. **Demo data outside page files** — all demo constants live in `app/_lib/demo-data.ts` to keep page files lean and allow sharing across multiple pages.

9. **`aspect-[2/3]` on all TCG containers** — locks the card portrait ratio regardless of container width. Enables responsive sizing via `w-[fixed]` without ratio drift.

10. **No backdrop-blur on modals** — `backdrop-blur-sm` was removed during the modal refactor for perceived performance and lighter feel. Backdrop is now solid `bg-foreground/60`.