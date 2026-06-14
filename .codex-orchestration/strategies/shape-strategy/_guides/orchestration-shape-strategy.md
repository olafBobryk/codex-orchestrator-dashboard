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

Update an already-initialized repo with the latest shared strategy support docs
with:

```bash
npm run update:shape-strategy -- /absolute/path/to/target-repo
```

The update command refreshes shared `_guides/` and `_templates/` docs and creates
a missing project-local pressure ledger. It preserves project-authored maps,
shapes, workpieces, runs, checkpoints, artifacts, and existing pressure ledger
entries.

The init command creates a clean project-local starter. It copies shared
`_guides/` and `_templates/` strategy docs, writes a blank map and pressure
ledger, and creates starter artifact/checkpoint/edge/run/shape/workpiece
folders. It does not copy this repo's example graph into the target.

Guides explain the strategy and artifact semantics. Templates are short
copy/edit starting points that link back to their guide counterparts.

The commands should stay conservative. They sync canonical guides and
templates, but they should not accept JSON payloads to generate artifact docs by
default. Agents should create project docs by copying templates and editing
plain Markdown with normal file operations so the command does not become a
second orchestration authoring abstraction.

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
- Status.
- Detail.
- Artifact links.

Shape rendering is a visual overlay around grouped nodes. It must not affect
graph physics.

Status is architecture-level strategy language. The dashboard may project
planning-like statuses as visually muted regions, nodes, markers, or edges, but
authors should not use UI state as orchestration vocabulary.

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

### Worktree

A worktree is a filesystem and Git execution context.

A worktree is not a run. A run is the worker or agent job; a worktree is one
place where that job may edit, test, and produce commits.

A worktree is not a primary graph node by default. It can appear as a detail or
evidence reference on runs, agents, workpieces, and shapes when it helps explain
where work happened.

The accepted shorthand is:

- Agent: who or what acted.
- Run: the execution attempt or job.
- Worktree: the checkout/folder context used by the run.
- Branch: the Git line the worktree may point at.
- Commit: durable Git evidence produced by the run.

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
- `Status: planning` means visible but not yet solidified work. The dashboard
  may render it as muted or deferred. `muted` is projection vocabulary, not a
  recommended authored status.
- `unsolidified` is accepted as a compatibility alias for `planning`, but
  `planning` is the canonical authored spelling.
- Test results belong in workpiece detail blocks by default.
- Test results should be readable as part of the work node's evidence, not
  forced into markers.
- Markers represent live workers or agents and where they are now.
- Agent markers should render only for live operational statuses: `active`,
  `in_progress`, or `paused`. Historical statuses such as `returned`,
  `accepted`, `planned`, or other non-live states remain available as docs and
  history, but should not produce graph markers.
- Other badge-like concepts should not overload markers without being named as
  a separate concept.

## Visibility-Required Delegation

Visible delegated work must appear on the map before substantive mutation.

`agents/*` remains optional for low-ceremony or non-visible work. A project can
visualize work without durable agent docs when the extra artifact would add
ceremony without clarity.

`runs/*` is required when a spawned or delegated worker is doing substantive
visible work inside a shape.

`agents/*` is required when that worker should appear as a dashboard marker.

Run and agent artifacts should be created or updated before substantive
mutation, then returned, accepted, paused, blocked, or removed from active map
references when the work stops being active.

For dashboard-visible delegated work, the steward or main checkout owns the
central projection docs. Worker worktrees may keep local run and agent docs as
evidence, but those local docs should not be the only source for active or
returned projection state. The main checkout should contain central run and
agent stubs when the dashboard is expected to show the work before
consolidation.

Lifecycle status and execution mode are separate. Use status for lifecycle
state such as `active`, `paused`, `returned`, `blocked`, `accepted`, or
`archived`; use mode for execution shape such as `subagent`, `visible-thread`,
`steward`, `worker`, or `reviewer`.

