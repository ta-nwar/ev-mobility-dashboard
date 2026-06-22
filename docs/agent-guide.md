# Future Agent Guide

This project is a Vite React dashboard for Germany EV charging infrastructure.
The current production-quality surfaces are Operators and Regions.

## Current Shape

- Branch: `main`.
- Remote: `https://github.com/ta-nwar/ev-mobility-dashboard.git`.
- Live site: `https://ta-nwar.github.io/ev-mobility-dashboard/`.
- Deployment: GitHub Pages workflow in `.github/workflows/pages.yml`.
- App entry: `src/main.tsx` -> `src/App.tsx` -> `AppShell`.
- Operators state: `src/components/OperatorSearch.tsx`.
- Operators UI pieces: `src/components/operators/`.
- Regions route: `src/components/regions/RegionsRoute.tsx`.

## Source Of Truth

The original Claude design artifacts and devlog screenshots were cleanup
artifacts and are no longer part of the repo. Do not assume missing
`claude-designed/` or `devlog/` files should be restored.

Use these instead:

- Current rendered app.
- `docs/operators-ui.md`.
- `docs/architecture.md`.
- `design-qa.md`.
- Remaining `design-references/` files for Tesla-inspired interaction and
  visual context.

If a future task provides new screenshots or design notes, treat those supplied
files as the source of truth for that task and update this guide if the durable
direction changes.

## Design System Rules

The UI is intentionally minimal and operational:

- Prefer hairline dividers and whitespace over cards.
- Avoid nested cards, marketing hero layouts, decorative gradients, or visual
  clutter.
- Keep typography compact inside dashboard surfaces.
- Keep the app useful on the first screen; no landing page.
- Use lucide icons for icon buttons.
- Preserve row heights and stable layout dimensions for rails, buttons, split
  bars, and tables.
- On narrow screens, guard flex children with `min-w-0` where text or rails can
  force horizontal overflow.

## Theme And Color

Theme tokens live in `src/index.css`.

Use semantic Tailwind classes and dashboard variables:

- `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`.
- `--dashboard-rule`, `--dashboard-rule-strong`.
- `--dashboard-row-hover`, `--dashboard-row-active`.
- `--dashboard-track`, `--dashboard-track-mid`, `--dashboard-track-soft`.
- `--dashboard-text-soft`, `--dashboard-text-subtle`.
- `--dashboard-map-low`, `--dashboard-map-high`.

Do not add scattered raw component colors for light/dark variants. If a new
visual role is needed, add a named CSS variable in both `:root` and `.dark`.

Dark mode is controlled by `src/lib/useTheme.ts`. It:

- Uses system preference when no stored preference exists.
- Stores explicit user choices in `localStorage` under `ev-mobility-theme`.
- Applies `.dark` to `document.documentElement`.

`index.html` has an early theme script to avoid a flash of the wrong theme.
Keep it in sync with `useTheme.ts` if the storage key or class name changes.

## Data And Metrics

The app reads generated static data bundles:

```text
public/data/operators.json
public/data/regions/index.json
public/data/regions/states.json
public/data/regions/germany-states-paths.json
public/data/regions/districts/by-state/{stateSlug}.json
public/data/regions/cities/by-district/{stateSlug}/{districtSlug}.json
```

Regenerate it from the cleaned charger parquet with:

```powershell
npm run build:data
```

The generators are:

```text
scripts/build_operator_index.py
scripts/build_region_index.py
```

Derived display logic lives in:

- `src/lib/operatorTypes.ts`
- `src/lib/operatorFormat.ts`
- `src/lib/operatorMetrics.ts`
- `src/lib/operatorMetrics.test.ts`

Regional metric definitions live in:

```text
docs/region-metrics.md
```

The current Regions UI loads `index.json`, `states.json`, and
`germany-states-paths.json` eagerly. The district/city files are generated for
future deeper drill-downs and should stay compatible with `BASE_URL`.

Metric wording matters:

- `chargingUnits` means BNetzA Ladeeinrichtung rows, not clustered physical
  sites.
- `chargingPoints` means summed registered Ladepunkte.
- `reportedNominalKw` is source-reported nominal power, not utilization,
  delivered energy, or installed grid capacity.
- Regional city grain is `state + district + city`, not globally unique city
  name.
- Payment and connector percentages can overlap; do not sum them to 100.

Prefer adding production metrics to the data generator instead of deriving
large new metrics inside React components.

## Deployment Gotchas

GitHub Pages serves the app at:

```text
/ev-mobility-dashboard/
```

`vite.config.ts` uses `GITHUB_PAGES=true` to switch the Vite base path. The app
loads data through `import.meta.env.BASE_URL`, so do not replace data fetches
with hard-coded `/data/...` paths.

For a Pages-equivalent local build:

```powershell
$env:GITHUB_PAGES='true'
npm run build
Remove-Item Env:\GITHUB_PAGES
```

## Verification Checklist

Before committing meaningful app changes:

```powershell
npm test
npm run lint
npm run build
```

For UI changes, also browser-test at least:

- Desktop overview or the changed desktop flow.
- Operator detail if metrics or primitives changed.
- Compare mode if rail selection, split bars, or table styles changed.
- Regions overview/detail if routing, data paths, map paths, or dashboard
  primitives changed.
- Narrow mobile around 320px width for horizontal overflow.
- Dark mode and light mode if colors, tokens, or layout primitives changed.

Known useful smoke path:

1. Load `/`.
2. Toggle dark mode.
3. Select `Tesla Germany GmbH`.
4. Click `Compare`.
5. Add `EnBW mobility+ AG und Co.KG`.
6. Confirm compare matrix renders and no console/request errors appear.

## Commit Hygiene

- Keep unrelated user changes.
- Do not restore deleted cleanup artifacts unless explicitly requested.
- Do not commit generated `dist/`.
- After a commit, use `git status --short` to confirm the tree is clean.
