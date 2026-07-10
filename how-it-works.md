# HowItWorks Component — Deep Breakdown

> File: `app/landing/_components/how-it-works.tsx`
> Pattern: Pinned scroll-driven media stack (Wembi-inspired)

## 1. What It Does

`HowItWorks` is a full-viewport, scroll-pinned section that walks the user through the 3-step Soccit gameplay loop:

1. **Call the Score** — pick exact score or winning outcome.
2. **Pitch the Subs** — drag substitute cards onto the pitch.
3. **Lock It In** — slide to commit the prediction on-chain.

The section stays pinned while the user scrolls through `300vh` of scroll distance. As they scroll, three things animate in lockstep:

- A **step indicator** at the top (dots + progress line).
- A **category carousel + split-text title/description** on the left.
- A **media stack** on the right that crossfades between the three interactive panels.

---

## 2. Static Data

### 2.1 `STEPS`

```ts
const STEPS = [
  { id: 0, category: "Step 1", title: "Call the Score", description: "Read the match..." },
  { id: 1, category: "Step 2", title: "Pitch the Subs", description: "Drag substitute cards..." },
  { id: 2, category: "Step 3", title: "Lock It In", description: "Slide to commit..." },
];
```

Drives the step indicator, category carousel, titles, and descriptions.

### 2.2 `FORMATION`

Array of 11 player tokens positioned as `%` coordinates on the pitch graphic:

```ts
{ id: "gk", src: "/assets/cards/players/gk.webp", x: 50, y: 88, pos: "GK" }
```

Used in Panel B. Each token is an absolutely positioned `motion.div` with hover scale.

### 2.3 `BENCH`

Array of 5 substitute cards. Rendered as a horizontally scrollable row in Panel B with a shimmer overlay.

---

## 3. DOM Structure

```tsx
<section id="how-it-works" ref={container} className="relative h-[300vh] w-full bg-background">
  <div className="sticky top-0 flex h-screen ...">
    {/* 1. Step indicator */}
    <div data-step-line />
    <div data-step-indicator><div data-step-dot /><span data-step-label /></div>

    {/* 2. Two-column content */}
    <div className="grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT: text stack */}
      <div>
        <div ref={categoryRef}>      {/* category carousel */}
          <div data-category-inner>
            <span>Step 1</span><span>Step 2</span><span>Step 3</span>
          </div>
        </div>
        <div className="h-[1.2em] overflow-hidden">
          <h2 data-step-title>Call the Score</h2>      {/* absolute */}
          <h2 data-step-title>Pitch the Subs</h2>      {/* absolute */}
          <h2 data-step-title>Lock It In</h2>          {/* absolute */}
        </div>
        <div className="h-[3.5em] overflow-hidden">
          <p data-step-desc>...</p>  {/* absolute */}
          <p data-step-desc>...</p>  {/* absolute */}
          <p data-step-desc>...</p>  {/* absolute */}
        </div>
        <div className="badges">5pts exact / 3pts outcome</div>
      </div>

      {/* RIGHT: media stack */}
      <div className="relative aspect-[4/3] lg:aspect-square">
        <div ref={panelARef}>...</div>   {/* Panel A - score */}
        <div ref={panelBRef}>...</div>   {/* Panel B - pitch */}
        <div ref={panelCRef}>...</div>   {/* Panel C - lock */}
      </div>
    </div>
  </div>
</section>
```

### Why `h-[300vh]`?

The root `<section>` is `300vh` tall to create scroll distance. The inner `<div>` is `sticky top-0 h-screen` so it stays in view while the user scrolls through those `300vh`. The GSAP ScrollTrigger is attached to the root section and pins it.

---

## 4. Animation System

### 4.1 ScrollTrigger setup

```ts
const howTl = gsap.timeline({
  scrollTrigger: {
    trigger: container.current,
    pin: true,
    start: "top top",
    end: "+=300%",
    scrub: 1,
    onUpdate: (self) => { /* step indicator logic */ },
  },
});
```

- `pin: true` — pins the section root.
- `end: "+=300%"` — the pinned animation plays over 3 viewport heights of scroll.
- `scrub: 1` — animations are tied 1:1 to scroll position with a tiny smoothing lag.

The timeline progress `0 → 1` maps directly to scroll progress through the pinned section.

---

## 5. Timeline Breakdown

### 5.1 Master timeline overview

