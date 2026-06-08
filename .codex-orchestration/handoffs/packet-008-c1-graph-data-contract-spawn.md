# Packet 008 C1 Spawn Handoff

Status: ready_to_spawn

## Target

Visible Codex thread with isolated worktree.

## Workspace

Main checkout:

`/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`

## Required Skills

- `agent-orchestration-strategy`
- `chunked-delivery-planner`
- `agent-worktree-workflow`

## Read First

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `.codex-orchestration/architecture-rolling-notes.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`
- `src/lib/orchestration.ts`
- `src/lib/codex-threads.ts`
- `src/app/page.tsx`
- `/Users/olafbobryk/Documents/Code/Mazi/2026/averlo-dashboard/src/components/ui/misc/GraphMap.tsx`

## Packet / Chunk

- Packet: 008 Orchestration Graph View
- Chunk: P8-C1 Graph Data Contract And Status Taxonomy
- Status at spawn: queued

## Product Spine

The orchestrator can understand where work is in the packet/chunk plan, where
agents split off, where work returned, what is live, what is blocked, and what
is still off the orchestrator source-of-truth checkout without reading every
Markdown file manually.

## Exact Task

Define and implement the first graph data contract for normalized
`.codex-orchestration/` docs.

Include node kinds, edge types, status taxonomy, source layers, missing-state
behavior, Markdown extraction rules, runtime annotation boundary, and
Git/worktree annotation boundary. Add code only if it is needed to make the
contract useful for P8-C2.

## In Scope

- Inspect existing normalized orchestration docs.
- Inspect current Markdown and Codex thread readers.
- Define graph model for chunks as primary nodes and packets as
  color/group/legend context.
- Define or implement small parser/contract helpers for normalized docs.
- Keep runtime Codex and Git/worktree data as annotations only.
- Update the packet ledger with P8-C1 evidence.
- Write return handoff at
  `.codex-orchestration/handoffs/packet-008-c1-graph-data-contract-return.md`.

## Out Of Scope

- No full graph renderer.
- No overlay panel implementation.
- No prompt generation.
- No execution controls.
- No automatic merge, checkout, worktree, or commit actions.
- No `/editor` route or in-app Markdown editor.
- No direct old-layout parsing for Averlo-style docs.
- No transcript parsing, prompt extraction, hidden tool-log parsing, secret/env
  display, or decision inference from chat content.
- No Codex state mutation.

## Hard Stops

- Stop if the contract requires private Codex state beyond the accepted runtime
  annotation boundary.
- Stop if the contract requires JSON/frontmatter instead of plain Markdown.
- Stop if packet/chunk semantics need an architecture decision not already in
  rolling notes.
- Stop before renderer work unless the contract is complete and the addition is
  tiny, low-risk, and directly supports P8-C2.

## Verification

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- If code is added, verify the graph contract can represent current Packet 008
  docs, current ledgers, and handoffs without crashing on missing sections.
- If docs only, perform docs review and record why no code checks were needed.

Product-readiness:

- P8-C2 can start without re-deciding graph source layers, node/edge model, or
  status taxonomy.

## Env Source Declaration

No env or secret source should be needed.

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations: local lint/build and read-only local preview if needed
- Stop rules: stop before external-state operations, migrations, email, paid
  APIs, customer data, or any env-backed smoke.

## Concerns To Bubble Up

Use this exact shape in the return handoff:

- Status: open | resolved | deferred
- Concern:
- Why it matters:
- Affected packet/docs:
- Recommended default:
- Needs human: yes | no
