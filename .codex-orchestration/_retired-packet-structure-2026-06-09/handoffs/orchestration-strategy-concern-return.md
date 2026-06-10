# Orchestration Strategy Concern Return

Status: resolved

## Returned Scope

- Source: orchestrator user concern in the current control-plane chat.
- Trigger skills: `agent-orchestration-strategy`, `agent-return`.
- Scope: clarify the intended orchestration model for this repo and make the
  concern visible to future return/consolidation work.

## Concerns To Bubble Up

- Status: resolved
- Concern: The current project instance did not clearly reflect the intended
  `agent-orchestration-strategy` use: one visible orchestrator chat should serve
  as the project control plane, primarily serving bounded packets, while chunk
  ledgers should be packet-scoped execution records only when a packet needs
  durable chunk state.
- Why it matters: If packet chats or chunk ledgers are treated as independent
  strategy authorities, returned work can drift from the accepted packet order,
  duplicate orchestration state, or hide concerns that should be decided by the
  orchestrator before consolidation.
- Affected packet/docs: `AGENTS.md`, `docs/architecture.md`,
  `docs/implementation-plan.md`, `.codex-orchestration/architecture.md`,
  `.codex-orchestration/packets/packet-map.md`, future returned packet
  handoffs.
- Recommended default: Use one visible orchestrator chat as the control plane.
  Packet chats execute or investigate inside accepted packet scope. Use chunk
  ledgers only as packet-scoped execution ledgers when a packet needs durable
  chunk state. Route returned work through `agent-return` by reading handoffs and
  concerns before accepting or consolidating.
- Needs human: no

## Agent Return Note

Future `agent-return` consolidation should check returned handoffs for this
model before accepting work:

- Returned work must identify its packet or packet-scoped chunk.
- Returned work should not introduce a new global strategy doc or use a chunk
  ledger as the project strategy.
- Concerns that affect packet order, product spine, architecture, or gates must
  return to the orchestrator before merge/consolidation.
- If a returned agent implemented outside accepted packet scope, defer or reject
  that work until the orchestrator records an explicit packet decision.

## Docs Updated

- `AGENTS.md`
- `docs/architecture.md`
- `docs/implementation-plan.md`
- `.codex-orchestration/architecture.md`
- `.codex-orchestration/packets/packet-map.md`
