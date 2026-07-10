# Soccit Landing Page — Concept & Implementation Spec

A scroll-driven, GSAP-animated landing page for Soccit — a gamified football prediction market on Solana. This document is detailed enough for a developer to implement directly.

---

## 1. Concept Overview & Narrative Arc

### The Story

The landing page tells a single, escalating story in five beats:

> **"The match is live. You see the pitch. You call the subs. You lock the prediction. The leaderboard proves you were right."**

This mirrors the actual product journey — a user enters a live match, reads the field, drags substitute TCG cards into position, slides to lock their prediction, and climbs the leaderboard when the outcome resolves.

The page is **not** a feature list. It's a **scroll-driven theatrical teaser** that walks the visitor through the emotional arc of playing Soccit, using the existing visual language (flat cards, card-shine, TCG WebP assets, pitch imagery) elevated by GSAP scroll-triggered motion.

### Narrative Beats

| Beat | Section | Emotion | What the visitor sees |
|------|---------|---------|----------------------|
| 1 | Hero | Curiosity / Arrival | Big score display, two nations, a player silhouette emerging from grayscale. "ENTER THE ARENA" CTA. |
| 2 | How It Works | Understanding | Three pinned panels — Call the Score, Pitch the Subs, Lock It In — each revealing a different arena model as you scroll. TCG cards fly into formation. |
| 3 | The Cards | Desire | Horizontal-scroll gallery of TCG player cards (FW/MD/DF/GK) with position-colored themes. Parallax depth. |
| 4 | Leaderboard / Social Proof | FOMO | Animated rank counter ticking up. Top finisher names. Prize pool growing. |
| 5 | CTA / Footer | Action | Final pinned section. Wallet connect prompt. "ENTER THE ARENA" button. Match ticker marquee at the bottom (reusing the existing TickerMarquee component). |

---

## 2. Section-by-Section Breakdown

### Section 1 — Hero

**Layout:** Full-viewport (`min-h-screen`) pinned section. No PageShell — this is a standalone landing layout that escapes the app's `overflow-hidden` shell.

**Content:**
- **Left column (60%):**
  - Eyebrow: `font-tech text-xs uppercase tracking-[0.15em] text-muted` — "GAMIFIED FOOTBALL PREDICTION MARKET"
  - Headline: `font-display text-6xl md:text-7xl lg:text-8xl` — "CALL THE GAME." split into words via SplitText for staggered reveal.
  - Subhead: `font-body text-lg text-muted` — "Predict the score. Pitch the subs. Lock it on-chain. Win the pool."
  - CTA: `.btn-gradient` button — "ENTER THE ARENA" + `arrow_forward` material icon (links to `/matches/{seed}?seed=1`).
  - Secondary CTA: ghost link — "Watch how it works" that smooth-scrolls to Section 2.

- **Right column (40%):**
  - The featured match card visual — reuses the existing `player-hero.webp` (271 KB) positioned `object-contain object-bottom` inside a container with `card-image-gray` (grayscale → color on scroll-into-view).
  - Two team flags (`flagcdn.com/pt.svg` and `flagcdn.com/ar.svg`) stacked vertically at top-right, each `h-24`.
  - A large gradient score "2 — 1" using `.gradient-text` class, positioned center-right, `font-display text-7xl`.
  - `card-shine` overlay on the hero card.

**GSAP Animation:**
- **Timeline `heroTl`** plays on mount (no scroll trigger — immediate):
  - SplitText splits headline into words with `mask: "words"`.
  - Words stagger in from `yPercent: 100, autoAlpha: 0` with `stagger: 0.08, duration: 0.8, ease: "power3.out"`.
  - Eyebrow fades in at `+=0.2` with `y: 20, autoAlpha: 0 → y: 0, autoAlpha: 1`.
  - Subhead fades in at `+=0.3`.
  - CTA button slides up at `+=0.4` with `y: 30, autoAlpha: 0 → y: 0, autoAlpha: 1`.
  - Team flags scale in from `scale: 0, autoAlpha: 0` with `stagger: 0.15` at `+=0.5`.
  - Score text counts up from "0 — 0" to "2 — 1" using `gsap.to()` on a ref'd object, with `onUpdate` writing to DOM. Duration 1.2s, ease `power2.out`.
  - Player image (`player-hero.webp`) clip-reveals from bottom using `clipPath: inset(100% 0 0 0) → inset(0% 0 0 0)` over 1s at `+=0.6`, then `card-image-gray` transitions to full color (toggle a class).

