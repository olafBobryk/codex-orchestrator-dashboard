# Packet 008B Graph Contract Reset And Stable Canvas Shell Spawn Handoff

Status: queued

## Spawned Agent Target

Visible Codex worktree-backed project thread.

Workspace main checkout:

- `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`

Starting branch:

- `main`

Pending worktree:

- `local:953806ee-909b-4818-9ca8-02c8679899a0`

## Packet

- Packet: `008B Graph Contract Reset And Stable Canvas Shell`
- Status: active
- Source packet doc:
  `.codex-orchestration/packets/packet-008b-graph-contract-reset-stable-canvas-shell.md`

## Product Spine

The graph should make packet/chunk orchestration easier to understand without
turning prototype momentum into accepted architecture. The first useful graph
surface must have a small source-of-truth contract and a canvas layout that does
not destabilize when side panels change state.

## Exact Task

Start by stating the proposed graph contract reset direction and potential
problems. Then, if the direction remains inside the packet boundary, implement
the minimal graph contract reset and stable canvas shell from main.

## Read First

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `node_modules/next/dist/docs/` docs relevant to the App Router files being
  edited
- `/Users/olafbobryk/.codex/skills/agent-orchestration-strategy/SKILL.md`
- `/Users/olafbobryk/.codex/skills/agent-worktree-workflow/SKILL.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/packets/packet-008a-graph-value-reset.md`
- `.codex-orchestration/packets/packet-008b-graph-contract-reset-stable-canvas-shell.md`
- `.codex-orchestration/handoffs/packet-008a-graph-value-reset-return.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`
- `src/app/page.tsx`
- `src/lib/orchestration.ts`
- `src/lib/codex-projects.ts`

Prototype branch may be inspected as reference only:

- `codex/p8-c1-graph-contract`

## In Scope

- Define the minimal graph contract Packet 008 should depend on.
- Reject the returned P8-C1 broad node/status/source-layer/support-node model.
- Name the smallest normalized Markdown source fields needed for the first
  graph view.
- Implement a stable canvas shell from main.
- Make left project navigation behave as a fixed/canvas-adjacent layer.
- Preserve current project navigation.
- Keep the right panel but correct only the highest-impact canvas-bound issue if
  tightly coupled.
- Use the smallest graph data shape needed to verify contract fit and canvas
  stability.

## Out Of Scope

- No runtime Codex annotations.
- No Git/worktree annotations.
- No handoff/concern support-node semantics.
- No transcript parsing.
- No prompt generation or execution controls.
- No automatic Git/worktree actions.
- No in-app Markdown editor.
- No broad page IA rewrite.
- No Packet 009-014 polish.
- No prototype branch merge or cherry-pick unless the orchestrator explicitly
  requests it later.

## Hard Stops

- Stop if the contract cannot stay minimal.
- Stop if canvas stability requires a broad IA rewrite.
- Stop if the task requires accepting the prototype branch's graph contract.
- Stop before adding runtime/Git annotations, support-node semantics, or
  filtering/clustering.
- Stop before using secrets/env or any external-state operation.

## Verification

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- Start the local dev server.
- Verify route reachability in browser.
- Verify sidebar open/collapse, project selection, and right-panel state changes
  do not resize or destabilize the graph canvas.
- Verify desktop and mobile framing.

Product-readiness:

- The minimal contract explains what the first graph view is allowed to show and
  what it must not model yet.
- The graph shell remains framed and interactive after sidebar/right-panel state
  changes.
- The current project navigation remains understandable.

## Env Source Declaration

No env or secret source should be needed.

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations: local lint/build, local dev server, browser verification
- Stop rules: stop before external-state operations, migrations, email, paid
  APIs, customer data, or any env-backed smoke

## Expected Return Handoff

Write:

- `.codex-orchestration/handoffs/packet-008b-graph-contract-reset-stable-canvas-shell-return.md`

Include:

- contract reset direction used;
- potential problems found and disposition;
- changed files;
- verification results;
- preview URL if left running;
- concerns to bubble up.

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
