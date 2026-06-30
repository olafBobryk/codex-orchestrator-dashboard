# Orchestration CLI Architecture

Status: accepted direction

This note records the accepted architecture direction for the orchestration CLI
surface. It is not an implementation plan yet.

## Command Surface

Use one command namespace:

```bash
npm run orchestration -- state
npm run orchestration -- check
npm run orchestration -- prepare
npm run orchestration -- update
npm run orchestration -- return
```

`npm run orchestration-state` may remain as a compatibility alias for:

```bash
npm run orchestration -- state
```

## Verb Roles

### state

Read-only context preflight.

### check

Read-only consistency check.

### prepare

Prepare a run before substantive work starts.

### update

Update current run or agent mechanical state during work.

### return

Return or accept a run at closeout.

## Plan And Apply

Mutating `orchestration` verbs default to plan mode.

`--apply` is required for filesystem or Git mutation.

Plan mode shows the exact files and fields a command would create or update.

## Prepare

`prepare` may surface candidate shapes, workpieces, runs, or checkpoints, but
the steward must choose the intended boundary before `prepare` proceeds.

`prepare` should know the run mode before deciding worktree behavior.

`prepare --apply` may create or update only:

- central `runs/*` docs;
- central `agents/*` docs;
- `map.md` run or agent references.

Other artifact types remain untouched.

For implementation mode, `prepare --apply` creates the worktree first, then
writes central docs so the run and agent docs record the real path, branch, and
`HEAD`.

`prepare --apply` requires the selected shape, workpiece, or checkpoint docs to
already exist. It may draft missing strategy docs in plan output, but it should
not invent or apply new shape, workpiece, or checkpoint docs.

`prepare --apply` may write mechanical starter fields for runs:

- status;
- mode;
- selected shape, workpiece, or checkpoint references;
- agent reference;
- start or parent checkpoint;
- delegated-by or parent steward agent;
- known thread id;
- known worktree path;
- branch;
- base;
- `HEAD`;
- initial preview disposition;
- short state summary;
- return expectations copied from existing boundary docs.

`prepare --apply` may write mechanical starter fields for agents:

- status;
- role or mode;
- parent agent;
- active shape/run references;
- current position;
- marker id when marker visibility is expected;
- known runtime identity fields;
- evidence links to selected docs.

`prepare --apply` must not write:

- acceptance status;
- product recommendations;
- shape autonomy;
- fixed decisions;
- escalation triggers;
- new workpiece acceptance criteria;
- invented verification requirements.

Ongoing agent state changes after preparation, such as pause, resume, current
position changes, or own-state updates, belong to `update`, not `prepare`.

`prepare` may produce a thread launch draft: the text the steward can send to a
worker thread, including selected boundary, run mode, docs to read, scope, hard
stops, verification, and return expectations.

The thread launch draft is not orchestration truth.

The thread launch draft is printed in plan mode. Under `--apply`, it may also
be written to an ignored temp file:

```text
.codex/tmp/orchestration-launch-<run-id>.md
```

Visible threads and hidden subagents share the same run identity. Hidden
subagents get marker docs by default so delegated work stays visible on the
dashboard. Marker docs may be suppressed only when dashboard visibility is
explicitly not wanted.

Non-implementation worktree override is deferred for the first version. If a
non-implementation task needs a worktree, the steward should choose
`implementation` mode or handle the worktree manually.

Marker suppression flags are deferred for the first version. If marker
visibility should be suppressed, edit docs manually or choose a non-visible
mode.

## Check

`check` is read-only.

Default `check` should be fast. It should not run slower validation by default.

`check` should inspect:

- selected orchestration root and root kind;
- current Git repo, branch, `HEAD`, and upstream;
- whether current checkout is a linked worktree;
- whether current thread, worktree, or branch matches an agent/run;
- whether active run refs in `map.md` point to existing run docs;
- whether agent refs point to existing agent docs;
- whether live agent marker statuses are live statuses;
- whether accepted or returned agents are still listed as active/live markers;
- whether worktree path, branch, or `HEAD` in docs still match the current
  checkout;
- whether preview fields are coherent, but not necessarily reachable by
  default;
- whether adapter validation should be run.

Warnings include:

- weak identity match;
- thread id conflicts with branch or worktree evidence;
- active accepted or returned run refs;
- missing preview URL where preview is optional;
- stale `HEAD` in docs;
- unmatched candidate runs.

Hard stops include:

- missing selected orchestration root;
- map references missing run or agent docs;
- current implementation worktree has no matching active run/agent;
- `--auto-accept` requested but gates, checks, preview, or Git state are
  unsafe;
- adapter validation failure when `check` is run with adapter validation
  enabled.

Default `check` should print the adapter-check command instead of running it
when adapter validation may be slow.

`check --full` may run adapter validation and any slower consistency checks.
Use `--full` as the slower-validation flag. Avoid `--adapter` as the primary
flag because future full checks may include more than adapter validation.

