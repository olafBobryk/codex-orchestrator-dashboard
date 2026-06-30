# Orchestration Run CLI Rolling Notes

Status: rolling discussion

Accepted CLI direction now lives in
`docs/future-directions/orchestration-cli-architecture.md`.

This file keeps discussion behavior and unresolved internals only.

## Discussion Behavior

Avoid one-question-at-a-time confirmation unless the decision is risky or
ambiguous.

Use small decision batches:

- list related decisions together;
- mark recommended defaults;
- separate uncertain items;
- ask the steward to accept, reject, or edit the batch.

Record only accepted items. Do not turn recommendations into accepted direction
without explicit steward approval.

Treat existing accepted architecture and rolling notes as solidified inputs. If
this discussion repeats an accepted point, label it as an inherited constraint,
not a new decision. If the CLI direction would change an accepted point, mark
that as an explicit refactor proposal before recording it.

Chat proposals must include the concrete decision details needed for
acceptance. Do not ask the steward to accept abstract labels when the actual
defaults are already known. Assume the steward may not reread the rolling note
before answering; the chat message itself should contain the accept/reject
material.

## Open Internals

### check

- No open first-version internals.

### prepare

- No open first-version internals.

### update

- Whether `update` needs additional flags after the first explicit-flag set is
  tested.

### return

- No open first-version internals.

### deferred

- Human override, such as `--id <slug>`, is deferred.
- Manual verification flags, such as `--verified "npm run lint"` and
  `--verification-summary "lint and build passed"`, are deferred.
- Non-implementation worktree override is deferred.
- Marker suppression flags are deferred.
- Implementation-specific verification discovery beyond the default
  verification path is deferred.

## Current Recommendation

The first-version command architecture is ready to turn into an implementation
plan.
