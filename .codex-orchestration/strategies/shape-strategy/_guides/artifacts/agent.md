# Orchestration Agent Minimal Doc

Status: provisional optional artifact

Template: ../../_templates/agent.md

This file sketches a possible Markdown agent document for the orchestration
shape strategy. It is not final and should not be required by default.

## Principle

An agent doc describes who or what is acting in the orchestration graph.

Agent docs are optional. A project can visualize work without durable agent
docs when the extra artifact would add ceremony without clarity.

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

### Runtime Identity

Runtime identity records the local Codex thread or worker identity that can be
used by a read-only dashboard adapter to infer live marker activity.

Loader state is derived by the dashboard from the referenced runtime thread
when available. The agent document should name the identity; it should not store
ephemeral loader state as durable strategy truth.

### Evidence

Evidence lists artifacts that identify or explain the agent.

Evidence can include thread ids, worktrees, commits, handoffs, return notes,
screenshots, previews, or docs.

## Candidate Template

```markdown
# Agent: <name>

Status: active | idle | paused | retired

## Role

steward | worker | reviewer | observer

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

## Evidence

- Worktree: <path or branch, if any>
- Commit: <sha or branch/ref, if relevant>
- Artifact: <handoff, return note, screenshot, preview, or doc>
```
