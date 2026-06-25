# Orchestration CLI Stages

Status: future direction

This note records the current staged direction for orchestration CLI work. It is
planning material, not accepted implementation architecture.

## Direction 1: Read-Only Context Tool

Start with a single low-friction command:

```bash
npm run orchestration-state
```

The command should infer the current project and orchestration root from the
current working directory. It should not require `--project`, `--shape`, or
`--workpiece` in the normal path.

Its job is context compression:

- identify the orchestration root;
- inspect cwd, Git, branch, `HEAD`, and worktree clues;
- match agent and run docs when possible;
- point the agent to the most relevant map, agent, run, shape, workpiece,
  checkpoint, and artifact docs;
- warn when the current session appears unmatched or stale;
- remind the agent to move its agent/run position if the work moved.

This stage should be read-only. It should not create worktrees, create runs,
create agents, or rewrite docs.

## Direction 2: Explicit Lifecycle Helpers

If the context tool repeatedly exposes the same bookkeeping failures, add
intentional helper commands for specific lifecycle steps.

Candidate commands:

```bash
npm run orchestration-start-run
npm run orchestration-return-run
```

These helpers may update mechanical fields such as status, current position,
thread id, worktree path, branch, `HEAD`, preview disposition, and return
evidence placeholders.

They should not decide strategy boundaries, acceptance, escalation triggers,
or fan-out launch order. Those remain steward decisions recorded in Markdown.

## Direction 3: Worktree-Backed Run Harness

Only if the first two stages prove useful, consider a stronger harness where
implementation runs are commonly worktree-backed.

Possible model:

```text
Run = bounded execution attempt
Worktree = execution container
Agent = current operator/contact identity
```

Typical relationship:

```text
1 run -> 1 worktree -> 1 active agent
```

This should not be treated as universal without more evidence. Steward-local
doc cleanup, review-only work, and tiny changes may not need a worktree.

The main question is whether requiring worktrees for visible implementation
runs improves output quality enough to justify the ceremony. The first context
tool should collect signals for this decision by warning when it appears to be
inside a worktree that no active run or agent doc references.

## Current Recommendation

Implement Direction 1 first.

Design it so worktree identity can become a strong matching source, but do not
make worktrees mandatory and do not add lifecycle mutation yet.
