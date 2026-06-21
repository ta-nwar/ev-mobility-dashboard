# EV Mobility Dashboard — Design Language & Build Guide

A handoff for implementing the dashboard in the real codebase (**React + TypeScript + Vite + Tailwind + shadcn/ui**). The prototype was authored in inline-styled HTML; this doc translates every pattern into tokens and components you can build directly.

The whole aesthetic is one idea: **hierarchy and whitespace do the work, not chrome.** Thin rules instead of borders, big quiet numbers, one dark accent, no color-coding. When in doubt, remove something.

---

## 1. The 10 rules (read these first)

1. **Hairlines, not boxes.** Separate things with 1px rules and whitespace. Avoid bordered/rounded "cards stacked on cards." The one card is the app shell itself.
2. **One accent only:** near-black `oklch(0.205 0 0)`. Bars, the active filled state, primary buttons. No blues/greens/reds. No status colors.
3. **Numbers are the heroes.** Big (28–34px), weight 600, `letter-spacing:-0.02em`, near-black. Units render smaller (16–18px), weight 500, in muted gray, as a `<span>` inside the number.
4. **Labels are quiet.** 13px, muted gray `oklch(0.556 0 0)`, lowercase ("locations", "capacity"). Section labels are 11px **UPPERCASE**, `letter-spacing:0.07em`, weight 600.
5. **Emphasis by weight, never by color.** "Winner" in a comparison = bold + darker, losers = medium + gray. Same hue.
6. **Generous space.** Section padding 28–32px. Gaps between KPIs 40px. Let it breathe; empty space is intentional, not unfinished.
7. **Progressive disclosure.** At-a-glance header first, deeper categories on scroll, map/compare opt-in. Never show everything at once.
8. **No emoji, no gradients, no drop shadows** except the single soft shadow on the app shell. No icon soup.
9. **Two type sizes of restraint:** don't introduce a new font size unless the hierarchy genuinely needs it. The scale below is the whole vocabulary.
10. **Animate sparingly.** One cubic ease-out count-up on KPIs when a detail opens. That's it. Calm > flashy.

---

## 2. Stack & setup

