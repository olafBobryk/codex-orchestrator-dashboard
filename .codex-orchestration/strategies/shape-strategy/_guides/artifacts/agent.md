# Orchestration Agent Minimal Doc

Status: provisional optional artifact

Template: ../../_templates/agent.md

This file sketches a possible Markdown agent document for the orchestration
shape strategy. It is not final and should not be required by default.

## Principle

An agent doc describes who or what is acting in the orchestration graph.

Agent docs are optional unless marker visibility is expected. A project can
visualize work without durable agent docs when the extra artifact would add
ceremony without clarity, but a live worker marker needs an agent doc with a
current position and runtime identity when available.

`Status:` is architecture-level strategy state for the agent. It is not a
dashboard rendering instruction.

Agent markers represent live operational presence only. The dashboard should
render markers for `active`, `in_progress`, and `paused` agents. Historical or
non-live statuses such as `returned`, `accepted`, `planned`, `idle`, or
`retired` can remain as docs and evidence, but should not render markers or
missing-position warnings.

Checkpoint status represents project position. Run docs represent execution
history. Agent markers represent live operational presence.

## Steward As Agent

A steward can be represented as an agent with non-writing authority rather than
as a special central graph role.

This keeps the graph open to multiple shapes:

- one steward;
- multiple stewards;
- no clear steward;
- worker-to-worker coordination;
- messy agent-to-agent work without clean central ownership.

## Candidate Sections

### Role

Role describes what kind of orchestration actor this is.

Candidate values:

- `steward`
- `worker`
- `reviewer`
- `observer`

### Mode

Mode describes how the agent is currently operating.

Candidate values:

- `subagent`
- `visible-thread`
- `steward`
- `worker`
- `reviewer`

Mode is not lifecycle status. Do not encode mode into status.

### Parent Agent

Parent agent records the steward or supervising agent when one exists.

Use `none` when the agent has no useful parent in the graph.

### Authority

Authority describes what the agent is allowed to do.

Candidate values:

- `writing`
- `non-writing`
- `review-only`
- `unknown`

### Intent

Intent states what this agent exists to do in the orchestration graph.

### Active Shape References

Active shape references list shapes this agent is currently attached to.

### Active Run References

Active run references list runs this agent is currently doing or supervising.

### Current Position

Current position describes where the agent appears in the graph, usually through
a node or marker.

The dashboard can render this as a marker attached to the referenced node. The
marker is visual position, not a workflow status bucket.

Create or update the agent doc before substantive mutation when the worker
should be visible as a live dashboard marker.

### Runtime Identity

Runtime identity records the local Codex thread or worker identity that can be
used by a read-only dashboard adapter to infer live marker activity.

Loader state is derived by the dashboard from the referenced runtime thread
when available. The agent document should name the identity; it should not store
ephemeral loader state as durable strategy truth.

Runtime identity can also record worktree path, preview URL, branch, and `HEAD`
when those facts explain where the worker is operating.

### Evidence

Evidence lists artifacts that identify or explain the agent.

Evidence can include thread ids, worktrees, commits, handoffs, return notes,
screenshots, previews, or docs.

When a worker runs in an isolated worktree, evidence may link to the local
agent or run docs in that worktree. Those local docs are evidence; the steward
checkout still owns the central projection stub when dashboard visibility is
expected.

## Candidate Template

```markdown
# Agent: <name>

Status: active | in_progress | paused | returned | accepted | planned | idle | retired

## Role

steward | worker | reviewer | observer

## Mode

subagent | visible-thread | steward | worker | reviewer

## Parent Agent

- Agent: `<agent-id>` | none

## Authority

writing | non-writing | review-only | unknown

## Intent

<What this agent exists to do in the orchestration graph.>

## Active Shape References

- `<shape-id>`: <why this agent is attached to the shape>

## Active Run References

- `<run-id>`: <what this agent is doing in the run>

## Current Position

- Node: `<node-id>` | none
- Marker: `<marker-id>` | none

## Runtime Identity

- Thread: <thread id or none>
- Agent: <agent id, nickname, or none>
- Worktree: <path or none>
- Branch: <branch or none>
- HEAD: <commit or none>
- Preview: <url or none>

## Evidence

- Worktree: <path or branch, if any>
- Commit: <sha or branch/ref, if relevant>
- Artifact: <handoff, return note, screenshot, preview, or doc>
```
