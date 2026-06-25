# Concept: Orchestration State CLI

Status: rolling design

## Intent

Define a lightweight read-only CLI that gives an agent the current relevant
orchestration context before it acts.

The core value is not validation. The core value is context compression:

- where this working session appears to sit in the orchestration map;
- which agent, run, shape, workpiece, checkpoint, and artifact docs matter
  next;
- which files to read for deeper context;
- what state must be updated if the session moves.

The CLI should preserve the modular Markdown artifact model. It should not
merge all artifacts into one large editable block, and it should not become a
JSON authoring API.

## Current Direction

The preferred command surface should be one general command with no required
project argument:

```bash
npm run orchestration-state
```

The command should infer context from the current working directory first, then
from orchestration docs and local runtime hints when available.

Required flags such as `--project`, `--shape`, or `--workpiece` should not be
part of the default path. They can exist later as debug or override options,
but the normal agent path should be a single preflight command.

## Locked Data Source: Current Working Directory

The current working directory is an accepted data source.

The CLI should walk upward from `process.cwd()` to find the nearest relevant
product or orchestration root. It should recognize:

- a selected orchestration root with `map.md`;
- a product repo with `docs/orchestration/map.md`;
- a legacy product repo with `.codex-orchestration/map.md`;
- this dashboard source repo's canonical strategy fallback only when relevant.

This keeps the command usable inside product checkouts, docked orchestration
repos, and worker worktrees without requiring the agent to pass a path.

## Not Yet Locked: Thread Environment Variables

Thread identity is useful, but the exact source is not locked.

`CODEX_THREAD_ID` should not be assumed as canonical until we verify whether it
is Codex-provided, repo-provided, or absent in normal desktop and worker
sessions.

For now, thread id is a possible search hint, not a required contract. If a
thread id is available from environment, runtime metadata, a local session file,
or a user-provided debug flag, the CLI may use it to match agent and run docs.

The CLI should report where a thread id came from when it uses one.

## Accepted Lookup Target: Agent And Run Docs

Agent and run docs are the right lookup targets once the CLI has identifying
marks.

The current strategy already records runtime identity fields in agent and run
templates, including thread, Codex agent, worktree, branch, and `HEAD`.

The CLI should scan `agents/*.md` and `runs/*.md` for matches such as:

- thread id;
- subagent id;
- visible thread id;
- worktree path;
- branch;
- `HEAD`;
- current node or workpiece.

When a match is found, the CLI should emit the matched agent, run, current
position, relevant shape/workpiece/checkpoint/artifact docs, and a confidence
summary explaining what matched.

The command should not pretend to know when evidence is weak. Low-confidence
matches should be reported as candidates.

## Worktree Identity Discussion

Worktree identity may be more reliable than thread id for implementation
workers.

If this proves true, the strategy may want to increase the lifecycle boundary:

- visible implementation runs happen in worktrees by default;
- a run, agent, and worktree become close to a `1:1:1` operational unit;
- the CLI can use worktree path, branch, and `HEAD` as strong location marks;
- docs become the direction harness while commands handle repeatable
  bookkeeping.

This is not locked yet.

The open question is whether requiring worktrees for runs improves quality
enough to justify the ceremony. It may reduce lost context and stale projection
state, but it may be too heavy for small steward-local work.

## Output Shape

The CLI should output concise current context, then point to files for deeper
reading.

Suggested output sections:

- orchestration root and root kind;
- identity source and confidence;
- matched agent and status;
- matched run and status;
- current node/workpiece;
- relevant shape;
- nearby checkpoints;
- active gates or warnings;
- preview disposition, when present;
- files to read next;
- reminder to move the agent entity if the work changes position.

The reminder is important:

```text
If this work moved to another node/workpiece, update the agent Current Position
and run State Summary before return.
```

The first version should be read-only. It should not update agent position,
create runs, create worktrees, or rewrite docs.

## Relationship To Adapter Checks

`orchestration-state` is a context preflight command.

`check:shape-strategy-adapter` is a projection validity command.

Do not merge these responsibilities too early. The state command helps agents
understand what to read and where they are. The adapter check verifies whether
the graph projection is structurally valid.

## Command Surface Still Open

The final command structure should be decided after collecting several likely
data sources and matching examples.

Do not lock a broad command family yet.

Start with the central context command, then add narrowly justified commands
only when a repeated failure class proves the need.
