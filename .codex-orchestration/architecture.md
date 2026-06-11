# Architecture

Status: accepted-surface-only

## Accepted Architecture

- The dashboard visualizes orchestration artifacts. It does not execute work or
  replace Codex chat.
- Active orchestration strategy material lives under
  `strategies/shape-strategy/`.
- `graph-projection.json` is a prototype fallback. The shape strategy Markdown
  is the preferred source when present.

## Pointers

- Accepted strategy:
  `strategies/shape-strategy/meta/orchestration-shape-strategy.md`
- Strategy map:
  `strategies/shape-strategy/map.md`
- Projection notes:
  `strategies/shape-strategy/meta/dashboard-contract-notes.md`
- Local fixtures:
  `tests/`
