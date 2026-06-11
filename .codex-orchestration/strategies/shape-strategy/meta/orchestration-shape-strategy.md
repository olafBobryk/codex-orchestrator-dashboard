# Orchestration Shape Strategy

Status: accepted vocabulary and boundary grammar

This file is the durable place for accepted orchestration-shape decisions.
Unverified discussion should stay in chat or temporary notes until explicitly
accepted.

## Purpose

This is an orchestration strategy attempt designed to work well with the visual
dashboard surface.

The strategy and dashboard are partners. The strategy gives project work a
shape that can be visualized; the dashboard renders that shape without becoming
the source of truth.

This repo can use the strategy as a template, but each project may adapt it for
its own orchestration needs.

## Initialization And Migration

Initialize this strategy in another repo from the dashboard repo with:

```bash
npm run init:shape-strategy -- /absolute/path/to/target-repo
```

Use `--force` only when intentionally replacing an existing shape strategy
folder.

Migration from older packet/chunk/handoff docs should not be automatic by
default. Use `goal-ledger-prep` first: create a temporary ignored ledger,
inventory old docs, classify what maps to shapes, workpieces, checkpoints,
runs, and artifacts, then hand a goal-ready migration prompt to a focused
implementation pass.

## Accepted Vocabulary

### Workpiece

A workpiece is the concrete lowest-level work node.

`Piece` is an accepted conversational alias for workpiece.

A workpiece should be able to carry:

- Label.
- Status.
- Neutral/default color or project category color.
- Tests and test results.
- Artifacts and links.
- Optional owning shape.

### Shape

A shape is the boundary around a group of workpieces.

A shape is defined by target node ids plus node-like metadata such as:

- Id.
- Label.
- Color or category.
- Muted state.
- Detail.
- Artifact links.

Shape rendering is a visual overlay around grouped nodes. It must not affect
graph physics.

Shape-in-shape is allowed as a strategy concept. Nested or overlapping shapes
can represent a larger boundary containing smaller boundaries, as long as the
nested structure stays understandable and does not become the default way to
explain simple work.

### Run

A run is a worker or agent job operating inside a shape boundary.

A run usually operates over a whole shape rather than forcing one run per
workpiece.

A run does not need to be directly graphed by default. While active, it can be
represented through worker or agent markers. When it ends, it creates a return
artifact that may become or attach to a checkpoint.

Run can remain architecture vocabulary without becoming a dashboard projection
entity until the dashboard has a concrete need for it.

A run should also be recordable as a lightweight artifact or execution trace.
That trace can reference the shape boundary it operated inside, touched
workpieces, start checkpoint, end checkpoint, and produced return evidence.

Start and end checkpoints are useful anchors, but they are optional references,
not the definition of a run. This keeps runs from becoming too Git-like or too
rigid.

In the dashboard, runs may be represented indirectly through checkpoint edges,
active worker markers, node details, and return evidence rather than as primary
graph nodes.

### Checkpoint

A checkpoint is a durable "we are here" graph node.

A checkpoint records a meaningful transition in the orchestration state of a
shape, run, or workpiece.

Checkpoints have their own legend color and icon support.

Checkpoints can represent outbound or inbound direction. Split-off and return
are directional interpretations of checkpoint flow, not separate core
primitives.

Checkpoints do not require Git evidence.

## Accepted Dashboard Semantics

- Default work nodes should render neutral gray unless a project-specific
  category or shape API deliberately assigns stronger meaning.
- Test results belong in workpiece detail blocks by default.
- Test results should be readable as part of the work node's evidence, not
  forced into markers.
- Markers represent active workers or agents and where they are now.
- Other badge-like concepts should not overload markers without being named as
  a separate concept.

## Shape Boundary Grammar

A shape boundary should state what is fixed, what is autonomous, what escalates,
and what evidence returns.

The shape owns the worker boundary. A run is bounded by the shape, not only by
an individual workpiece.

The accepted minimal Markdown shape document is described in
`orchestration-shape-minimal-doc.md`.

The accepted minimal Markdown workpiece document is described in
`orchestration-workpiece-minimal-doc.md`.

The accepted minimal Markdown run document is described in
`orchestration-run-minimal-doc.md`.

The accepted minimal Markdown checkpoint document is described in
`orchestration-checkpoint-minimal-doc.md`.

An optional, provisional Markdown agent document is sketched in
`orchestration-agent-minimal-doc.md`. Agent docs are not required by default.

The accepted minimal Markdown map document is described in
`orchestration-map-minimal-doc.md`.

The accepted minimal Markdown edge document is described in
`orchestration-edge-minimal-doc.md`.

The accepted minimal Markdown artifact document is described in
`orchestration-artifact-minimal-doc.md`.

### Fixed Decisions

Fixed decisions are choices, constraints, or accepted direction that the worker
should treat as already decided inside the shape.

They are not general background notes. They should be specific enough that a
worker can avoid reopening the same question during the run.

### Autonomous Decisions

Autonomous decisions are choices the worker may make inside the shape without
returning to the steward first.

They should define the allowed decision space, such as affected workpieces,
acceptable tradeoffs, or local implementation freedom. Autonomy is bounded by
the shape and by any escalation triggers.

### Escalation Triggers

Escalation triggers are specific conditions that require returning to the
steward before continuing.

They should be concrete and limited. They are for boundary-breaking questions,
contradictions, unexpected risk, or decisions that exceed the shape's autonomy.
They are not a bucket for every uncertainty.

### Return Evidence

Return evidence is the required material a run must bring back when it ends.

It can include verified outcomes, changed artifacts, unresolved concerns,
accepted local decisions, or decisions that need steward acceptance.

Return evidence can overlap with run return artifacts. That overlap is
acceptable: the shape defines what must come back, while the run produces the
actual return material.

## Visual Strategy Notes

Clear start and end nodes make a completed project graph easier to understand.
During active development, multiple starts and endings may be legitimate.

For most stewarded project work, prefer a visible steward trunk when it helps
the graph read as one project. Parallel work may branch from the trunk and
reconnect through return evidence, checkpoint, or review edges.

Not every graph requires one visible trunk. If work has no clear steward, has
multiple agents moving in separate directions, or intentionally has unclear
ownership, the graph may show that structure directly.

Visual mess should be treated as a signal to investigate. Edge crossings,
intersections, and non-planar-looking structure may indicate too much parallel
complexity, missing stewardship, or patchy projection edges. This is a
hypothesis, not a proof: valid parallel work can also create crossings.

The steward may eventually be represented as a normal graph node rather than a
special hidden role. One possible abstraction is that the steward is an agent
with non-writing authority over direction, acceptance, and escalation.

## Source Of Truth

The dashboard renders projected orchestration state. It does not decide
strategy, mutate work, or become the source of truth.

Project-local Markdown remains the durable source for orchestration strategy
and work state unless a project explicitly accepts another source.

## Git Evidence

Git may provide evidence for the graph, such as commits, branches, merge points,
or worktree state.

Git does not define the orchestration graph. The graph is shaped by accepted
orchestration artifacts first; Git can annotate or corroborate that shape.

Commits can be associated with shapes, workpieces, runs, and checkpoints as
evidence. A commit should not replace the artifact it supports.

## Artifacts

Artifacts are first-class references.

Markdown files, handoffs, test results, commits, screenshots, and related
material can be linked as artifacts or detail references.

Artifacts do not automatically become graph nodes.