Identity conflicts downgrade confidence and show candidates. `check` and
`state` should not report high confidence while warning that a thread hint did
not match the selected agent or run.

## Update

`update` follows the same plan/apply model. Plan mode shows the exact current
run and agent fields it would change. `update --apply` is required to write
changes.

`update` uses the same identity matching as `state`.

`update --apply` may write mechanical in-progress fields:

- agent status: `active`, `paused`, or `blocked`;
- run status: `active`, `paused`, or `blocked`;
- current node, workpiece, or checkpoint;
- short state summary;
- preview owner, disposition, URL, or PID;
- branch, `HEAD`, and worktree path refresh;
- thread id when newly known;
- marker position when it follows current node;
- evidence links for new preview, commit, branch, thread, or worktree facts.

`blocked` may be set by `update --apply` while the run is still in progress.
A blocked run does not have to be returned immediately.

`update --apply` must not write:

- `returned`;
- `accepted`;
- shape status;
- workpiece acceptance criteria;
- map structural changes beyond current-position or marker references;
- product decisions;
- escalation trigger edits.

`update` should use explicit flags rather than free-form field assignment.

Examples:

```bash
npm run orchestration -- update --position workpieces/foo.md
npm run orchestration -- update --status paused
npm run orchestration -- update --status blocked --note "Waiting on API key decision"
npm run orchestration -- update --preview left-running --url http://localhost:3012
npm run orchestration -- update --refresh-git
npm run orchestration -- update --thread 019...
npm run orchestration -- update --apply
```

Without `--apply`, `update` prints what would change.

`--status` accepts only `active`, `paused`, and `blocked`.

`--position` updates current node, workpiece, or checkpoint and marker
position.

`--preview` accepts only `sidecar-used`, `left-running`, `stopped`, or
`unavailable`.

`--refresh-git` updates branch, `HEAD`, and worktree evidence from the current
checkout.

`--thread` attaches a thread id when known.

`--note` updates a short state summary, not arbitrary doc prose.

Do not support free-form `--set field=value` in the first version.

## Return

`return` follows the same plan/apply model.

Plan mode shows detected Git, docs, preview, verification, run, and agent state,
plus the mechanical return fields it would write.

`return --apply` may write only accepted mechanical return fields.

`return --apply` may update run docs:

- `Status: returned`, or `Status: accepted` with `--auto-accept`;
- state summary;
- branch, `HEAD`, and worktree;
- commit evidence;
- verification summary;
- preview owner, disposition, URL, PID, and notes;
- return evidence;
- gate/return section;
- end/result section if the run doc has one.

`return --apply` may update agent docs:

- `Status: returned`, or `Status: accepted` with `--auto-accept`;
- current position;
- runtime identity refresh;
- evidence links;
- preview link if the agent doc carries it.

`return --apply` may update `map.md`:

- remove the run from `Active Run References` when returned or accepted;
- move the run to returned or accepted references if those sections exist;
- keep or update agent references according to marker behavior;
- remove live marker refs for accepted non-live agents.

`return --apply` may update a workpiece status to `returned` or `accepted` only
when that workpiece is the selected run target.

`return --apply` must not edit:

- workpiece acceptance criteria;
- workpiece strategy fields;
- shape status;
- checkpoint creation;
- edge creation/removal;
- architecture or product decisions;
- pressure-ledger entries;
- unrelated artifact docs.

For implementation returns, commit evidence is recommended when the repo or
worktree model supports it. The CLI treats commits as strong return evidence,
not as the orchestration source of truth.

`return` may support an explicit commit flag for creating or recording a
reviewable implementation commit. Commit behavior is not implicit.

`return --commit` is valid only with `--apply`.

Default `return` reads Git state, does not commit, and shows whether a commit is
recommended or required by mode.

`return --commit --apply` may create one commit for the run's currently changed
tracked files and relevant untracked files.

`return --commit` may stage files itself only if they are inside the run's
allowed scope. Plan mode must list the files first. Out-of-scope files are a
hard stop.

Default commit message:

```text
Complete <run title>
```

If `--auto-accept` is present:

```text
Accept <run title>
```

If run mode is `docs-only`:

```text
Record <run title>
```

The commit body should include:

- run id;
- agent id;
- shape/workpiece;
- verification summary when known;
- preview URL/disposition when known.

Hard stops for `return --commit`:

- changed files outside selected run scope;
- unresolved conflict state;
- no changed files;
- generated or ignored files only;
- secret/env files present;
- failing required checks if checks were supplied;
- current branch does not match run branch for implementation mode;
- worktree path does not match run docs for implementation mode.

`return` may support an explicit `--auto-accept` flag for pre-authorized work.
Auto-accept is not the default and does not let the CLI decide product quality.

`--auto-accept` means the command may close the run as accepted, remove or
update active refs as appropriate, record accepted evidence, and produce an
accepted closeout packet instead of a review packet.

Auto-accept is blocked by:

- failing checks;
- skipped verification when verification is required;
- changed files outside scope;
- dirty repo after commit when clean return is required;
- merge conflicts;
- unresolved human gates;
- run status already blocked;
- adapter failure;
- product, architecture, security, or content decisions;
- touched secret/env files;
- missing required preview evidence;
- package or dependency changes outside selected scope;
- generated files only;
- thread/worktree identity mismatch;
- unsafe Git state for the selected run mode.

## Verification And Preview On Return

Verification is default behavior for `return`.

`return` should run or request the relevant verification path for the selected
run mode. If verification creates problems or is intentionally out of scope,
the command may support an explicit skip path.

Skipping verification should be visible in plan and closeout output.

`return` should not invent test results.

If no verification result is available, `return` records verification as not
supplied or skipped, depending on the selected path.

Manual verification flags are a future direction, not part of the accepted
initial behavior:

```bash
--verified "npm run lint"
--verified "npm run build"
--verification-summary "lint and build passed"
```

Implementation-specific verification discovery beyond the default verification
path is deferred for the first version. Add richer discovery only after
repeated failures show the need.

`return` may check preview reachability only when a preview URL is known.

Default preview checking should be lightweight HTTP reachability, not
browser/Playwright.

If preview is required by run mode or scope and unreachable, that blocks
`--auto-accept`.

If preview is optional and unreachable, that is a warning.

Preview disposition must be one of:

- `sidecar-used`;
- `left-running`;
- `stopped`;
- `unavailable`.

Never record a URL as live if disposition is `stopped` or `unavailable`.

Allowed `return --apply` preview fields:

- owner;
- disposition;
- URL;
- PID when known;
- notes.

Accepted closeout packet under `--auto-accept` should include:

- commit hash if created or present;
- files changed summary;
- verification summary;
- preview disposition;
- accepted run/workpiece status;
- remaining warnings, if any;
- explicit "accepted by pre-authorized auto-accept" note.

## Mode Defaults

### implementation

- Worktree default: yes.
- Marker default: yes, including hidden subagents, unless visibility is
  explicitly suppressed.
- Thread launch draft: yes.
- Commit evidence on return: recommended.
- Auto-accept: allowed only if pre-authorized and no hard-stop gate is present.

### discussion

- Worktree default: no.
- Marker default: optional, only when dashboard visibility matters.
- Thread launch draft: yes.
- Commit evidence on return: not expected.
- Auto-accept: no. Discussion returns recommendations, not accepted
  implementation.

### review

- Worktree default: no, unless reviewing a dirty isolated worktree.
- Marker default: optional.
- Thread launch draft: yes.
- Commit evidence on return: not expected.
- Auto-accept: no by default.

### docs-only

- Worktree default: no, unless docs are risky/large or repo is already dirty.
- Marker default: usually no.
- Thread launch draft: optional.
- Commit evidence on return: recommended if docs are applied.
- Auto-accept: allowed for tightly scoped mechanical doc updates.

### steward-local

- Worktree default: no.
- Marker default: no; steward marker already exists.
- Thread launch draft: no.
- Commit evidence on return: optional.
- Auto-accept: not applicable.

Hidden subagents get marker docs by default so delegated work remains visible
on the dashboard. Suppress marker docs only when dashboard visibility is
explicitly not wanted.

## Identity Defaults

### Run Id

Default to selected boundary slug plus a short unique suffix.

Example:

```text
about-static-page-preview-7f3a
```

If the selected workpiece is more specific than the shape, use the workpiece
slug.

Do not use thread ids as the main run id. A run may later move from hidden
subagent to visible thread.

### Agent Id

Default to run id plus role suffix.

Example:

```text
about-static-page-preview-agent-7f3a
```

If mode is `steward-local`, use the existing steward agent instead of creating
a new agent.

If mode is `review`, the suffix may be `reviewer` instead of `agent`.

### Branch Name

For implementation worktree runs, use:

```text
codex/<run-id>
```

Example:

```text
codex/about-static-page-preview-7f3a
```

For docs-only applied work without a worktree, no branch is created by default.

### Worktree Path

Default under Codex worktrees:

```text
/Users/olafbobryk/.codex/worktrees/<suffix>/<repo-name>
```

Example:

```text
/Users/olafbobryk/.codex/worktrees/7f3a/averlo-rebrand
```

The suffix should match the run suffix so path, branch, run, and agent
correlate.

### Thread Id

Thread id is not part of the initial required id.

Record it later when known.

### Collision Handling

If any id, path, or branch already exists, generate a new suffix and print the
collision in plan mode.

Do not overwrite existing run or agent docs unless explicitly updating the same
selected run.

### Deferred

Human override, such as `--id <slug>`, is deferred.

## Skill Reminder

The personal `$orchestration-cli-reminder` skill points agents at this command
surface. It starts with `npm run orchestration -- state`, uses `check`,
`prepare`, `update`, or `return` only when the task explicitly calls for those
lifecycle phases, and keeps read-only preflight behavior as the default.
