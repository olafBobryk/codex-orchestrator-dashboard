# Architecture Rolling Notes

Status: active notes

Last updated: 2026-06-09

## Rule

Do not solidify proposed architecture here unless explicitly requested.

For now, this file records decisions that are already implemented in the
project, plus architecture decisions explicitly approved in chat. Recording
something here is not approval for implementation work unless a packet is later
accepted.

## Currently Implemented Decisions

| ID | Implemented decision | Evidence | Notes |
|---|---|---|---|
| I-001 | The app is a local Next.js sidecar. | `package.json`; `src/app/page.tsx` | Runtime exists. |
| I-002 | The sidecar reads project-local `.codex-orchestration/` Markdown docs. | `src/lib/orchestration.ts` | Plain Markdown reader exists. |
| I-003 | The sidecar renders summary-style dashboard views from docs. | `src/app/page.tsx`; `src/lib/orchestration.ts` | Current UI summarizes docs and metrics. |
| I-004 | Markdown editing is not implemented as an in-app editor route. | no `/editor` route; `src/app/page.tsx` | Current behavior uses file links instead of an editor surface. |
| I-005 | The sidecar reads Codex's local project list from `/Users/olafbobryk/.codex/.codex-global-state.json` as a narrow source. | `src/lib/codex-projects.ts`; `.codex-orchestration/packets/packet-007-read-only-codex-projects-source.md` | Packet 007 records the accepted field boundary. |
| I-006 | The app includes a recent workspace selector. | `src/components/recent-workspace-selector.tsx`; `.codex-orchestration/packets/packet-005-recent-workspace-selector.md` | Packet 005 is verified. |
| I-007 | The repo has normalized orchestration docs under `.codex-orchestration/`. | `.codex-orchestration/packets/`; `.codex-orchestration/ledgers/`; `.codex-orchestration/handoffs/` | Current project-local organization exists. |
| I-008 | This project records packet order in a packet map. | `.codex-orchestration/packets/packet-map.md` | Packet map exists and is active. |
| I-009 | Returned or delegated work is recorded through handoff docs. | `.codex-orchestration/handoffs/` | Current handoff directory exists. |
| I-010 | The project instructions say feature packet work should prefer visible Codex threads when spawned. | `AGENTS.md` | This is an implemented project instruction, not a request to spawn work now. |
| I-011 | Packet 008 is only planned, not active. | `.codex-orchestration/packets/packet-map.md`; `.codex-orchestration/packets/packet-008-orchestration-graph-view.md` | No graph packet should be spawned from this note. |

## Chat-Approved Architecture Decisions

| ID | Date | Decision | Rationale | Implementation Status |
|---|---|---|---|---|
| D-001 | 2026-06-08 | Codex thread/runtime state is relevant to the future graph view. | The graph should show where chats/agents are along the orchestration structure. | Partly implemented through `src/lib/codex-threads.ts`; graph integration not accepted yet. |
| D-002 | 2026-06-08 | Markdown file links are inside the sidecar boundary. | VS Code already provides Markdown viewing and editing, so the sidecar should not remake that workflow for now. | Implemented as file links in the current UI. |
| D-003 | 2026-06-08 | Older project doc structures should be migrated into `.codex-orchestration/` by a migration skill instead of read directly by the dashboard. | This keeps the sidecar source model clean while still letting mature projects such as `averlo-brand-dashboard` be brought forward when useful. | Not implemented; migration skill not started. |
| D-004 | 2026-06-08 | The future graph should preserve completed agents as well as show live/running agents. | Once an agent is done, it should not disappear from the orchestration view. | Not implemented. |
| D-005 | 2026-06-08 | The minimum useful graph slice is a packet/chunk graph showing where splits happened and where work returned. | This captures the core orchestration path before broader lifecycle surfaces. | Packet 008 remains planned; no implementation accepted. |
| D-006 | 2026-06-08 | Worktree/detour work should appear in the graph but be visually muted when it is not on the orchestrator source-of-truth checkout. | The graph should show detours without implying they are accepted mainline state. | Not implemented. |
| D-007 | 2026-06-08 | Option A is accepted: normalized `.codex-orchestration/` is the dashboard source model, with migration used for older structures. | Runtime tolerant parsing of old project-specific doc layouts should not be the dashboard's main complexity. | Not implemented beyond current normalized docs. |
| D-008 | 2026-06-08 | Chunk commits are a convention, not a hard rule. | Git can support the graph as evidence, but Markdown remains the orchestration source of truth. | Not implemented as a workflow rule. |
| D-009 | 2026-06-08 | Runtime Codex thread state may annotate the graph within a narrow boundary. | Live/running-agent visibility is useful, but runtime state should not become durable truth. | Partly implemented through `src/lib/codex-threads.ts`; boundary not enforced as a graph contract. |
| D-010 | 2026-06-08 | Future handoffs should use a practical standard for handoff summary, optional graph edges, and concern sections. | The graph and detail viewer need predictable Markdown sections without switching to JSON or frontmatter. | Not implemented as a skill or template rule yet. |
| D-011 | 2026-06-08 | Graph node details should open the relevant orchestration document slice. | The sidecar should inspect orchestration context without remaking Markdown editing. | Not implemented. |
| D-012 | 2026-06-08 | Markdown docs define graph nodes and edges; Codex runtime, Git, and VS Code provide annotations/actions. | Keeps durable truth in Markdown while still using runtime state, Git evidence, and existing editing tools. | Not implemented as a graph contract. |
| D-013 | 2026-06-08 | Keep the left project rail as compact navigation, not a new orchestration rail. | Additional vertical rails would compete with the existing folder/workspace sidebar and make the app feel cluttered. | Partly implemented; status tags and agent counts are not implemented. |
| D-014 | 2026-06-09 | Chunks are the primary graph nodes; packets are color/group/legend context. | Chunks are subdivisions of packets, so packet identity should organize nodes rather than compete with chunks as peer nodes. | Not implemented. |
| D-015 | 2026-06-09 | Packet 008 graph implementation should use `react-force-graph-2d`. | The local Webvizion/Averlo graph reference already uses this family of tools and supports interactive draggable graph behavior. | Not implemented. |
| D-016 | 2026-06-09 | The graph should be a full-canvas graph. | The canvas becomes the primary orchestration summary surface instead of another table/card area. | Not implemented. |
| D-017 | 2026-06-09 | Node details should use an overlay panel. | A conditional overlay avoids adding another permanent rail while still allowing focused inspection. | Not implemented. |
| D-018 | 2026-06-09 | `agent-orchestration-strategy` should be updated after architecture plan consolidation. | The reusable skill should reflect the accepted graph/handoff conventions, but only after this project architecture is organized. | Not implemented; global skill not edited yet. |

