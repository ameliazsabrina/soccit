# Soccit Landing Page — Current State

> Last updated: 2026-07-10
> Location: `app/landing/`

## 1. Overview

The landing page is a single-page marketing experience for Soccit, a gamified football prediction market on Solana. It is built as a Next.js App Router page (`app/landing/page.tsx`) and composes several client-side animation-heavy sections.

The design language is sports-meets-crypto: high-contrast typography, gold/cyan accents on a dark/light adaptable background, card-based visuals, and heavy use of scroll-driven GSAP animations plus Framer Motion micro-interactions.

### Page entry point

```tsx
// app/landing/page.tsx
<>
  <PageLoader />
  <ScrollProgress />
  <SmoothScroll>
    <main id="top">
      <LandingHero />
      <HowItWorks />
      <CardsGallery />
      <LeaderboardTeaser />
      <CTASection />
    </main>
  </SmoothScroll>
  <BottomNav />
</>
```

### Global shell elements

| Component | File | Purpose |
|-----------|------|---------|
| `PageLoader` | `_components/page-loader.tsx` | Full-screen intro overlay shown once per session |
| `ScrollProgress` | `_components/scroll-progress.tsx` | 2px gradient progress bar fixed to top |
| `SmoothScroll` | `_components/smooth-scroll.tsx` | Lenis smooth-scroll provider wrapping `main` |
| `BottomNav` | `_components/bottom-nav.tsx` | Fixed bottom pill nav with wallet + CTA |

---

## 2. Shared Infrastructure

### 2.1 GSAP setup

`app/landing/_components/gsap-setup.ts` centralizes GSAP plugin registration and re-exports the hooks.

```ts
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText);
export { gsap, ScrollTrigger, SplitText, useGSAP };
```

- `SplitText` is a Club GreenSock plugin (requires valid GSAP membership at build time).
- All landing components import from this file rather than directly from `gsap` to avoid double registration.

### 2.2 Smooth scroll (Lenis)

`SmoothScroll` creates a `Lenis` instance on mount and wires it to GSAP:

- `lenis.on("scroll", ScrollTrigger.update)` — keeps ScrollTrigger pinned sections accurate.
- `gsap.ticker.add(raf)` — drives Lenis via the GSAP ticker.
- `gsap.ticker.lagSmoothing(0)` — prevents smoothing lag when scrubbing.
- Cleans up on unmount.

Configuration:

```ts
{
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: "vertical",
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
}
```

### 2.3 Hover-reveal micro-interaction

`app/landing/_components/hover-reveal.tsx` provides three components:

- `HoverRevealLink` — Next.js `Link` wrapper with duplicate text that slides up on hover.
- `HoverRevealButton` — Same effect but rendered as a `<span>` for use inside buttons/links.
- Optional `underline` prop adds a Wembi-style underline that animates out to the right on hover.

CSS lives in `app/globals.css` under the `/* Hover-reveal text effect */` section.

### 2.4 Motion preference

Every animated component reads `useReducedMotion()` from Framer Motion and provides a fast/static fallback. Typical pattern:

```ts
if (shouldReduceMotion) {
  gsap.set("[data-xxx-animate]", { autoAlpha: 1, y: 0 });
  return;
}
```

---

## 3. Section Breakdown

### 3.1 LandingHero

**File:** `app/landing/_components/landing-hero.tsx`

**Responsibilities:**
- First viewport impression.
- Brand headline, subhead, CTA.
- Hero player image with cursor-reactive 3D tilt.
- Magnetic CTA button.
- Score counter animation.
- Country flags.
- Pinned scroll parallax + fade-out.

**Layout:**
- Two-column grid on desktop (`lg:grid-cols-[1fr_0.8fr]`), single column on mobile.
- Left: eyebrow, headline, subhead, CTA row.
- Right: score, flags, player image.

**Refs:**
- `container` — section root.
- `headlineRef` — H1 for SplitText.
- `scoreRef` — animated score text.
- `playerRef` — player image container for tilt.
- `ctaRef` — CTA anchor for magnetic effect.

**Animations (GSAP `useGSAP`):**
- `SplitText` on headline, words masked, `yPercent: 120 → 0`, `rotationX: 35 → 0`, stagger 0.06s, ease `power4.out`.
- Eyebrow/subhead/CTA fade/slide up.
- Flags scale in with `back.out(1.7)`.
- Score 3D reveal + count-up from `0 — 0` to `2 — 1`.
- Player image clip-path reveal from bottom + grayscale-to-color transition.
- Scroll cue fade in.
- ScrollTrigger pinned parallax:
  - `data-hero-parallax` moves `-80px`.
  - `data-hero-headline-parallax` moves `+60px`.
  - Section fades to `autoAlpha: 0` as it leaves.
  - Scroll cue fades over first 20% of scroll.

