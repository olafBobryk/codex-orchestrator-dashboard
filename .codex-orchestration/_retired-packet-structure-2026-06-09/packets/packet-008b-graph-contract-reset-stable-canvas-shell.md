# Packet 008B: Graph Contract Reset And Stable Canvas Shell

Status: active

## Goal

Reset the graph contract before downstream graph packets build on the wrong
model, then verify that contract through a stable graph shell.

## Product Spine

The graph should make packet/chunk orchestration easier to understand without
turning prototype momentum into accepted architecture. The first useful graph
surface must have a small source-of-truth contract and a canvas layout that does
not destabilize when side panels change state.

## Context

Packet 008A returned this recommendation:

- Do not merge `codex/p8-c1-graph-contract` as-is.
- Do not accept the returned P8-C1 graph contract as the foundation.
- Do not accept Packet 009-014 prototype polish as project history.
- Keep only the useful layout lesson: the left sidebar should behave like a
  fixed layer, closer to the right panel, so it does not resize the graph
  canvas and destabilize the physics simulation.

Reference docs:

- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/packets/packet-008a-graph-value-reset.md`
- `.codex-orchestration/handoffs/packet-008a-graph-value-reset-return.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`

Prototype branch is reference-only:

- `codex/p8-c1-graph-contract`

## Outcome

- A minimal graph contract that names what the first graph is allowed to show
  and what it must not model yet.
- A stable canvas shell where left project navigation behaves as a fixed layer
  instead of resizing the graph canvas.
- The current project navigation remains understandable.
- Any graph preview uses the smallest data shape needed to prove the contract
  and shell behavior.

## Starting Direction Requirement

Before source changes, the spawned agent must state the proposed graph contract
reset direction and call out potential problems. It should continue only if the
direction stays inside this packet's boundary.

Potential problems to explicitly check:

- The minimal contract may still be too broad and recreate the rejected P8-C1
  taxonomy.
- A fixed left layer may conflict with the current responsive shell.
- The right panel may still create layout pressure against the canvas.
- Adding `react-force-graph-2d` may be premature if the shell can be verified
  with a smaller placeholder first.
- Browser verification may require a fresh local server and viewport checks.

## Scope

- Define the minimal graph contract Packet 008 should depend on.
- Explicitly reject the returned P8-C1 contract pieces that should not cascade:
  broad node taxonomy, broad status taxonomy, source-layer taxonomy, and
  support-node semantics.
- Name the smallest normalized Markdown source fields needed for the first
  graph view.
- Make the left project sidebar a fixed/canvas-adjacent layer closer to the
  right panel model.
- Keep graph canvas bounds stable when the left sidebar opens, collapses,
  scrolls, or changes selected workspace.
- Preserve the current left sidebar's useful project navigation behavior.
- Keep the right panel, but correct only the highest-impact interaction problem
  if it is tightly coupled to canvas bounds.
- Use the smallest graph data shape needed to verify contract fit and canvas
  stability.

## Out Of Scope

- Expanding beyond the minimal reset contract.
- Broad status taxonomy work.
- Handoff/concern support-node semantics.
- Runtime Codex annotation.
- Git/worktree annotation.
- Full side-panel IA rewrite.
- Support-node density, filtering, clustering, or edge styling.
- Packet 009-014 prototype polish.
- New global architecture rules.
- Prompt generation, execution controls, Codex state mutation, transcript
  parsing, secret/env display, automatic Git/worktree action, or in-app
  Markdown editing.

## Verification Strategy

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- Start the local dev server.
- Verify the graph/shell route is reachable.
- Verify sidebar open/collapse, project selection, and right-panel state changes
  do not resize or destabilize the graph canvas.
- Verify desktop and mobile framing.

Product-readiness:

- The minimal contract explains what the first graph view is allowed to show
  and what it must not model yet.
- The corrected contract does not carry forward the returned branch's broad
  node/source-layer/status model.
- The left sidebar feels like a fixed layer comparable to the right panel.
- The graph remains framed and interactive on desktop and mobile after sidebar
  and right-panel state changes.
- The current project navigation remains understandable.

## Chunk Planner Decision

No chunk planner needed if the packet stays to the contract reset and shell fix.
Stop and return to the orchestrator if the slice expands into runtime/Git
annotations, broad graph-contract design, page IA replacement, or support-node
filtering.

## Direction Warning Triggers

- The implementation starts from the prototype branch instead of main.
- The agent accepts the returned graph contract by default.
- The graph contract expands into support-node, runtime, Git, transcript, or
  source-layer modeling.
- The shell change becomes a broad page IA rewrite.
- The agent adds visual polish before proving canvas stability.
- The agent adds dependencies that are not required by the narrow slice.

## Handoff Notes

Expected return handoff:

- `.codex-orchestration/handoffs/packet-008b-graph-contract-reset-stable-canvas-shell-return.md`

The return must include:

- contract reset direction used;
- potential problems found and disposition;
- files changed;
- verification results;
- preview URL if a server is left running;
- any concerns to bubble up.
