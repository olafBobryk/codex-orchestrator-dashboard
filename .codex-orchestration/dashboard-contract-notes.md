# Dashboard Contract Notes

Status: rolling

These notes are provisional. Candidate fields may be discussed here, but do not
freeze the final contract yet.

## Direction

The target is a minimal stable contract for the orchestration dashboard to
consume.

## Layers

- Project orchestration layer: project-local docs, vocabulary, experiments, and
  examples.
- Adapter layer: deterministic conversion from project-local artifacts into a
  dashboard-consumable graph projection.
- Dashboard layer: rigid visual consumer of the projected graph information.

## Current Intent

- Park methodology decisions while exploring the dashboard-consumption contract.
- Keep the dashboard rigid enough that project-level orchestration vocabulary
  can evolve without changing dashboard code.
- Allow different project-level interpretations to be pressure-tested by
  producing the same kind of graph projection.

## Candidate Durable Points

### Nodes

- Nodes need a stable label.
- Nodes need color.
- Node color should be tied to a legend key; for nodes, color and legend meaning
  are the same concept.
- Nodes need a muted state. The dashboard can render muted as reduced opacity.

### Edges

- Edges need source and target.
- Edges may be directional, but directionality should be toggleable and off by
  default.
- Edges need style options such as solid, dashed, or dotted.
- Edges may receive detail information.

### Markers

- Marker is the preferred word for the node-attached badge/accent concept.
- A marker is not a graph node.
- A marker attaches to a target node.
- Markers need id, target id, label, color, muted state, and icon.
- Markers do not need position for now.

### Detail

- Node and edge detail should support variable-length information.
- Projects should be able to include more or fewer detail entries depending on
  what their adapter can provide.
- Detail entries may need a name, icon, summary, color, body text, and a way to
  represent links such as Markdown source files.
- Detail should be modeled as flexible detail blocks, not fixed rows only.
- Links inside detail blocks are references or navigation affordances, not
  execution actions.
- Avoid a generic `actions` field for now.
- `links` is the current preferred word for source/document references inside
  detail blocks.
