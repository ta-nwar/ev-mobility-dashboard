# EV Mobility Dashboard

Web dashboard for exploring Germany's public EV charging infrastructure from the
Bundesnetzagentur charging register.

Live site:
[https://ta-nwar.github.io/ev-mobility-dashboard/](https://ta-nwar.github.io/ev-mobility-dashboard/)

## What It Shows Today

- Nationwide operator overview.
- Searchable operator rail with all 11,806 operators.
- Operator detail view with locations, charging points, capacity, DC-fast share,
  connectors, power profile, geography, access, and rollout metrics.
- Operator comparison mode for up to four operators.
- Regions overview with a Germany state choropleth, metric ranking, and state
  drill-in pages for regional power, market, access, connector, rollout, and
  district/city breakdowns.
- Generated operator and regional indexes derived from the cleaned charger
  parquet.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui-ready project setup
- Light/dark theme tokens
- Vitest
- GitHub Pages deployment through GitHub Actions

## Project Structure

```text
src/
  components/
    AppShell.tsx
    OperatorSearch.tsx
    operators/
      CompareView.tsx
      OperatorDetail.tsx
      OperatorOverview.tsx
      OperatorPrimitives.tsx
      OperatorRail.tsx
    regions/
      RegionsRoute.tsx
  lib/
    operatorFormat.ts
    operatorMetrics.ts
    operatorMetrics.test.ts
    operatorTypes.ts
    regionTypes.ts
    useTheme.ts
scripts/
  build_operator_index.py
  build_region_index.py
public/data/
  chargers.clean.parquet
  operators.json
  regions/
    germany-states-paths.json
docs/
  architecture.md
  data-pipeline.md
  deployment.md
  agent-guide.md
  operators-ui.md
  region-metrics.md
```

## Run Locally

```powershell
npm install
npm run dev
```

The local Vite server usually runs at:

```text
http://127.0.0.1:5173/
```

## Checks

Run the normal maintenance checks before committing meaningful changes:

```powershell
npm test
npm run lint
npm run build
```

For a GitHub Pages-equivalent build:

```powershell
$env:GITHUB_PAGES='true'
npm run build
Remove-Item Env:\GITHUB_PAGES
```

## Rebuild Data

The app data bundles are generated from
`public/data/chargers.clean.parquet` with:

```powershell
npm run build:data
```

The Python script requires `duckdb` in the active Python environment.

## Deployment

Pushes to `main` deploy through `.github/workflows/pages.yml`. The workflow
builds `dist/` with `GITHUB_PAGES=true`, uploads the artifact, and deploys it to
GitHub Pages.

More details:

- [Future Agent Guide](docs/agent-guide.md)
- [Architecture](docs/architecture.md)
- [Data Pipeline](docs/data-pipeline.md)
- [Deployment](docs/deployment.md)
- [Operators UI](docs/operators-ui.md)
- [Regional Metrics](docs/region-metrics.md)
