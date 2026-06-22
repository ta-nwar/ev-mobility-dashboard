# Architecture

This is a Vite React single-page app. The current product surfaces are the
Operators and Regions sections of the EV Mobility Dashboard.

## Runtime Flow

1. `src/main.tsx` mounts the React app.
2. `src/App.tsx` renders `AppShell`.
3. `AppShell` owns the persistent frame: top navigation and full-height app
   canvas, including the light/dark mode toggle.
4. `AppShell` switches between Operators and Regions based on `#regions` and
   `?state=` URL state.
5. `OperatorSearch` owns Operators state: search query, selected operator,
   compare mode, compare set, and KPI count-up progress.
6. Operator views render from static JSON loaded from
   `public/data/operators.json`.
7. `RegionsRoute` owns Regions state: ranking metric, hovered state, selected
   state, regional JSON loading, and regional URL state.

## Component Boundaries

```text
AppShell
  OperatorSearch
    OperatorRail
    OperatorOverview
    OperatorDetail
    CompareView
  RegionsRoute
```

`OperatorSearch` should stay mostly orchestration. Visual sections should live
under `src/components/operators/`.

### Key Files

- `src/components/AppShell.tsx`: top navigation and app frame.
- `src/components/OperatorSearch.tsx`: Operators state machine and data fetch.
- `src/components/operators/OperatorRail.tsx`: search input and virtualized
  operator list.
- `src/components/operators/OperatorOverview.tsx`: nationwide overview and top
  operator leaderboard.
- `src/components/operators/OperatorDetail.tsx`: selected operator detail view.
- `src/components/operators/CompareView.tsx`: compare matrix.
- `src/components/operators/OperatorPrimitives.tsx`: reusable visual building
  blocks such as split bars, chips, metrics, section labels, and sparklines.
- `src/components/regions/RegionsRoute.tsx`: Regions overview, Germany map,
  ranked state list, and state detail view.
- `src/lib/useTheme.ts`: theme state, persistence, and document class updates.

## Data Boundaries

Types, formatting, and derived profile logic are outside the component tree:

- `src/lib/operatorTypes.ts`: JSON/data contracts.
- `src/lib/operatorFormat.ts`: display formatting helpers.
- `src/lib/operatorMetrics.ts`: profile fallback and sparkline helpers.
- `src/lib/operatorMetrics.test.ts`: focused tests for the metric helpers.
- `src/lib/regionTypes.ts`: regional JSON and map-path contracts.

The UI should prefer fields from `operators.json`. Fallback logic in
`operatorMetrics.ts` exists so older or partial operator records can still
render, but new production metrics should be generated in
`scripts/build_operator_index.py`. New regional metrics should be generated in
`scripts/build_region_index.py`.

## State Model

`OperatorSearch` tracks:

- `query`: current rail search text.
- `operatorIndex`: loaded `operators.json`.
- `selectedOperatorId`: selected detail operator.
- `compareMode`: whether the right canvas shows compare view.
- `compareIds`: selected compare operators, capped at four.
- `animationProgress`: 0 to 1 KPI count-up progress for detail header metrics.

`useTheme` tracks light/dark display state outside the Operators state machine.
It applies `.dark` to `document.documentElement` and stores explicit user
choices in `localStorage`.

`RegionsRoute` tracks:

- `metric`: the active ranking/map shading metric.
- `hoverSlug`: state highlighted by map or ranking hover/focus.
- `selectedSlug`: selected state from `?state=<slug>`, synchronized with
  browser history.
- loaded national, state, and SVG path JSON.

## Performance Notes

The rail can represent all 11,806 operators, so it is virtualized in
`OperatorRail`. It renders only visible rows plus overscan while keeping the
scroll height equal to the full filtered result set.

Search filters the full in-memory operator array client-side. This is acceptable
for the current dataset size because the payload is static and local to the app.

## Styling Approach

The repo is shadcn/ui-ready, but the Operators design is intentionally not a
card-heavy component kit surface. The dashboard uses bespoke layout primitives
with Tailwind utility classes, project aliases, `cn()`, and semantic tokens
where practical.

Prefer:

- Small, named components.
- Existing design tokens from `src/index.css`.
- New dashboard color roles as named CSS variables in both `:root` and `.dark`.
- Hairline dividers and whitespace over nested cards.
- Direct imports via `@/`.

Avoid:

- Reintroducing large all-in-one components.
- Ad hoc color palettes.
- Manual one-off dark-mode color patches in components.
- Chart libraries for the rollout sparkline unless the interaction requirements
  become much more complex.
