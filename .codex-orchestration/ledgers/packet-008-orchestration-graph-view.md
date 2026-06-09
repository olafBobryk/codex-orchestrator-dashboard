# Packet 008 Orchestration Graph View Ledger

Status: active

## Purpose

- Goal: create the first useful full-canvas orchestration graph for the local
  sidecar.
- Product spine: the orchestrator can understand where work is in the
  packet/chunk plan, where agents split off, where work returned, what is live,
  what is blocked, and what is still off the orchestrator source-of-truth
  checkout without reading every Markdown file manually.
- Source of truth: normalized `.codex-orchestration/` Markdown docs.
- Boundary: read-only visualization; no work execution, prompt generation,
  automatic merge, worktree actions, Codex state mutation, or in-app Markdown
  editing.

## Status Legend

- `queued`: not started
- `in_progress`: actively being worked
- `blocked`: cannot proceed without external fix or missing dependency
- `needs_human`: decision gate reached
- `fixed`: implementation or review pass complete, not yet verified
- `verified`: checks passed for the chunk
- `signed_off`: human accepted the chunk

## Operating Rules

- Use packet-scoped chunk IDs.
- Work runs in visible Codex threads.
- Prefer isolated worktree threads for mutating implementation.
- Keep Markdown docs as source of truth.
- Runtime Codex state and Git/worktree state are annotations only.
- Do not parse old project-specific doc structures directly; older projects
  should be migrated into `.codex-orchestration/` separately.
- Stop before transcript parsing, prompt extraction, hidden tool-log parsing,
  secret/env display, or Codex state mutation.

## Rolling Chunk Window

| Order | Chunk | Status | Owner/Audience | Product Spine Fit | Scope | Acceptance Criteria | Verification | Gates / Stop Conditions |
|---|---|---|---|---|---|---|---|---|
| Current | P8-C1: Graph Data Contract And Status Taxonomy | needs_human | Returned visible worktree thread `019ea98c-329d-7f70-9b18-7e64cc4128ec` on branch `codex/p8-c1-graph-contract` | Defines the graph model needed before renderer work can proceed. | Node kinds, edge types, status taxonomy, source layers, missing-state behavior, Markdown extraction rules, runtime annotation boundary, and Git/worktree annotation boundary. | Contract represents current packet/chunk/handoff docs, keeps status taxonomy small, avoids old-layout parsing, avoids transcript inference, and prepares P8-C2. | Returned branch claims lint/build/browser checks, but branch scope exceeded P8-C1 and needs Packet 008A review before acceptance. | Stop before accepting, merging, cherry-picking, or continuing graph implementation until Packet 008A returns. |
| Next | P8-C2: Full-Canvas Graph Renderer | queued | UI implementer | Turns the contract into the main orchestration summary surface. | Full-canvas `react-force-graph-2d`, chunks as primary nodes, packets as color/group context, rolling legend, sequence/split/return/detour/verification edges. | Graph renders this repo's normalized docs, handles missing docs, retains chronology/lanes after physics settles, and shows visible packet legend only. | `npm run lint`; `npm run build`; browser preview verification. | Stop before overlay details, runtime/Git annotations, execution controls, or broad page IA changes. |
| Next | P8-C3: Overlay Detail Panel And Markdown Sections | queued | UI/data implementer | Lets users inspect selected graph items without remaking Markdown editing. | Read-only overlay panel for chunk rows, handoff summaries, concern sections, thread metadata, recorded docs, and VS Code file actions. | Overlay opens/dismisses cleanly, shows incomplete data honestly, and never edits Markdown. | `npm run lint`; `npm run build`; browser preview verification. | Stop before `/editor`, save API, rich editor, or permanent extra side rail. |
| Next | P8-C4: Runtime And Git/Worktree Annotations | queued | Runtime/Git annotation implementer | Shows live/completed agents and source-of-truth boundaries as annotations. | Codex thread status within accepted boundary, live/completed/archived/unknown labels, Git commit/worktree evidence, muted off-source branches. | Runtime/Git data is labeled as annotation/evidence; Markdown remains truth; no Codex mutation or transcript parsing. | `npm run lint`; `npm run build`; browser preview verification. | Stop before private runtime reads beyond accepted boundary, transcript parsing, env/secret exposure, or required Git dependency. |

## Later Chunk

| Chunk | Status | Notes |
|---|---|---|
| P8-C5: Handoff/Concern Standard And Edge Polish | queued | Parse preferred `## Handoff Summary`, `## Graph Edges`, and `## Concerns To Bubble Up`; summarize current handoffs; polish edge semantics. |

## Decisions

| Date | Chunk | Decision | Rationale | Status |
|---|---|---|---|---|
| 2026-06-09 | P8-C1 | Activate Packet 008 as a chunked packet starting with P8-C1. | The architecture plan is sufficiently bounded for the first data-contract chunk. | accepted |
| 2026-06-09 | P8-C1 | Use visible worktree-backed Codex thread for mutating packet work. | Keeps implementation isolated while preserving visible orchestration. | accepted |
| 2026-06-09 | P8-C1 | Queue worktree-backed thread `local:57cd1a26-d913-4457-a69f-993195f4bcdd`. | Starts P8-C1 in visible delegated work while preserving orchestrator control. | accepted |
| 2026-06-09 | P8-C1 | Pause Packet 008 behind Packet 008A. | Returned branch completed P8-C1 through P8-C5 plus unaccepted polish passes, so the orchestrator needs a value reset before accepting work. | needs_human |
| 2026-06-09 | P8-C1 / 008A | Accept Packet 008A recommendation and open Packet 008B. | The returned graph contract should not become the foundation; next work resets the contract and verifies a stable canvas shell from main. | accepted |

## Verification Log

| Date | Chunk | Command/Check | Result | Evidence |
|---|---|---|---|---|
| 2026-06-09 | P8-C0 | Git baseline created. | passed | Commit `2c64489` (`Initial sidecar baseline`). |

## Handoff Point

P8-C1 should produce a return handoff at:

`.codex-orchestration/handoffs/packet-008-c1-graph-data-contract-return.md`

Pending worktree thread:

- `local:57cd1a26-d913-4457-a69f-993195f4bcdd`
