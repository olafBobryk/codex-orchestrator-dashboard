# Orchestration Run Minimal Doc

Status: accepted minimal doc idea

Template: ../../_templates/run.md

This file defines the smallest useful Markdown run document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A run doc records one worker or agent execution trace inside a shape boundary.

The run is not the workpiece itself. It is the record of what happened while
work was attempted, verified, returned, paused, or accepted.

`Status:` is architecture-level strategy state for the run. It is not a
dashboard rendering instruction.

Start and end checkpoints are optional anchors for a run, not the definition of
the run.

A run doc is required when a spawned or delegated worker is doing substantive
visible work inside a shape. Create or update it before substantive mutation so
the map does not hide active delegated work.

## Relationship To Shapes And Workpieces

- A shape defines the work boundary.
- A workpiece defines concrete work.
- A run records execution across one or more shapes and workpieces.
- A worktree records where execution happened, when a separate checkout was
  used.

Runs may touch multiple workpieces and may operate inside one or more shapes.

The worktree is execution context, not the run itself. It should be recorded as
detail or evidence for the run and can also be surfaced from related agent,
workpiece, or shape details when helpful.

## Required Sections

### Intent

Intent states what this run is trying to do inside the shape boundary.

It should describe the run's execution target, not reopen the shape strategy.

### Shape References

Shape references list the shape boundaries this run operated inside.

Each reference should explain why the run belongs to that shape.

### Workpiece References

Workpiece references list the workpieces touched by the run.

Each reference should explain how the run touched the workpiece.

### Agent Reference

Agent reference records the current thread, Codex agent id, or worker identity
for the run.

This should be enough to find the execution context later without making the
dashboard depend on live Codex runtime state.

### Start

Start records where the run began.

The start checkpoint is optional. A run can start from a thread, handoff,
worktree, or accepted shape boundary without having a checkpoint node.

### Execution Context

Execution context records the concrete runtime and checkout context for the
run.

It can include thread id, Codex agent id, worktree path, branch, base commit, or
other context needed to find where the work happened later.

This section should stay factual. It should not become a second run plan.

### Return Evidence

Return evidence is the required material the run brings back.

It can include verified outcomes, changed artifacts, unresolved concerns,
accepted local decisions, or decisions needing steward acceptance.

Commits may be included as run evidence, but the run is still the execution
trace. The commit is supporting evidence, not the run itself.

### End

End records where the run stopped.

The end checkpoint is optional. Routine returns do not need to create checkpoint
nodes unless they change orchestration state or need steward attention.

## Status Lifecycle

- `active`: worker is currently operating.
- `returned`: worker has returned evidence and awaits steward handling.
- `accepted`: returned work has been accepted into durable truth.
- `blocked`: worker cannot continue without external input.
- `paused`: work is intentionally stopped but may resume.

## Minimal Template

```markdown
# Run: <name>

Status: active | returned | accepted | blocked | paused

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
```
