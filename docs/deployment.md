# Deployment

The live app is deployed to GitHub Pages:

[https://ta-nwar.github.io/ev-mobility-dashboard/](https://ta-nwar.github.io/ev-mobility-dashboard/)

## How Deployment Works

Deployment is handled by:

```text
.github/workflows/pages.yml
```

On every push to `main`, the workflow:

1. Checks out the repo.
2. Installs Node 24.
3. Runs `npm ci`.
4. Runs `npm run build` with `GITHUB_PAGES=true`.
5. Uploads `dist/` as a Pages artifact.
6. Deploys that artifact to GitHub Pages.

The repository's Pages setting should use workflow deployment mode, not legacy
branch-root deployment.

## Vite Base Path

GitHub Pages serves this project under:

```text
/ev-mobility-dashboard/
```

`vite.config.ts` switches the base path only for GitHub Pages builds:

```ts
base: process.env.GITHUB_PAGES === 'true' ? '/ev-mobility-dashboard/' : '/'
```

This keeps local development at `/` while making production asset URLs correct
under the GitHub Pages project path.

## Static Data Paths

The app fetches operator and regional data through `import.meta.env.BASE_URL`:

```text
${import.meta.env.BASE_URL}data/operators.json
${import.meta.env.BASE_URL}data/regions/index.json
${import.meta.env.BASE_URL}data/regions/states.json
${import.meta.env.BASE_URL}data/regions/germany-states-paths.json
```

That path works in both environments:

- Local: `/data/operators.json`
- GitHub Pages: `/ev-mobility-dashboard/data/operators.json`

## Local Deployment Check

Before pushing a deployment-related change:

```powershell
$env:GITHUB_PAGES='true'
npm run build
Remove-Item Env:\GITHUB_PAGES
npm test
npm run lint
```

## Manual Rerun

If Pages needs a manual redeploy:

```powershell
gh workflow run pages.yml --repo ta-nwar/ev-mobility-dashboard --ref main
```

Watch the run:

```powershell
gh run watch <run-id> --repo ta-nwar/ev-mobility-dashboard --exit-status
```

## Troubleshooting

If the live page shows an unbuilt Vite source `index.html`, Pages is likely
serving legacy branch-root output. Switch Pages to workflow mode and rerun
`pages.yml`.

If the UI loads but operators never appear, check the data request path in the
browser network panel. It should request:

```text
/ev-mobility-dashboard/data/operators.json
```

If Regions never leaves its loading state, also check:

```text
/ev-mobility-dashboard/data/regions/index.json
/ev-mobility-dashboard/data/regions/states.json
/ev-mobility-dashboard/data/regions/germany-states-paths.json
```

If assets 404, verify that `GITHUB_PAGES=true` was present during the workflow
build and that `dist/index.html` references `/ev-mobility-dashboard/assets/...`.

If dark mode appears to flash light before settling, check that the early theme
script in `index.html` still matches `src/lib/useTheme.ts`:

- storage key: `ev-mobility-theme`
- document class: `dark`
