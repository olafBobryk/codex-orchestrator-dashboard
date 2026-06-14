# Orchestration Edge Minimal Doc

Status: accepted minimal doc idea

Template: ../../_templates/edge.md

This file defines the smallest useful Markdown edge document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

An edge doc describes why two graph items are related.

Edges make the map readable. They should represent real orchestration
relationships, not arbitrary bridge lines added only to satisfy a visual or
connected-component check.

## Relationship To Maps

Map docs can list trunk and flow edges directly. Edge docs are useful when a
relationship needs its own explanation, evidence, or status.

`Status:` is architecture-level strategy state. Use `planning` for visible
relationships that are not yet solidified. Use `Visual Weight: muted` only as
projection language for how strongly an edge should appear.

## Required Sections

### Intent

Intent states why this relationship exists.

It should explain what the edge means in orchestration terms.

### Source / Target

Source / Target identifies the graph items connected by the edge.

The ids may point to nodes or artifacts, depending on the map.

### Relationship

Relationship describes the kind of connection.

Accepted relationship values are:

- `trunk`
- `branch`
- `return`
- `dependency`
- `evidence`
- `comparison`
- `annotation`

### Direction

Direction states whether the edge is directed or undirected.

Use directed when order, flow, dependency, return, or evidence movement matters.
Use undirected when the edge only means association or comparison.

### Visual Weight

Visual weight states how strongly the edge should appear.

Accepted visual weight values are:

- `primary`
- `secondary`
- `muted`

### Evidence

Evidence lists material that supports this relationship.

Evidence can include docs, commits, handoffs, return notes, screenshots, test
results, previews, or other artifacts.

## Minimal Template

```markdown
# Edge: <name>

Status: planning | active | accepted | removed

## Intent

<Why this relationship exists.>

## Source / Target

- Source: `<node-or-artifact-id>`
- Target: `<node-or-artifact-id>`

## Relationship

trunk | branch | return | dependency | evidence | comparison | annotation

## Direction

directed | undirected

## Visual Weight

primary | secondary | muted

## Evidence

- <doc, commit, handoff, return note, screenshot, test result, preview, or artifact>
```
