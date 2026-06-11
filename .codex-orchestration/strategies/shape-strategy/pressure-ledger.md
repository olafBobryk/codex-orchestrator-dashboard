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
