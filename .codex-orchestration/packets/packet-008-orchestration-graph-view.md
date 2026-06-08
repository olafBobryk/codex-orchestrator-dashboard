# Packet 008: Orchestration Graph View

Status: active

## Goal

Create the first useful full-canvas orchestration graph for the local sidecar.
The graph should show chunks as primary nodes, packets as color/group context,
splits, returns, live/completed chats, worktree/detour branches, concerns,
handoffs, and verification state without turning the sidecar into an executor.

## Product Spine

The orchestrator can understand where work is in the packet/chunk plan, where
agents split off, where work returned, what is live, what is blocked, and what
is still off the orchestrator source-of-truth checkout without reading every
Markdown file manually.

## Context

Accepted rolling architecture decisions live in:

- `.codex-orchestration/architecture-rolling-notes.md`

Relevant implementation facts:

- The app is a local Next.js 16 App Router project.
- Available checks are `npm run lint` and `npm run build`.
- The current Markdown reader is `src/lib/orchestration.ts`.
- Codex project source is `src/lib/codex-projects.ts`.
- Current Codex thread reader is `src/lib/codex-threads.ts`.
- Existing UI is in `src/app/page.tsx`.
- Reference graph implementation:
  `/Users/olafbobryk/Documents/Code/Mazi/2026/averlo-dashboard/src/components/ui/misc/GraphMap.tsx`.

Active ledger:

- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`

P8-C1 spawn handoff:

- `.codex-orchestration/handoffs/packet-008-c1-graph-data-contract-spawn.md`

## Outcome

- Full-canvas `react-force-graph-2d` orchestration graph.
- Chunks are primary nodes.
- Packets are color/group/legend context.
- Handoffs are edges/events unless they carry enough evidence to be selected as
  detail-bearing items.
- Details open in a read-only overlay panel.
- VS Code remains the Markdown editing action.
- Runtime Codex state and Git/worktree state annotate the graph but do not
  become source of truth.

## Constraints

- No prompt generation.
- No execution controls.
- No automatic merge, checkout, worktree, or commit actions.
- No `/editor` route or in-app Markdown editor.
- No direct tolerant runtime parsing of older project-specific doc structures;
  older projects should be migrated into `.codex-orchestration/` separately.
- No transcript parsing, prompt extraction, hidden tool-log parsing, secret/env
  display, or decision inference from chat content.
- No private Codex state mutation.
- No Packet 008 implementation starts from this orchestrator chat unless the
  user explicitly asks to spawn or implement.

## Plan

Use `react-force-graph-2d` and a physics-assisted layout:

- chronology/order as a vertical guide force;
- lanes as a horizontal guide force, such as main path, spawned worktree,
  detour, and returned branch;
- collision forces for readable spacing;
- relationship type to tune link distance;
- drag allowed, with nodes settling back toward chronological/lane guides.

Use shadcn-compatible visual treatment:

- quiet dense control-surface UI;
- subtle packet colors;
- rolling legend for visible packets only;
- clear live accents for running agents;
- quieter completed/verified work;
- stronger contrast for blocked/human-gate states;
- muted off-source-of-truth branches.

## Expected Chunks

### P8-C1: Graph Data Contract And Status Taxonomy

Define the normalized graph model from `.codex-orchestration/`.

Scope:

- Node kinds, edge types, status taxonomy, source layers, and missing-state
  behavior.
- Markdown extraction rules for packets, packet-scoped ledgers, handoffs,
  concerns, graph edges, thread IDs, and verification evidence.
- Runtime annotation boundary for Codex thread status.
- Git/worktree annotation boundary.

Acceptance:

- Contract does not require old-layout parsing.
- Contract does not infer decisions from transcripts.
- Contract can represent this repo's current packet/chunk/handoff docs.
- Status taxonomy is small enough to be understandable.

### P8-C2: Full-Canvas Graph Renderer

Implement the first `react-force-graph-2d` graph surface.

Scope:

- Full-canvas graph as the primary summary surface.
- Chunks as primary nodes.
- Packets as color/group context and rolling legend.
- Basic sequence, split, return, detour, and verification edges.
- Existing summary cards/tables remain available below the canvas or in a
  secondary section until a later IA decision moves them.

Acceptance:

- Graph renders without crashing for missing or partial docs.
- Graph remains readable on desktop.
- Layout retains chronology and lanes after physics settles.
- Packet legend only shows visible packet groups.

### P8-C3: Overlay Detail Panel And Markdown Sections

Add read-only inspection for selected graph items.

Scope:

- Overlay panel, not permanent right rail.
- Chunk node opens ledger row/details.
- Handoff node opens handoff summary.
- Concern node opens concern section.
- Thread node opens metadata and links to recorded handoff/docs.
- File action opens VS Code.

Acceptance:

- No Markdown editing or save API.
- Overlay can be opened and dismissed without losing graph context.
- Missing section data is shown as incomplete, not inferred.

### P8-C4: Runtime And Git/Worktree Annotations

Add non-authoritative annotations from runtime and Git/worktree state.

Scope:

- Codex thread status annotations within the accepted boundary.
- Live/completed/archived/unknown runtime labels when available.
- Git commit/worktree evidence where available.
- Muted off-plan or off-source-of-truth branches.

Acceptance:

- Markdown remains source of truth.
- Runtime/Git data is clearly displayed as annotation/evidence.
- No Codex state mutation.
- No transcript or secret parsing.

### P8-C5: Handoff/Concern Standard And Edge Polish

Make the graph useful for returned work and concern review.

Scope:

- Parse preferred `## Handoff Summary`, `## Graph Edges`, and
  `## Concerns To Bubble Up` sections when present.