## Shape Boundary Grammar

A shape boundary should state what is fixed, what is autonomous, what escalates,
and what evidence returns.

The shape owns the worker boundary. A run is bounded by the shape, not only by
an individual workpiece.

The accepted minimal Markdown shape document is described in
`artifacts/shape.md`.

The accepted minimal Markdown workpiece document is described in
`artifacts/workpiece.md`.

The accepted minimal Markdown run document is described in
`artifacts/run.md`.

The accepted minimal Markdown checkpoint document is described in
`artifacts/checkpoint.md`.

An optional, provisional Markdown agent document is sketched in
`artifacts/agent.md`. Agent docs are optional unless marker visibility is
expected.

The accepted minimal Markdown map document is described in
`artifacts/map.md`.

The accepted minimal Markdown edge document is described in
`artifacts/edge.md`.

The accepted minimal Markdown artifact document is described in
`artifacts/artifact.md`.

The accepted minimal Markdown pressure ledger document is described in
`artifacts/pressure-ledger.md`.

Lightweight strategy concepts that are not artifact schemas are recorded in
`concepts/strategies/approaches.md`.

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

## Shape Run Return Lifecycle

When a worker finishes a run inside a shape, return it through a consistent
sequence so the graph stays connected to the steward and Git state.

Use the local `$shape-run-return` skill when available. It is a shape-strategy
specific companion to generic `$agent-return` and `$agent-worktree-workflow`
rules; it does not replace generic merge, worktree, or preview safety rules.

The accepted return order is:

1. Inspect return state.
2. Prepare Git return state.
3. Update durable orchestration docs.
4. Verify.
5. Send the steward packet.

Inspection comes first because the worker needs to know the actual shape, run,
agent, workpiece, branch, worktree, preview, env, verification, and gate state
before changing durable docs.

Git return packaging comes before documentation. The docs should record the
real disposition: committed checkpoint, staged changes, dirty returned
worktree, retained preview, skipped merge, generated ignored files, or any
other actual state. Do not leave Git sorting for the steward when the worker
can safely classify it.

Durable docs are updated after Git disposition is known. Mark workpieces, runs,
and agents `returned` when they are handed back but not accepted. Leave the
shape `active` while human gates or future workpieces remain. Do not mark a
run `accepted` only because verification passed.

Verification follows doc updates so the adapter checks the actual returned map
state. Run the shape adapter whenever `.codex-orchestration` changes, then run
repo checks and preview checks relevant to the work.

The steward packet is last. It should report the final documented state, the
Git disposition, verification results, preview/worktree disposition, env
disposition, and remaining gates. If the packet is sent to the wrong thread,
resend it to the corrected thread and state both thread ids in the current
conversation.

Hard stops remain in force: no commit, merge, push, deploy, worktree removal,
preview stop, or thread archive unless explicitly authorized; passing checks
does not mean product acceptance; unresolved architecture, product, security,
content, deployment, or external-state concerns remain gates.

## Pressure Ledger

The pressure ledger records friction against the orchestration strategy itself.

Pressure entries are not concerns, workpieces, checkpoints, or architecture
decisions by default. They capture durable feedback about where the current
strategy bent, confused the work, created churn, or exposed useful signal.

Pressure is grouped by direction:

- Upper pressure: higher-level intent, steward decisions, architecture, product
  direction, or human preference pushing down onto the work.
- Lower pressure: implementation reality, verification, UI behavior, code
  constraints, adapter limits, or worker output pushing up against the plan.
- Sideways pressure: neighboring workstreams, concurrent agents, dirty
  worktrees, duplicated docs, shared files, or parallel decisions pushing
  laterally against the work.

Pressure entries do not update strategy automatically. The promotion path is:

```text
pressure entry -> discussion -> accepted decision -> strategy doc update
```

This keeps the ledger useful as feedback without turning every friction point
into durable architecture.

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
