# Concept: Learning Harness Future Research

Status: future-research

## Intent

Park the higher-level learning and agent-harness question until enough real
project work has returned evidence. The shape strategy should stay lightweight
during active project delivery, while still preserving signals that may later
inform a reusable self-teaching orchestration layer.

## Research Question

After enough projects complete, decide how learnings should be separated across:

- project-specific notes that should not leave the project;
- implementation-path strategy for a project family, such as static pages;
- reusable orchestration strategy vocabulary, templates, and guides;
- possible agent-harness behavior for self-teaching, memory, routing, or review
  loops.

## Current Boundary

- Do not turn active project strategy work into harness design by default.
- Do not promote every page or section lesson into global strategy.
- Do not require agents to maintain a generalized memory system during ordinary
  implementation.
- Keep learning classification cheap during active work: path-level,
  project-level, parked harness/template research, or do-not-promote.
- Revisit this only after project completion or after repeated returned evidence
  shows the same learning classification problem across multiple shapes.

## Graph Linearity Questions

Future architecture work should revisit whether orchestration graphs need a
stricter directed acyclic graph contract.

The current Markdown edge model is intentionally explainable, but explicit edge
documents can add overhead when the relationship is only simple progress flow.
A lighter flow definition may be enough for common linear work.

The graph may also need DAG-shaped constraints so progress order stays legible:
work should generally move forward through checkpoints and workpieces rather
than loop back or branch without a clear return. This matters because agents can
drift away from the intended linearity unless the strategy, adapter, or review
surface makes ordering violations visible.

Do not enforce this yet. Collect evidence first on whether DAG validation,
simpler edge authoring, or agent-facing warnings would reduce orchestration
churn without making the docs heavier.

## Evidence To Collect Later

- Which lessons repeated across multiple pages or shapes.
- Which lessons stayed project-specific.
- Which review loops saved implementation churn.
- Which routing decisions created unnecessary ceremony.
- Which dashboard or graph affordances made future work easier to steer.
- Whether simpler edge authoring would reduce doc overhead.
- Whether DAG-like validation would make agent progress easier to steer.
- Which agent-harness ideas would have helped without replacing Codex chat or
  turning the dashboard into an executor.

## Deferred Decisions

- Whether learning belongs in shape-strategy guides, project templates, a
  separate implementation-strategy layer, or a future harness layer.
- Whether future strategies should include a promotion taxonomy beyond
  path-level and project-level notes.
- Whether any self-teaching behavior should be automated, prompted, or remain a
  human/steward review activity.
- Whether orchestration maps should become DAGs by default, and what exceptions
  should be allowed for returns, review loops, or template/reference components.
- Whether common flow edges should be authored inline instead of as separate
  edge documents.
