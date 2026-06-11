# Codex Orchestrator Dashboard

A narrow local Next.js + shadcn/ui sidecar for reading project-local Codex
orchestration Markdown docs.

The app reads from:

```text
<project>/.codex-orchestration/
```

V1 is intentionally limited:

- Plain Markdown only.
- Summary dashboard for architecture, packets, ledgers, handoffs, concerns,
  gates, verification, and preview notes.
- Markdown editing happens in VS Code, opened to the selected Markdown file.
- No prompt generation.
- No Codex chat replacement.
- No implementation execution.
- No agent tracker or separate concern/gate workflow system.
- No in-app Markdown editor and no `/editor` route.

Run locally:

```bash
npm run dev
```

Initialize the current shape strategy in another repo:

```bash
npm run init:shape-strategy -- /absolute/path/to/target-repo
```

Use `--force` only when intentionally replacing an existing
`.codex-orchestration/strategies/shape-strategy/` folder.

Migrating older orchestration docs should be a prep-ledger pass, not an
automatic conversion. Use `goal-ledger-prep` to create a temporary ignored
ledger, inventory old packet/chunk/handoff docs, map them into shape strategy
artifacts, and produce a goal-ready migration prompt.

Useful docs:

- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/discussion-handoff.md`
- `.codex-orchestration/strategies/shape-strategy/meta/orchestration-shape-strategy.md`
- `.codex-orchestration/strategies/shape-strategy/map.md`