**Micro-interactions (Framer Motion):**
- Player tilt via `useMotionValue` + `useSpring` mapped to rotateX/rotateY.
- Magnetic CTA via spring physics.
- Flags hover scale/rotate.

**Assets:**
- `/assets/soccit-logo.svg`
- `/assets/cards/player-hero.webp`
- External flag CDN: `https://flagcdn.com/pt.svg`, `https://flagcdn.com/ar.svg`

---

### 3.2 HowItWorks

**File:** `app/landing/_components/how-it-works.tsx`

**Responsibilities:**
- Explain the 3-step prediction flow.
- Pinned scroll section with Wembi-style media stack.

**Steps data:**

| # | Category | Title | Description |
|---|----------|-------|-------------|
| 1 | Step 1 | Call the Score | Pick exact final score or winning outcome. |
| 2 | Step 2 | Pitch the Subs | Drag substitute cards onto the pitch. |
| 3 | Step 3 | Lock It In | Slide to commit; prediction sealed on-chain. |

**Layout:**
- Pinned sticky container (`h-screen`).
- Top step indicator (3 dots + labels + progress line).
- Two-column layout on desktop:
  - Left: category carousel + split-text title/description stack + point badges.
  - Right: media stack with 3 absolutely positioned panels.

**Refs:**
- `container` — root section (also `h-[300vh]` to create scroll distance).
- `panelARef`, `panelBRef`, `panelCRef` — media stack panels.
- `scoreARef` — score counter in panel A.
- `lockThumbRef`, `lockGhostRef`, `lockFillRef`, `burstRef` — lock slider in panel C.

**Animations:**
- ScrollTrigger: pin, start `top top`, end `+=300%`, scrub 1.
- Step indicator progress line scales from 0 → 1.
- Category carousel translates `yPercent` 0 → -66.67% over the scroll.
- Each step title/description uses `SplitText` (words/lines masked) and animates in/out at the correct scroll progress.
- Media stack panels transition via:
  - `clipPath: inset(10% round 0px) ↔ inset(0% round 0px)`
  - `filter: blur(8px) ↔ blur(0px)`
  - `scale: 1.05 ↔ 1`
  - `autoAlpha`
- Panel A internal: score count-up `0 — 0 → 2 — 1`, score controls fade in.
- Panel B internal: tokens drop with `bounce.out`, formation lines draw via `strokeDashoffset`, bench shimmer fades in.
- Panel C internal: lock thumb slides 0% → 95%, ghost trail, fill bar, particle burst, "Prediction Locked" text reveal.

**Data arrays:**
- `FORMATION` — 11 player tokens positioned by `%` coordinates.
- `BENCH` — 5 substitute cards.

**Gotchas:**
- The section relies on `SplitText` with `autoSplit: true` on absolutely positioned text nodes. Line breaks depend on container width.
- Panel internal animations are on the same scrub timeline as the section reveal, so they play as the user scrolls rather than on entry.

---

### 3.3 CardsGallery

**File:** `app/landing/_components/cards-gallery.tsx`

**Responsibilities:**
- Showcase the four player card types (Forward, Midfielder, Defender, Goalkeeper).
- Horizontal scroll gallery on desktop; vertical stack on mobile.

**Cards data:**

| ID | Title | Accent color | Tailwind text class |
|----|-------|--------------|---------------------|
| fw | Forward | `#ed1c24` | `text-rose` |
| md | Midfielder | `#dba111` | `text-cyan` |
| df | Defender | `#034694` | `text-purple` |
| gk | Goalkeeper | `#dba111` | `text-gold` |

**Layout:**
- Section header + track of cards.
- Desktop: horizontal track pinned and translated with scroll.
- Mobile: vertical flex with staggered fade-in.

**Animations:**
- GSAP `matchMedia`:
  - Desktop (`min-width: 1024px`): horizontal scroll, pin section, scrub. Cards skew/rotate based on scroll velocity and scale down near viewport edges.
  - Mobile (`max-width: 1023px`): cards fade/slide up on scroll into view.
- Framer Motion `whileHover` lifts cards `-12px`.
- Card shine effect via `.card-shine` CSS utility.

**Assets:**
- `/assets/cards/players/fw.webp`
- `/assets/cards/players/md.webp`
- `/assets/cards/players/df.webp`
- `/assets/cards/players/gk.webp`
- Background texture: `/field.webp`

---

### 3.4 LeaderboardTeaser

**File:** `app/landing/_components/leaderboard-teaser.tsx`

**Responsibilities:**
- Social proof / FOMO block.
- Shows global rank, total players, podium, and prize pool.

