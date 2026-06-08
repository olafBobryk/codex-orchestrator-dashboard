# Packet Map

Status: active

## Packet Order

| Packet | Name | Status | Chunking | Notes |
|---|---|---|---|---|
| 001 | Scaffold and read summaries | verified | no | Implemented in the orchestrator chat before durable packet docs existed. |
| 002 | Markdown editing direction | superseded | no | In-app editing was replaced by VS Code file editing. |
| 003 | Summary refinement | verified | no | Implemented in the orchestrator chat before durable packet docs existed. |
| 004 | Architecture consolidation | complete | no | Durable docs created after implementation. |
| 005 | Recent workspace selector | verified | no | Implemented by spawned worker and verified by orchestrator. |
| 006 | Investigate Codex project list integration | verified | no | Investigation returned; accepted narrow read-only `.codex-global-state.json` direction. |
| 007 | Read-only Codex local projects source | verified | no | Consolidated existing implementation; no sidecar registry yet. |
| 008 | Orchestration graph view | active | yes | P8-C1 queued as pending visible worktree thread `local:57cd1a26-d913-4457-a69f-993195f4bcdd`. |

## Human Gates

- Storage policy for recent workspaces must remain local-only.
- Do not add external sync, accounts, telemetry, or project execution.
- Do not add prompt generation as part of this packet.
- Read `/Users/olafbobryk/.codex/.codex-global-state.json` only as a narrow,
  read-only Codex local projects source. Accepted fields are
  `electron-saved-workspace-roots`, `active-workspace-roots`, and
  `project-order`.
- Do not mutate Codex app state.
- Do not add a sidecar-owned explicit registry file yet.
- Do not read broader Codex runtime state for project selection without a new
  accepted packet.

## Concern Bubble-Up Path

Record packet concerns in `.codex-orchestration/handoffs/` under a
`## Concerns To Bubble Up` section.

Returned packet work must be reviewed through the orchestrator before
acceptance. Read the returned handoff and concerns first, then decide whether to
accept, defer, reject, or open a new packet/chunk gate.

## Orchestration Model

- One visible orchestrator chat is the project control plane.
- The orchestrator primarily serves packets and owns packet order, gates,
  concern disposition, spawned-chat coordination, and returned-work review.
- Packet chats work inside accepted packet scope and do not rewrite strategy on
  their own.
- Chunk ledgers are packet-scoped execution records only when a packet needs
  durable chunk state.
