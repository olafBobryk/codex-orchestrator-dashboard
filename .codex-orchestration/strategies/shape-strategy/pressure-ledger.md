# Pressure Ledger

Status: active feedback ledger

This ledger records friction against the orchestration shape strategy itself.
Entries are not accepted architecture by default.

Promotion path:

```text
pressure entry -> discussion -> accepted decision -> strategy doc update
```

## Entry: Averlo Legacy Provenance Migration

Date: 2026-06-11
Status: open

Pressure:
upper + sideways

Signal:
The first real target repo for shape-strategy initialization is Averlo Rebrand,
but the repo still contains Webvizion/template-intelligence flavored worklogs
and active unrelated design-system work.

Why It Matters:
The strategy needs to support project identity and legacy provenance without
forcing old docs into the new shape model too early or mixing docs migration
with active app changes.

Affected Artifacts:
- `/Users/olafbobryk/Documents/Code/Averlo/2026/averlo-rebrand`
- `docs/worklogs/*` in Averlo Rebrand
- `.codex/tmp/*` in Averlo Rebrand
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
A delegated worker was doing substantive visible work inside an Averlo shape,
but the map had no active run or agent references, so the work did not appear
as an active worker lane or marker.

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
Preview-only Averlo work used `Status: muted` to ask for a quieter visual
surface, but `muted` reads like UI/projection language rather than architecture
status.

Why It Matters:
If docs use visual rendering words as strategy status, the shape strategy starts
mixing authored orchestration truth with dashboard appearance.

Affected Artifacts:
- `strategies/shape-strategy/_guides/orchestration-shape-strategy.md`
- `strategies/shape-strategy/_guides/artifacts/shape.md`
- `strategies/shape-strategy/_guides/artifacts/workpiece.md`
- `src/lib/shape-strategy-adapter.ts`
- `src/lib/graph-projection.ts`

Recommended Response:
Use `Status: planning` for visible but not yet solidified work. Keep `muted` as
projection vocabulary and as a legacy adapter alias only.

Decision:
Absorbed by the status-to-projection contract.

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
