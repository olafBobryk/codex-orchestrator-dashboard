# Packet 008D: Prototype Polish And Acceptance Pass

Status: ready

## Goal

Return to the original Packet 008 graph direction and make one bounded polish
and acceptance pass on the prototype, instead of running another reset,
realignment, or architecture detour.

## Product Spine

The orchestrator should be able to use the graph canvas to understand
packet/chunk flow, splits, returns, detours, worktree state, live/completed
chats, and concern/verification signals without reading every Markdown file
manually and without the dashboard becoming an executor.

## Context

This packet exists because the 008A-008C recovery loop took too long and did
not materially advance the app. Its useful conclusion is simple:

- preserve the original graph prototype direction;
- reject only the procedural/orchestration drift;
- polish toward acceptance instead of resetting again.

Reference branches:

- `codex/p8-c1-graph-contract`: directionally correct graph prototype. Use as
  the primary reference.
- `codex/packet-008b-graph-shell`: rejected reset-regression branch. Do not use
  as baseline.

Accepted source of truth:

- `main`
- normalized `.codex-orchestration/` Markdown docs

Important distinction:

- Product direction to preserve: full-canvas graph, chronology/lane flow, side
  panels, selected-node detail, live/completed chat signals, off-source/worktree
  state, handoff/concern/verification/return/detour/split signals.
- Drift to reject: unaccepted packet-history/status mutations, Packet 009-014
  self-recorded durable docs, treating the spawned implementation thread as
  strategy authority, and marking Packet 008 verified before orchestrator
  acceptance.

## Outcome

- A reviewable graph candidate that preserves the intended prototype direction.
- The branch avoids importing unaccepted durable-doc history/status mutations.
- The UI is polished enough for the orchestrator to decide whether Packet 008
  can be accepted, needs a focused follow-up, or should remain open.
- A reachable local preview is provided for review.

## Scope

- Inspect `codex/p8-c1-graph-contract` as the primary prototype reference.
- Prefer narrow cherry-picks or a rebuild on `main`, whichever best preserves
  the graph UX/model while excluding bad durable-doc mutations.
- Preserve the full graph canvas direction.
- Improve clarity, hierarchy, fit, canvas behavior, panel behavior, and signal
  legibility.
- Keep Markdown docs as durable source of truth.
- Keep runtime and Git/worktree data as annotations/evidence.
- Remove or avoid unaccepted packet-history/status mutations.
- Produce a return handoff with changed files, verification, preview URL, and
  any remaining concerns.

## Out Of Scope

- Another graph contract reset.
- Another realignment or architecture discussion packet.
- Reducing the graph to packet/ledger-only data.
- Using `codex/packet-008b-graph-shell` as baseline.
- Accepting Packet 009-014 prototype docs as durable project history.
- Prompt generation.
- Execution controls.
- Codex state mutation.
- Transcript parsing.
- Secret/env display.
- Automatic Git/worktree actions.
- In-app Markdown editing.
- Marking Packet 008 verified before orchestrator acceptance.

## Verification Strategy

Baseline:

- `npm run lint`
- `npm run build`

Targeted:

- Start the local dev server.
- Verify the graph route is reachable.
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

## Chunk Planner Decision

No chunk planner needed. This should be one implementation packet. Stop if it
starts becoming another packet series, architecture rewrite, or reset loop.

## Direction Warning Triggers

- The work is framed as another reset.
- The original graph vision is discarded instead of polished.
- The graph is reduced to packet/ledger-only data.
- The implementation uses `codex/packet-008b-graph-shell` as baseline.
- Runtime state, Git history, transcript content, or generated prompts become
  source of truth.
- The branch imports unaccepted Packet 009-014 durable docs or marks Packet 008
  verified without orchestrator acceptance.

## Handoff Notes

When the user explicitly asks to implement or spawn this packet, use a visible
worktree-backed thread.

Expected return handoff:

- `.codex-orchestration/handoffs/packet-008d-prototype-polish-acceptance-return.md`

The return should include:

- implementation route chosen: narrow cherry-pick series or rebuild on `main`;
- what was preserved from the prototype;
- what drift was excluded;
- changed files;
- verification results;
- preview URL if the server is left running;
- remaining concerns.