**ScrollTrigger (Hero pin):**
- The hero section is **pinned** with `pin: true, start: "top top", end: "+=100%"`.
- As the user scrolls through the pinned duration, the player image parallallax-drifts upward (`y: -80px`) and the headline text parallaxes downward (`y: 60px`), creating a depth separation. Scrubbed at `scrub: 1`.
- On pin leave (`onLeave`), the hero fades out (`autoAlpha: 0`) as the next section is revealed.

**Assets used:**
- `/assets/cards/player-hero.webp` — main player silhouette
- `flagcdn.com/pt.svg`, `flagcdn.com/ar.svg` — team flags
- `.gradient-text`, `.btn-gradient`, `.card-shine` — CSS utilities

**Color palette:**
- Background: `--background` (`#ffffff` light / `#0a0a0a` dark)
- Headline: `--foreground`
- Score: `.gradient-text` (purple → cyan)
- Eyebrow/subhead: `--muted`
- CTA: `.btn-gradient` (purple → cyan → purple)

**Typography:**
- Headline: `font-display` (Space Grotesk 700, uppercase, -0.02em)
- Eyebrow: `font-tech` (Space Grotesk regular, uppercase, tracking-[0.15em])
- Subhead: `font-body` (Inter 400/500)

---

### Section 2 — How It Works (Pinned Scroll Sequence)

**Layout:** A single tall container (`h-[300vh]`) containing three full-viewport panels. ScrollTrigger pins the container and scrubs through three sub-timelines as the user scrolls. This is the signature GSAP "pinned panel sequence" pattern.

**Three Panels:**

#### Panel A — "Call the Score"
- **Content:** The Score prediction model. Shows the `player-hero.webp` again but smaller, alongside a mock "Call the Score" UI with +/- score controls (non-interactive, purely visual).
- **Visual:** Two TeamBadge `xl` flags (Portugal, Argentina) flanking a center score display. Score counter animates from `0-0` to `2-1` as the panel scrolls into focus.
- **Tag chips:** "5pts exact" and "3pts outcome" — styled as small `font-tech` badges.

#### Panel B — "Pitch the Subs"
- **Content:** The Substitute Manager arena model. Shows `field.webp` as the pitch background with 11 TCG tokens positioned on it in a 4-3-3 formation.
- **Visual:** TCG cards (`fw.webp`, `md.webp`, `df.webp`, `gk.webp`) drop into their grid positions one-by-one with a stagger. Each token shows the position code (baked into the image), a player number overlay, and a name bar.
- **Bench row** at the bottom: horizontal scroll of remaining TCG cards with `hover:-translate-y-1` and `selected:-translate-y-2 scale-105` (CSS-only, no GSAP needed here).
- **The animation:** As this panel enters, the field WebP fades in, then tokens stagger-drop from `y: -200, autoAlpha: 0` to `y: 0, autoAlpha: 1` with `ease: "bounce.out"` and `stagger: 0.1` per token. The GK drops first, then defenders, then mids, then forwards — mirroring formation buildup.

#### Panel C — "Lock It In"
- **Content:** The SlideToLock + celebration. Shows a mock SlideToLock bar that animates from 0% to 95% as the panel scrolls (scrubbed), then triggers the `.celebration-burst` CSS animation on lock.
- **Visual:** A horizontal bar (`h-14 bg-surface`) with a thumb circle that slides right. The background fills with `--cyan` as the thumb progresses. On "lock" (scroll reaches 95% of panel), a radial celebration burst plays (reusing `.celebration-burst` keyframe).
- **Text:** "PREDICTION LOCKED" in `font-display text-4xl text-foreground`.

**GSAP Animation:**
- **Master timeline `howTl`** with `scrollTrigger: { trigger: "#how-it-works", pin: true, start: "top top", end: "+=300%", scrub: 1 }`.
- Timeline has three labels: `"score"`, `"pitch"`, `"lock"`.
- Between labels, panels cross-fade: Panel A fades out as Panel B fades in, etc.
- Each panel's internal animations are nested sub-timelines positioned at the appropriate label.
- Token drop animation in Panel B uses `gsap.from(tokens, { y: -200, autoAlpha: 0, stagger: { each: 0.08, from: "center" }, ease: "power2.out" })`.

