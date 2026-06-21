# Architecture

This is a Vite React single-page app. The current product surface is the
Operators section of the EV Mobility Dashboard.

## Runtime Flow

1. `src/main.tsx` mounts the React app.
2. `src/App.tsx` renders `AppShell`.
3. `AppShell` owns the persistent frame: top navigation and full-height app
   canvas.
4. `OperatorSearch` owns Operators state: search query, selected operator,
   compare mode, compare set, and KPI count-up progress.
5. Operator views render from static JSON loaded from
   `public/data/operators.json`.

## Component Boundaries

```text
AppShell
  OperatorSearch
    OperatorRail
    OperatorOverview
    OperatorDetail
    CompareView
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

## Data Boundaries

Types, formatting, and derived profile logic are outside the component tree:

- `src/lib/operatorTypes.ts`: JSON/data contracts.
- `src/lib/operatorFormat.ts`: display formatting helpers.
- `src/lib/operatorMetrics.ts`: profile fallback and sparkline helpers.
- `src/lib/operatorMetrics.test.ts`: focused tests for the metric helpers.

The UI should prefer fields from `operators.json`. Fallback logic in
`operatorMetrics.ts` exists so older or partial operator records can still
render, but new production metrics should be generated in
`scripts/build_operator_index.py`.

## State Model

`OperatorSearch` tracks:

- `query`: current rail search text.
- `operatorIndex`: loaded `operators.json`.
- `selectedOperatorId`: selected detail operator.
- `compareMode`: whether the right canvas shows compare view.
- `compareIds`: selected compare operators, capped at four.
- `animationProgress`: 0 to 1 KPI count-up progress for detail header metrics.

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
- Hairline dividers and whitespace over nested cards.
- Direct imports via `@/`.

Avoid:

- Reintroducing large all-in-one components.
- Ad hoc color palettes.
- Chart libraries for the rollout sparkline unless the interaction requirements
  become much more complex.
