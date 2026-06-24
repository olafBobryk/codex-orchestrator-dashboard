# Orchestration Shape Minimal Doc

Status: accepted minimal doc idea

Template: ../../_templates/shape.md

This file defines the smallest useful Markdown shape document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A shape doc describes a bounded area of work clearly enough that a worker can
act inside it and a steward can review what returns.

The doc should stay plain Markdown. It may later be parsed by an adapter, but
it should remain readable without tooling.

`Status:` is architecture-level strategy state. Use `planning` for visible
preview or speculative work that is not yet solidified. The dashboard may render
planning shapes as muted regions, but `muted` should not be used as an authored
shape status.

`Role:` is optional usage metadata. Use `Role: template` when a shape represents
reusable planning or route-template infrastructure instead of executable project
scope. Status remains lifecycle state; do not combine role and status.

## Required Sections

### Intent

Intent replaces vague "purpose" language.

Intent states why the shape exists and what outcome it is trying to make
possible. It should describe the work boundary, not the implementation plan.

Good intent answers:

- What is this shape trying to make true?
- Why is this boundary useful?
- What should be easier to decide, build, or review after this shape closes?

### Workpiece References

A shape references workpieces. It does not own them.

Workpieces may be reused across nested shapes, sibling shapes, or later review
shapes. The shape boundary says which workpieces matter for this shape.

Each reference should include enough context to understand why the workpiece is
inside the shape.

The minimal workpiece document is described in
`workpiece.md`.

### Checkpoint References

A shape may reference checkpoints that belong inside the same visual boundary.
The dashboard projects these checkpoint references into the shape region, just
like workpieces and nested shape nodes.

Use checkpoint references sparingly. They are useful when a checkpoint is part
of the shape's internal routing or return structure, not merely a distant graph
dependency.

### Nested Shape References

A shape may reference child shapes when a larger boundary contains route,
subsystem, or repeated-pattern boundaries. Nested shapes contribute their nodes
to the parent region.

### Fixed Decisions

Fixed decisions are choices, constraints, or accepted direction that the worker
should treat as already decided inside the shape.

They should be specific enough that the worker does not reopen the same
question during the run.

### Autonomous Decisions

Autonomous decisions are choices the worker may make inside the shape without
returning to the steward first.

They define bounded autonomy. They should say what the worker may decide, where
that freedom applies, and what tradeoffs are acceptable.

### Escalation Triggers

Escalation triggers are specific conditions that require returning to the
steward before continuing.

They should be concrete and limited. They are not a bucket for every
uncertainty.

### Return Evidence

Return evidence is the required material a run must bring back when it ends.

It can include verified outcomes, changed artifacts, unresolved concerns,
accepted local decisions, or decisions that need steward acceptance.

## Run References

Runs are lightweight artifacts referenced from shape docs.

A shape doc may reference active or completed runs, but runs do not need to be
top-level graph docs. A run reference can point to a handoff, return note,
thread, worktree, commit, screenshot, or other artifact.

## Commit Evidence

Commits may be referenced as evidence for work inside the shape, but commits do
not define the shape boundary.

## Minimal Template

```markdown
# Shape: <name>

Status: planning | planned | active | returned | accepted | paused

Role: template | executable-path | reference | none

## Intent

<Why this shape exists, what boundary it creates, and what outcome it should
make possible.>

## Workpiece References

- `<workpiece-id>`: <why this workpiece is inside the shape>

## Checkpoint References

- `<checkpoint-id>`: <why this checkpoint belongs inside the shape>

## Nested Shape References

- `<shape-id>`: <why this child shape belongs inside the shape>

## Fixed Decisions

- <decision, constraint, or accepted direction>

## Autonomous Decisions

- <decision the worker may make inside this shape>

## Escalation Triggers

- <specific condition that requires returning to the steward>

## Return Evidence

- <material the run must bring back>

## Run References

- <run artifact, handoff, thread, worktree, commit, screenshot, or return note>

## Commit Evidence

- <commit sha, branch/ref, or none>
```