**Assets used:**
- `/field.webp` — pitch background (524 KB)
- `/assets/cards/players/fw.webp`, `md.webp`, `df.webp`, `gk.webp` — TCG tokens
- `/assets/cards/player-hero.webp` — Panel A player
- `.celebration-burst` — CSS keyframe (reused from globals.css)

**Color palette:**
- Pitch surface: `--pitch-turf` → `--pitch-deep` gradient
- Tokens by position: FW red (#ED1C24), MD gold (#DBA111), DF purple (#034694), GK gold (#E4A900)
- Score display: `.gradient-text`
- SlideToLock fill: `--cyan`

**Typography:**
- Panel titles: `font-display text-5xl md:text-6xl`
- Panel descriptions: `font-body text-base text-muted`
- Tag chips: `font-tech text-xs uppercase`

---

### Section 3 — The Cards (Horizontal Scroll Gallery)

**Layout:** A horizontally-scrolling section triggered by vertical scroll. Uses the `containerAnimation` ScrollTrigger pattern from GSAP docs. The section pins for `+=200%` scroll distance, and the inner track translates horizontally.

**Content:** A gallery of the 4 TCG position cards, displayed large (`w-[300px] sm:w-[400px] aspect-[2/3]`) in a horizontal row with generous gaps. Each card is a real `<Image>` of the WebP asset.

**Card presentation:**
- Each card sits in a flat container with `card-shine` on hover.
- Position code is baked into the image (FW/MD/DF/GK) — no overlay needed.
- Below each card: position name in `font-display`, a one-line description in `font-body text-muted`.
  - FW: "Forward — The finishers. Every goal is a point."
  - MD: "Midfielder — The engine. Control the tempo."
  - DF: "Defender — The wall. Deny the attack."
  - GK: "Goalkeeper — The last line. Save the game."
- Cards have a slight 3D tilt on scroll — `rotationY` based on velocity (using `ScrollTrigger.getVelocity()`).

**Parallax depth:**
- Background layer: `field.webp` at `opacity: 0.08` scales and translates slower than the cards (parallax).
- Cards layer: moves at scroll speed.
- Foreground: subtle dust/particles (optional CSS radial gradients animated via GSAP).

**GSAP Animation:**
```javascript
const track = trackRef.current;
const cards = cardRefs.current;

const horizontalTl = gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: sectionRef.current,
    pin: true,
    start: "top top",
    end: () => `+=${track.scrollWidth - window.innerWidth}`,
    scrub: 1,
    invalidateOnRefresh: true,
  },
});

// Card velocity tilt
cards.forEach((card) => {
  gsap.to(card, {
    rotationY: 8,
    scrollTrigger: {
      trigger: card,
      containerAnimation: horizontalTl,
      start: "left center",
      end: "right center",
      scrub: 2,
    },
  });
});
```

**Assets used:**
- `/assets/cards/players/fw.webp` (356 KB)
- `/assets/cards/players/md.webp` (437 KB)
- `/assets/cards/players/df.webp` (416 KB)
- `/assets/cards/players/gk.webp` (555 KB)
- `/field.webp` — background at low opacity

**Color palette:**
- Background: `--background` with `field.webp` overlay at 8% opacity
- Card frames: position-themed (red/green/blue/gold as baked into the WebP)
- Text: `--foreground` for position names, `--muted` for descriptions
- Card hover: `.card-shine` (blue diagonal streak)

**Typography:**
- Position names: `font-display text-3xl uppercase`
- Descriptions: `font-body text-sm`

---

### Section 4 — Leaderboard / Social Proof

**Layout:** Standard scroll-triggered reveal (no pin). Full-width section with a 3-column grid on desktop, stacked on mobile.

**Content:**
- **Section header:** "THE LEADERBOARD" in `font-display text-5xl`, with a subhead "Prove you know the game."
- **Left column:** Animated rank counter — "#0" ticks up to "#4,092" using `gsap.to()` with a number scrub. Below: "Total Players" counter ticking to "12,847".
- **Center column:** Top finisher podium. 1st place with `bg-gold`, 2nd `bg-foreground`, 3rd `bg-bronze`. Player avatar from `/avatars/avatar-{0-2}.webp`. Prize amounts in `font-display`.
- **Right column:** Prize pool counter — "$0" ticks up to "$14,093.50" (reusing the portfolio counter pattern from the current `page.tsx`).

**GSAP Animation:**
- Each column reveals with `gsap.from(column, { y: 60, autoAlpha: 0, duration: 0.8, ease: "power3.out" })` triggered by `ScrollTrigger` with `start: "top 80%"`.
- Counters animate using a ref object pattern:
```javascript
gsap.to(counterRef.current, {
  val: 4092,
  duration: 2,
  ease: "power2.out",
  snap: { val: 1 },
  onUpdate: () => {
    counterEl.current.textContent = "#" + Math.floor(counterRef.current.val).toLocaleString();
  },
  scrollTrigger: { trigger: counterEl.current, start: "top 85%", once: true },
});
```
- Podium bars grow from `scaleY: 0` to `scaleY: 1` with stagger `0.15`.

**Assets used:**
- `/avatars/avatar-0.webp`, `avatar-1.webp`, `avatar-2.webp` — podium avatars
- `/assets/cards/player-leaderboard.webp` — decorative player portrait, `card-image-gray` → color on reveal

**Color palette:**
- 1st place badge: `--gold` (#DBA111)
- 2nd place: `--foreground` inverted
- 3rd place: `--bronze` (#DBA111)
- Prize pool: `--cyan`
- Rank counter: `--foreground`

**Typography:**
- Section header: `font-display text-5xl uppercase`
- Counters: `font-display text-6xl` (Unica One style — uppercase, tight tracking)
- Player names: `font-display text-lg`
- Labels: `font-tech text-xs uppercase tracking-wider`

---

### Section 5 — Final CTA & Footer

**Layout:** Pinned full-viewport section. The last thing the user sees before the page ends.

**Content:**
- Centered: Soccit logo (`/assets/soccit-logo.svg`, white variant, `h-20 w-20`).
- Headline: "READY TO PLAY?" in `font-display text-6xl md:text-7xl`, split via SplitText for one final staggered word reveal.
- Subhead: "Connect your wallet. Pick a match. Call the game."
- CTA: Large `.btn-gradient` button — "ENTER THE ARENA" linking to `/matches/{seed}?seed=1`. Pulsing glow on hover (`glow-cyan`).
- Below CTA: secondary text — "Built on Solana · On-chain predictions · Real prizes" in `font-tech text-xs uppercase text-muted`.

**Footer strip:**
- Thin `border-t border-muted/20` bar.
- Left: "© 2026 SOCCIT" in `font-tech text-xs`.
- Right: social links (Twitter/X, Discord, GitHub) as material icons.
- Above the footer: the existing `TickerMarquee` component running the live match ticker — this ties the landing page back to the live app.

**GSAP Animation:**
- Pin: `pin: true, start: "top top", end: "+=50%"`.
- SplitText headline reveal: same word-mask pattern as hero, but triggered on `onEnter` (scroll-triggered, not immediate).
- Logo scales in from `scale: 0.8, autoAlpha: 0` to `scale: 1, autoAlpha: 1`.
- CTA slides up from `y: 40, autoAlpha: 0` with `delay: 0.3` after the headline.
- Background: subtle gradient shift using `gsap.to(sectionBg, { backgroundPosition: "100% 50%", duration: 4, ease: "none", scrollTrigger: { scrub: 1 } })`.

**Assets used:**
- `/assets/soccit-logo.svg` — main logo
- `TickerMarquee` component (existing)

**Color palette:**
- Background: `--background` with a subtle radial gradient using `--purple` and `--cyan` at low opacity
- Logo: white fills
- CTA: `.btn-gradient` + `.glow-cyan` on hover
- Footer: `--muted` for text, `border-muted/20`

**Typography:**
- Headline: `font-display text-6xl uppercase`
- Subhead: `font-body text-lg text-muted`
- CTA: `font-display text-xl uppercase tracking-[0.1em]`
- Footer: `font-tech text-xs uppercase`

---

## 3. Asset Usage Summary

| Asset | Section | Purpose |
|-------|---------|---------|
| `/assets/cards/player-hero.webp` | Hero, Panel A | Player silhouette, grayscale → color reveal |
| `/assets/cards/player-leaderboard.webp` | Leaderboard | Decorative portrait |
| `/assets/cards/players/fw.webp` | Cards gallery, Panel B | Forward TCG token |
| `/assets/cards/players/md.webp` | Cards gallery, Panel B | Midfielder TCG token |
| `/assets/cards/players/df.webp` | Cards gallery, Panel B | Defender TCG token |
| `/assets/cards/players/gk.webp` | Cards gallery, Panel B | Goalkeeper TCG token |
| `/field.webp` | Panel B, Cards gallery bg | Pitch surface |
| `/assets/soccit-logo.svg` | CTA section | Brand logo |
| `/avatars/avatar-0.webp` | Leaderboard | 1st place avatar |
| `/avatars/avatar-1.webp` | Leaderboard | 2nd place avatar |
| `/avatars/avatar-2.webp` | Leaderboard | 3rd place avatar |
| `flagcdn.com/pt.svg` | Hero, Panel A | Portugal flag |
| `flagcdn.com/ar.svg` | Hero, Panel A | Argentina flag |
| `/app-bg.webp` | (not used — landing has its own bg) | — |

**Unused assets (intentionally not on landing):** `player-arena.webp`, `player-events.webp`, `player-logs.webp`, `team-home.webp`, `team-away.webp`, `fwc-banner-bg.webp`, `ucl-banner-bg.webp` — these are app-interior assets. The landing page focuses on the core TCG cards and hero imagery for maximum brand cohesion.

---

## 4. Color Palette Usage Per Section

| Section | Background | Primary text | Accent | Special |
|---------|-----------|-------------|--------|---------|
| Hero | `--background` | `--foreground` | `.gradient-text` (purple→cyan) | `--muted` for eyebrow |
| How It Works | `--background` → `--pitch-turf` (Panel B) | `--foreground` | `--cyan` (SlideToLock fill) | Position colors: red/gold/purple/gold |
| The Cards | `--background` + `field.webp` @ 8% | `--foreground` | `--muted` | `.card-shine` on hover |
| Leaderboard | `--background` | `--foreground` | `--gold`, `--bronze` (podium) | `--cyan` (prize pool) |
| CTA / Footer | `--background` + radial `--purple`/`--cyan` | `--foreground` | `.btn-gradient` | `--muted` footer text |

All sections respect the **flat radius** (`--radius: 0px`) — zero rounded corners on any element.

---

## 5. Typography Usage

| Font class | Family | Where used on landing |
|-----------|--------|----------------------|
| `font-display` / `.unica-one` | Space Grotesk 700, uppercase, -0.02em | All headlines, score displays, counter values, CTA button text, position names |
| `font-tech` | Space Grotesk regular | Eyebrows, tag chips, labels, footer text, ticker |
| `font-body` | Inter 400/500/600 | All paragraph text, subheads, card descriptions |
| `font-wc` | FWC 2026 Black 900 | Not used on landing (reserved for World Cup campaign pages) |

No new fonts needed — all are already loaded via `next/font/google` in `app/layout.tsx`.

---

## 6. Motion Grammar

### GSAP Timeline Structure

```
Page Timeline (not a single timeline — each section has its own)

Section 1 (Hero):
  heroTl — plays on mount (no ScrollTrigger)
    ├── SplitText word reveal (headline)
    ├── Eyebrow fade-in
    ├── Subhead fade-in  
    ├── CTA slide-up
    ├── Flags scale-in (stagger)
    ├── Score count-up (0-0 → 2-1)
    └── Player image clip-reveal (bottom → full)
  + ScrollTrigger pin (parallax on scroll-out)

Section 2 (How It Works):
  howTl — scrubbed timeline with ScrollTrigger pin
    ├── "score" label: Panel A in (score count, flags)
    ├── "pitch" label: Panel A out → Panel B in (field fade, token drops stagger)
    └── "lock" label: Panel B out → Panel C in (SlideToLock scrub, celebration)

Section 3 (Cards):
  horizontalTl — scrubbed horizontal translate
  + per-card rotationY tilt (containerAnimation)

Section 4 (Leaderboard):
  Three independent ScrollTriggers (once: true)
    ├── Column 1 reveal + rank counter
    ├── Column 2 reveal + podium bars grow
    └── Column 3 reveal + prize counter

Section 5 (CTA):
  ScrollTrigger onEnter
    ├── SplitText word reveal (headline)
    ├── Logo scale-in
    └── CTA slide-up
```

### Easing

| Animation | Ease | Rationale |
|-----------|------|-----------|
| SplitText word reveals | `power3.out` | Strong deceleration, natural landing |
| Token drops (Panel B) | `power2.out` | Gravity-like drop |
| Counter tick-ups | `power2.out` | Fast start, slow finish |
| Scrubbed sections | `none` (linear) | Required for scrub — must match scroll exactly |
| Pin transitions | default (power1.out) | Smooth panel cross-fades |
| CTA hover glow | CSS transition | Not GSAP |

### ScrollTrigger Configuration

| Trigger | pin | start | end | scrub | toggleActions |
|---------|-----|-------|-----|-------|---------------|
| Hero parallax | true | "top top" | "+=100%" | 1 | "play none none reverse" |
| How It Works | true | "top top" | "+=300%" | 1 | "play none none reverse" |
| Cards horizontal | true | "top top" | dynamic (track width) | 1 | "play none none reverse" |
| Leaderboard columns | false | "top 80%" | — | — | "play none none none" (once) |
| CTA reveal | true | "top top" | "+=50%" | — | "play none none none" |

### Stagger Patterns

- **Words (SplitText):** `stagger: 0.08` — fast word-by-word cascade.
- **Tokens (Panel B):** `stagger: { each: 0.08, from: "center" }` — center-out formation build.
- **Flags (Hero):** `stagger: 0.15` — deliberate, weighted.
- **Leaderboard columns:** `stagger: 0.2` — sequential reveal left to right.

### Reduced Motion

All GSAP animations must be gated behind a `prefers-reduced-motion` check:

```javascript
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

useGSAP(() => {
  if (prefersReducedMotion) {
    // Set all elements to final state immediately
    gsap.set("[data-animate]", { autoAlpha: 1, y: 0, scale: 1 });
    return;
  }
  // ... normal animations
}, { scope: container });
```

The existing `globals.css` already clamps CSS animation/transition durations to `0.01ms` for reduced motion. GSAP timelines must be additionally disabled since GSAP operates outside CSS.

---

## 7. Responsive Behavior

### Mobile (< 640px)

| Section | Behavior |
|---------|----------|
| Hero | Single column. Headline `text-5xl`. Player image hidden or reduced to `h-48`. Flags stacked. CTA full-width. |
| How It Works | Pinned panels still work but content stacks vertically. Panel B field height `h-[300px]`. TCG tokens `w-10` (smaller). Bench cards `w-[130px]`. |
| The Cards | **Disable horizontal scroll pin on mobile.** Fall back to vertical scroll with standard ScrollTrigger reveals. Cards `w-full max-w-[300px]` centered. |
| Leaderboard | Single column. Counters full-width. Podium stacks. |
| CTA | Headline `text-4xl`. Logo `h-16`. CTA full-width. |

### Desktop (≥ 1024px)

All sections as described above. Full horizontal scroll for Cards gallery. Pinned panels with 3-column layouts.

### Implementation: `gsap.matchMedia()`

```javascript
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add("(min-width: 1024px)", () => {
    // Desktop: full pinned horizontal scroll for Cards
    const horizontalTl = gsap.to(track, { ... });
    return () => horizontalTl.kill();
  });

  mm.add("(max-width: 1023px)", () => {
    // Mobile: vertical scroll reveals, no horizontal pin
    gsap.from(".card-item", {
      y: 60, autoAlpha: 0, stagger: 0.15,
      scrollTrigger: { trigger: ".cards-section", start: "top 80%" },
    });
  });

  return () => mm.revert();
}, { scope: container });
```

---

## 8. Technical Implementation Notes

### Package Installation

```bash
npm install gsap @gsap/react
```

`gsap` provides the core + ScrollTrigger + SplitText (all free as of GSAP 3.13+, which made the full plugin suite free under Webflow ownership). `@gsap/react` provides the `useGSAP()` hook.

### File Structure

The landing page should be a **separate route** from the current app home (`/`). Two approaches:

**Option A (recommended): New route `/landing`**
```
app/
  landing/
    page.tsx          ← the landing page (Server Component shell)
    _components/
      landing-hero.tsx       ("use client")
      how-it-works.tsx       ("use client")
      cards-gallery.tsx      ("use client")
      leaderboard-teaser.tsx ("use client")
      cta-section.tsx        ("use client")
      gsap-provider.tsx      ("use client" — registers plugins once)
```

**Option B: Replace current `/` and move app to `/app`**
This is more disruptive but makes the landing page the true front door.

### Server vs Client Boundary

The landing page route (`app/landing/page.tsx`) can be a **Server Component** that imports the section components. Each section component is a Client Component (`"use client"`) because it uses `useGSAP()`, `useRef`, and ScrollTrigger.

```tsx
// app/landing/page.tsx (Server Component)
import { LandingHero } from "./_components/landing-hero";
import { HowItWorks } from "./_components/how-it-works";
import { CardsGallery } from "./_components/cards-gallery";
import { LeaderboardTeaser } from "./_components/leaderboard-teaser";
import { CTASection } from "./_components/cta-section";

export const metadata = {
  title: "Soccit — Gamified Football Prediction Market on Solana",
  description: "Predict the score. Pitch the subs. Lock it on-chain. Win the pool.",
};

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      <LandingHero />
      <HowItWorks />
      <CardsGallery />
      <LeaderboardTeaser />
      <CTASection />
    </main>
  );
}
```

### GSAP Plugin Registration

Register plugins **once** at the module level, not inside components:

```tsx
// app/landing/_components/gsap-setup.ts
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export { gsap, ScrollTrigger, SplitText, useGSAP };
```

Each section imports from this module. This avoids double-registration and tree-shakes correctly.

### The `useGSAP()` Hook Pattern

Every section component follows this pattern:

```tsx
"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../gsap-setup";

export function LandingHero() {
  const container = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(container.current, { autoAlpha: 1 });
      return;
    }

    // SplitText for headline
    const split = SplitText.create(headlineRef.current, {
      type: "words",
      mask: "words",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.words, {
          yPercent: 100,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
        });
      },
    });

    // Pin + parallax
    ScrollTrigger.create({
      trigger: container.current,
      pin: true,
      start: "top top",
      end: "+=100%",
      scrub: 1,
      animation: gsap.to(".hero-parallax", { y: -80 }),
    });

    return () => split.revert();
  }, { scope: container });

  return ( /* JSX */ );
}
```

### Escape from PageShell

The landing page must **not** use `PageShell` — it needs the full scrollable document, not the `overflow-hidden` fixed-height app shell. The landing page's `<main>` is a normal scrolling container. This is why it's a separate route.

### Image Handling

Use `next/image` `<Image>` component for all WebP assets, with appropriate `sizes` attributes:

```tsx
<Image
  src="/assets/cards/players/fw.webp"
  alt="Forward card"
  width={1023}
  height={1537}
  sizes="(max-width: 640px) 260px, (max-width: 1024px) 360px, 400px"
  className="w-full h-full object-cover"
/>
```

For images that GSAP animates (clip-reveal, parallax), wrap them in a positioned container and animate the container, not the `<Image>` directly — GSAP transforms on `next/image` can conflict with its internal sizing.

---

## 9. Performance Considerations

### GSAP Registration & Bundle Size

- Import only what's needed: `gsap` core (~30 KB gzipped), `ScrollTrigger` (~15 KB), `SplitText` (~8 KB), `@gsap/react` (~2 KB). Total ~55 KB gzipped — acceptable.
- Register at module scope (not per-render) to avoid repeated work.
- GSAP is already tree-shakeable. Import from `gsap/ScrollTrigger` (named path) not `gsap` (full bundle).

### Code Splitting

- The landing route should be a separate Next.js page. Next.js automatically code-splits per route, so GSAP only loads when the user visits `/landing`.
- If the landing replaces `/`, the app pages (which use `framer-motion`, not GSAP) are on different routes and won't load GSAP.
- **Do not** load GSAP in `app/layout.tsx` — keep it scoped to the landing route's components.

### ScrollTrigger Performance

- Use `once: true` for reveal animations (Leaderboard section) — kills the ScrollTrigger after it fires, freeing memory.
- Use `scrub: 1` (not `true`) for pinned sections — the 1-second catch-up smooths scroll without creating continuous tween updates.
- Call `ScrollTrigger.refresh()` after images load (WebP assets affect layout heights):
```javascript
useGSAP(() => {
  // ... setup ...
  // Refresh after images load
  const imgs = container.current?.querySelectorAll("img");
  if (imgs) {
    Promise.all(Array.from(imgs).map(img => 
      img.complete ? Promise.resolve() : new Promise(r => img.onload = r)
    )).then(() => ScrollTrigger.refresh());
  }
}, { scope: container });
```
- Set `invalidateOnRefresh: true` on ScrollTriggers that use function-based `end` values (horizontal scroll track width changes on resize).

### Font Loading & SplitText

SplitText can mis-split if fonts load after the split. Use `autoSplit: true` with `onSplit()` callback — this re-splits when fonts load and keeps animations in sync. All fonts are already loaded via `next/font/google` with `display: swap`, so this is a safety net.

### Reduced Motion

- Gate all GSAP animations behind `prefers-reduced-motion` check (shown above).
- For reduced motion users, set all animated elements to their final state immediately (`gsap.set()`), don't just skip the animation — otherwise elements stay at their `autoAlpha: 0` initial state and are invisible.
- The existing CSS `prefers-reduced-motion` media query in `globals.css` clamps CSS animations to 0.01ms, but GSAP animations are JavaScript-driven and bypass that — the JS check is mandatory.

### Layout Shift (CLS)

- Pin sections with `pin: true` add padding to the document. This is expected and not a CLS issue (it's intentional space).
- Images with `width`/`height` props (via `next/image`) reserve space — no CLS.
- Counters that tick up should start at their final value in the DOM and animate from 0 — this ensures the text is present even if JS fails.

### SSR Safety

- `useGSAP()` from `@gsap/react` uses `useIsomorphicLayoutEffect` internally — safe for SSR.
- All GSAP code runs inside `useGSAP()` which only executes client-side.
- The Server Component shell (`app/landing/page.tsx`) renders static HTML (headlines, text, image placeholders) that's visible before JS hydrates. GSAP animations then enhance on top.
- To prevent FOUC (flash of unstyled content before GSAP initializes), set initial states via CSS on elements that will be animated:
```css
[data-animate="fade-up"] {
  opacity: 0;
  transform: translateY(20px);
}
```
GSAP overrides these on init. If JS is disabled, add a `<noscript>` style that resets these.

---

## 10. Implementation Checklist

- [ ] `npm install gsap @gsap/react`
- [ ] Create `app/landing/` route with Server Component `page.tsx`
- [ ] Create `gsap-setup.ts` module with plugin registration
- [ ] Build `LandingHero` component (SplitText, clip-reveal, pin, parallax)
- [ ] Build `HowItWorks` component (3-panel pinned timeline, TCG token drops)
- [ ] Build `CardsGallery` component (horizontal scroll, velocity tilt, matchMedia fallback)
- [ ] Build `LeaderboardTeaser` component (counter tick-ups, podium bars, ScrollTrigger once)
- [ ] Build `CTASection` component (SplitText reveal, logo scale, pin)
- [ ] Add `TickerMarquee` at the bottom of CTA section (import from existing `_components/`)
- [ ] Add `prefers-reduced-motion` gating to every section
- [ ] Add `ScrollTrigger.refresh()` after image load in pinned sections
- [ ] Test on mobile (disable horizontal scroll pin, use vertical fallback)
- [ ] Verify flat radius (0px) on all elements — no rounded corners
- [ ] Verify all colors come from DESIGN.md tokens — no hardcoded hex
- [ ] Verify all fonts use `font-display` / `font-tech` / `font-body` classes
- [ ] Add `<noscript>` fallback styles to prevent FOUC
- [ ] Lighthouse audit: target 90+ performance, 100 accessibility

---

## Sources

- GSAP ScrollTrigger docs: https://gsap.com/docs/v3/Plugins/ScrollTrigger/ (HIGH confidence — official docs)
- GSAP core (Tween/Timeline) docs: https://gsap.com/docs/v3/GSAP/ (HIGH confidence — official docs)
- GSAP React useGSAP() docs: https://gsap.com/resources/React (HIGH confidence — official docs)
- GSAP SplitText docs: https://gsap.com/docs/v3/Plugins/SplitText/ (HIGH confidence — official docs)
- Next.js 16 use-client directive: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md` (HIGH confidence — bundled docs)
- Soccit DESIGN.md: `/Users/welly/soccit/docs/DESIGN.md` (HIGH confidence — project spec)
- Soccit arena data model: `/Users/welly/soccit/docs/arena-subs-data.md` (HIGH confidence — project spec)
