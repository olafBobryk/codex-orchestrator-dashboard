# Dashboard Contract Notes

Status: rolling

These notes are provisional dashboard projection notes. They should not carry
accepted orchestration methodology.

Accepted orchestration vocabulary now lives in:

- `strategies/shape-strategy/meta/orchestration-shape-strategy.md`

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
- Keep a deliberate language gap between orchestration strategy and dashboard
  projection. For example, orchestration may call a boundary a `shape` while
  the dashboard renders it as a visual `region`. This prevents the dashboard
  layer from becoming the orchestration layer.

## Candidate Durable Points

### Nodes

- Nodes need a stable label.
- Nodes need color.
- Node color should be tied to a legend key; for nodes, color and legend meaning
  are the same concept.
- Nodes need a muted state. The dashboard can render muted as reduced opacity.
- A basic work-unit node should support a neutral/default visual treatment,
  likely gray, before project-specific color/category is applied.
- Work-unit node detail should be able to show associated tests and test
  results.
- Node detail should be able to show run membership when runs are represented
  indirectly.

### Edges

- Edges need source and target.
- Edges may be directional, but directionality should be toggleable and off by
  default.
- Edges need style options such as solid, dashed, or dotted.
- Edges may receive detail information.
- A projection may contain multiple connected components, but more than one
  active component should be flagged as a patchiness warning unless explicitly
  marked as intentional.

### Markers

- Marker is the preferred word for the node-attached badge/accent concept.
- A marker is not a graph node.
- A marker attaches to a target node.
- Markers need id, target id, label, color, muted state, and icon.
- Markers do not need position for now.

### Groups / Shapes

- Shape may become a graph overlay layer for grouping related nodes.
- A shape should visually circle or pool nodes without affecting graph physics.
- Shape could represent the boundary of work that determines what workers may
  decide live and when they must return to the steward.
- Shape fields are not ready to freeze. Candidate needs include id, label,
  category, target node ids, color, muted state, and links/artifacts.
- Nested or overlapping shapes may be useful, but the dashboard contract should
  not force recursion as the default model.
- The dashboard may continue to call rendered shape overlays `regions`. That
  naming difference is intentional when it helps keep the dashboard generic.

### Runs

- Runs are represented indirectly in the dashboard projection through
  checkpoint edges, worker markers, node detail, and return evidence.
- Runs do not need a primary projection layer until visual testing proves that
  indirect representation is insufficient.

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
- `details` is the preferred eventual field name for arrays of detail blocks.
  Existing `detail` usage is a current API shape, not the desired final naming.
