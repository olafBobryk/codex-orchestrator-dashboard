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
| 008 | Orchestration graph view | needs_human | yes | Original graph direction paused; prototype branch is directionally correct but has procedural/orchestration scope drift. Await explicit Packet 008D activation before implementation continues. |
| 008A | Graph value reset | superseded | no | Diagnosed prototype scope drift but overcorrected toward reset. Keep as historical context, not current direction. |
| 008B | Graph contract reset and stable canvas shell | rejected | no | Returned branch `codex/packet-008b-graph-shell` regressed the graph vision; do not merge or use as baseline. |
| 008C | Graph vision realignment | fixed | no | Returned handoff recommends reframing the next graph move as prototype polish/acceptance, not reset. |

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
- Do not treat the `codex/p8-c1-graph-contract` prototype branch as accepted.
  It is unaccepted reference work: directionally useful, but scope-drifty.
- Do not treat `codex/packet-008b-graph-shell` as accepted. It is rejected as a
  reset-regression branch and must not be merged or used as baseline.
- Treat `codex/p8-c1-graph-contract` as the directionally correct graph
  reference while still rejecting its unaccepted procedural/status-history
  drift.
- Frame the next graph implementation as prototype polish and acceptance, not
  another reset or reduced placeholder.

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
