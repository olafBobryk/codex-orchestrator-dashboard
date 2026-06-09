# Packet 008C Graph Vision Realignment Return

Status: fixed

## Handoff Summary

- Packet: 008C Graph Vision Realignment
- Source thread: visible discussion/review thread for Packet 008C
- Workspace:
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Branch inspected: `main`
- Reference branches inspected without acceptance:
  - `codex/p8-c1-graph-contract`
  - `codex/packet-008b-graph-shell`
- Recommendation: reframe the next graph move as a bounded polish and
  acceptance pass for the original graph prototype direction, not as another
  reset, reduction, or replacement contract.

## Discussion Outcome

The orchestrator clarified that the earlier recovery questions were too
surface-level. The original graph prototype direction should be preserved as a
whole:

- full-canvas graph experience;
- chronology and lane flow;
- side panels and selected-node detail;
- live/completed chat signals;
- off-source/worktree state;
- handoff, concern, verification, return, detour, and split signals.

No UX/model part of the original graph prototype was identified as inherently
wrong for V1. The concern is not that the prototype had the wrong product
vision; the concern is that the conversation drifted into reset framing when it
should have been framed as polish.

## Preserved Prototype Direction

Preserve the `codex/p8-c1-graph-contract` branch as the directionally correct
reference for the graph experience.

The next accepted work should keep the graph as an orchestration canvas that
helps the orchestrator see:

- packet and chunk flow;
- splits and spawned chats;
- returns and handoffs;
- detours and off-source/worktree state;
- live versus completed work;
- concerns, blocked states, verification signals, and human gates;
- selected-node detail without turning the dashboard into an executor or
  Markdown editor.

The prototype's breadth should be treated as the intended graph surface that
needs product polish, acceptance boundaries, and implementation cleanup, not as
evidence that the graph vision should be collapsed.

## Rejected Prototype Scope Drift

Do not reject prototype UX/model features as scope drift by default.

The scope drift to reject is procedural and orchestration-level:

- treating unaccepted prototype commits as already accepted project history;
- marking Packet 008 verified without orchestrator acceptance;
- self-recording Packet 009-014 polish docs as durable accepted history;
- letting one spawned implementation thread become the strategy authority;
- merging or cherry-picking the entire branch without a bounded acceptance pass.

The product direction itself remains valuable and should be preserved.

## Rejected 008B Regression Points

Treat `codex/packet-008b-graph-shell` as rejected/superseded reset work.

The problem with 008B is not a missing individual feature checklist; it is the
reset framing. It redirected the conversation away from polishing the intended
prototype and toward a reduced baseline.

Reject these 008B defaults:

- using 008B as the accepted graph baseline;
- reducing the graph to packet/ledger Markdown only;
- replacing the intended force/canvas graph direction with a static SVG shell;
- deferring handoff, concern, worktree, runtime, verification, split, return,
  and detour signals out of the core graph conversation;
- treating a smaller contract as the fix when the needed move is polish and
  acceptance of the original graph vision.

## Smallest Next Packet Recommendation

Packet 008D should be a bounded graph prototype polish and acceptance pass.

Goal:
Polish the original graph prototype direction into an acceptable Packet 008
candidate while preserving the intended canvas graph model.

Product spine:
The orchestrator can use the graph canvas to understand packet/chunk flow,
splits, returns, detours, worktree state, live/completed chats, and
concern/verification signals without reading every Markdown file manually and
without the dashboard becoming an executor.

Recommended starting point:

- Inspect `codex/p8-c1-graph-contract` as the primary reference.
- Prefer either a narrow cherry-pick series or a rebuild on `main` that matches
  the prototype direction, whichever avoids importing unaccepted durable-doc
  status/history changes.
- Do not use `codex/packet-008b-graph-shell` as baseline.

Scope:

- Preserve the full graph UX/model direction from the prototype.
- Polish clarity, hierarchy, fit, canvas behavior, panel behavior, and signal
  legibility.
- Keep Markdown docs as source of truth.
- Keep runtime and Git/worktree data as annotations.
- Remove or avoid unaccepted packet-history/status mutations.
- Produce reviewable UI evidence through a verified local preview.

Out of scope:

- Another graph contract reset.
- Reducing the graph to a placeholder or static shell.
- Accepting Packet 008B.
- Prompt generation, execution controls, Codex state mutation, transcript
  parsing, secret/env display, automatic Git/worktree action, or in-app
  Markdown editing.
- Marking Packet 008 verified before orchestrator acceptance.

Chunk planner decision:
No chunk planner needed if Packet 008D stays to one bounded polish/acceptance
pass. Stop and return to the orchestrator if the work expands into a new packet
series, broad architecture rewrite, executor behavior, or another reset.

## Product-Readiness Checks For Packet 008D

- The graph visually communicates packet/chunk flow, splits, returns, detours,
  worktree state, live/completed chats, and concern/verification signals.
- The graph still feels like the intended full-canvas orchestration experience,
  not a reduced placeholder.
- Side panels and selected detail improve inspection without becoming in-app
  editing or execution.
- Runtime/Git/worktree data is visibly annotation/evidence, not durable truth.
- The UI is reviewable through a reachable local preview.
- Any imported prototype work excludes unaccepted durable-doc status/history
  changes.

## Anti-Loop Hard Stops

- Stop if the next packet is framed as another reset.
- Stop if the recommendation treats 008B as accepted baseline.
- Stop if the original graph vision is discarded instead of polished.
- Stop if implementation reduces the graph to packet/ledger-only data.
- Stop if runtime state, Git history, transcript content, or generated prompts
  become source of truth.
- Stop before execution controls, automatic merge/worktree actions, Codex state
  mutation, secret/env display, or in-app Markdown editing.
- Stop before marking Packet 008 verified without orchestrator acceptance.

## Verification

- Read `/Users/olafbobryk/.codex/AGENTS.md`.
- Read project `AGENTS.md`.
- Read required orchestration, return, and packet-planner skills.
- Read Packet 008, 008A, 008B, 008C, packet map, Packet 008 ledger, 008A return
  handoff, and 008C spawn handoff.
- Inspected reference branch summaries and commits without checkout, merge, or
  cherry-pick.
- Wrote only this return handoff.

## Env Disposition

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations performed: local read-only Git/doc inspection and this
  optional return handoff write.
- External-state operations: none.

## Concerns To Bubble Up

- Status: open
- Concern: The previous reset framing converted a polish/acceptance problem into
  a product-direction reduction.
- Why it matters: Continuing that framing risks discarding the graph experience
  the user actually wants and looping through narrower placeholder baselines.
- Affected packet/docs: Packet 008, Packet 008A, Packet 008B, Packet 008C,
  Packet 008 ledger, packet map.
- Recommended default: Open Packet 008D as a prototype polish and acceptance
  pass centered on the original graph direction; keep 008B rejected.
- Needs human: yes

- Status: deferred
- Concern: The original prototype branch still contains unaccepted durable-doc
  status/history changes mixed with directionally useful UI/model work.
- Why it matters: Accepting the branch wholesale would import bad orchestration
  history even if the UI direction is right.
- Affected packet/docs: Packet 008, Packet 008 ledger, packet map, prototype
  Packet 009-014 docs.
- Recommended default: Use narrow cherry-picks or rebuild-on-main to preserve
  the graph UX/model while excluding unaccepted packet/status mutations.
- Needs human: no
