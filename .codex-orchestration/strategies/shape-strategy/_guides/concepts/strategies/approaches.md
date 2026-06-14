# Shape Strategy Approaches

Status: accepted lightweight concepts

This file records small strategy concepts that are useful enough to name but
not heavy enough to become artifact schemas, adapter behavior, or workflow
skills by default.

## Checkpoint Fan-Out

Checkpoint fan-out is the steward pattern where one checkpoint opens multiple
independent downstream branches.

Fan-out means the branches can be evaluated separately for readiness,
ownership, file overlap, risk, and verification. It does not mean all branches
must launch at the same time.

Branches may be:

- parallel, when ownership and verification are independent enough;
- staggered, when one branch is ready but another needs more definition;
- ordered, when one branch creates primitives, APIs, or decisions the next
  branch depends on;
- deferred, when a branch is visible but not accepted as active scope.

The checkpoint remains the project position. Branches are possible next work
directions. Runs and agents are created only when a branch is activated.

Before launching visible agents from a fan-out checkpoint, check:

- whether the branches touch the same source files;
- whether either branch depends on the other;
- whether verification can happen independently;
- whether a shared architecture or product decision is still unresolved;
- whether each branch has a clear shape, workpiece, or run boundary.

Fan-out can be conceptual, staggered, or parallel depending on those checks.
Parallel launch is allowed, but not implied.

If this pattern repeats enough to need operational support, it may later become
a small skill that recommends split shape, launch order, run docs, agent docs,
and human gates. That skill should not spawn agents automatically.

## Lifecycle Wrapper Direction

The shape strategy may benefit from a narrow wrapper that handles repetitive
Git and documentation bookkeeping.

The justification is output quality, not automation for its own sake. A wrapper
is useful only if it reduces known failure classes such as stale Git facts,
missing active run refs, dead agent markers, premature steward packets, or
inconsistent return state.

The preferred boundary is:

- add rigidity around lifecycle bookkeeping;
- keep orchestration judgement in the steward and docs.

A wrapper may mutate mechanical fields such as:

- `Status`;
- active run references;
- agent references;
- current position;
- thread id;
- worktree path;
- branch and `HEAD`;
- commit evidence;
- verification summary placeholders.

A wrapper should not author strategy judgement such as:

- shape boundaries;
- fixed decisions;
- autonomous decisions;
- escalation triggers;
- acceptance decisions;
- fan-out launch recommendations;
- pressure interpretation.

The first useful wrapper candidates are `shape:check` and `shape:return-run`,
because return paths have already exposed repeated errors. `shape:start-run`
can follow only if the return wrapper proves that mechanical rigidity improves
closeout quality.

Avoid turning the wrapper into a JSON authoring API or a hidden orchestrator.
Commands should write or update a few known fields and leave Markdown
human-readable.

## Central Steward Projection

The dashboard should read one project-local projection source: the steward or
main checkout `.codex-orchestration` docs.

Worker worktrees may keep their own run and agent docs as local execution
evidence, but those worktree-local docs are not the primary dashboard
projection source. If delegated work should be visible on the steward
dashboard, the main checkout should contain central agent and run stubs for the
currently relevant work.

Central projection stubs are required when dashboard visibility matters:

- active steward presence;
- active workers or subagents;
- visible thread workers;
- returned review candidates;
- unresolved human gates;
- accepted checkpoints when they explain project position;
- preview URLs that should be reviewed;
- worktree paths, branch names, and `HEAD` references that explain where work
  happened.

The steward should create or update central stubs at spawn time, return time,
and acceptance time. This keeps active and returned work visible before a
worker worktree is consolidated.

Worker worktrees should not be the only source of active projection truth. A
worker may write local evidence in its worktree, but central projection docs
should be steward-owned unless the steward explicitly authorizes a worker to
patch the main checkout projection docs.

Lifecycle status and execution mode must stay separate:

- lifecycle status: `active`, `paused`, `returned`, `blocked`, `accepted`,
  `archived`;
- execution mode: `subagent`, `visible-thread`, `steward`, `worker`,
  `reviewer`.

Do not encode mode into status. Avoid fake statuses such as `active-sub` or
`returned-thread`.

Promotion from hidden or low-contact work to a visible thread should be a
metadata transition, not a new run identity. Preserve the run and shape
identity, update `Mode: visible-thread`, add the thread id when available, and
keep the current workpiece position.

Recommended projection treatment:

- `active`, `in_progress`, and `paused`: live worker marker;
- `returned`: review-candidate marker or returned-review detail, visually
  distinct from live worker presence;
- `blocked`: gate marker or blocked-gate detail when unresolved human action
  remains;
- `accepted`: hidden by default or muted history;
- `archived`: hidden.

Until the dashboard has separate returned-review and blocked-gate projection
styles, returned and blocked agents should remain available in docs/details
without being mistaken for live workers.

Subagents should be the default for bounded shape work where the steward can
safely supervise. Promote to a visible thread when the branch is long-running,
needs repeated direct user review, has a live preview the user should inspect,
or may need direct steering. Never use hidden subagents silently when the user
asked for a new agent or thread and expects sidebar visibility.

A future `$steward-subagent-loop` skill may coordinate this pattern. It should
decide when to spawn a subagent, monitor returned packets, escalate only true
human gates, promote to visible thread when needed, and update central run and
agent docs consistently. Because Codex does not currently provide a native
continuous steward loop primitive, this should start as explicit steward turns,
a goal-backed steward session, or a future app/runtime capability.

## Review Preview Ownership

Runs should return the most direct valid review target.

For UI or app-facing work, that usually means a verified live review URL. If no
live URL is available, the run should say `unavailable` and explain why.

Long-lived review preview should be steward or sidecar owned when available.
Worker dev servers are temporary verification tools unless explicitly retained.

Preview state belongs on the run as lightweight closeout information, not as a
separate workflow system by default. Record:

- owner: `sidecar`, `worker-temp`, `external`, or `none`;
- disposition: `sidecar-used`, `left-running`, `stopped`, or `unavailable`;
- verified URL or `none`;
- PID when known;
- whether the URL is durable review or temporary verification.

Use random or free ports for temporary worker previews to avoid collisions.
Stable review should prefer a sidecar or steward-owned service over random
worker ports.

Never report a URL as live after stopping its server.

The reusable `$preview-restart` skill can recover stale preview links, prefer a
durable sidecar when available, or start a temporary verification preview on a
free port when needed.