| Time (progress) | Event |
|-----------------|-------|
| `0.000` | Section pins. Panel A already visible. |
| `0.000 → 1.000` | Step progress line scales 0 → 1. |
| `0.000 → 1.000` | Category carousel slides `yPercent 0 → -66.67%`. |
| `0.050` | `setActivePanel(0)` — confirms Panel A. |
| `0.050` | Score count-up begins (0–0 → 2–1). |
| `0.100` | Score control buttons fade in. |
| `0.120` | Step 1 title/desc reveal in. |
| `0.280` | Step 1 title/desc reveal out. |
| `0.383` | `setActivePanel(1)` — switches to Panel B. |
| `0.450` | Tokens drop onto the pitch. |
| `0.453` | Step 2 title/desc reveal in. |
| `0.550` | Formation lines draw + bench shimmer. |
| `0.613` | Step 2 title/desc reveal out. |
| `0.716` | `setActivePanel(2)` — switches to Panel C. |
| `0.750` | Lock slider thumb moves 0% → 95%. |
| `0.786` | Step 3 title/desc reveal in. |
| `0.950` | Lock completes → celebration burst + "Prediction Locked". |

---

### 5.2 Step indicator

```ts
onUpdate: (self) => {
  const progress = self.progress;
  const step = Math.min(2, Math.floor(progress * 3));
  // toggle dot/label classes for each indicator
}
```

- At progress `0.000 → 0.333`: step = 0, only dot 1 is active.
- At progress `0.333 → 0.666`: step = 1, dots 1 & 2 active.
- At progress `0.666 → 1.000`: step = 2, all dots active.

The progress line is animated separately:

```ts
howTl.fromTo("[data-step-line]", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
```

---

### 5.3 Category carousel

```ts
howTl.fromTo(
  "[data-category-inner]",
  { yPercent: 0 },
  { yPercent: -(100 / 3) * 2, ease: "none" },
  0
);
```

The inner container is 3 lines tall (`1.6cap × 3`). It translates up by `-66.67%` over the full scroll. This means:

| Progress | `yPercent` | Visible category |
|----------|------------|------------------|
| 0.00 | 0% | Step 1 |
| 0.50 | -33.33% | Step 2 |
| 1.00 | -66.67% | Step 3 |

> **Note:** The carousel is continuous/linear, while the panels switch at discrete points (`0.05`, `0.383`, `0.716`). At the Panel B switch (`0.383`), the carousel is only at `-12.78%` and still mostly shows "Step 1". This can feel slightly out of sync. A better mapping would keyframe the carousel to `-33.33%` and `-66.67%` exactly at the panel switch times.

---

### 5.4 Title & description split-text reveals

Each title and description is split using GSAP `SplitText`:

```ts
// Titles: split by words, masked
SplitText.create(el, { type: "words", mask: "words", autoSplit: true })

// Descriptions: split by lines, masked
SplitText.create(el, { type: "lines", mask: "lines", autoSplit: true })
```

Initial state:

```ts
titleSplits.forEach((split) => gsap.set(split.words, { yPercent: 110, autoAlpha: 0 }));
descSplits.forEach((split) => gsap.set(split.lines, { yPercent: 110, autoAlpha: 0 }));
```

Per-step animation:

```ts
[0, 1, 2].forEach((step) => {
  const start = step / 3;       // 0, 0.333, 0.666
  const mid = start + 0.12;     // 0.12, 0.453, 0.786
  const end = start + 0.28;     // 0.28, 0.613, 0.946

  // reveal in
  howTl.to(titleSplits[step].words, { yPercent: 0, autoAlpha: 1, ... }, mid);
  howTl.to(descSplits[step].lines, { yPercent: 0, autoAlpha: 1, ... }, mid + 0.02);

  // reveal out (except last step)
  if (step < 2) {
    howTl.to(titleSplits[step].words, { yPercent: -110, autoAlpha: 0, ... }, end);
    howTl.to(descSplits[step].lines, { yPercent: -110, autoAlpha: 0, ... }, end + 0.01);
  }
});
```

**Timing details:**
- Reveal in: `duration: 0.08`, stagger `0.01`, ease `power4.out`.
- Reveal out: `duration: 0.06`, stagger `0.005`, ease `power4.in`.

Because these durations are tiny and the timeline is scrubbed, the visible effect is a quick word-by-word reveal at the midpoint of each step, then a quick exit.

---

### 5.5 Media stack transitions

```ts
const setActivePanel = (active: number) => {
  [panelARef, panelBRef, panelCRef].forEach((ref, idx) => {
    if (!ref.current) return;
    const isActive = idx === active;
    gsap.to(ref.current, {
      clipPath: isActive ? "inset(0% round 0px)" : "inset(10% round 0px)",
      filter: isActive ? "blur(0px)" : "blur(8px)",
      scale: isActive ? 1 : 1.05,
      autoAlpha: isActive ? 1 : 0,
      duration: 0.4,
      ease: "power4.out",
    });
  });
};
```

