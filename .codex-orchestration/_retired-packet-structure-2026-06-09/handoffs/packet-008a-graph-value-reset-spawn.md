# Packet 008A Graph Value Reset Spawn Handoff

Status: spawned

## Spawned Agent Target

Visible Codex project thread, local checkout, no worktree required.

Workspace:

- `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`

Thread:

- `019ead0e-bf55-7823-b70a-07c062dccc30`

## Packet

- Packet: `008A Graph Value Reset`
- Status: active
- Source packet doc:
  `.codex-orchestration/packets/packet-008a-graph-value-reset.md`

## Product Spine

The graph should reduce the orchestrator's confusion about packet/chunk state,
splits, returns, concerns, and live/completed threads. If the graph does not
make that clearer than the current summary UI, it should be simplified before
more implementation continues.

## Exact Task

Review the returned graph prototype branch as a reference and write a return
handoff that recommends what to do next. Do not implement, merge, cherry-pick,
or polish.

## Read First

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `/Users/olafbobryk/.codex/skills/agent-orchestration-strategy/SKILL.md`
- `/Users/olafbobryk/.codex/skills/agent-return/SKILL.md`
- `/Users/olafbobryk/.codex/skills/packet-planner/SKILL.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/packets/packet-008a-graph-value-reset.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/handoffs/packet-008-c1-graph-data-contract-spawn.md`

Also inspect the returned prototype worktree:

- `/Users/olafbobryk/.codex/worktrees/2ce0/codex-orchestrator-dashboard`

## In Scope

- Compare main Packet 008 docs with the returned prototype branch.
- Inspect commits and changed files on `codex/p8-c1-graph-contract`.
- Review returned handoffs in the prototype worktree.
- Use the verified local preview if still reachable:
  `http://127.0.0.1:3000/?workspace=/Users/olafbobryk/.codex/worktrees/2ce0/codex-orchestrator-dashboard`
- Classify work into keep, simplify, defer, and reject.
- Recommend the next bounded packet and hard stops.
- Write `.codex-orchestration/handoffs/packet-008a-graph-value-reset-return.md`.

## Out Of Scope

- No source code changes.
- No package dependency changes.
- No merge, cherry-pick, branch deletion, or worktree cleanup.
- No implementation or visual polish.
- No new graph packet sequence beyond one recommended next packet.
- No architecture doc changes unless explicitly approved by the orchestrator.
- No prompt generation, execution controls, Codex state mutation, transcript
  parsing, or secret/env display.

## Hard Stops

- Stop if a recommendation requires changing the accepted V1 sidecar boundary.
- Stop if the graph value cannot be judged without new user direction.
- Stop if the live preview is unavailable and screenshots or code inspection are
  insufficient to assess confusion.
- Stop before mutating anything except the return handoff.

## Verification

Acceptance checks:

- The return handoff names current packet state accurately.
- It does not treat prototype branch commits as already accepted.
- It gives a concrete recommendation for Packet 008.
- It includes a product-readiness test for the next graph step.
- It separates implementation value from visual polish.

## Env Source Declaration

No env or secret source should be needed.

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations: local read-only inspection, Git inspection, and local
  preview review if already running
- Stop rules: stop before external-state operations, migrations, email, paid
  APIs, customer data, or any env-backed smoke

## Concern Bubble-Up Format

Use this section in the return handoff if needed:

```markdown
## Concerns To Bubble Up

- Status: open | resolved | deferred
- Concern:
- Why it matters:
- Affected packet/docs:
- Recommended default:
- Needs human: yes | no
```
