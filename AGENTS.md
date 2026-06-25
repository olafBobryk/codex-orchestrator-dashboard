<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codex Orchestrator Dashboard Agent Guide

This repo is the canonical source for a V1 local sidecar dashboard. The
dashboard visualizes durable orchestration docs; Codex chat remains where work
happens.

## Install And Run

```bash
npm install
npm run dev
```

- Dev app: `http://localhost:3000`
- Local service URL: `http://127.0.0.1:26339`
- Build for service restarts: `npm run build`
- Public fixture mode: `NEXT_PUBLIC_DEMO=true`

Useful scripts:

- `npm run lint`
- `npm run check:graph-components`
- `npm run check:shape-strategy-adapter`
- `npm run init:shape-strategy -- /absolute/path/to/target-repo`
- `npm run orchestration-setup -- /absolute/path/to/product-repo`
- `npm run update:shape-strategy -- /absolute/path/to/target-repo`
- `npm run service:install && npm run service:start`
- `npm run service:install-app`

## Work Map

- App entry: `src/app/page.tsx`
- Dashboard/domain components: `src/components/domain/`
- Shared UI primitives: `src/components/ui/`
- Codex runtime readers: `src/lib/codex/`
- Demo-only helpers: `src/lib/demo/`
- Graph contract and projection code: `src/lib/graph/`
- Strategy adapters: `src/lib/strategies/`
- Workspace Markdown readers: `src/lib/orchestration/`
- Git and service helpers: `src/lib/git/`, `src/lib/service/`
- Public demo fixture: `src/data/public-example-projection.json`
- Local service scripts: `scripts/service.mjs`, `scripts/service-runner.mjs`
- Strategy init/update scripts: `scripts/init-shape-strategy.mjs`,
  `scripts/update-shape-strategy.mjs`, `scripts/shape-strategy-template.mjs`
- Public README assets: `docs/assets/`
- Architecture docs: `docs/architecture.md`, `.codex-orchestration/architecture.md`,
  `.codex-orchestration/runtime-architecture.md`
- Historical planning notes and legacy UI references: `docs/archive/`
- Test fixtures: `fixtures/`

## Product Boundary

Keep the V1 boundary strict:

- Plain Markdown docs under `.codex-orchestration/` are the durable format.
- The dashboard summarizes docs; it does not execute implementation work.
- The dashboard does not generate prompts, replace Codex chat, or become an
  agent tracker.
- Markdown editing happens in VS Code. Do not add an in-app Markdown editor or
  `/editor` route.
- Keep adapters responsible for strategy-specific interpretation. Keep shared
  dashboard surfaces reusable.
- Public demo mode must stay fixture-based and sanitized.

## Strategy Docs

This repo stores the canonical strategy under
`.codex-orchestration/strategies/shape-strategy/`. Target repos initialized by
the scripts use root-level `.codex-orchestration/` docs instead.

Key strategy references:

- `.codex-orchestration/strategies/shape-strategy/map.md`
- `.codex-orchestration/strategies/shape-strategy/pressure-ledger.md`
- `.codex-orchestration/strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `.codex-orchestration/strategies/shape-strategy/_guides/artifacts/pressure-ledger.md`
- `.codex-orchestration/strategies/shape-strategy/_templates/workpiece.md`

Use chunk ledgers only per packet when durable execution state is needed. Do not
use a chunk ledger as the global strategy doc.

## Operating Rules

- For Next.js changes, read the relevant guide in `node_modules/next/dist/docs/`
  before coding.
- Prefer visible Codex threads over hidden/background subagents when splitting
  work.
- If a task needs a secret or token, use an ignored repo-local env/secret file.
  Never print, summarize, log, or commit secrets.
- Public demo work must not expose filesystem access, Codex runtime state,
  service controls, editor links, private data, local paths, emails, thread IDs,
  or long hashes.
- Include the most direct review link in final responses: verified preview URL,
  PR/deployment/artifact URL, or clickable file links.
- Skip `npm run lint` only when no code files were touched and the task is
  documentation/assets only.
