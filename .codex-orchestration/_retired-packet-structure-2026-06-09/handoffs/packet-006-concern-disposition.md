# Packet 006 Concern Disposition

Status: resolved

## Returned Thread Reviewed

- Thread ID: `019ea695-ac00-7582-8c55-2e2161d767b0`
- Handoff: `.codex-orchestration/handoffs/packet-006-investigation-return.md`
- Scope: read-only investigation of Codex project/context sources.

## Concerns Cleared Instantly

- Status: resolved
- Concern: Prior V1 work was implemented before durable packet docs existed.
- Disposition: Cleared. Packet docs, packet map, and orchestration docs now
  exist. Future feature work must update packet docs before split-off.
- Needs human: no

- Status: resolved
- Concern: The orchestrator model was not explicit enough.
- Disposition: Cleared. The docs and local orchestration skills now state that
  this visible orchestrator chat is the control plane, and feature work should
  run in visible spawned threads unless hidden delegation is explicitly chosen.
- Needs human: no

- Status: deferred
- Concern: `/Users/olafbobryk/.codex/state_5.sqlite` can derive thread activity
  and workspace recency.
- Disposition: Cleared for V1 by deferring/rejecting it as a selector source.
  It contains broader thread/runtime metadata than the sidecar needs.
- Needs human: no for V1; yes only if a later diagnostic/thread-activity view
  is proposed.

## Accepted Decision

- Status: resolved
- Decision: Read `/Users/olafbobryk/.codex/.codex-global-state.json` as a
  narrow, read-only "Codex projects" source.
- Accepted fields: `electron-saved-workspace-roots`,
  `active-workspace-roots`, and `project-order`.
- Explicitly not accepted yet: sidecar-owned explicit registry file.

## Concerns That Need Thought Later

- Status: resolved
- Concern: `/Users/olafbobryk/.codex/.codex-global-state.json` has useful
  project-list fields, but it is private Codex app state with no documented
  compatibility contract.
- Why it matters: Reading it by default would align the sidecar with Codex's
  project UI, but it couples the sidecar to internal state names and file shape.
- Affected packet/docs: Packet 006, possible Packet 007,
  `.codex-orchestration/architecture.md`, `docs/architecture.md`.
- Recommended default: Accepted. Use it only as a read-only, narrow-field,
  best-effort Codex projects source. Read only
  `electron-saved-workspace-roots`, `active-workspace-roots`, and
  `project-order`.
- Needs human: no

- Status: deferred
- Concern: An explicit sidecar-owned registry file is safer than reading Codex
  private state, but less automatic.
- Why it matters: It gives the sidecar a stable, auditable contract while not
  closely matching Codex's existing project UI unless manually imported.
- Affected packet/docs: possible Packet 007.
- Recommended default: Do not define a registry first. Revisit only if the
  read-only Codex project source proves too unstable or if the product needs
  project grouping/labels that Codex state cannot provide.
- Needs human: no for now

## Recommended Decision To Make Next

Packet 007 direction is accepted: read-only Codex projects source from
`.codex-global-state.json`, narrow fields only, best-effort fallback behavior.

Next strategy question: what orchestration state belongs in the sidecar beyond
project selection, especially packet/chunk/thread graph visualization.
