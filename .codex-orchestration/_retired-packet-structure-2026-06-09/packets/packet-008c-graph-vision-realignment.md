# Packet 008C: Graph Vision Realignment

Status: active

## Goal

Stop the reset loop and realign Packet 008 around the intended graph vision
before any more implementation is accepted or delegated.

## Product Spine

The graph should help the orchestrator see packet/chunk flow, splits, returns,
detours, worktree state, live/completed chats, and concern/verification signals
in a way that matches the user's intended canvas experience. Realignment should
preserve useful progress and make minimal corrective changes, not collapse the
direction into a reduced placeholder.

## Current State

Main remains the accepted app truth:

- branch `main`
- latest orchestrator commit `fe0710b`
- 008B code has not been merged

Unaccepted reference branches:

- `codex/p8-c1-graph-contract`: original graph prototype branch. It overran
  Packet 008/P8-C1 scope but contains much of the intended graph direction.
- `codex/packet-008b-graph-shell`: reset branch. It is a major product
  regression and should not be merged.

Packet interpretation:

- Packet 008 is still the graph direction packet, but its execution is paused.
- Packet 008A diagnosed scope drift but overcorrected toward reset.
- Packet 008B followed that reset framing too literally and regressed the
  product direction.
- Packet 008C exists to slow down, recover the intended vision, and decide the
  smallest next corrective move.

## Outcome

A graph realignment conversation and handoff that identify:

- what should be preserved from the original graph prototype;
- what should be rejected from the original graph prototype;
- what should be rejected from the 008B reset branch;
- the smallest next packet that moves toward the intended graph vision;
- specific hard stops that prevent another reset/regression loop.

## Constraints

- No implementation.
- No source code edits.
- No package dependency changes.
- No branch merge, cherry-pick, cleanup, or worktree deletion.
- No acceptance of Packet 008B.
- No rewriting Packet 008 into a smaller placeholder graph by default.
- No new graph architecture decisions unless first discussed in the spawned
  conversation and then returned to the orchestrator.

## Discussion Starting Point

The spawned thread must start by slowing down over the current state. It should
not rush into a new plan. It should explicitly state:

- main is still safe and has not merged the regression;
- the original graph prototype was scope-drifty but directionally closer to the
  user's vision;
- the 008B reset branch is a regression and should be treated as rejected unless
  the orchestrator later says otherwise;
- the next move should preserve vision and change minimally;
- the conversation should first recover the intended UX/graph model before
  writing any implementation packet.

## Questions To Open

The spawned thread should lead with a compact conversation around:

- Which parts of the original graph prototype matched the user's vision?
- Which parts were confusing because of scope drift rather than bad direction?
- What did 008B remove that should not have been removed?
- What is the minimum correction that gets the app back toward the intended
  canvas graph?
- Should the next implementation packet continue from the original prototype,
  cherry-pick a narrow subset, or rebuild a small slice on main while matching
  the prototype direction?

## Verification Strategy

Acceptance checks:

- The conversation distinguishes scope drift from product direction.
- The return does not recommend accepting 008B.
- The return does not flatten the graph vision into a placeholder.
- The return identifies a minimal next implementation packet.
- The return includes concrete anti-loop hard stops.

## Chunk Planner Decision

No chunk planner needed. This is a bounded realignment conversation packet.

## Direction Warning Triggers

- The agent frames the original graph direction as entirely wrong.
- The agent recommends another broad reset.
- The agent treats the 008B branch as accepted or useful baseline.
- The agent starts implementation.
- The agent writes architecture or packet docs without explicit orchestrator
  approval after the conversation.
- The agent turns the dashboard into a Codex replacement, executor, prompt
  generator, or in-app Markdown editor.

## Handoff Notes

Expected return handoff if the conversation reaches a recommendation:

- `.codex-orchestration/handoffs/packet-008c-graph-vision-realignment-return.md`

Until then, the spawned thread should operate as a visible discussion thread.
