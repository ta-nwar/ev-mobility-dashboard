# Operators UI

The Operators section is a master-detail dashboard inspired by the Claude design
handoff in `claude-designed/`.

## Design Sources

Primary references:

- `claude-designed/claude-design-mockup.html`
- `claude-designed/DESIGN_HANDOFF.md`
- `claude-designed/DESIGN_SPEC.md`
- `claude-designed/Screenshot 2026-06-21 193623.png`
- `claude-designed/Screenshot 2026-06-21 193650.png`
- `claude-designed/Screenshot 2026-06-21 193724.png`

Visual QA outputs and prior snapshots live in `devlog/screenshots/`.

## Design Principles

The surface is intentionally restrained:

- Hairline dividers, not card stacks.
- Warm neutral background and one dark accent.
- Large quiet numbers.
- Lowercase field labels and uppercase section labels.
- Weight and spacing for emphasis, not color-coding.
- Inline SVG for rollout sparklines.
- Real dashboard first screen, no marketing page.

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

## Current Limitations

- Regions and Access tabs are navigation placeholders.
- Geography still uses a placeholder map panel.
- Rollout sparklines are non-interactive.
- Compare view does not yet show rollout small multiples.

## Good Next Enhancements

- Real Germany dot map from lat/lon samples.
- Regions tab using the same master-detail pattern by Bundesland.
- Access tab focused on payment and opening-hour coverage.
- Hover tooltip for rollout sparkline.
- Compare rollout row with shared-scale small multiples.