## Commit Convention Detail

- For implementation chunks, prefer one reviewable commit per verified chunk
  when the repo/worktree model supports it.
- For docs-only discussion, do not require commits.
- For exploratory agents, require a handoff first; commit only after returned
  work is accepted.
- For multi-agent work, a chunk commit should correspond to a closed, verified
  chunk, not every partial attempt.
- The graph may use commits as evidence, but should not require commits to
  render.

This avoids turning Git into the orchestration source of truth. Git supports the
graph; Markdown still owns the graph.

## Runtime State Boundary

Allowed as graph annotations:

- thread ID
- title
- status such as running, completed, or archived when available
- workspace path
- created and updated timestamps
- relation to current project/workspace
- short preview text if already exposed by thread listing

Not allowed without a new gate:

- transcript parsing as source of truth
- prompt extraction
- hidden messages or tool logs as graph data
- secrets or env details
- inferring decisions from chat content instead of docs
- mutating Codex state

## Handoff And Concern Standard

Future handoffs should prefer this Markdown shape when relevant:

```markdown
## Handoff Summary

- Packet:
- Chunk:
- Source thread:
- Worktree:
- Status:
- Returned to:
- Review link:

## Graph Edges

- from:
- to:
- type: spawned | returned | detour | repass | blocked | verified

## Concerns To Bubble Up

- Status: open | resolved | deferred
- Concern:
- Why it matters:
- Affected packet/docs:
- Recommended default:
- Needs human: yes | no
```

Extraction rule:

- First-class extraction comes from standardized sections when present.
- Existing handoffs may still be summarized from known headings.
- Missing graph metadata should be shown as incomplete, not inferred.
- Migration skill work may add standardized sections to older docs later.

## Node Detail Behavior

- Chunk node opens ledger row/details.
- Handoff node opens handoff summary.
- Concern node opens the concern section.
- Thread node opens metadata and links to recorded handoff/docs.
- File action opens VS Code.

## Graph Source Layers

- Markdown docs define nodes and edges.
- Codex runtime annotates thread status.
- Git annotates commit/worktree state.
- VS Code handles editing.

## Frontend UX Recommendations

These are recorded recommendations, not implementation approval.

### Reference

- Use the interactive graph strategy from
  `/Users/olafbobryk/Documents/Code/Mazi/2026/averlo-dashboard/src/components/ui/misc/GraphMap.tsx`
  as a reference point.
- The reference uses `react-force-graph-2d` / `react-force-graph-3d` with D3
  forces and guided X/Y positioning in 2D focus mode.
- The sidecar graph should match the current shadcn look and should not import
  unrelated Averlo/Webvizion visual language wholesale.

