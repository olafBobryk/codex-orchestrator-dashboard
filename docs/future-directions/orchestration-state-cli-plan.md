# Orchestration State CLI Plan

Status: planning

This doc plans the first concrete CLI tool for the orchestration strategy. It
builds on `orchestration-cli-stages.md` and the source strategy concept note at
`.codex-orchestration/strategies/shape-strategy/_guides/concepts/orchestration-state-cli.md`.

## Goal

Create one read-only command that tells an agent where it is in the current
orchestration system and which files to read next.

Default command:

```bash
npm run orchestration-state
```

The command should be useful at the start of a run, before a return, and any
time the agent is unsure which orchestration docs are current.

Target repos should expose the command locally through:

```bash
npm run update:orchestration-cli -- <target-repo-or-orchestration-root>
```

That update command copies the CLI into the target orchestration root and adds
an `orchestration-state` package script when a product `package.json` exists.

## Must Have

- No required arguments in the normal path.
- Read-only behavior.
- Current-working-directory discovery.
- Docked root support: `docs/orchestration/`.
- Legacy root support: `.codex-orchestration/`.
- Clear selected orchestration root and root kind.
- Agent/run matching when enough identity evidence exists.
- Confidence reporting for matches.
- Candidate output instead of pretending when identity is ambiguous.
- Direct file paths for the most relevant docs to read next.
- Warning when a likely worker/worktree is not represented by any active run or
  agent doc.
- Reminder to update agent/run position if the session moved.
- Separation from `check:shape-strategy-adapter`.

The first version should not:

- create worktrees;
- create run docs;
- create agent docs;
- move agent position;
- change statuses;
- rewrite map, shape, workpiece, checkpoint, or artifact docs;
- decide acceptance, escalation, or launch order.

## Safest Association Path

The safest association path is evidence-based and transparent.

The command should not depend on one hidden identity source. It should collect
multiple local marks, score matches, and explain the score.

Recommended matching order:

1. Discover the orchestration root from the current working directory.
2. Read Git facts from the current checkout: repo root, branch, `HEAD`, and
   whether the checkout is a linked worktree.
3. Scan `agents/*.md` and `runs/*.md` for matching runtime fields.
4. Use thread id only when available and report where it came from.
5. If no strong match exists, show active agents/runs/checkpoints as candidates.

High-confidence matches should require at least one strong local mark:

- current worktree path matches a run or agent;
- current branch and `HEAD` match a run or agent;
- current thread id matches a run or agent and the source of that thread id is
  known;
- an ignored local session file explicitly points to an agent/run.

Low-confidence signals, such as current node names or prose references, should
only produce candidates.

## Identity Sources

### Current Working Directory

Locked as a valid source.

The CLI should walk upward from `process.cwd()` to locate a product checkout or
orchestration root. This is the default association anchor.

### Git Worktree Facts

Likely the strongest practical source for implementation workers.

Use:

- repository root;
- worktree path;
- branch;
- `HEAD`;
- upstream branch when available.

These facts should be compared against agent and run docs. A worktree with no
matching active run/agent should produce a warning.

### Thread Identity

Useful but not yet locked.

Do not assume `CODEX_THREAD_ID` exists or is canonical. Treat any thread id as
a search hint unless we verify its source in normal Codex desktop, visible
thread, subagent, and worktree sessions.

If the CLI uses a thread id, it should print the source:

```text
Thread id source: CODEX_THREAD_ID
```

or:

```text
Thread id source: not available
```

### Local Session File

Potential later source, not Stage 1 required.

A future lifecycle helper could write an ignored local file such as:

```text
.codex/orchestration-session.json
```

with:

```json
{
  "agent": "agents/contact-booking-form-subagent.md",
  "run": "runs/contact-booking-form-system-subagent.md",
  "threadId": "...",
  "worktree": "..."
}
```

This should not be required for Stage 1 because it implies a setup step that
does not exist yet.

## Output Contract

The human-readable output should be compact and deterministic.

Suggested shape:

```text
Orchestration root:
  /path/to/docs/orchestration
  kind: docked

Identity:
  confidence: high | medium | low | none
  matched by: worktree path, branch, HEAD
  thread id source: not available

Matched agent:
  agents/contact-booking-form-subagent.md
  status: active
  current node: contact-booking-source-discovery

Matched run:
  runs/contact-booking-form-system-subagent.md
  status: active
  preview: left-running http://localhost:3011

Read next:
  1. agents/contact-booking-form-subagent.md
  2. runs/contact-booking-form-system-subagent.md
  3. shapes/contact-booking-form-system.md
  4. workpieces/contact-booking-source-discovery.md
  5. artifacts/contact-booking-source-index.md

Warnings:
  none

Reminder:
  If this work moved to another node/workpiece, update the agent Current
  Position and run State Summary before return.
```

An optional `--json` output may be useful later for tests or dashboard
integration, but it should not be required for the first useful human-facing
tool.

## Tiny Skill Direction

A small optional skill can make the command habitual without adding ceremony.

Possible skill name:

```text
orchestration-state-preflight
```

Purpose:

- tell agents to run `npm run orchestration-state` at the start of a run when
  the repo provides it;
- use the command output to read the right docs;
- keep agent and run docs current when position changes;
- run it again before return;
- fall back to `AGENTS.md`, `docs/ORCHESTRATION.md`, and map docs when the
  command is not available.

The skill should stay tiny. It should not replace `agent-orchestration-strategy`,
`agent-worktree-workflow`, or `shape-run-return`. It only teaches the preflight
habit.

Candidate skill body:

