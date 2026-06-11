# Shape: Graph Legibility

Status: active

## Intent

Test whether the map can stay understandable when labels, icons, regions,
markers, and zoom behavior are all present.

## Workpiece References

- `workpieces/label-density.md`: keeps labels readable.
- `workpieces/icon-fade.md`: supports zoomed-out scanning.
- `workpieces/edge-weight.md`: keeps relationships legible.
- `workpieces/region-contrast.md`: keeps shapes visible without dominating.
- `workpieces/marker-clarity.md`: keeps worker markers scoped.
- `workpieces/zoom-scanning.md`: tests the graph at different zoom levels.

## Fixed Decisions

- Workpieces should remain the primary visual objects.

## Autonomous Decisions

- Tune wording around visual legibility where the example needs clarity.

## Escalation Triggers

- Escalate if checkpoints, markers, or regions dominate the workpieces.

## Return Evidence

- Notes showing whether the graph remains readable as a map.

## Run References

- none

## Commit Evidence

- none
