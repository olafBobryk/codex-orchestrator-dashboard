# Codex Orchestrator Dashboard Implementation Plan

Status: V1 scaffold implemented; Packet 005 active.

## Packet 1: Scaffold And Read Summaries

- Create a Next.js + shadcn/ui local app.
- Add server-side filesystem reading for `.codex-orchestration/`.
- Render workspace metrics, grouped Markdown docs, and empty states.

## Packet 2: Markdown Editing Direction

- Keep Markdown editing out of the sidecar.
- Open VS Code to the selected Markdown file from doc rows.
- Do not add an in-app Markdown editor or save API.

## Packet 3: Summary Refinement

- Parse plain Markdown tolerantly.
- Extract titles, status labels, and excerpts for grouped doc rows.
- Keep extracted information as lightweight display metadata, not workflow
  management state.

## Packet 4: Architecture Consolidation

- Record accepted architecture in `docs/architecture.md`.
- Keep implementation scope in this plan.
- Retain the discussion handoff as historical context.

## Packet 5: Recent Workspace Selector

- Add browser-local recent workspace history.
- Add a compact selector near the workspace input.
- Record only successfully loaded workspaces.
- Keep this as an ergonomics feature, not project execution or orchestration
  state.

## Process Correction

Packets 1 through 4 were implemented directly before `.codex-orchestration/`
existed. Future feature work should create or update the packet record first,
then split implementation when useful.

Use the visible orchestrator chat as the control plane for packet order,
concerns, gates, spawned-chat coordination, and returned-work review. Packet
chats should stay inside accepted packet scope. Chunk ledgers should be created
only as packet-scoped execution records when a packet needs durable chunk state.
