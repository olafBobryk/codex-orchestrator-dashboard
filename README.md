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

Useful docs:

- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/discussion-handoff.md`
- `.codex-orchestration/packets/packet-map.md`
