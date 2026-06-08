# Codex Orchestrator Dashboard Discussion Handoff

## Status

Discussion only. Do not implement yet.

## Origin

This project is a sibling exploration from:

`/Users/olafbobryk/Documents/Code/Personal/2026/codex-ui`

The existing app, Codex Skill Overlay, is a lightweight Electron overlay for
selecting Codex skills and composing prompts. It did not become a durable habit.
The likely reason is that the user's workflow has shifted from choosing skills
to coordinating multi-agent orchestration.

## Current Product Question

Should Codex Skill Overlay be retired and replaced by a typical shadcn-style
dashboard for an orchestrator agent that tracks visual status of the project
ledger?

The dashboard would support the user's newer workflow around:

- `agent-orchestration-strategy`
- `packet-planner`
- `chunked-delivery-planner`
- `agent-split-off`
- `agent-return`
- `handoff-pointer`
- worktree-aware spawned agent execution
- durable concern bubble-up
- human gates

## Important Architecture Concern

The user raised this concern:

> I was wondering about the repeatability of this. We will have to tie the
> orchestration skill to this project by path and then it will create a small
> instance running here, or we have a central one that changes between projects?
> This quickly turns into Codex and other overlay. Consider this and discuss
> first.

## Current Preferred Direction

Use one central dashboard app that switches between projects by workspace path.

Avoid creating one tiny dashboard instance per project.

Suggested shape:

```text
Central app:
~/Documents/Code/Personal/2026/codex-orchestrator-dashboard

Per-project state:
<project>/.codex-orchestration/
  project.json
  architecture.md
  packets/*.md
  ledgers/*.md
  handoffs/*.md
  concerns.md
```

The central app should be a viewer/editor/command surface. Durable truth should
stay inside each project so agents can read it, humans can review it, and Git can
diff it.

## Boundary

The dashboard should:

- Visualize packet, ledger, handoff, concern, gate, verification, preview, and
  next-action state.
- Edit durable orchestration docs.
- Generate deterministic prompts for orchestrator, packet, spawn, return, and
  concern workflows.
- Eventually help create or continue Codex threads if that remains within the
  accepted boundary.

The dashboard should not:

- Replace Codex chat.
- Become a general chat client.
- Execute implementation work.
- Hide real permission, environment, verification, or product-readiness states.
- Fork global skills into project-specific copies.
- Store critical orchestration truth only in app-private state.

## Discussion Tasks For Next Agent

Continue discussion only. Do not scaffold or implement.

Pressure-test:

- Central dashboard versus per-project local instances.
- How repeatability should work across projects.
- How a new project should be bootstrapped into orchestration.
- Whether `.codex-orchestration/` is the right project-local durable state path.
- Whether docs should be Markdown with frontmatter, JSON, or both.
- What the minimum useful dashboard data model should include.
- Which prompt-generation commands are essential for MVP.
- Where the global `agent-orchestration-strategy` skill ends and project-local
  docs begin.
- How to avoid becoming another overlay or a partial Codex clone.

Produce:

- A concise architecture recommendation.
- A recommended MVP scope.
- A first packet proposal.
- Any hard human gates before implementation.

## Candidate MVP

The smallest useful version likely does four things:

1. Parse project-local orchestration docs and show packet or ledger status.
2. Generate the exact spawn prompt for a selected packet.
3. Import, link, or summarize a returned handoff.
4. Surface concerns and gates visually.

## Candidate Commands

- `plan orchestration`
- `make packet`
- `chunk packet`
- `spawn packet`
- `receive return`
- `bubble concern`
- `handoff pointer`
- `next action`

