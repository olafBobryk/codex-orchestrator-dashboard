# Orchestration Map: Workpiece First Visual Map

Status: active

## Intent

Show one readable project graph where workpieces stay visually primary, shapes
group related work, checkpoints stay sparse, and the trunk remains easy to
follow.

## Start

- Start: `steward-shape-start`

## Shape References

- `shapes/contract-base.md`: establishes the projection and contract baseline.
- `shapes/panel-inspection.md`: tests focused Markdown inspection behavior.
- `shapes/graph-legibility.md`: tests whether the graph can be scanned.
- `shapes/review-surface.md`: tests whether returned evidence is reviewable.

## Checkpoint References

- `checkpoints/steward-shape-start.md`: marks the accepted start of the map.
- `checkpoints/review-return.md`: marks the review transition for returned evidence.

## Active Run References

- none

## Agent References

- `agents/shape-side-thread.md`: visible side Codex thread currently working on graph marker and activity behavior.

## Trunk / Flow

- `steward-shape-start` -> `contract-base`: start with projection contract work.
- `contract-base` -> `panel-inspection`: use the contract to inspect references.
- `panel-inspection` -> `graph-legibility`: verify the graph remains readable.
- `graph-legibility` -> `review-surface`: collect reviewable evidence.
- `review-surface` -> `review-return`: return the visual-map result.

## Intentional Disconnected Components

- none

## Evidence

- Commit: none
- Artifact: `artifacts/workpiece-first-visual-map.md`
- Artifact: `artifacts/orchestration-shape-strategy.md`
