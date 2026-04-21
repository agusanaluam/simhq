# Brand Guidelines – SIM Hewan Qurban
**Design System:** Verdant Ledger  
**Source:** Stitch project `6711390392877823593`  
**North Star:** *Organic Precision* — premium financial + reliable livestock management

---

## Colors

### Primary (Green)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#006b2c` | Button gradient start, sidebar brand bg |
| `--color-primary-container` | `#00873a` | Button gradient end |
| `--color-brand` | `#16a34a` | Active states, links, accents |
| `--color-primary-fixed` | `#7ffc97` | Light green on dark bg (sidebar subtitle) |
| `--color-on-primary` | `#ffffff` | Text on green bg |

### Surface (Tonal Layering — NO BORDERS)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-surface-container-lowest` | `#ffffff` | Cards, modals (lifted) |
| `--color-surface-container-low` | `#eff4ff` | Page background |
| `--color-surface-container` | `#e5eeff` | Sidebar, sub-panels |
| `--color-surface-container-high` | `#dce9ff` | Nested sections |
| `--color-surface-container-highest` | `#d3e4fe` | Input fills, hover states |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-on-surface` | `#0b1c30` | All body text (NOT pure black) |
| `--color-on-surface-variant` | `#3e4a3d` | Secondary text, labels |
| `--color-on-secondary-container` | `#57657a` | Placeholder, metadata |

### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-error` | `#ba1a1a` | Error states |
| `--color-tertiary` | `#a72d51` | Alerts, destructive actions, "Keluar" |
| `--color-secondary-container` | `#d5e3fc` | Secondary buttons bg |

---

## Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Headlines | **Manrope** | 600–800 | Page titles, KPI numbers, brand name |
| Body / Labels | **Inter** | 400–500 | Table data, form labels, descriptions |

**Rules:**
- KPI numbers → `font-family: Manrope`, large size, hero treatment
- All-caps labels → `label-sm` Inter + 5% letter-spacing ("archival" look)
- Never pure black text → always use `--color-on-surface` (#0b1c30)

---

## Components

### Buttons
```css
/* Primary — gradient, not flat */
background: linear-gradient(135deg, #006b2c, #00873a);
border-radius: 0.75rem (12px);
color: white;
```
- No border on secondary → use `secondary-container` bg
- Tertiary = text-only with hover bg

### Cards
```css
/* "Lifted" via color shift — NO drop shadow border */
background: var(--color-surface-container-lowest);  /* white */
/* On top of: */
background: var(--color-surface-container-low);     /* #eff4ff page bg */
border-radius: 0.5rem (8px);
box-shadow: 0 8px 32px rgba(11, 28, 48, 0.06);     /* tinted, not black */
```

### Inputs
```css
background: var(--color-surface-container-highest);  /* #d3e4fe */
border: none;
border-radius: 0.375rem (6px);
/* Focus: 2px brand-green underline or ghost border */
```

### Status Chips
```css
border-radius: 9999px (full round);
/* AVAILABLE: #dcfce7 / #15803d */
/* BOOKED:    #fef9c3 / #854d0e */
/* SOLD:      #dbeafe / #1d4ed8 */
/* MATI:      #fee2e2 / #991b1b */
```

---

## Rules (DO / DON'T)

### ✅ DO
- Use `display-sm` Manrope for numbers — data is the hero
- Asymmetric padding: more top space than bottom on headings
- `surface` tonal shifts to define sections (no 1px lines)
- `primary_fixed` (#7ffc97) for positive/sold trends

### ❌ DON'T
- Never 100% black text → use `#0b1c30`
- Never 1px solid borders for section dividers → use color shifts
- Never sharp `0` corners → minimum `0.125rem` (2px)
- Never crowd data → increase padding rather than shrink text
- Never plain colored buttons → always gradient on primary

---

## Border Radius Scale
| Name | Value | Usage |
|------|-------|-------|
| `sm` | 2px | Minimal (fallback) |
| `md` | 6px | Inputs, table rows |
| `lg` | 8px | Cards |
| `xl` | 12px | Buttons, modals |
| `2xl` | 16px | Large modals |
| `full` | 9999px | Chips, badges |

---

## Elevation (Tonal, NOT shadow-heavy)
1. Page bg: `surface-container-low` (#eff4ff)
2. Cards: `surface-container-lowest` (#fff) + ambient shadow
3. Sidebar: `surface-container` (#e5eeff)
4. Nested: `surface-container-high` (#dce9ff)
5. Modals: backdrop-blur 20px at 80% opacity (glassmorphism)
