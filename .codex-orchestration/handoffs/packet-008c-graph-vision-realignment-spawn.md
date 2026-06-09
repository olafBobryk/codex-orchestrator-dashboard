# Packet 008C Graph Vision Realignment Spawn Handoff

Status: ready_to_spawn

## Spawned Agent Target

Visible Codex project thread, local checkout, no worktree.

Workspace:

- `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`

## Packet

- Packet: `008C Graph Vision Realignment`
- Status: active
- Source packet doc:
  `.codex-orchestration/packets/packet-008c-graph-vision-realignment.md`

## Product Spine

The graph should help the orchestrator see packet/chunk flow, splits, returns,
detours, worktree state, live/completed chats, and concern/verification signals
in a way that matches the user's intended canvas experience. Realignment should
preserve useful progress and make minimal corrective changes, not collapse the
direction into a reduced placeholder.

## Exact Task

Initiate the graph vision realignment conversation. Slow down over the current
state before planning. Do not implement.

## Read First

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `/Users/olafbobryk/.codex/skills/agent-orchestration-strategy/SKILL.md`
- `/Users/olafbobryk/.codex/skills/agent-return/SKILL.md`
- `/Users/olafbobryk/.codex/skills/packet-planner/SKILL.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/packets/packet-008a-graph-value-reset.md`
- `.codex-orchestration/packets/packet-008b-graph-contract-reset-stable-canvas-shell.md`
- `.codex-orchestration/packets/packet-008c-graph-vision-realignment.md`
- `.codex-orchestration/handoffs/packet-008a-graph-value-reset-return.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`

Reference branches:

- `codex/p8-c1-graph-contract`: inspect only as an unaccepted prototype.
- `codex/packet-008b-graph-shell`: inspect only as rejected/superseded reset
  work.

## In Scope

- Start a discussion that recovers the intended graph UX/model.
- Distinguish scope drift from bad product direction.
- Identify what to preserve from the original graph prototype.
- Identify what to reject from the original graph prototype.
- Identify what 008B removed or flattened incorrectly.
- Recommend the smallest next implementation packet only after the discussion.
- Write a return handoff only if the conversation reaches a recommendation.

## Out Of Scope

- No implementation.
- No source code edits.
- No package dependency changes.
- No branch merge, cherry-pick, cleanup, or worktree deletion.
- No acceptance of Packet 008B.
- No architecture doc edits.
- No packet map edits.
- No prompt generation, execution controls, Codex state mutation, transcript
  parsing, secret/env display, automatic Git/worktree action, or in-app
  Markdown editing.

## Hard Stops

- Stop if the conversation is drifting toward another broad reset.
- Stop if the recommendation treats 008B as accepted baseline.
- Stop if the recommendation discards the original graph vision instead of
  identifying minimal corrections.
- Stop before implementation or source edits.
- Stop before changing durable docs other than the optional return handoff.

## Required Opening

Open the spawned thread by explicitly stating:

- main is still safe and has not merged the regression;
- the original graph prototype was scope-drifty but directionally closer to the
  user's vision;
- the 008B reset branch is a regression and should be treated as rejected unless
  the orchestrator later says otherwise;
- the next move should preserve the vision and change minimally;
- the conversation should recover the intended UX/graph model before writing any
  implementation packet.

Then ask the user a small number of focused questions.

## Env Source Declaration

No env or secret source should be needed.

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations: local read-only Git/doc inspection only
- Stop rules: stop before external-state operations, migrations, email, paid
  APIs, customer data, env-backed smoke, local dev server, or source edits

## Expected Return Handoff

If the conversation reaches a recommendation, write:

- `.codex-orchestration/handoffs/packet-008c-graph-vision-realignment-return.md`

Include:

- preserved prototype direction;
- rejected prototype scope drift;
- rejected 008B regression points;
- smallest next packet recommendation;
- anti-loop hard stops;
- any concerns to bubble up.

## Concern Bubble-Up Format

```markdown
## Concerns To Bubble Up

- Status: open | resolved | deferred
- Concern:
- Why it matters:
- Affected packet/docs:
- Recommended default:
- Needs human: yes | no
```
