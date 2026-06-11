# Orchestration Workpiece Minimal Doc

Status: accepted minimal doc idea

Template: ../../_templates/workpiece.md

This file defines the smallest useful Markdown workpiece document for the
orchestration shape strategy. It is a documentation idea, not an adapter schema.

## Principle

A workpiece doc describes one concrete piece of work.

The workpiece should be small enough to build, test, review, and reference from
one or more shapes.

## Relationship To Shapes And Runs

- A shape is the boundary around work.
- A workpiece is the concrete work item.
- A run is the execution trace or evidence produced while work happens.

A shape references workpieces. A run may touch one or more workpieces.

## Required Sections

### Intent

Intent states what this concrete piece of work is trying to make true.

It should describe the desired outcome, not every implementation step.

### Acceptance

Acceptance lists observable conditions that mean the workpiece is done.

These should be reviewable by the steward or another worker.

### Tests

Tests list the checks, screenshots, manual verification, or expected evidence
that prove the acceptance conditions.

### Artifacts

Artifacts are references created or used by the workpiece.

They can include files, docs, commits, screenshots, previews, handoffs, or
return notes.

Commits may be referenced as evidence for the workpiece, but commits do not
define whether the workpiece exists or what it means.

### Notes

Notes are short supporting context only when needed.

They should not become a second implementation plan.

## Minimal Template

```markdown
# Workpiece: <name>

Status: planned | active | returned | accepted | paused

## Intent

<What this concrete piece of work is trying to make true.>

## Acceptance

- <observable condition that means this workpiece is done>

## Tests

- <test, check, screenshot, manual verification, or expected evidence>

## Artifacts

- <file, doc, commit, screenshot, preview, handoff, or return note>

## Commit Evidence

- <commit sha, branch/ref, or none>

## Notes

- <short context only if needed>
```
