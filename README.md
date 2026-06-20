# EV Mobility Dashboard

Fresh Vercel-ready frontend for exploring Germany's public EV charging infrastructure.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui-ready component setup
- DuckDB-WASM-ready static data path

## Run Locally

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Data

The cleaned Bundesnetzagentur charging register is served as a static asset:

```text
public/data/chargers.clean.parquet
```

In the app, it is available at:

```text
/data/chargers.clean.parquet
```

## Vercel

Vercel can build this app with:

```text
Build command: npm run build
Output directory: dist
```

`vercel.json` includes a SPA fallback so client routes can refresh correctly.