Initial state:

```ts
gsap.set([panelBRef.current, panelCRef.current], {
  autoAlpha: 0,
  clipPath: "inset(10% round 0px)",
  filter: "blur(8px)",
  scale: 1.05,
});
gsap.set(panelARef.current, {
  autoAlpha: 1,
  clipPath: "inset(0% round 0px)",
  filter: "blur(0px)",
  scale: 1,
});
```

Panel switches are triggered at:

```ts
[0, 1, 2].forEach((step) => {
  const t = step / 3 + 0.05;   // 0.05, 0.383, 0.716
  howTl.call(() => setActivePanel(step), [], t);
});
```

This gives each panel ~5% of buffer after its theoretical step boundary before switching.

---

## 6. Panel-Specific Internal Animations

### 6.1 Panel A — Call the Score

Elements:
- Portugal flag (left)
- Argentina flag (right)
- Score display (`scoreARef`)
- `+` / `-` control buttons (`data-score-control`)

Animations:

```ts
// Score count-up 0-0 → 2-1
const scoreA = { home: 0, away: 0 };
howTl.to(scoreA, {
  home: 2,
  away: 1,
  ease: "power2.out",
  onUpdate: () => { scoreARef.current.textContent = "..."; }
}, 0.05);

// Controls fade/slide in
howTl.from("[data-score-control]", { autoAlpha: 0, x: -20, stagger: 0.05 }, 0.1);
```

The `+`/`-` buttons are decorative (no click handlers).

---

### 6.2 Panel B — Pitch the Subs

Elements:
- Pitch background image (`/field.webp`)
- SVG formation lines (`data-formation-line`)
- 11 player tokens (`data-token`)
- Bench row (`data-bench-shimmer`)

Animations:

```ts
// Tokens drop from above with bounce
howTl.from("[data-token]", {
  y: -120,
  scale: 0.6,
  rotation: -5,
  autoAlpha: 0,
  stagger: { each: 0.02, from: "center" },
  ease: "bounce.out",
  onComplete: () => { /* add animate-slot-flash class */ }
}, 0.45);

// Formation lines draw via stroke-dashoffset
howTl.fromTo("[data-formation-line]",
  { strokeDashoffset: 200 },
  { strokeDashoffset: 0, duration: 0.2, stagger: 0.03, ease: "power2.out" },
  0.55
);

// Bench shimmer fades in
howTl.from("[data-bench-shimmer]", { autoAlpha: 0, duration: 0.15 }, 0.55);
```

The tokens are Framer Motion `motion.div`s with `whileHover` scale. The bench cards also have hover lift.

---

### 6.3 Panel C — Lock It In

Elements:
- Lock track background
- Fill bar (`lockFillRef`)
- Ghost thumb (`lockGhostRef`)
- Main thumb (`lockThumbRef`)
- Particle burst (`burstRef`)
- "Prediction Locked" text (`data-locked-text`)

Animations:

```ts
const lockProgress = { pct: 0 };
howTl.to(lockProgress, {
  pct: 95,
  ease: "none",
  onUpdate: () => {
    lockThumbRef.current.style.left = `${pct}%`;
    lockGhostRef.current.style.left = `${Math.max(0, pct - 8)}%`;
    lockFillRef.current.style.width = `${pct}%`;
  },
  onComplete: () => {
    // Celebration burst
    panelCRef.current.classList.add("celebration-burst");
    burstRef.current.classList.remove("pointer-events-none", "opacity-0");

    // Particles fly out
    gsap.fromTo("[data-particle]",
      { x: 0, y: 0, opacity: 1, scale: 1 },
      { x: [...], y: [...], opacity: 0, scale: 0, duration: 1, stagger: 0.05 }
    );

    // "Prediction Locked" text pops in
    gsap.fromTo("[data-locked-text]",
      { scale: 0.9, letterSpacing: "0.2em", opacity: 0 },
      { scale: 1, letterSpacing: "0.05em", opacity: 1, duration: 0.6 }
    );
  }
}, 0.75);
```

> **Note:** `onComplete` of a scrubbed tween fires when the playhead reaches the end of that tween while scrolling forward. If the user scrolls backward past it, the celebration class and particle state are not reset.

---

## 7. Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| `< lg` (mobile/tablet) | Single column. Media stack appears **above** text content (`order-1` vs `order-2`). |
| `≥ lg` (desktop) | Two columns. Text on left, media stack on right. |

