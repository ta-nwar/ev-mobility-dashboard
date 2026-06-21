# EV Mobility Dashboard — Design & Implementation Spec

A handoff guide for rebuilding this UI in the real codebase (React + TypeScript + Tailwind v4 + shadcn). It documents the **design language**, the exact **tokens**, and how every piece (cards, hairline rows, bars, the line graph, the compare matrix) is built. Pair this with the exported HTML + screenshots.

> The single most important rule: **this design wins through restraint.** Whitespace, thin hairlines, big quiet numbers, one dark accent. No card-soup, no colored chips, no gradients, no shadows except one whisper on the outer frame. When in doubt, remove.

---

## 1. Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (`@theme inline` tokens — already in `src/index.css`)
- **shadcn/ui** component setup (Radix primitives) — but most of this UI is plain divs + flex/grid, not shadcn components
- **lucide-react** for icons (already used)
- Data: `public/data/operators.json`, derived from `public/data/chargers.clean.parquet` via `scripts/build_operator_index.py` (DuckDB)

Keep the existing `AppShell` top-nav. The new work is inside the Operators route.

---

## 2. Design tokens (already in `src/index.css`)

All colors are **OKLCH, near-zero chroma** (true neutrals). Do not introduce hues.

| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.994 0.001 106)` | app canvas — a *warm* off-white, NOT pure white |
| `--card` | `oklch(1 0 0)` | pure white (inputs, the one outer frame) |
| `--foreground` | `oklch(0.145 0 0)` | primary text, big numbers |
| `--muted` | `oklch(0.97 0 0)` | nav pill bg, input fill, "off" chips |
| `--muted-foreground` | `oklch(0.556 0 0)` | labels, secondary text |
| `--border` | `oklch(0.922 0 0)` | hairlines, dividers |
| `--primary` | `oklch(0.205 0 0)` | **the one dark accent** — bar fills, "Done" button |
| `--radius` | `0.625rem` (10px) | base radius |

**Greys you'll reach for repeatedly (memorize these):**
- `oklch(0.205 0 0)` — dark accent (fast-charge bar, primary button, checkmark bg)
- `oklch(0.3 0 0)` — active chip border/text, leaderboard bar fill
- `oklch(0.45–0.5 0 0)` — section labels, captions
- `oklch(0.556 0 0)` — field labels
- `oklch(0.6 0 0)` — mid-tone bar segment, median tick
- `oklch(0.82–0.88 0 0)` — light bar segment ("AC normal")
- `oklch(0.91–0.94 0 0)` — dividers, bar tracks

### Dark mode
Tokens already flip in `.dark`. Everything here is token-based, so dark mode mostly "just works" — but **re-check the bars**: in dark mode the dark accent and light segment need to swap relationships (accent becomes light, track becomes dark). Test it.

---

## 3. Typography

- **Inter**, weights 400 / 500 / 600 / 700. Load via Google Fonts or self-host.
- This is the one place to be careful: Inter is fine *here* because it's already the product's face — but lean on **weight + size + letter-spacing**, never on decorative type.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Big KPI number | 30–34px | 600 | `-0.02em` |
| Page H1 (operator name) | 30–34px | 600 | `-0.02em` |
| Section number (e.g. "247") | 24–30px | 600 | `-0.02em` |
| Unit suffix ("MW", "kW", "%") | 16–18px | 500 | —, color `muted-foreground`, `margin-left:4–6px` |
| Body / list rows | 14–15px | 400–500 | — |
| Field label (above value) | 13px | 400 | —, color `muted-foreground` |
| **Section label** | 11px | 600 | `0.07em`, `UPPERCASE`, color `oklch(0.5 0 0)` |
| Caption / hint | 12px | 400 | —, color `oklch(0.5–0.6 0 0)` |

**Number formatting:** `Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })`. Capacity = `kW ÷ 1000` → MW.

---

## 4. The core layout — master / detail

```
┌─ Header (h-56, hairline bottom) ───────────────────────────┐
│  logo + title        [Operators] Regions Access            │
├──────────────┬─────────────────────────────────────────────┤
│  LEFT RAIL   │  RIGHT CANVAS (scrolls independently)        │
│  w-340       │   • no selection → national overview         │
│  search +    │   • operator selected → detail category stack│
│  scroll list │   • compare mode → comparison matrix         │
│  hairline ►  │                                              │
└──────────────┴─────────────────────────────────────────────┘
```

- Outer: `height: 100vh; display:flex; flex-direction:column`.
- Body: `flex:1; min-height:0; display:flex`. (The `min-height:0` is essential or the scroll areas won't scroll.)
- Rail: `width:340px; flex:none; border-right:1px solid var(--border)`. Inside: a fixed search/sort block, then a `flex:1; overflow-y:auto` list.
- Canvas: `flex:1; min-width:0; overflow-y:auto`.

This mirrors Tesla's find-us pattern (list left / working surface right) from `tesla-patterns-handoff.md`.

---

## 5. The recipes

### 5a. The "card" is **not** a card — it's a hairline cell
The thing that reads as polished is the **absence** of boxes. Don't wrap content in bordered rounded cards. Instead:

**Sections** are separated by whitespace + a single `1px` hairline. For the 2-column category area, use a **grid whose gap IS the hairline**:

```css
display:grid; grid-template-columns:1fr 1fr;
gap:1px;
background:var(--border);   /* the grid bg shows through the 1px gaps = perfect hairlines */
```
Each cell sets `background:var(--background)` to cover, with `padding:28px 32px`. A full-width cell spans with `grid-column:1 / -1`. This gives a clean matrix of cells divided by single pixel lines — no borders to misalign, no shadows.

The **only** elevated surface is the outermost frame in a mockup: `background:var(--background); border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,.08)`. In the real app the canvas is full-bleed, so you don't even need that.

### 5b. The KPI row (the signature element)
Values in a row, **divided by thin vertical rules**, label on top:

```
[ label ]   │   [ label ]   │   [ label ]
[ 30px # ]  │   [ 30px # ]  │   [ 30px # ]
```
- Container: `display:flex; align-items:flex-start; gap:40px`.
- Each item: `display:flex; flex-direction:column`. Label 13px muted, value `margin-top:7px; font-size:30px; font-weight:600; letter-spacing:-0.02em`.
- Divider: `<div style="width:1px; height:52px; background:oklch(0.91 0 0)" />` between items.
- Unit suffix is a nested span: `margin-left:5px; font-size:17px; font-weight:500; color:var(--muted-foreground)`.

### 5c. The segmented bar (fast / normal, power classes)
A flex row of segments sized by `flex-grow`, gap creates the gaps:

```jsx
<div style={{ display:'flex', height:8, gap:3 }}>
  <div style={{ flexGrow: fast,  flexBasis:0, background:'oklch(0.205 0 0)', borderRadius:999 }} />
  <div style={{ flexGrow: 100-fast, flexBasis:0, background:'oklch(0.88 0 0)', borderRadius:999 }} />
</div>
```
Legend below: `display:flex; justify-content:space-between; font-size:12px; color:oklch(0.5 0 0)`, each label prefixed with a 6px round dot in the matching segment color.

**National-median tick** (the always-on quiet comparison): a `position:absolute` 1px line over the bar at `left: <medianPct>%`, color `oklch(0.6 0 0)`, extending a few px above/below. Center legend reads `national median 40%`. This gives "vs the market" for free on every operator.

Power classes = the same bar with **three** segments: `0.205` (150kW+), `0.6` (50–149), `0.88` (≤22kW).

### 5d. Chips (connectors, payment)
Pill outlines, two states only — **no fills, no color**:
- **Active:** `padding:5px 12px; border:1px solid oklch(0.3 0 0); border-radius:999px; font-size:13px; color:oklch(0.2 0 0)`.
- **Off/unsupported:** same but `border:1px solid oklch(0.92 0 0); color:oklch(0.72 0 0)`.
Lay out with `display:flex; flex-wrap:wrap; gap:8px`.

### 5e. The line graph (rollout sparkline) — and how to make it interactive
Currently a clean inline SVG polyline (cumulative stations over time). It's deliberately chrome-free:

```jsx
<svg width="100%" height="84" viewBox="0 0 600 84" preserveAspectRatio="none">
  <polyline
    points="0,80 75,75 150,68 225,58 300,46 375,33 450,21 525,11 600,5"
    fill="none" stroke="oklch(0.205 0 0)" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    vectorEffect="non-scaling-stroke" />
</svg>
```
Notes:
- `preserveAspectRatio="none"` + `vectorEffect="non-scaling-stroke"` = the line stretches to any width but the stroke stays a crisp 2px. This is why it looks good responsive.
- Year labels under it: `display:flex; justify-content:space-between; font-size:11px; color:oklch(0.6 0 0)`.

**To make it interactive (your plan), keep it SVG and add, in this order of effort:**
1. **Area fill** under the line — add a `<path>` (or `<polygon>` closing to the baseline) filled with `oklch(0.205 0 0)` at ~6% opacity. Gives depth without color.
2. **Hover dots + tooltip** — render a `<circle r=3>` at each data point; on `mouseenter` show a tiny tooltip (operator + year + cumulative count). Track the nearest point to the cursor's x with `onMouseMove` on an invisible full-height `<rect>` overlay; snap a vertical guide line (1px `oklch(0.6 0 0)`) + highlight dot.
3. **Real data** — generate points from `commissioned_at`: bucket stations by month/year, take a cumulative sum, map to `[x,y]`. x = time → 0..600, y = `80 - (cum/maxCum)*75`.
4. **Use it in compare** — render one sparkline per operator column (or overlay 2–4 lines on shared axes, each a different grey weight: `0.205`, `0.45`, `0.65`, `0.82` — distinguish by **value, not hue**). A small multiples row reads cleanest and stays on-language.

Charting libs are unnecessary and will fight the aesthetic. If you want one, **visx** (low-level, unstyled) or hand-rolled SVG. **Avoid** Recharts/Chart.js defaults — they bring axes, gridlines, and colors you'll spend more time deleting than you saved.

### 5f. Count-up animation
On operator select, KPIs count from 0 → value over ~750ms with ease-out-cubic (`1 - (1-t)³`). Implement with `requestAnimationFrame` writing an eased `t` (0→1) to state; displayed value = `Math.round(target * t)`. Cancel any in-flight frame on new selection / unmount. Keep it to the four headline KPIs only — don't animate the category stack.

### 5g. The compare matrix
The detail view, rotated: **metrics = rows, operators = columns**.
- Build with **flex rows** (not CSS grid) so the per-operator `<sc-for>`/`.map` is trivial and columns stay aligned: each row is `display:flex`; first cell is a fixed `width:180px` label gutter; each operator cell is `flex:1; border-left:1px solid oklch(0.93 0 0)`.
- Rows divided by `border-top:1px solid oklch(0.93 0 0)`.
- **Leading value per row gets `font-weight:700` + `color:var(--foreground)`**; others `font-weight:500; color:oklch(0.45 0 0)`. Compute leader = max (or min for "first live"). **Emphasis by weight, never color.**
- Include a "fast / normal" row that renders the mini segmented bar per column.
- Cap at **4 columns**; overflow scrolls horizontally.
- Selection: enter via "+ Compare" on the detail header (pins current operator). In compare mode the rail rows show a `+` / filled-checkmark affordance and clicking toggles membership. Tray at top: title + "N of 4 selected" + "Clear all" + "Done".

---

## 6. Data model & derived metrics

Raw per-operator (from `operators.json`): `operator`, `chargingUnits` (→ "locations"), `chargingPoints`, `reportedNominalKw`.

The parquet (`chargers.clean.parquet`, one row per station) also has, ready to roll up per operator:
`charger_type` (Schnellladeeinrichtung = DC fast / Normalladeeinrichtung = AC normal), `nominal_power_kw`, `max_plug_power_kw`, `plug_slot_count`, `has_ccs/has_type2/has_tesla/has_chademo/has_schuko/has_cee/has_mcs`, `state`, `city`, `district`, `lat`, `lon`, `payment_systems`, `opening_hours`, `commissioned_at`, `parking_info`.

**Extend `build_operator_index.py`** to emit these per operator (this is the right place — DuckDB aggregation, not client-side):
- `dc_fast_pct` = `count(*) filter (charger_type='Schnellladeeinrichtung') / count(*)`
- `avg_kw_per_point` = `sum(nominal_power_kw)/sum(charging_points)`
- `peak_kw` = `max(max_plug_power_kw)`
- power-class buckets = `count(*) filter (max_plug_power_kw >= 150)` etc.
- `states_covered` = `count(distinct state)`
- `top_cities` = top-N `city` by `count(*)`
- `pct_24_7` = share where `opening_hours` indicates 24/7
- connector flags = `bool_or(has_*)`
- `first_commissioned` / `latest` / `added_last_12mo` from `commissioned_at`
- map points = sampled `[lat, lon]` array (cap ~2–5k for perf, or cluster)

> ⚠️ In the current **prototype**, everything beyond the 4 raw fields is **deterministically synthesized** in the component (see `profile()` in the .dc.html logic) so each operator looks distinct. Replace these with the real DuckDB rollups above — don't ship the synthesized values.

---

## 7. The Germany map (placeholder today)
Detail "Geography" cell shows a striped placeholder. Make it real with **MapLibre GL** (free, no token) — per the handoff doc, *the map is the product surface, not a widget in a decorative card*. A dot/heat layer of `lat`/`lon`, no basemap chrome, monochrome to match. This also seeds the **Regions** tab (choropleth by `state`).

---

## 8. What's still open (roadmap)
- **Regions tab** — same master/detail pattern keyed to `state` (16 Bundesländer); choropleth + ranked list.
- **Access tab** — `payment_systems` + `opening_hours` are exactly this section's data.
- **Map** — make it real (above).
- **Graph** — interactive + in comparisons (§5e).
- **Sort/filter** in the rail (currently labelled, not wired).

---

## 9. Do / Don't (paste this at the top of any Codex prompt)

**DO:** hairline dividers over borders · whitespace over chrome · big quiet numbers · one dark accent (`oklch(0.205 0 0)`) · OKLCH neutrals only · label-on-top KPI pattern · emphasis by weight · `flex-grow` segmented bars · inline SVG for graphs.

**DON'T:** bordered rounded cards stacked everywhere · drop shadows (except the one outer frame) · gradients · colored chips/badges · saturated colors of any kind · charting libraries with default axes/legends · emojis · instructional/filler copy · centering content that should be left-aligned in a dashboard.