### Left Project Rail

- Keep the current left project/workspace rail as compact navigation.
- Do not add a second orchestration rail next to it.
- It may show compact per-project status tags such as waiting, working, or
  number of active agents.

### Center Canvas

- Make the graph/canvas the main summary surface.
- Move current lower-value summary cards/tables further down or to a secondary
  docs/status surface after the canvas becomes useful.
- Prefer chunks as the primary graph nodes.
- Represent packets as grouping/color context, not equal peer nodes beside
  chunks.
- Use a rolling packet legend containing only packet colors currently visible.
- Represent handoffs primarily as edges or events.
- Allow checkpoint events to become nodes when they carry their own review or
  evidence payload.
- Treat detours as branch types. Mute only branches that are off-plan or not on
  the orchestrator source-of-truth checkout.
- Show returned/accepted branches reconnecting to the main orchestration path.

### Physics-Assisted Layout

- Do not use pure free-force layout; it loses chronology.
- Use a physics-assisted layout with strong guide forces.
- Use chronology/order as a vertical force.
- Use lanes as a horizontal force, for example main path, spawned worktree,
  detour, returned branch.
- Use collision forces to preserve readable node spacing.
- Use relationship type to influence link distance.
- Allow drag interaction, but let nodes settle back toward chronological/lane
  guides.
- Use focus/pin behavior for selected nodes when useful.

### Right Conditional Panel

- Do not make the right panel a permanent rail by default.
- Default state can show compact current workspace/orchestration status.
- When a node is selected, show the most relevant conditional panel.
- Keep it read-only for orchestration inspection.
- Keep VS Code as the editing action.

### Visual Hierarchy

- Use shadcn-compatible tokens, spacing, borders, badges, and quiet status
  colors.
- Active/running agents should have clear live accents.
- Completed/verified work should be quieter.
- Blocked or human-gate states need stronger contrast.
- Off-source-of-truth branches should be visually muted without disappearing.

## Skill Adaptation Notes

The reusable `agent-orchestration-strategy` skill should eventually be adapted
to support the graph standard.

Needed changes:

- Extend the spawned chat contract to ask agents to record `Handoff Summary`
  fields when returning work.
- Extend the concern bubble-up guidance to keep using `## Concerns To Bubble Up`
  with the existing fields.
- Add optional `## Graph Edges` guidance for spawned, returned, detour, repass,
  blocked, and verified relationships.
- Make clear that graph metadata remains plain Markdown, not JSON/frontmatter.
- Make clear that graph metadata supports visualization only; it does not make
  runtime state or Git history the orchestration source of truth.
- Preserve the existing rule that project-specific paths and packet names
  belong in repo docs, not the global skill.

## Discussion Queue

| ID | Topic | Issue Surfaced | Current Lean | Needs Approval Before |
|---|---|---|---|---|
| Q-001 | In-orchestrator Markdown viewer layer | VS Code links are intended for editing, but there may be value in a lightweight dashboard viewing layer for orchestration docs. | Consider a read-only viewer layer, not an editor. | Any route/component work. |
| Q-002 | Vertical git-style graph structure | A vertical git graph could fit packets, chunks, splits, returns, detours, and muted worktree branches. | Use physics-assisted layout with chronology/lane guide forces. | Graph data contract or renderer work. |
| Q-003 | Concern and handoff pickup implementation | The standard is accepted, but parser and template implementation details are not. | Implement after Packet 008 or a skill-update packet is accepted. | Graph data contract, parser work, or global skill edits. |
| Q-004 | Node detail viewer UI | Node detail behavior is accepted; overlay panel is now the accepted UI direction. | Read-only overlay panel. | Any viewer route/component work. |
| Q-005 | Averlo migration example | `averlo-brand-dashboard` is a useful old-structure example for the migration skill. | Use as an example when migration-skill work is explicitly started. | Creating or spawning migration-skill work. |
| Q-006 | Frontend UX/UI design | The graph view needs a concrete interaction model, density, layout, and visual hierarchy before implementation. | Discuss before Packet 008 activation. | Any graph renderer/design implementation. |
| Q-007 | Graph status taxonomy | Node and edge statuses need a concrete taxonomy. | Define before Packet 008 implementation. | Graph data contract or renderer work. |
| Q-008 | Migration skill timing | Older projects will be migrated by a skill, but the timing and ownership of that skill are separate from Packet 008. | Decide after graph architecture consolidation unless migration becomes blocking. | Creating or spawning migration-skill work. |
| Q-009 | Existing summary UI placement | Current summary cards/tables may become secondary once the canvas is the main summary surface. | Move below canvas or to a docs/status surface later. | Any page IA implementation. |
