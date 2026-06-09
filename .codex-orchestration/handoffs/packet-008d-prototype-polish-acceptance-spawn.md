# Packet 008D Prototype Polish And Acceptance Pass Spawn Handoff

Status: ready_to_spawn

## Spawned Agent Target

Visible Codex worktree-backed project thread.

Workspace main checkout:

- `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`

Starting branch:

- `main`

## Packet

- Packet: `008D Prototype Polish And Acceptance Pass`
- Status: active
- Source packet doc:
  `.codex-orchestration/packets/packet-008d-prototype-polish-acceptance.md`

## Product Spine

The orchestrator should be able to use the graph canvas to understand
packet/chunk flow, splits, returns, detours, worktree state, live/completed
chats, and concern/verification signals without reading every Markdown file
manually and without the dashboard becoming an executor.

## Exact Task

Implement Packet 008D as one bounded prototype polish and acceptance pass.
Start a local dev server immediately after required reading/bootstrap so the UI
is reviewable while work proceeds.

## Read First

- `/Users/olafbobryk/.codex/AGENTS.md`
- `AGENTS.md`
- `node_modules/next/dist/docs/` docs relevant to edited App Router files
- `/Users/olafbobryk/.codex/skills/agent-orchestration-strategy/SKILL.md`
- `/Users/olafbobryk/.codex/skills/agent-worktree-workflow/SKILL.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/packets/packet-008d-prototype-polish-acceptance.md`
- `.codex-orchestration/handoffs/packet-008c-graph-vision-realignment-return.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`
- `src/app/page.tsx`
- `src/lib/orchestration.ts`
- `src/lib/codex-projects.ts`
- `src/lib/codex-threads.ts`

Reference branches:

- `codex/p8-c1-graph-contract`: primary directionally correct graph prototype
  reference.
- `codex/packet-008b-graph-shell`: rejected reset-regression branch; do not use
  as baseline.

## Immediate Dev Server Requirement

After required reading and env bootstrap:

- install dependencies in the worktree if `node_modules` is missing;
- start the local dev server immediately with `npm run dev -- -p <free-port>`;
- prefer port `3109`, otherwise use the next free port;
- verify the preview URL is reachable;
- report and keep the verified preview URL running while implementing;
- use that live preview for UI checks and closeout.

## In Scope

- Inspect `codex/p8-c1-graph-contract` as the primary prototype reference.
- Choose narrow cherry-picks or rebuild-on-`main`, whichever preserves the graph
  UX/model while excluding bad durable-doc mutations.
- Preserve the full graph canvas direction.
- Improve clarity, hierarchy, fit, canvas behavior, panel behavior, and signal
  legibility.
- Keep Markdown docs as durable source of truth.
- Keep runtime and Git/worktree data as annotations/evidence.
- Remove or avoid unaccepted packet-history/status mutations.
- Produce a return handoff with changed files, verification, preview URL, and
  remaining concerns.

## Out Of Scope

- No graph contract reset.
- No realignment or architecture discussion detour.
- No reduced placeholder or packet/ledger-only graph.
- No use of `codex/packet-008b-graph-shell` as baseline.
- No accepting Packet 009-014 prototype docs as durable project history.
- No prompt generation.
- No execution controls.
- No Codex state mutation.
- No transcript parsing.
- No secret/env display.
- No automatic Git/worktree actions.
- No in-app Markdown editing.
- No marking Packet 008 verified before orchestrator acceptance.

## Hard Stops

- Stop if the work is becoming another reset.
- Stop if the original graph vision is being discarded instead of polished.
- Stop if runtime state, Git history, transcript content, or generated prompts
  become source of truth.
- Stop if the branch imports unaccepted Packet 009-014 durable docs or marks
  Packet 008 verified.
- Stop before using secrets/env or any external-state operation.

## Verification

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- Verify the dev server route is reachable.
- Verify the graph visually communicates packet/chunk flow, splits, returns,
  detours, worktree state, live/completed chats, and concern/verification
  signals.
- Verify selected-node detail improves inspection without becoming editing or
  execution.
- Verify runtime/Git/worktree data is visibly annotation/evidence, not durable
  truth.
- Verify any imported prototype work excludes unaccepted durable-doc
  status/history changes.

Product-readiness:

- The graph still feels like the intended full-canvas orchestration experience,
  not a reduced placeholder.
- The UI is reviewable through a reachable local preview.
- The orchestrator can decide from the preview whether to accept Packet 008,
  request a focused polish follow-up, or keep the packet open.

## Env Source Declaration

No env or secret source should be needed.

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations: dependency install if needed, local lint/build, local dev
  server, browser/UI verification
- Stop rules: stop before external-state operations, migrations, email, paid
  APIs, customer data, or any env-backed smoke

## Expected Return Handoff

Write:

- `.codex-orchestration/handoffs/packet-008d-prototype-polish-acceptance-return.md`

Include:

- implementation route chosen: narrow cherry-pick series or rebuild on `main`;
- what was preserved from the prototype;
- what drift was excluded;
- changed files;
- verification results;
- verified preview URL if the server is left running;
- remaining concerns.

## Worktree Closeout Expectation

- Retain the worktree for orchestrator review.
- Keep the verified dev server running unless blocked.
- Do not remove or close worktrees.
- Do not merge or cherry-pick into `main`.

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
