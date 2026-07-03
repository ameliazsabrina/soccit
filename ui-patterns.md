# Soccit UI Patterns

Reusable component styles and patterns used across the Soccit frontend.

---

## Enter Button

The primary CTA for entering a match. Based on the card-hero button on the start menu.

### Component

`app/_components/enter-button.tsx`

### Usage

```tsx
import { EnterButton } from "./_components/enter-button";

// Inside a Next.js Link
<Link href="/matches/[pda]">
  <EnterButton />
</Link>

// Custom label or size override
<EnterButton className="px-4 py-2 text-xs">Enter Arena</EnterButton>
```

### Style definition

```tsx
<span
  className={
    "btn-gradient inline-flex items-center gap-3 " +
    "px-8 py-4 font-display text-xl uppercase tracking-[0.1em] text-white"
  }
>
  {children}
  <span className="material-symbols-outlined">arrow_forward</span>
</span>
```

### Tokens used

- **Background:** `btn-gradient` utility (`linear-gradient(to right, var(--purple), var(--cyan), var(--purple))` with `background-size: 200% auto`)
- **Font:** `font-display` → Unica One
- **Case:** uppercase
- **Tracking:** `tracking-[0.1em]`
- **Text color:** white
- **Icon:** Material Symbols `arrow_forward`
- **Hover:** gradient shifts right + cyan glow shadow

### When to use

- Any primary "Enter" action: match rooms, arenas, featured matches.
- Keep the gradient style consistent; only scale padding/font-size for context.
