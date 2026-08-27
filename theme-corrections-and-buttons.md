# GravitySales — Correction Brief: Bright Theme Fixes + Button System

Use this document to correct `PROJECT_DOCUMENTATION.md`. It replaces section 2 (Design Tokens) and adds a new section 4.4 (Button System). Apply these exactly — do not reinterpret or re-generate the values below.

---

## PART A — Fix the "Ledger" Bright Theme Tokens

The current bright-theme tokens have drifted from spec in five ways. Replace the entire token block in section 2 with this:

```
+-----------------------------------------------------------------------------+
|                      THE LEDGER (WARM MINIMAL) TOKENS                       |
+-----------------------------------------------------------------------------+
| Background Primary  : #F7F4EE (Warm Linen Paper)                            |
| Background Secondary: #EFEAE0 (Paper Band / Section Fill)                   |
| Paper Panel          : #FFFFFF (White Ledger Page)                          |
| Border Subtle        : #E5E0D8 (1px Hairline Border)                        |
+-----------------------------------------------------------------------------+
| Text Primary        : #1C1810 (Warm Ink — not pure black/gray)              |
| Text Secondary      : #6B6357 (Muted warm slate)                            |
+-----------------------------------------------------------------------------+
| Primary Accent      : #6366f1 (Indigo — MUST match Obsidian dark theme)     |
| Secondary Accent    : #06b6d4 (Cyan — MUST match Obsidian dark theme)       |
| Purple Accent       : #8b5cf6 (used sparingly, same as dark theme)          |
+-----------------------------------------------------------------------------+
|                    12% TINT BADGES — TEXT USES DEEPENED HUE                 |
| Status Success : text #047857 on rgba(16, 185, 129, 0.12)                   |
| Status Warning : text #B45309 on rgba(245, 158, 11, 0.14)                   |
| Status Danger  : text #B91C1C on rgba(239, 68, 68, 0.12)                    |
| Status Info    : text #1D4ED8 on rgba(59, 130, 246, 0.12)                   |
+-----------------------------------------------------------------------------+
```

### Rules — do not deviate from these

1. **Accent colors are shared across both themes, always.** Never introduce a new accent hue for the bright theme (no new "Classic Indigo," no "Deep Violet," no terracotta). Indigo `#6366f1`, Cyan `#06b6d4`, and Purple `#8b5cf6` are the only accents in the entire product, in both themes.
2. **Never use the full-saturation status hex as text on its own tint.** `#10B981` text on `rgba(16,185,129,0.12)` background fails accessibility contrast (~2.5:1). Always use the deepened text hex from the table above — the tint bg stays the same, only the text darkens.
3. **Background Primary is `#F7F4EE`, not `#F4F1EA`.** These look similar but `#F4F1EA` is a widely-recognized default "AI-generated warm minimal" background — don't use it.
4. **Text colors are warm-toned, never neutral gray.** Do not use `#1A1A1A` / `#555555` / `#888888` — use `#1C1810` / `#6B6357` instead.

---

## PART B — Restore the Signature "Fold" Interaction

The current bright-theme card hover (`border-color` change + `translateY(-1px)`) is generic and must be replaced. Cards in the bright theme need a folded-corner detail that is the one deliberate "premium" signature of this theme — everything else in the theme stays quiet and flat by design, so this is the only place motion/color should stand out.

Replace `.paper-panel-hover` in section 4.2 with:

```css
/* Ledger Card Base */
.paper-panel {
  background: var(--paper-panel);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
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

.paper-panel-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.paper-panel-hover:hover::after { width: 30px; height: 30px; }
.paper-panel-hover:hover::before { width: 100%; }
```

Apply `.paper-panel` to every card surface (dashboard metric cards, opportunity cards, resource profile cards, feedback entries, the current/latest version card in Proposal Revisions). Do not apply the Fold to dense data tables or the Admin Console — those stay flat on purpose.

---

## PART C — Professional Button System (both themes)

Buttons across the app currently have no defined hierarchy or state system. Every button — in both `data-theme="ledger"` and `data-theme="obsidian"` — must use this system. No one-off button styles anywhere in the app.

### Hierarchy (use in this order of visual weight)

1. **Primary** — one per view/section max. The single main action (e.g. "Create Opportunity," "Save Changes," "Log Effort").
2. **Secondary** — supporting actions next to a primary (e.g. "Cancel," "Export").
3. **Ghost/Text** — low-emphasis actions, inline table actions, tertiary links.
4. **Danger** — destructive actions only (Delete, Remove Member, Discard Revision).

Never use two primary buttons side by side. Never use color alone to signal danger — destructive buttons always carry a clear label ("Delete," not just an icon).

### Sizing

Three sizes only: `sm` (32px height, tables/inline), `md` (40px height, default), `lg` (48px height, modal primary CTAs). Same horizontal padding scale in every theme: `sm` 12px, `md` 16px, `lg` 20px.

### States every button must implement

- **Rest** — base style below.
- **Hover** — subtle lift/brighten, never a jarring color jump.
- **Active/press** — `transform: scale(0.98)`, no lift, gives tactile feedback.
- **Focus-visible** — a visible 2px accent-colored ring with 2px offset. Required for keyboard accessibility — do not skip this even if it "looks cleaner" without it.
- **Disabled** — 45% opacity, `cursor: not-allowed`, no hover/active transitions.
- **Loading** — label is replaced by a small spinner at the same width as the label (prevents button width from jumping); button is non-interactive while loading.

### CSS — Ledger (bright) theme

```css
.btn {
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.btn-primary {
  background: var(--accent-primary);
  color: #FFFFFF;
  box-shadow: 0 1px 2px rgba(28,24,16,0.08);
}
.btn-primary:hover {
  background: #4F52E0; /* accent-primary, ~8% darker */
  box-shadow: 0 6px 16px rgba(99,102,241,0.24);
  transform: translateY(-1px);
}
.btn-primary:active { transform: scale(0.98); box-shadow: 0 1px 2px rgba(28,24,16,0.08); }

.btn-secondary {
  background: var(--paper-panel);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}
.btn-secondary:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  padding: 0 8px;
}
.btn-ghost:hover { color: var(--text-primary); background: var(--bg-secondary); }

.btn-danger {
  background: transparent;
  color: #B91C1C;
  border: 1px solid rgba(239,68,68,0.3);
}
.btn-danger:hover { background: rgba(239,68,68,0.08); }

.btn:disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
.btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
```

### CSS — Obsidian (dark) theme

```css
.btn-primary {
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(99,102,241,0.25);
}
.btn-primary:hover {
  box-shadow: 0 4px 20px rgba(99,102,241,0.4);
  transform: translateY(-1px);
}
.btn-primary:active { transform: scale(0.98); }

.btn-secondary {
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
}
.btn-secondary:hover { border-color: rgba(99,102,241,0.4); }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }

.btn-danger {
  background: transparent;
  color: #F87171;
  border: 1px solid rgba(239,68,68,0.35);
}
.btn-danger:hover { background: rgba(239,68,68,0.12); }
```

### Rules — do not deviate

- Icon-only buttons (table row actions, close buttons) still get all states above, sized to a square matching `sm`/`md` height, with the icon centered.
- No button anywhere should use a hardcoded hex — every color must reference the theme's CSS variables so buttons correctly re-skin when `data-theme` toggles.
- Primary buttons never use the Fold effect from Part B — the Fold is card-only.