**Layout:**
- 3-column grid on desktop, single column on mobile.
- Card 1: rank + total players with `DigitRollCounter`.
- Card 2: podium with 1st/2nd/3rd avatars and animated bar heights.
- Card 3: total prize pool with shimmer sweep + decorative player image.

**Animations (Framer Motion):**
- Section header fades/slides in on `useInView`.
- Cards stagger in.
- Podium bars scale up from bottom (`scaleY: 0 → 1`).
- Prize shimmer sweeps across after counter finishes.

**Data:**
- `PODIUM` — mock winners with avatars, prizes, rank colors.

**Assets:**
- `/avatars/avatar-0.webp`, `/avatars/avatar-1.webp`, `/avatars/avatar-2.webp`
- `/assets/cards/player-leaderboard.webp`

**Shared utility:**
- `DigitRollCounter` — animates number values digit-by-digit with a roll-up effect.

---

### 3.5 CTASection

**File:** `app/landing/_components/cta-section.tsx`

**Responsibilities:**
- Final call-to-action.
- Large headline "READY TO PLAY?".
- Magnetic CTA button with click ripple effect.
- Aurora mesh background.
- Inline footer with social links.

**Layout:**
- Centered flex column, full viewport height.
- Footer absolutely positioned at bottom.

**Refs:**
- `container` — section root.
- `headlineRef` — H2 for SplitText.
- `buttonRef` — CTA anchor for magnetic effect.

**Animations:**
- ScrollTrigger pins section (`end: "+=50%"`).
- `SplitText` headline reveal on scroll into view (`start: "top 60%"`, `once: true`).
- Logo, subhead, button, meta stagger in.
- Aurora background gradient position animates infinitely.
- Logo rotating ring animation.

**Micro-interactions:**
- Magnetic button via Framer Motion springs.
- Click ripple: adds/removes ripple elements in React state.
- `HoverRevealButton` on CTA text.
- `HoverRevealLink` on footer "Back to top".

**Assets:**
- `/assets/soccit-logo.svg`

---

## 4. Utility Components

### 4.1 DigitRollCounter

**File:** `app/landing/_components/digit-roll-counter.tsx`

- Animates a number from 0 to target.
- Each digit is wrapped and rolls up with staggered CSS transitions.
- Supports `prefix`, `suffix`, `decimals`, and `duration`.
- Triggers on `useInView`.

### 4.2 AnimatedCounter

**File:** `app/landing/_components/animated-counter.tsx`

- Alternative counter using Framer Motion `useSpring`.
- Supports `Intl.NumberFormatOptions`.
- Currently not used on the landing page but kept in the components folder.

---

## 5. Styling & Theming

### 5.1 Global CSS

**File:** `app/globals.css`

Key custom properties:

```css
:root {
  --background: #ffffff;
  --foreground: #0a1628;
  --surface: #f4f4f4;
  --surface-elevated: #ffffff;
  --muted: #8a8d90;
  --purple: #034694;
  --cyan: #dba111;
  --rose: #ed1c24;
  --bronze: #cd7f32;
  --gold: #dba111;
  --radius: 0px;
}

.dark {
  --background: #0a0a0a;
  --foreground: #f8fafc;
  --surface: #15121b;
  --surface-elevated: #211e27;
  --muted: #958ea0;
}
```

Tailwind v4 `@theme inline` maps these to colors like `bg-background`, `text-cyan`, etc.

### 5.2 Typography

Fonts loaded in `app/layout.tsx`:

| Font | Variable | Usage |
|------|----------|-------|
| Space Grotesk | `--font-space-grotesk` | Body, tech labels, display fallback |
| Inter | `--font-inter` | Body paragraphs |
| Unica One | `--font-unica-one` | Display (fallback) |
| Noto Sans | `--font-noto-sans` | Support text |
| FWC2026 (local) | `--font-fwc2026` | World Cup campaign display |

CSS utility classes:
- `.font-display` — bold uppercase display type.
- `.font-tech` — technical/label type.
- `.font-body` — readable body type.
- `.gradient-text` — purple-to-cyan text gradient.
- `.text-outline` — stroked text effect.

### 5.3 Utilities used heavily

- `.card-shine` — angled shimmer sweep on hover.
- `.btn-gradient` — animated gradient CTA buttons.
- `.glass` / inline `backdrop-blur` — pill nav and panels.
- `.perspective-800`, `.preserve-3d` — 3D card/tilt effects.

---

## 6. State & Data Flow

### 6.1 Local component state

- `PageLoader`: `isLoading` boolean driven by `sessionStorage`.
- `CTASection`: `ripples` array for click ripples.
- `BottomNav`: `hidden` boolean for scroll-direction hide/show.

### 6.2 Wallet integration

