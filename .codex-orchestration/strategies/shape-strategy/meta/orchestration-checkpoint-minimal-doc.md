# Orchestration Checkpoint Minimal Doc

Status: accepted minimal doc idea

This file defines the smallest useful Markdown checkpoint document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A checkpoint records a meaningful transition in orchestration state.

A checkpoint is not a commit, and it is not every run boundary. A checkpoint may
reference a commit as evidence, but Git does not define the checkpoint.

## Relationship To Shapes, Workpieces, Runs, And Commits

- A shape defines the work boundary affected by the transition.
- A workpiece is concrete work affected by the transition.
- A run may start from or end at a checkpoint.
- A commit may provide evidence for the transition.

The checkpoint records what changed in orchestration state and points to the
evidence that supports it.

## Required Sections

### Transition

Transition states what changed in orchestration state.

It should explain why this moment deserves a checkpoint instead of remaining
routine run evidence.

### Applies To

Applies To references the shapes, workpieces, and runs affected by the
transition.

References can be `none` when the checkpoint is broader than a single artifact.

### Direction

Direction describes how the checkpoint is used in the graph.

Accepted direction values are:

- `outbound`
- `inbound`
- `pause`
- `acceptance`
- `rescope`
- `reference`

### Evidence

Evidence lists the artifacts that support the checkpoint.

Evidence can include commits, handoffs, previews, screenshots, test results,
docs, return notes, or other review material.

### Decision

Decision records what the steward accepted, rejected, paused, or changed here.

It should be short and specific.

## Minimal Template

```markdown
# Checkpoint: <name>

Status: planned | reached | accepted | superseded

## Transition

<What changed in orchestration state?>

## Applies To

- Shape: `<shape-id>` | none
- Workpiece: `<workpiece-id>` | none
- Run: `<run-id>` | none

## Direction

outbound | inbound | pause | acceptance | rescope | reference

## Evidence

- Commit: <sha or branch/ref, if relevant>
- Artifact: <handoff, preview, screenshot, test result, doc, or return note>

## Decision

<What the steward accepted, rejected, paused, or changed here.>
```
