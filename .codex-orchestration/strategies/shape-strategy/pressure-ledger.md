# Pressure Ledger

Status: active feedback ledger

This ledger records friction against the orchestration shape strategy itself.
Entries are not accepted architecture by default.

Promotion path:

```text
pressure entry -> discussion -> accepted decision -> strategy doc update
```

## Entry: Legacy Provenance Migration

Date: 2026-06-11
Status: open

Pressure:
upper + sideways

Signal:
The first real target repo for shape-strategy initialization contains legacy
template/product worklogs and active unrelated design-system work.

Why It Matters:
The strategy needs to support project identity and legacy provenance without
forcing old docs into the new shape model too early or mixing docs migration
with active app changes.

Affected Artifacts:
- `<target-project>`
- `docs/worklogs/*` in the target project
- `.codex/tmp/*` in the target project
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`

Recommended Response:
Initialize the shape-strategy skeleton first, create an ignored migration
ledger, preserve old worklogs as historical evidence, and defer classification
or promotion until reviewed.

Decision:

## Entry: Visible Delegated Worker Missing From Map

Date: 2026-06-12
Status: absorbed

Pressure:
lower + sideways

Signal:
A delegated worker was doing substantive visible work inside a project shape,
but the map had no active run or agent references, so the work did not appear as
an active worker lane or marker.

Why It Matters:
The strategy said agent docs were optional, which was true for low-ceremony
work but too loose for spawned workers expected to be visible on the dashboard.

Affected Artifacts:
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/map.md`
- `strategies/shape-strategy/_guides/artifacts/agent.md`
- `strategies/shape-strategy/_guides/artifacts/run.md`

Recommended Response:
Require run artifacts for substantive visible delegated work and require agent
artifacts when a visible worker marker is expected.

Decision:
Absorbed by the Visibility-Required Delegation rule.

## Entry: Muted Leaked Into Strategy Status

Date: 2026-06-12
Status: absorbed

Pressure:
lower

Signal:
Preview-only product work used `Status: muted` to ask for a quieter visual
surface, but `muted` reads like UI/projection language rather than architecture
status.

Why It Matters:
If docs use visual rendering words as strategy status, the shape strategy starts
mixing authored orchestration truth with dashboard appearance.

Affected Artifacts:
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/shape.md`
- `strategies/shape-strategy/_guides/artifacts/workpiece.md`
- `src/lib/strategies/shape-strategy-adapter.ts`
- `src/lib/graph/projection.ts`

Recommended Response:
Use `Status: planning` for visible but not yet solidified work. Keep `muted` as
projection vocabulary and as a legacy adapter alias only.

Decision:
Absorbed by the status-to-projection contract.

## Entry: Shape Run Return Order Was Product-Local Only

Date: 2026-06-13
Status: absorbed

Pressure:
lower + sideways

Signal:
A product worktree discovered a better shape run return order, but the
corrected lifecycle lived only in the product docs and local skill, not in the
source shape-strategy template.

Why It Matters:
Future initialized repos could keep sending steward packets before Git
disposition, durable docs, and verification were final.

Affected Artifacts:
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `.codex-orchestration/architecture.md`
- `$CODEX_HOME/skills/shape-run-return/SKILL.md`

Recommended Response:
Backport the lifecycle into the canonical strategy guide and expose the
`$shape-run-return` workflow from architecture pointers. Keep the reusable
workflow skill in the personal Codex skills directory for now.

Decision:
Absorbed by the Shape Run Return Lifecycle section.

## Entry: Historical Agent Rendered As Live Marker

Date: 2026-06-13
Status: absorbed

Pressure:
lower

Signal:
An accepted historical worker agent still rendered as an active dashboard
marker at a checkpoint, even though there was no live worker thread at that
position.

Why It Matters:
The graph blurred run history, checkpoint/project state, and live operational
presence. Dead worker markers make accepted or returned work look active.

Affected Artifacts:
- `src/lib/strategies/shape-strategy-adapter.ts`
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/agent.md`
- `strategies/shape-strategy/_guides/dashboard-contract-notes.md`
- `strategies/shape-strategy/_templates/agent.md`

Recommended Response:
Render agent markers only for live statuses: `active`, `in_progress`, and
`paused`. Keep historical agents in docs/history without graph markers or
missing-position warnings.

Decision:
Absorbed by the live-marker status contract.

## Entry: Worktree-Local Worker Docs Disappeared From Steward Dashboard

Date: 2026-06-14
Status: absorbed

Pressure:
lower + sideways

Signal:
Visible worker threads correctly wrote run and agent docs inside isolated
worktrees, but the dashboard was pointed at the steward/main checkout and
therefore did not show those active or returned workers.

Why It Matters:
If worker worktree docs are the only source of projection state, the dashboard
can look stale or false until consolidation. That increases closeout ceremony
and hides work that the steward is actively supervising.

Affected Artifacts:
- `strategies/shape-strategy/_guides/concepts/strategies/approaches.md`
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/agent.md`
- `strategies/shape-strategy/_guides/artifacts/run.md`
- `strategies/shape-strategy/_guides/artifacts/map.md`
- `strategies/shape-strategy/_guides/dashboard-contract-notes.md`
- `strategies/shape-strategy/_templates/agent.md`
- `strategies/shape-strategy/_templates/run.md`

Recommended Response:
Use central steward projection stubs in the main checkout for dashboard-visible
delegated work. Treat worktree-local run and agent docs as evidence unless the
steward explicitly authorizes workers to update central projection docs.

Decision:
Absorbed by the Central Steward Projection approach.

## Entry: Worker Preview Ports Became Stale Review Links

Date: 2026-06-14
Status: absorbed

Pressure:
lower + sideways

Signal:
Worker threads started temporary dev servers on ad hoc ports, stopped or lost
those processes during closeout, and then stale localhost URLs remained in the
review surface.

Why It Matters:
The user needs review links to stay trustworthy across threads. A stopped
worker preview should not be reported as live, and durable review should not
depend on an unmanaged temporary port.

Affected Artifacts:
- `strategies/shape-strategy/_guides/concepts/strategies/approaches.md`
- `strategies/shape-strategy/_guides/artifacts/run.md`
- `strategies/shape-strategy/_templates/run.md`
- `$CODEX_HOME/skills/preview-restart/SKILL.md`
- `$CODEX_HOME/skills/shape-run-return/SKILL.md`

Recommended Response:
Keep preview state linked to runs. Prefer sidecar/steward-owned review URLs for
durable review, use worker dev servers as temporary verification unless
retained, and require preview owner/disposition in handoffs.

Decision:
Absorbed by the Review Preview Ownership approach and `preview-restart` skill.

## Entry: Pressure Ledger Becomes Missing Feedback Artifact

Date: 2026-06-11
Status: open

Pressure:
lower

Signal:
The shape strategy had artifacts for maps, shapes, workpieces, runs,
checkpoints, edges, agents, and artifacts, but no durable place to record when
the strategy itself created friction or useful signal.

Why It Matters:
Without a pressure ledger, orchestration feedback gets lost in chat, overfits
into concerns, or gets promoted too quickly into architecture.

Affected Artifacts:
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/pressure-ledger.md`

Recommended Response:
Use this pressure ledger as a lightweight feedback artifact. Do not render
pressure entries as graph nodes by default.

Decision:
