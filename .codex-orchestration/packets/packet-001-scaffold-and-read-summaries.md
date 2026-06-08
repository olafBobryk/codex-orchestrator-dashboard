# Packet 001: Scaffold And Read Summaries

Status: verified

## Goal

Create the first usable local Next.js + shadcn sidecar that reads plain
Markdown orchestration docs from a selected project workspace.

## Outcome

- Next.js app scaffolded.
- shadcn/ui primitives added.
- Workspace path input added.
- Server-side `.codex-orchestration/` reader added.
- Missing workspace and missing directory states render.

## Verification

- `npm run lint`
- `npm run build`
- Local server returned HTTP 200.
- Missing-state HTML was verified with `curl`.

## Process Note

This packet was implemented directly in the orchestrator chat before durable
packet docs existed. Future feature packets should be recorded before
implementation begins.
