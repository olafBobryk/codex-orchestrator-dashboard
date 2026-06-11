# Shape: Contract Base

Status: active

## Intent

Create the minimal graph contract foundation needed for a workpiece-first map.

## Workpiece References

- `workpieces/adapter-boundary.md`: keeps adapter responsibility clear.
- `workpieces/projection-fields.md`: names the minimum projected fields.
- `workpieces/neutral-work-color.md`: keeps workpieces visually neutral.
- `workpieces/shape-region-link.md`: keeps strategy shapes separate from dashboard regions.
- `workpieces/detail-consistency.md`: keeps details readable across items.
- `workpieces/artifact-links.md`: keeps evidence reachable without node inflation.

## Fixed Decisions

- The dashboard renders projection data; it does not own strategy.
- Shapes can render as dashboard regions.

## Autonomous Decisions

- Adjust wording inside workpiece docs if it improves readability.

## Escalation Triggers

- Escalate if the example needs projection JSON or adapter behavior.

## Return Evidence

- A readable contract-base section in the shape strategy example.

## Run References

- none

## Commit Evidence

- none
