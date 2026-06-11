# Orchestration Pressure Ledger Minimal Doc

Status: accepted minimal doc idea

Template: ../../_templates/pressure-ledger-entry.md

This file defines the smallest useful Markdown pressure ledger for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A pressure ledger records feedback about the orchestration system itself.

It is not a concern tracker for current implementation work. It is not a packet
ledger, run ledger, or architecture document. It captures moments where the
strategy, docs, graph, agent flow, or project reality pushed against the way
work was being organized.

Pressure entries are raw until accepted. They become strategy only after chat
discussion and an explicit accepted decision.

## Pressure Directions

### Upper Pressure

Upper pressure comes from higher-level intent pushing down onto work.

Examples include steward preference, product identity, architecture direction,
human gates, strategy changes, or project goals invalidating a lower-level plan.

### Lower Pressure

Lower pressure comes from implementation reality pushing up against the plan.

Examples include code constraints, verification results, dashboard behavior,
adapter limits, graph readability, missing files, or worker output exposing a
plan mismatch.

### Sideways Pressure

Sideways pressure comes from neighboring work pushing laterally against the
current work.

Examples include parallel agents, dirty worktrees, shared files, duplicated
docs, stale worklogs, or adjacent decisions interfering with a boundary.

## Required Sections

### Status

The pressure entry status is:

- `open`: the signal exists and has not been absorbed or rejected.
- `absorbed`: the signal led to an accepted change or durable note elsewhere.
- `rejected`: the signal was reviewed and should not change strategy.
- `deferred`: the signal is real but not actionable yet.

### Pressure

Pressure records the direction of the signal.

Use `upper`, `lower`, `sideways`, or a short combined form such as
`upper + sideways` when one direction would hide the useful signal.

### Signal

Signal describes what happened.

Keep this factual. Do not turn it into a decision or a solution.

### Why It Matters

Why It Matters explains what the signal reveals about the strategy, docs,
dashboard, or orchestration behavior.

### Affected Artifacts

Affected Artifacts links the pressure entry to relevant maps, shapes,
workpieces, runs, checkpoints, agents, commits, threads, docs, or repositories.

### Recommended Response

Recommended Response states the smallest likely response: change, test, avoid,
defer, or discuss.

### Decision

Decision stays empty until the steward accepts an outcome.

Accepted decisions should be copied into the proper durable strategy doc instead
of leaving the pressure ledger as the only source of truth.

## Minimal Template

```markdown
# Pressure Ledger

## Entry: <short name>

Date: <YYYY-MM-DD or unknown>
Status: open | absorbed | rejected | deferred

Pressure:
upper | lower | sideways | <combined directions>

Signal:
<what happened>

Why It Matters:
<what this reveals about the strategy, docs, graph, or orchestration behavior>

Affected Artifacts:
- <doc, shape, workpiece, run, checkpoint, thread, repo, commit, or none>

Recommended Response:
<change, test, avoid, defer, or discuss>

Decision:
<empty until accepted>
```
