# Run: <name>

Status: active | returned | accepted | blocked | paused

Guide: ../_guides/artifacts/run.md

## Intent

<What this run is trying to do inside the shape boundary.>

## Shape References

- `<shape-id>`: <why this run is inside this shape>

## Workpiece References

- `<workpiece-id>`: <how this run touched the workpiece>

## Agent Reference

- Thread: <current thread id or link>
- Codex agent: <agent id, worker name, or none>

## Start

- Checkpoint: `<checkpoint-id>` | none
- Handoff: <handoff or source artifact>

## Execution Context

- Thread: <current thread id or link>
- Codex agent: <agent id, worker name, or none>
- Worktree: <path or branch, if any>
- Branch: <branch or none>
- Base: <commit or branch, if known>

## Return Evidence

- <verified outcome, artifact, unresolved concern, or decision needing steward acceptance>
- Commit: <sha or branch/ref, if relevant>

## End

- Checkpoint: `<checkpoint-id>` | none
- Result: returned | accepted | blocked | paused
