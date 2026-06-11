# Architecture

Status: accepted-surface-only

## Accepted Architecture

- The dashboard visualizes orchestration artifacts. It does not execute work or
  replace Codex chat.
- Active orchestration strategy material lives under
  `strategies/shape-strategy/` in this dashboard repo because this repo hosts
  canonical strategy source material.
- Normal target projects use root-level `.codex-orchestration/` shape strategy
  docs after initialization or migration.
- `graph-projection.json` is a prototype fallback. The shape strategy Markdown
  is the preferred source when present.
- The accepted local runtime direction is an always-available macOS LaunchAgent
  running the local Next.js dev server. Port choice, install mechanics, and
  future phone-accessible modes remain open.

## Pointers

- Accepted strategy:
  `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- Strategy map:
  `strategies/shape-strategy/map.md`
- Projection notes:
  `strategies/shape-strategy/_guides/dashboard-contract-notes.md`
- Strategy templates:
  `strategies/shape-strategy/_templates/`
- Runtime architecture:
  `runtime-architecture.md`
- Local fixtures:
  `tests/`