`BottomNav` uses:
- `useWallet()` from `@solana/wallet-adapter-react` for `publicKey`, `connected`, `disconnect`.
- `useWalletModal()` from `@solana/wallet-adapter-react-ui` to open the connect modal.

### 6.3 Theme

Theme context lives in `app/_components/providers.tsx`. It reads/writes `localStorage` key `soccit-theme` and toggles the `.dark` class on `document.documentElement`.

---

## 7. Assets Inventory

### Images referenced on landing

| Path | Used in |
|------|---------|
| `/assets/soccit-logo.svg` | PageLoader, CTASection |
| `/assets/cards/player-hero.webp` | LandingHero |
| `/assets/cards/player-arena.webp` | — |
| `/assets/cards/player-events.webp` | — |
| `/assets/cards/player-leaderboard.webp` | LeaderboardTeaser |
| `/assets/cards/player-logs.webp` | — |
| `/assets/cards/players/fw.webp` | CardsGallery, HowItWorks bench/formation |
| `/assets/cards/players/md.webp` | CardsGallery, HowItWorks bench/formation |
| `/assets/cards/players/df.webp` | CardsGallery, HowItWorks bench/formation |
| `/assets/cards/players/gk.webp` | CardsGallery, HowItWorks bench/formation |
| `/field.webp` | HowItWorks, CardsGallery background |
| `/avatars/avatar-0.webp` | LeaderboardTeaser |
| `/avatars/avatar-1.webp` | LeaderboardTeaser |
| `/avatars/avatar-2.webp` | LeaderboardTeaser |

### External assets

- Flag CDN: `https://flagcdn.com/pt.svg`, `https://flagcdn.com/ar.svg`
- Google Material Symbols Outlined font (loaded in layout head)

---

## 8. Dependencies

Core animation dependencies relevant to the landing page:

```json
{
  "@gsap/react": "^2.1.2",
  "framer-motion": "^12.42.2",
  "gsap": "^3.15.0",
  "lenis": "<installed>"
}
```

Also:
- `@solana/wallet-adapter-react`
- `@solana/wallet-adapter-react-ui`
- `clsx`, `tailwind-merge` (via `app/_lib/utils.ts`)
- `lucide-react` (available but not used in landing components)

---

## 9. Responsive Behavior Summary

| Section | Mobile | Desktop |
|---------|--------|---------|
| Hero | Single column, player below text | Two columns |
| HowItWorks | Stacked (media above content) | Side-by-side media stack + content |
| CardsGallery | Vertical card stack fade-in | Horizontal pinned scroll gallery |
| Leaderboard | Single column cards | 3-column grid |
| CTA | Centered, compact footer | Same centered layout |
| BottomNav | Pill nav, "How it works" hidden | Pill nav with all items |

---

## 10. Known Patterns & Gotchas

1. **GSAP plugin registration** — Always import from `gsap-setup.ts` to avoid `registerPlugin` conflicts.
2. **ScrollTrigger + Lenis** — `SmoothScroll` calls `ScrollTrigger.update` on every Lenis scroll and disables ticker lag smoothing.
3. **SplitText cleanup** — Components that call `SplitText.create()` revert splits in the `useGSAP` cleanup function.
4. **Pinned sections** — `LandingHero`, `HowItWorks`, `CardsGallery` (desktop), and `CTASection` all pin. Pinning creates new stacking contexts; z-index ordering matters.
5. **Session-based loader** — `PageLoader` only shows once per browser session via `sessionStorage`.
6. **Reduced motion** — Every animation has an early-return static state.
7. **Flag CDN images** — Browser console warns about aspect ratio because CSS changes height only; this is pre-existing and visual-only.
8. **Wallet adapter warnings** — Phantom registering as Standard Wallet produces console warnings; harmless.

---

## 11. File Map

```
app/landing/
├── page.tsx
└── _components/
    ├── animated-counter.tsx
    ├── bottom-nav.tsx
    ├── cards-gallery.tsx
    ├── cta-section.tsx
    ├── digit-roll-counter.tsx
    ├── gsap-setup.ts
    ├── hover-reveal.tsx
    ├── how-it-works.tsx
    ├── landing-hero.tsx
    ├── leaderboard-teaser.tsx
    ├── page-loader.tsx
    ├── scroll-progress.tsx
    └── smooth-scroll.tsx
```

---

## 12. Next Likely Touch Points

If you want to keep iterating on the Wembi direction, the natural next files are:

- `how-it-works.tsx` — refine media stack timing, add real step imagery, smooth the text stack line breaks.
- `landing-hero.tsx` — add a custom cursor or page-transition wipe.
- `cta-section.tsx` — unify headline easing to `power4.out` to match hero.
- `cards-gallery.tsx` — add goo-filter or pill-stack variant for card categories.
- Add a dedicated FAQ/rules accordion with the morphing-background pattern.
