# Operators UI

The Operators section is a master-detail dashboard inspired by the Claude design
handoff that was used during the initial build. The temporary handoff and devlog
artifacts were later removed during cleanup, so current repo documentation and
the rendered app are now the durable reference.

## Design Sources

Primary durable references:

- Current rendered Operators app.
- `docs/agent-guide.md`
- `docs/architecture.md`
- `design-qa.md`
- Remaining files in `design-references/`.

Do not restore the old `claude-designed/` or `devlog/` folders unless the user
explicitly asks for those deleted artifacts.

## Design Principles

The surface is intentionally restrained:

- Hairline dividers, not card stacks.
- Warm neutral background and one dark accent.
- Large quiet numbers.
- Lowercase field labels and uppercase section labels.
- Weight and spacing for emphasis, not color-coding.
- Inline SVG for rollout sparklines.
- Real dashboard first screen, no marketing page.
- Light and dark themes use the same layout and hierarchy.
- Theme colors come from semantic tokens and dashboard CSS variables in
  `src/index.css`.

## Interaction States

### Overview

Shown when no operator is selected.

Includes:

- National operator count.
- National DC-fast vs AC-normal split.
- Top operators by capacity.

### Detail

Shown after choosing an operator from the rail.

Includes:

- Header metrics: locations, charging points, capacity, DC-fast share.
- National median tick on the fast/normal split bar.
- Network composition.
- Power profile.
- Geography.
- Access and operations.
- Rollout sparkline.

### Compare

Entered from the detail `Compare` button.

Behavior:

- Pins the current detail operator.
- Rail changes to tap-to-add mode.
- Compare set is capped at four operators.
- Matrix renders when at least two operators are selected.
- Leading value in each metric row is bold.

## Component Map

```text
OperatorSearch
  OperatorRail
  OperatorOverview
  OperatorDetail
  CompareView
  OperatorPrimitives
```

`OperatorSearch` should stay focused on state orchestration. New UI surfaces
should generally live in `src/components/operators/`.

## Rail Virtualization

`OperatorRail` virtualizes the operator list with a fixed 48px row height. This
keeps the UI responsive while still representing all 11,806 operators and all
filtered search results.

If row height changes, update `railRowHeight` in `OperatorRail.tsx`.

## Responsive Behavior

Desktop:

- Header stays top.
- Rail is fixed-width on the left.
- Canvas scrolls independently on the right.

Small screens:

- Header hides inactive nav items.
- Rail stacks above the content.
- Leaderboard progress bars hide to avoid horizontal overflow.
- Flex boundaries use `min-w-0` to keep 320px-wide screens from horizontally
  overflowing.

## Dark Mode

Dark mode is intentionally quiet and operational. It should not introduce a new
visual personality.

Implementation notes:

- `src/lib/useTheme.ts` owns theme state and persistence.
- `index.html` applies the initial `.dark` class before React boots.
- Component colors should use semantic classes or dashboard variables from
  `src/index.css`.
- Add a named token in both `:root` and `.dark` when a new visual role is
  needed.

## Current Limitations

- Access is still a navigation placeholder.
- Regions now has its own production dashboard route; keep this document focused
  on the Operators surface unless an Operators primitive is being changed.
- Rollout sparklines are non-interactive.
- Compare view does not yet show rollout small multiples.

## Good Next Enhancements

- Real Germany dot map from lat/lon samples.
- Access tab focused on payment and opening-hour coverage.
- Hover tooltip for rollout sparkline.
- Compare rollout row with shared-scale small multiples.
