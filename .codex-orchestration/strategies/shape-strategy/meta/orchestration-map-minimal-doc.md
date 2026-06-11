# Orchestration Map Minimal Doc

Status: accepted minimal doc idea

This file defines the smallest useful Markdown map document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A map doc describes how orchestration artifacts assemble into one project graph
or scoped graph view.

The map sits above shapes, workpieces, runs, checkpoints, and optional agents.
It answers what should be visible together and why.

## End Boundary

Map-level end anchoring is not part of this minimal doc. The dashboard end API
is being removed, so this document does not define an `End` field.

Completion or acceptance should be represented through checkpoints, shape
status, run returns, or map status instead of a dedicated map end anchor.

## Required Sections

### Intent

Intent states what this map is trying to make visible.

It should describe the graph view or project scope, not every artifact inside
it.

### Start

Start references the checkpoint or artifact that anchors the visible beginning
of the map when one exists.

Start can be `none` when the graph intentionally has no single beginning.

### Shape References

Shape references list the shapes included in the map.

Each reference should explain why the shape belongs in this graph view.

### Checkpoint References

Checkpoint references list the checkpoint transitions included in the map.

Each reference should explain what transition the checkpoint marks.

### Active Run References

Active run references list runs that are currently relevant to the map.

Completed runs can be omitted unless their return evidence is still important
to the current view.

### Agent References

Agent references are optional.

They should be included only when they clarify active ownership, stewardship,
review, or worker position.

### Trunk / Flow

Trunk / Flow lists the main relationship edges that make the map readable.

A map does not always need one visible trunk, but most stewarded project maps
should make the main flow explicit when it exists.

The minimal edge document is described in
`orchestration-edge-minimal-doc.md`. Use an edge doc when a relationship needs
its own explanation, evidence, or status.

### Intentional Disconnected Components

Intentional disconnected components lists graph components that are knowingly
separate.

If more than one active component exists and it is not listed here, the
projection should be treated as patchy or under-specified.

### Evidence

Evidence lists material that supports this map.

Evidence can include docs, handoffs, previews, screenshots, test results,
commits, branches, worktrees, or notes.

## Minimal Template

```markdown
# Orchestration Map: <project or scope name>

Status: active | paused | accepted | archived

## Intent

<What this map is trying to make visible.>

## Start

- Start: `<checkpoint-id>` | none

## Shape References

- `<shape-id>`: <why this shape is part of the map>

## Checkpoint References

- `<checkpoint-id>`: <what transition this checkpoint marks>

## Active Run References

- `<run-id>`: <why this run is currently relevant>

## Agent References

- `<agent-id>`: <optional, only if useful>

## Trunk / Flow

- `<source-id>` -> `<target-id>`: <why this is a main flow edge>

## Intentional Disconnected Components

- `<component-id>`: <why this component is intentionally disconnected>

## Evidence

- Commit: <sha or branch/ref, if relevant>
- Artifact: <doc, handoff, preview, screenshot, test result, or note>
```