- Summarize current handoffs from known headings where possible.
- Show handoff, concern, blocked, verified, detour, and repass relationships.
- Polish edge color/weight semantics.

Acceptance:

- Standardized sections become first-class graph input.
- Current handoffs still appear usefully.
- Concern and human-gate state remains summary/read-only, not management UI.

## Verification Strategy

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- Verify graph renders for this repo's `.codex-orchestration/` docs.
- Verify partial/missing docs do not crash graph construction.
- Verify overlay panel opens selected chunk, handoff, concern, thread, and file
  actions as available.
- Verify runtime/Git annotations are labeled as annotations, not durable truth.

Product-readiness:

- The graph answers: what chunk is this, which packet color/group does it
  belong to, where did work split, where did work return, what is live, what is
  blocked, and what remains off-source-of-truth.
- The user can open the relevant Markdown in VS Code from graph/detail context.
- No execution or prompt-generation controls are present.

## Chunk Planner Decision

Use `$chunked-delivery-planner` because this packet crosses data modeling,
Markdown extraction, graph layout, UI interaction, runtime annotation, Git
annotation, and verification boundaries. Progress should survive fresh visible
Codex threads through a packet-scoped ledger.

Do not implement this as one large pass.

## Direction Warning Triggers

- The graph treats packets and chunks as equal peer nodes instead of chunks as
  primary nodes with packet grouping.
- The graph starts parsing old Averlo-style docs directly instead of normalized
  `.codex-orchestration/` docs.
- Runtime state becomes source of truth.
- Git history becomes required for graph rendering.
- The UI adds a second permanent left orchestration rail.
- The overlay panel becomes an editor.
- The graph adds execution controls, prompt generation, automatic merge,
  automatic worktree actions, or Codex state mutation.
- The implementation needs private Codex transcript/tool-log parsing.

## Handoff Notes

When this packet is activated, spawn visible Codex threads for chunks. The first
spawned chunk should read:

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `.codex-orchestration/architecture-rolling-notes.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `src/lib/orchestration.ts`
- `src/lib/codex-threads.ts`
- `src/app/page.tsx`

Expected future packet, after architecture plan consolidation:

- update `/Users/olafbobryk/.codex/skills/agent-orchestration-strategy/SKILL.md`
  with the accepted handoff summary, graph edge, concern pickup, and graph
  source-of-truth guidance.

Separate later packet:

- migration skill for older projects such as `averlo-brand-dashboard`.