The pinned behavior and GSAP timeline are the same across breakpoints, but the aspect ratio of the media stack changes (`aspect-[4/3]` → `aspect-square`).

---

## 8. Cleanup & Performance

### SplitText cleanup

```ts
return () => {
  titleSplits.forEach((s) => s.revert());
  descSplits.forEach((s) => s.revert());
};
```

Reverts the DOM modifications made by `SplitText.create()` when the component unmounts or `useGSAP` re-runs.

### Image load refresh

```ts
const imgs = container.current?.querySelectorAll("img");
if (imgs) {
  Promise.all(
    Array.from(imgs).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => (img.onload = () => r()))
    )
  ).then(() => ScrollTrigger.refresh());
}
```

Waits for all images inside the section to load, then calls `ScrollTrigger.refresh()` so pinned dimensions are correct.

### Reduced motion

```ts
if (shouldReduceMotion) {
  gsap.set([panelARef.current, panelBRef.current, panelCRef.current], { autoAlpha: 1 });
  if (scoreARef.current) scoreARef.current.textContent = "2 — 1";
  return;
}
```

All panels are visible and the final score is shown immediately.

---

## 9. Known Issues & Opportunities

### 9.1 Category carousel / panel switch misalignment

The carousel translates linearly from `0%` to `-66.67%` over the whole timeline, but panels switch at `0.05`, `0.383`, `0.716`. This means the visible category lags behind the active panel at switch moments.

**Fix idea:** Animate the carousel in discrete keyframes:

```ts
howTl.fromTo("[data-category-inner]", { yPercent: 0 }, { yPercent: 0, ease: "none" }, 0);
howTl.to("[data-category-inner]", { yPercent: -33.33, ease: "none" }, 0.333);
howTl.to("[data-category-inner]", { yPercent: -66.67, ease: "none" }, 0.666);
```

### 9.2 Panel C celebration is one-way

The celebration burst, particles, and "Prediction Locked" text only trigger on scroll forward. Scrolling back up leaves Panel C in its post-celebration state.

**Fix idea:** Track scroll direction in `onUpdate` and reset/rewind Panel C state when scrolling backward, or use timeline tweens for the particles/text instead of `onComplete` callbacks.

### 9.3 Text stack line-break fragility

The title and description stacks rely on `SplitText` with `autoSplit: true` on absolutely positioned elements inside overflow-hidden containers. If the container width changes (e.g., font loading, hydration mismatch), line breaks can differ between server and client.

**Fix idea:** Force explicit widths or use `SplitText` with `type: "words"` for both titles and descriptions to avoid line-dependent masking.

### 9.4 Decorative buttons

The `+`/`-` score buttons and bench cards have no actual interaction. They are purely visual. If the product later supports real interaction, these need handlers.

### 9.5 Panel A score count-up repeats

The score counts up on every mount/scroll-through. If the user scrolls back to the top and down again, it counts up again because the scrub timeline replays.

---

## 10. Quick Reference: Refs

| Ref | Element | Purpose |
|-----|---------|---------|
| `container` | `<section id="how-it-works">` | ScrollTrigger trigger + pin target |
| `panelARef` | Panel A wrapper | Media stack panel 1 |
| `panelBRef` | Panel B wrapper | Media stack panel 2 |
| `panelCRef` | Panel C wrapper | Media stack panel 3 |
| `scoreARef` | Score text span | Animated score value |
| `lockThumbRef` | Lock thumb div | Slider thumb position |
| `lockGhostRef` | Ghost thumb div | Trailing slider ghost |
| `lockFillRef` | Fill bar div | Progress fill width |
| `burstRef` | Particle container | Celebration burst origin |
| `categoryRef` | Category carousel | Currently set but not animated directly |

---

## 11. Quick Reference: Data Attributes

| Selector | Elements |
|----------|----------|
| `[data-step-line]` | Progress line background |
| `[data-step-indicator]` | Dot + label wrapper |
| `[data-step-dot]` | Status dot |
| `[data-step-label]` | Step label text |
| `[data-category-inner]` | Category carousel inner container |
| `[data-step-title]` | Each step H2 |
| `[data-step-desc]` | Each step description |
| `[data-score-control]` | `+`/`-` buttons in Panel A |
| `[data-token]` | Player tokens in Panel B |
| `[data-formation-line]` | SVG lines in Panel B |
| `[data-bench-shimmer]` | Bench row in Panel B |
| `[data-particle]` | Burst particles in Panel C |
| `[data-locked-text]` | "Prediction Locked" text |