- **React + TS + Vite**, **Tailwind**, **shadcn/ui** (already in repo).
- Font: **Inter** (400/500/600/700), `-webkit-font-smoothing:antialiased`. Load via `@fontsource/inter` or a `<link>`.
- All colors are **OKLCH** — they're already CSS variables in `src/index.css`. Keep using OKLCH; it's perceptually even, which is why the grays feel so clean.
- Charts: see §7. Use **inline SVG** for the sparkline (don't reach for a chart lib for that). For interactive/hover charts, a thin lib like **visx** or hand-rolled SVG is more on-brand than Recharts' default chrome.

---

## 3. Color tokens (OKLCH)

Map these to Tailwind theme tokens / CSS vars. Names match how they're used.

| Token | Value | Use |
|---|---|---|
| `bg` (app ground) | `oklch(0.994 0.001 106)` | page + shell background (very warm off-white) |
| `surface` | `oklch(1 0 0)` | pure white — search input wells, the rare raised element |
| `ink` | `oklch(0.145 0 0)` | primary text, hero numbers |
| `ink-2` | `oklch(0.205 0 0)` | **the accent** — bars, filled buttons, active fill |
| `ink-3` | `oklch(0.25–0.3 0 0)` | secondary text, list names |
| `muted` | `oklch(0.556 0 0)` | labels, units, secondary numbers |
| `muted-2` | `oklch(0.6 0 0)` | tertiary captions, axis labels, median tick |
| `hairline` | `oklch(0.922 0 0)` | structural 1px borders (shell, rail, grid gaps) |
| `hairline-soft` | `oklch(0.94 0 0)` | list-row dividers |
| `rule` | `oklch(0.91 0 0)` | vertical KPI dividers |
| `fill-track` | `oklch(0.88 0 0)` | the "normal/AC" / remainder portion of bars |
| `fill-track-2`| `oklch(0.93 0 0)` | leaderboard bar track (empty) |
| `chip-on` border | `oklch(0.3 0 0)` | active connector/payment chip |
| `chip-off` border/text | `oklch(0.92 0 0)` / `oklch(0.72 0 0)` | inactive chip (offered-but-not) |
| `hover` | `oklch(0.97 0 0)` / `oklch(0.985 0 0)` | nav pill / list-row hover |
| `pill-active` | `oklch(0.95 0 0)` | selected list row background |

**Power-class 3-tone ramp** (only place with a mid-gray): `oklch(0.205)` → `oklch(0.6)` → `oklch(0.88)`.

---

## 4. Type scale

| Role | Size / weight / tracking |
|---|---|
| Hero number | 30–34px / 600 / -0.02em |
| Compare cell number | 18px / 500–700 / -0.01em |
| Secondary number (24px sections) | 24px / 600 / -0.02em |
| Unit suffix (`MW`, `kW`, `%`) | 16–18px / 500 / muted, as inner `<span>` |
| App title | 18px / 400 / -0.01em |
| H1 (operator / overview) | 30–34px / 600 / -0.02em |
| Nav + list items | 14–15px / 400–500 |
| Field label | 13px / 400 / muted |
| **Section label** | 11px / 600 / **0.07em** / UPPERCASE / muted |
| Caption / legend / axis | 12px / 400 / muted-2 |

---

## 5. Layout skeleton

```
App shell  (the ONE card: bg, radius 4px, shadow 0 1px 3px rgba(0,0,0,.08))
├─ Header  56px, bottom hairline, 3-col grid [logo | nav-centered | spacer]
└─ Body    flex row, fills remaining height
   ├─ Left rail   340px fixed, right hairline, own vertical scroll
   │   ├─ Search input (sticky top)
   │   ├─ count + sort line
   │   └─ result rows (name + quiet MW, divider per row)
   └─ Right canvas   flex:1, own vertical scroll
       ├─ OVERVIEW   (nothing selected) → leaderboard
       ├─ DETAIL     (operator) → at-a-glance + category grid
       └─ COMPARE    (compare mode) → matrix
```

- **Master–detail**: selecting a rail row swaps the canvas **in place** — no route change, no back button.
- The right canvas is a **single scrolling column**. Categories are sections divided by 1px rules, *not* nested cards.
- **Category grid**: a 2-col CSS grid where the **gap itself is the hairline** — set `gap:1px; background:hairline`, and give each cell `background:bg`. The 1px background showing through the gap *is* the divider. Full-width rows use `grid-column:1 / -1`. (This is the cleanest way to get perfect hairline separators with zero border math.)

---

## 6. Component recipes

### KPI row (the signature element)
Horizontal flex, `gap:40px`. Each KPI is a 2-row column: quiet label on top, hero number below. Between KPIs, a **vertical rule**: `width:1px; height:52px; background:rule`. Unit is an inner span:

```tsx
<div className="flex flex-col">
  <span className="text-[13px] text-muted">capacity</span>
  <span className="mt-[7px] text-[30px] font-semibold tracking-[-0.02em] text-ink">
    905<span className="ml-[5px] text-[17px] font-medium text-muted">MW</span>
  </span>
</div>
```

### The split bar (fast / normal) — used everywhere
Two flex children whose `flex-grow` = the two percentages, `flex-basis:0`, `gap:3px`, height 8px, both `rounded-full`. Dark = the highlighted share (`ink-2`), light = remainder (`fill-track`). Legend below: two rows justified between, each a 6px dot + 12px muted label.

**National-median tick:** wrap the bar in `position:relative`, drop an absolutely-positioned 1px line at `left:{median}%`, color `muted-2`, extending a few px above/below. This single tick gives "vs. the market" for free on every bar. Keep it.

### Power-class bar
Same mechanism, three segments using the 3-tone ramp. Legend is a single inline row of dot+label triples.

### Chips (connectors / payment)
Pill, `rounded-full`, `padding:5px 12px`, 13px. **On** = `border:1px solid chip-on`, dark text. **Off** (standard exists in the dataset but this operator doesn't offer it) = `border:1px hairline`, `text:chip-off`. Showing the off-state greyed is more informative than hiding it — but keep it subtle.

### List row (rail + leaderboard)
Full-width button, `height:48–52px`, name left (ellipsis truncation: `overflow-hidden text-ellipsis whitespace-nowrap`), quiet number right, bottom divider `hairline-soft`. Hover = `bg hover`. Selected = `pill-active` bg + `rounded-[8px]` (and drop the divider on the active row). Leaderboard rows add a rank number (22px wide, muted) and a thin inline progress bar (`fill-track-2` track, `ink-3` fill scaled to `value / max`).

### Buttons
- Secondary (Compare, Clear): `height:34–36px`, `border:1px solid oklch(0.9)`, transparent bg, 13–14px `ink-3`, hover `bg hover`.
- Primary (Done): same size, `bg:ink-2`, white text, no border.

### Nav pills
14px, `padding:7px 14px`, `rounded-[9px]`. Active = `bg hover` + `ink`. Inactive = `muted`, hover fills to `bg hover` + `ink`.

---

## 7. The graphs

### Rollout sparkline (the line you liked)
It's a single inline `<svg>` `polyline`, no library:

```tsx
<svg width="100%" height="84" viewBox="0 0 600 84" preserveAspectRatio="none">
  <polyline
    points="0,80 75,75 150,68 225,58 300,46 375,33 450,21 525,11 600,5"
    fill="none" stroke="oklch(0.205 0 0)" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    vectorEffect="non-scaling-stroke" />
</svg>
```

Two tricks that make it look right: `preserveAspectRatio="none"` lets it stretch full-width, and `vector-effect:non-scaling-stroke` keeps the stroke a crisp 2px no matter the stretch. Year labels sit below, justified between, 11px `muted-2`. **No axes, no grid, no legend** — that restraint is the whole look.

**Your planned upgrades (good instincts):**
- **Hover/interactive:** overlay an invisible full-height `<rect>` per data point (or track `mousemove` → nearest x). On hover, show a 1px vertical guide + a small dot (`r=3`, fill `ink-2`) at the point + a minimal tooltip (white, 1px hairline border, `radius:8px`, the year + value in the same type scale). Keep the tooltip chrome as quiet as everything else.
- **More detail:** build `points` from real cumulative `commissioned_at` counts. Add a faint area fill under the line if you want weight: a `<polygon>` closing to the baseline, fill `oklch(0.205 / 0.04)` — *very* low alpha or it'll feel heavy.
- **Smoothing:** optional — convert the polyline to a path with Catmull-Rom→bezier if you want a softer curve. Sharp polyline is perfectly on-brand though; don't feel you must.

### Sparklines in comparison (your idea — yes, do this)
In the compare matrix, add a **rollout row** where each column renders its own mini sparkline on a **shared y-scale** (compute the max across all selected operators, scale every line to it — otherwise the comparison lies). Same SVG recipe at smaller height (~40px), no labels. This is the single most powerful addition to compare: trajectory side-by-side reads instantly.

### Dot map (placeholder in prototype)
Plan: project `lat`/`lon` to x/y over a Germany bounding box, render one small `<circle>` (r≈1.5, `ink` at low alpha) per station or per cluster. No basemap tiles — a bare dot cloud in the country's silhouette is more on-brand than a Google/Mapbox map. A faint 1px Germany outline path behind it is enough context. This also seeds the **Regions** tab.

---

## 8. Interactions & states

- **Count-up:** on operator select, animate KPI numbers 0→value over ~750ms with cubic ease-out `1 - (1-t)³`, via `requestAnimationFrame`. Round each frame. Cancel the rAF on unmount / re-select.
- **Compare flow:** "+ Compare" pins current operator → rail switches to **tap-to-add** (each row shows a `+`, pinned rows a filled check, cap **4**). Canvas becomes the matrix. Matrix = metrics as rows, operators as columns; vertical hairlines between columns, horizontal between rows; **leading value per row in bold+dark**, others medium+gray. "Done" exits to the last detail; "Clear all" empties the set. Matrix only renders at **2+** selected; below that, one quiet line: *"Pick operators from the list to compare."*
- **Empty/overview state** is informative, not dead: nationwide totals + split + top-10 leaderboard. "Clear selection" / logo returns here.
- **Search:** filter client-side, case-insensitive `includes`. Show `"{n} of 11,806"` when filtering.

---

## 9. Data model

The dataset is the **Bundesnetzagentur Ladesäulenregister** (`public/data/chargers.clean.parquet`, one row per station). `scripts/build_operator_index.py` already rolls it up per operator. Columns available to derive richer metrics:

- **Identity:** `operator`, `display_name`
- **Hardware:** `charger_type` (Schnellladeeinrichtung = DC fast / Normalladeeinrichtung = AC normal), `charging_points`, `nominal_power_kw`, `max_plug_power_kw`, `plug_slot_count`
- **Connectors:** `plug_types`, `has_ccs`, `has_type2`, `has_tesla`, `has_chademo`, `has_schuko`, `has_cee`, `has_mcs`
- **Access:** `payment_systems`, `opening_hours`
- **Geo:** `street`, `postcode`, `city`, `district`, `state`, `lat`, `lon`
- **Timeline:** `commissioned_at`

**Metrics to derive in the build script** (the prototype synthesizes these from each operator's real units/points/kw/fast — replace with true rollups):
`avg kW/point = nominal_power_kw_sum / charging_points` · `DC-fast % = fast_points / total_points` · power-class buckets (≤22 / 50–149 / 150+ from `max_plug_power_kw`) · `states covered = distinct state` · `% open 24/7` from `opening_hours` · `first live / newest / added-12mo` from `commissioned_at` · national **rank** & **% of total capacity** · top cities by station count.

Extend `build_operator_index.py` to emit these per operator into `operators.json`; the UI just reads them.

---

## 10. Roadmap (where this is going)

1. **Regions tab** — same master–detail pattern keyed to `state` (16 Bundesländer). Choropleth or dot map + ranked KPIs.
2. **Access tab** — `payment_systems` + `opening_hours`; the dormant nav item becomes real.
3. **Real dot map** in Geography (replaces the placeholder).
4. **Interactive + comparative sparklines** (§7).

Keep every addition inside the rules in §1. The discipline is the product.
