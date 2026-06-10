# Packet 008A: Graph Value Reset

Status: active

## Goal

Review the returned graph prototype branch before any merge, cherry-pick, or
additional graph implementation. Decide the minimum graph surface that actually
helps orchestration instead of adding confusing polish.

## Product Spine

The graph should reduce the orchestrator's confusion about packet/chunk state,
splits, returns, concerns, and live/completed threads. If the graph does not
make that clearer than the current summary UI, it should be simplified before
more implementation continues.

## Context

Main checkout:

- `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- branch `main`
- current durable docs show Packet 008 active with P8-C1 delegated.

Returned prototype branch:

- branch `codex/p8-c1-graph-contract`
- worktree
  `/Users/olafbobryk/.codex/worktrees/2ce0/codex-orchestrator-dashboard`
- thread `019ea98c-329d-7f70-9b18-7e64cc4128ec`

The returned branch contains P8-C1 through P8-C5 plus extra polish passes that
were not accepted by the orchestrator as separate packets before implementation.

Reference docs to inspect:

- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/ledgers/packet-008-orchestration-graph-view.md`
- `.codex-orchestration/handoffs/packet-008-c1-graph-data-contract-spawn.md`
- returned handoffs in the prototype worktree under
  `.codex-orchestration/handoffs/`

## Outcome

A return handoff that recommends one of these paths:

- accept only the graph data contract and defer UI implementation;
- accept a narrowed graph UI slice with explicit simplification;
- reject the prototype branch for now and re-plan Packet 008;
- define a new implementation packet with stricter product-readiness checks.

The handoff should identify which commits/files are useful, which are confusing
or premature, and what the next packet should be.

## Constraints

- No source code changes.
- No package dependency changes.
- No merge, cherry-pick, branch deletion, or worktree cleanup.
- No new graph polish.
- No new packet sequence beyond the one recommended next packet.
- No changes to accepted architecture unless the orchestrator explicitly
  approves them in chat.
- The agent may write only its return handoff unless the orchestrator gives
  another write target.

## Plan

1. Compare main Packet 008 docs with the returned prototype branch.
2. Review the prototype through the live preview if available.
3. Classify prototype work into keep, simplify, defer, and reject.
4. Evaluate whether the graph currently improves orchestration clarity.
5. Recommend the next bounded packet and hard stops.
6. Write the return handoff.

## Verification Strategy

Acceptance checks:

- The handoff names the current packet state accurately.
- The handoff does not treat the prototype branch as accepted.
- The handoff gives a concrete recommendation for what to do with Packet 008.
- The handoff includes a product-readiness test for the next graph step.
- The handoff clearly separates implementation value from visual polish.

## Chunk Planner Decision

No chunk planner needed; this is one bounded review/repass packet. Do not create
a chunk ledger for this packet unless scope changes.

## Direction Warning Triggers

- The agent starts implementation or visual polish.
- The agent rewrites project architecture instead of returning a recommendation.
- The agent treats commits on `codex/p8-c1-graph-contract` as already accepted.
- The recommendation depends on hidden transcript parsing or private Codex state.
- The recommendation makes Git the source of truth instead of Markdown docs.

## Handoff Notes

Expected return handoff:

- `.codex-orchestration/handoffs/packet-008a-graph-value-reset-return.md`

The orchestrator will review the handoff and decide whether to merge,
cherry-pick, defer, or re-plan Packet 008.
