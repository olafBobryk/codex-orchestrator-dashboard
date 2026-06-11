# Orchestration Artifact Minimal Doc

Status: accepted minimal doc idea

This file defines the smallest useful Markdown artifact document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

An artifact doc describes a reference that supports orchestration work.

Artifacts are first-class references, but they do not automatically become graph
nodes.

## Relationship To Other Artifacts

Shapes, workpieces, runs, checkpoints, edges, maps, and optional agents can all
reference artifacts as evidence or context.

The artifact doc exists when the reference itself needs explanation, status, or
review context.

## Required Sections

### Intent

Intent states why this artifact matters to orchestration.

It should explain what the artifact proves, supports, or makes easier to
review.

### Artifact Type

Artifact Type classifies the reference.

Accepted type values are:

- `doc`
- `commit`
- `screenshot`
- `preview`
- `handoff`
- `return-note`
- `test-result`
- `thread`
- `worktree`
- `other`

### Reference

Reference points to the artifact.

This may be a relative path, URL, commit sha, branch/ref, thread id, worktree
path, or short textual identifier.

### Applies To

Applies To lists the orchestration items supported by the artifact.

References can point to shapes, workpieces, runs, checkpoints, edges, maps,
agents, or other artifacts.

### Evidence Role

Evidence Role describes how the artifact is being used.

Accepted evidence role values are:

- `source`
- `verification`
- `return-evidence`
- `decision-support`
- `context`
- `reference`

### Notes

Notes provide short supporting context only when needed.

## Minimal Template

```markdown
# Artifact: <name>

Status: active | accepted | superseded | archived

## Intent

<Why this artifact matters to orchestration.>

## Artifact Type

doc | commit | screenshot | preview | handoff | return-note | test-result | thread | worktree | other

## Reference

- <relative path, URL, commit sha, branch/ref, thread id, worktree path, or identifier>

## Applies To

- `<shape/workpiece/run/checkpoint/edge/map/agent/artifact-id>`: <how it applies>

## Evidence Role

source | verification | return-evidence | decision-support | context | reference

## Notes

- <short context only if needed>
```
