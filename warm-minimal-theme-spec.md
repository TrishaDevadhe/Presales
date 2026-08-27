# GravitySales — Bright Theme: "The Ledger" (Warm Minimal)

## Concept

Dark mode is **the engine room** — obsidian, glassy, glowing, technical. Bright mode is **the ledger** — paper, ink, hairline rules, the tactile feeling of a well-kept deal book. Same product, same brand accents, different material. This gives the two themes a reason to look different beyond "light vs dark," and it's grounded in what the app actually is: a system of record for deals, proposals, and revisions.

The signature element that carries this idea through the UI is described in section 4.

---

## 1. Design Tokens

```
+-----------------------------------------------------------------------------+
|                        BRIGHT THEME — "THE LEDGER"                          |
+-----------------------------------------------------------------------------+
| Background Primary : #F7F4EE (Warm Linen)                                   |
| Background Secondary: #EFEAE0 (Paper Band / Section Fill)                   |
| Surface / Card      : #FFFFFF (Ledger Page)                                 |
+-----------------------------------------------------------------------------+
| Ink Primary         : #1C1810 (Warm Near-Black — never pure #000)           |
| Ink Secondary       : #6B6357 (Muted body / labels)                         |
| Hairline Border     : rgba(28, 24, 16, 0.10)                                |
| Hairline Strong     : rgba(28, 24, 16, 0.16) (table dividers, active rules) |
+-----------------------------------------------------------------------------+
| Shadow — Rest       : 0 1px 2px rgba(28,24,16,0.04)                         |
| Shadow — Lift(hover): 0 10px 28px rgba(28,24,16,0.08)                       |
+-----------------------------------------------------------------------------+
| Primary Accent     : #6366f1 (Indigo) — same as dark theme                  |
| Secondary Accent   : #06b6d4 (Cyan)   — same as dark theme                  |
| Purple Accent      : #8b5cf6 (Purple) — same as dark theme, used sparingly  |
+-----------------------------------------------------------------------------+
| Status Success  #10b981 | Warning #f59e0b | Danger #ef4444 | Info #3b82f6   |
| (used as 12% tint fills with deepened text color — see §3)                  |
+-----------------------------------------------------------------------------+
```

**Why the accents don't change:** keeping Indigo/Cyan/Purple identical across both themes is what makes them feel like *one product with two moods* rather than two different apps. Everything that changes between themes lives in the neutrals, the shadows, and the surface material — not the brand color.

---

## 2. Typography (bright-theme specific rules)

Same families as dark mode (`Outfit` for headers/metrics, `Inter` for body/data) — but bright mode leans harder into type as hierarchy since there's no glow or blur to create depth:

- Headline weight jumps are more aggressive: `Outfit 700` for page titles vs `Outfit 500` for card labels — wider contrast than in dark mode, where glow does some of that work.
- Metric numbers use **tabular figures** (`font-variant-numeric: tabular-nums`) so dashboard cards don't jitter on count-up.
- Body/table text sits at `Ink Secondary` (#6B6357), not pure black — keeps the paper feeling soft, only titles and active values hit `Ink Primary`.
- Letter-spacing +0.02em on all-caps labels (status badges, table headers) — a small "ledger stamp" feel.

---

## 3. Status Pills / Chips (light-background formula)

Your existing status hexes are tuned for dark backgrounds and will feel washed out or low-contrast as flat fills on white. Use tint + deepened-text pairs instead:

| Status | Background | Text |
|---|---|---|
| Success | `rgba(16,185,129,0.12)` | `#047857` |
| Warning | `rgba(245,158,11,0.14)` | `#B45309` |
| Danger | `rgba(239,68,68,0.12)` | `#B91C1C` |
| Info | `rgba(59,130,246,0.12)` | `#1D4ED8` |

Same pattern for priority/complexity tags in Opportunities and Work Items.

---

## 4. Signature Element: The Fold

The one deliberate, memorable move in this theme — used with restraint, not everywhere.

**Ledger cards** (opportunity cards, resource profile cards, feedback entries) get a small folded-corner detail in the top-right, rendered as a CSS triangle in `Background Secondary`. On hover, the fold "lifts" — it grows slightly and casts its own tiny shadow, as if you're about to turn the page — and the card underneath gets the `Shadow — Lift` treatment plus a 2px accent-colored rule that draws in along the card's top edge (left to right, ~180ms). This is the one place `Primary Accent` shows up as motion rather than a static color, so it stays a genuine "moment" instead of noise.

Everywhere else — tables, sidebar, forms — stays quiet: hairline rules, no glow, no blur, no gradients.

```css
/* Ledger Card Base */
.paper-panel {
  background: var(--surface-card);
  border: 1px solid var(--hairline-border);
  border-radius: var(--radius-md); /* same radius tokens as dark theme */
  box-shadow: var(--shadow-rest);
  position: relative;
  overflow: hidden;
}

/* Folded corner */
.paper-panel::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 22px; height: 22px;
  background: linear-gradient(135deg, transparent 50%, var(--bg-secondary) 50%);
  transition: width 180ms ease, height 180ms ease;
}

/* Top accent rule — draws in on hover, not a static border */
.paper-panel::before {
  content: '';
  position: absolute;
  top: 0; left: 0; height: 2px;
  width: 0%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width 220ms ease;
}

.paper-panel:hover {
  box-shadow: var(--shadow-lift);
  transform: translateY(-2px);
}
.paper-panel:hover::after { width: 30px; height: 30px; }
.paper-panel:hover::before { width: 100%; }
```

---

## 5. Motion & Interaction Patterns (bright theme)

- **Dashboard metrics**: count up from 0 on mount/tab-switch (~600ms, ease-out), tabular-nums prevents layout shift.
- **Nav items (sidebar)**: active item gets a thin left-side ink rule + label weight jump, not a filled pill — quieter than dark mode's glow treatment, matches the "ledger tab" feeling.
- **Table row hover**: background steps to `Background Secondary`, no shadow — tables should feel flat and legible, motion is reserved for cards.
- **Modals (Opportunity Creation, etc.)**: slide up 8px + fade, no blur backdrop — instead a soft warm scrim (`rgba(28,24,16,0.25)`), consistent with "paper on a desk" rather than "glass overlay."
- **Reduced motion**: all of the above collapse to opacity-only transitions when `prefers-reduced-motion` is set.

Keep this list short in practice — this theme's premium feeling comes from restraint and precision (consistent hairlines, tight spacing rhythm, tabular numbers), not from animation volume.

---

## 6. Quick Notes Per Page

| Page | Bright-theme specific note |
|---|---|
| Dashboard | Metric cards get the Fold treatment; alert panels (Deadlines, Overload) use Warning/Danger tint pills, not solid fills |
| Opportunities | Table stays flat/hairline; only the row's priority + stage badges carry color |
| Work Items | Status badges use the tint formula; "Blocked" badge is the one place Danger tint appears filled slightly stronger, for scannability |
| Effort Logs | Burn-rate variance shown as a thin horizontal bar (over/under) in Success/Danger tint, not a glowing gauge |
| Proposal Revisions | Version history reads like a literal ledger: numbered rows, hairline dividers, Fold detail only on the current/latest version card |
| Client Feedback | Severity as tint pill; "Critical" is the one severity allowed a filled (non-tint) Danger badge |
| Resource Profiles | Member cards get the Fold; skill tags are neutral outline chips, not colored, so they don't compete with capacity-status color |
| Admin Console | Flattest page in the app on purpose — dense config tables, no cards, signals "this is the control layer" |

---

## 7. Drop-in Prompt Paragraph (for your Antigravity page-generation doc)

> **Bright Theme — "The Ledger":** A warm, paper-toned minimal theme (background `#F7F4EE`, cards `#FFFFFF`, ink `#1C1810`/`#6B6357`) that reuses the exact same brand accent colors as the dark theme (Indigo `#6366f1`, Cyan `#06b6d4`, Purple `#8b5cf6`) so both themes read as one product. No glassmorphism, no blur, no glow — depth comes from soft warm shadows and hairline borders only. The signature interactive detail is the "Fold": cards have a small folded-corner in the top-right that lifts on hover alongside a top-edge accent rule that draws in left-to-right. Status colors use 12%-opacity tint backgrounds with deepened text, never flat neon fills. Typography leans on stronger weight contrast (Outfit 700 headers vs 500 labels) and tabular figures on all metrics, since there's no glow to carry hierarchy. Keep every non-card surface (tables, sidebar, forms) flat and quiet — the Fold is the one bold move in this theme, everything else is restraint.

---

## 8. What NOT to let Gemini/Antigravity default to

Since this is being generated via prompt, explicitly flag these anti-patterns in your instructions or you'll likely get them back:

- Don't invert the dark theme's glassmorphism into a "light glass" look (frosted white blur) — this theme has **no blur, anywhere**.
- Don't introduce a new accent color (e.g., terracotta/clay) for the light theme — same three brand accents as dark mode.
- Don't use pure white text-on-color status badges as the default — use the tint formula in §3 or they'll look neon/harsh on paper background.
- Don't let card corner-radius or spacing scale differ from the dark theme's tokens — only color/material should change between themes, not the underlying grid.
