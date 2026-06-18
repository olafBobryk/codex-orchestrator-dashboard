# Codex Orchestrator Dashboard

A narrow local Next.js + shadcn/ui sidecar for reading project-local Codex
orchestration Markdown docs and visualizing their shape-strategy graph.

Public demo:

- Live demo: https://codex-orchestrator-public-example.vercel.app
- Source: https://github.com/olafBobryk/codex-orchestrator-dashboard/tree/main

The public demo is built from the root dashboard app with
`NEXT_PUBLIC_DEMO=true`. It uses a committed, hardcoded, sanitized fixture and
the same dashboard UI, components, graph contract, and data model as the local
app.

Public demo mode does not expose local filesystem reads, Codex runtime polling,
service controls, editor links, API-backed actions, private project paths, or
private orchestration data. Relative artifact references are rendered as static
evidence only.

The real sidecar remains a local filesystem-backed app that reads project
`.codex-orchestration/` docs.

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

Run the sanitized public demo locally:

```bash
NEXT_PUBLIC_DEMO=true npm run dev
```

Initialize the current shape strategy in another repo:

```bash
npm run init:shape-strategy -- /absolute/path/to/target-repo
```

Use `--force` only when intentionally replacing existing shape strategy state.

The init command creates a clean project-local starter. It copies shared
`_guides/` and `_templates/` strategy docs, writes a blank map and pressure
ledger, and creates starter artifact/checkpoint/edge/run/shape/workpiece
folders at the root of `.codex-orchestration/`. It does not copy this repo's
example graph into the target.

Update an already-initialized repo with the latest shared strategy support
docs:

```bash
npm run update:shape-strategy -- /absolute/path/to/target-repo
```

The update command refreshes shared `_guides/` and `_templates/` strategy docs and
creates a missing `pressure-ledger.md`. It preserves project-authored maps,
shapes, workpieces, runs, checkpoints, artifacts, and existing pressure ledger
entries. It updates only recognized shape strategy installs; ambiguous
`.codex-orchestration/` folders are left untouched.

Run the dashboard as a local macOS service:

```bash
npm run service:install
npm run service:start
```

The service uses `http://127.0.0.1:26339` by default. It is local-only, fails
on port conflict, writes runtime files under `.codex/tmp/orchestrator-service/`,
and can be managed with `service:stop`, `service:restart`, `service:status`,
`service:open`, and `service:uninstall`.
The always-on service runs `next start`; run `npm run build` after code changes
before restarting it.

Install a Spotlight-launchable local app wrapper:

```bash
npm run service:install-app
```

This creates `~/Applications/Codex Orchestration Dashboard.app`. Launching it
starts the service if needed and opens the Chrome app window.

Migrating older orchestration docs should be a prep-ledger pass, not an
automatic conversion. Use `goal-ledger-prep` to create a temporary ignored
ledger, inventory old packet/chunk/handoff docs, map them into shape strategy
artifacts, and produce a goal-ready migration prompt.

Useful docs:

- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/discussion-handoff.md`
- `.codex-orchestration/strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `.codex-orchestration/strategies/shape-strategy/_guides/artifacts/pressure-ledger.md`
- `.codex-orchestration/strategies/shape-strategy/_templates/workpiece.md`
- `.codex-orchestration/strategies/shape-strategy/pressure-ledger.md`
- `.codex-orchestration/strategies/shape-strategy/map.md`

This dashboard repo is the canonical strategy source, so it keeps strategy
material under `.codex-orchestration/strategies/shape-strategy/`. Normal target
projects initialized by the commands use root-level `.codex-orchestration/`
docs instead.