```markdown
# Orchestration State Preflight

When working in a repo that has Codex orchestration docs, run:

`npm run orchestration-state`

Use the output to identify the current orchestration root, matched agent/run,
current node, relevant shape/workpiece/checkpoint/artifact docs, and warnings.

If the command says the current work moved, update the agent Current Position
and run State Summary before return.

If the command is unavailable, fall back to reading `AGENTS.md`,
`docs/ORCHESTRATION.md`, and the current orchestration map.
```

Do not create the skill until Stage 1 exists or the team accepts that the skill
can mention a planned-but-not-yet-available command.

## Stage 1 Implementation Sketch

Stage 1 can be implemented without changing the docs schema.

Likely implementation pieces:

- reuse the existing orchestration root resolver;
- add a Node script under `scripts/orchestration-state.mjs`;
- add `npm run orchestration-state`;
- parse top-level fields and key sections from map, agent, and run docs;
- use Git CLI for cwd, repo root, worktree list, branch, and `HEAD`;
- produce deterministic text output;
- test against:
  - this dashboard repo;
  - Averlo product root;
  - Averlo `docs/orchestration`;
  - a worktree path if one is available;
  - an empty/non-orchestrated repo.

## Stage 1 Plan

Stage 1 should ship the smallest useful context preflight.

### Packet Goal

Add `npm run orchestration-state` as a read-only CLI that can be run with no
arguments from a product repo, docked orchestration root, legacy orchestration
root, or worker worktree.

The command should tell the agent:

- which orchestration root was selected;
- what Git/worktree facts were detected;
- whether an agent or run doc appears to match the current session;
- which docs to read next;
- which warnings or stale-association risks exist;
- what to update manually if the agent has moved.

### Scope

- Add `scripts/orchestration-state.mjs`.
- Add `npm run orchestration-state`.
- Reuse the existing orchestration root resolver behavior where practical.
- Read Markdown docs directly from the selected orchestration root.
- Parse only lightweight fields and sections needed for context.
- Inspect local Git facts with the Git CLI.
- Produce deterministic human-readable text output.
- Keep the command read-only.

### Out Of Scope

- No worktree creation.
- No run or agent doc creation.
- No doc mutation.
- No automatic status changes.
- No acceptance or launch-order decisions.
- No global Codex runtime dependency.
- No hard requirement that thread id exists.
- No replacement for `check:shape-strategy-adapter`.

### Association Rules

Use transparent matching rather than hidden magic.

Suggested match strengths:

- high: worktree path, known thread id, or explicit local session file points to
  a single active agent/run;
- medium: branch plus `HEAD` or branch plus worktree root points to a single
  plausible active agent/run;
- low: only prose/current-node references match;
- none: no plausible match.

When confidence is low or none, the command should show active candidates
instead of choosing one.

### Required Output

The output must include:

- orchestration root path and kind;
- current Git repo root, branch, and `HEAD` when available;
- thread id source or `not available`;
- matched agent/run or candidate agents/runs;
- current node/workpiece when known;
- read-next file list;
- warnings;
- reminder to update agent Current Position and run State Summary if the work
  moved.

### Baseline Verification

Run:

```bash
node --check scripts/orchestration-state.mjs
npm run orchestration-state
npm run orchestration-state -- --help
npm run check:shape-strategy-adapter -- /Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard
```

Then run the command from:

- dashboard repo root;
- Averlo product root:
  `/Users/olafbobryk/Documents/Code/Averlo/2026/averlo-rebrand`;
- Averlo docked orchestration root:
  `/Users/olafbobryk/Documents/Code/Averlo/2026/averlo-rebrand/docs/orchestration`;
- one known worker/worktree path if one is still available.

### Final Test 1: Averlo Fake Last-Mile Association

After the command works normally, run it against Averlo while faking the last
association mile.

The goal is to verify that the CLI can produce the right context when supplied
or exposed enough identifying marks for a known active Averlo agent/run.

Acceptable ways to fake the association, depending on the implemented command
surface:

- set a temporary env var with the visible/contact-booking thread id if thread
  id lookup is supported as a search hint;
- run from a worktree path recorded in an active Averlo run/agent doc if one is
  available;
- add a temporary ignored local session file only if the implementation already
  supports it and the file is not committed.

Expected result:

- selected root resolves to Averlo `docs/orchestration`;
- matched or candidate agent/run points to the intended active Averlo context;
- output includes the relevant agent, run, shape, workpiece, and artifact docs;
- output explains which identity source was used;
- no docs are mutated.

### Final Test 2: External Detour Review

Ask session `019ef010-7676-71b0-b776-02899d281a7a` to do a short detour after
Stage 1 is implemented.

Prompt shape:

```text
Please do a bounded detour review of the new `npm run orchestration-state`
command.

Goal:
- Run the command from the dashboard repo and from Averlo Rebrand if available.
- Check whether the output actually tells an agent where it is and what to read
  next.
- Check whether the command stays read-only.
- Report confusing output, missing association clues, or places where an agent
  would still be likely to make the wrong next move.

Do not mutate product docs or implementation code. Return findings only.
```

This is the final-final review because it tests whether a separate thread can
understand and use the command without having participated in the design
conversation.

## Open Questions

- Can Codex desktop expose a reliable thread id to a local command?
- Should the command search global Codex thread/runtime state, or stay strictly
  repo-local?
- Should a local ignored session file be created manually, by a future start
  command, or not at all?
- How strict should confidence scoring be before the command names a single
  matched agent?
- Should the command warn when a worktree has no active run, or only when the
  worktree is outside the main checkout?
- Should Stage 1 include `--json`, or keep output text-only until real use
  shows the need?
