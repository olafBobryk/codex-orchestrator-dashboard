# Codex Orchestrator Dashboard Architecture

Status: accepted V1 direction.

## Product Boundary

This app is a local sidecar for durable Codex orchestration docs. It does not
replace Codex chat, execute implementation work, generate prompts, or become an
overlay.

V1 reads plain Markdown only and surfaces docs as grouped rows with lightweight
metadata. Markdown edits belong in VS Code, opened to the selected Markdown
file.

## Runtime

The app is a local Next.js App Router project with shadcn/ui source components.
Server-side code reads Markdown files from a selected workspace path.

The central app lives in this repo. Per-project orchestration truth stays in the
target project:

```text
<project>/.codex-orchestration/
  architecture.md
  packets/*.md
  ledgers/*.md
  handoffs/*.md
  concerns.md
  gates.md
  verification.md
  preview.md
```

## Orchestration Operating Model

Use one visible orchestrator chat as the project control plane. The orchestrator
primarily serves bounded packets: it maintains packet order, durable docs,
human gates, concern disposition, spawned-chat coordination, and returned-work
review.

Packet chats execute or investigate within the accepted packet. They may bubble
up concerns, but they do not rewrite project strategy on their own. Chunk
ledgers are packet-scoped execution records used only when a packet needs
durable chunk state; they are not the global strategy document.

## Data Flow

1. The user enters a workspace path.
2. The server resolves `<workspace>/.codex-orchestration/`.
3. Markdown docs are read with tolerant parsing for title, status, and excerpt.
4. The dashboard renders metrics and grouped doc rows.
5. Doc rows can open the selected Markdown file in VS Code for edits.

## Non-Goals

- No project-specific skill forks.
- No app-private orchestration source of truth.
- No in-app Markdown editor.
- No prompt factory.
- No agent lifecycle tracker.
- No in-app edit route; VS Code links open specific Markdown files.
