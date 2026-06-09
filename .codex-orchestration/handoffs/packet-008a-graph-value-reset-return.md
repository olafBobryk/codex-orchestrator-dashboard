# Packet 008A Graph Value Reset Return

Status: fixed

## Handoff Summary

- Packet: 008A Graph Value Reset
- Source thread: visible review/repass thread for Packet 008A
- Reviewed returned branch: `codex/p8-c1-graph-contract`
- Returned prototype thread: `019ea98c-329d-7f70-9b18-7e64cc4128ec`
- Expected prototype worktree:
  `/Users/olafbobryk/.codex/worktrees/2ce0/codex-orchestrator-dashboard`
- Current main packet state: Packet 008 is `needs_human`; Packet 008A is
  `active`; prototype commits are not accepted.
- Recommendation: do not merge the prototype branch as-is. The graph contract
  is the main problem and should not become the foundation. Keep only the useful
  layout lesson: the left sidebar should behave like a fixed layer, closer to
  the right panel, so it does not resize the graph canvas and destabilize the
  physics simulation.
- Orchestrator clarification: `Packet 008B: Graph Contract Reset And Stable
  Canvas Shell`, not shell-only work. The contract reset is required because a
  bad Packet 008 contract would cascade into later graph packets.

## Review Evidence

- Main checkout is on `main`; durable docs say Packet 008 is paused behind
  Packet 008A.
- Prototype branch contains 13 commits:
  - `11109a0` Define orchestration graph contract
  - `fad2367` Add orchestration graph renderer
  - `0111720` Add graph detail overlay
  - `53fd810` Add runtime and worktree annotations
  - `41ac081` Polish graph handoff concern edges
  - `d42e546` through `4f03f4f` add unapproved Packet 009-014 layout and
    polish work.
- Prototype branch changes 31 files with about 5.5k added lines, including
  `src/lib/orchestration-graph.ts`,
  `src/components/orchestration-graph-canvas.tsx`,
  `src/lib/git-worktree.ts`, package dependency changes, Packet 009-014 docs,
  and architecture/status edits that mark Packet 008 verified.
- The advertised preview
  `http://127.0.0.1:3000/?workspace=/Users/olafbobryk/.codex/worktrees/2ce0/codex-orchestrator-dashboard`
  was not reachable during this review.
- The advertised worktree path was not present during this review. Branch
  commits and committed handoffs were still available for Git inspection.

## Classification

### Keep

- The current left sidebar direction is partially useful as project/workspace
  navigation.
- The left sidebar should become a fixed overlay/layer like the right panel,
  instead of participating in document/grid sizing in a way that changes the
  canvas dimensions.
- The right panel direction is acceptable as a starting point, but it still
  needs correction before the graph UI can be considered stable.
- The parsing target of normalized `.codex-orchestration/` Markdown is still
  correct, but it should be read directly for the specific UI questions rather
  than through the returned branch's broad graph contract.

### Simplify

- The next graph pass should focus on layout stability before graph semantics:
  fixed left layer, stable canvas bounds, right panel behavior, and no physics
  reset caused by sidebar open/collapse or viewport resizing.
- Keep graph semantics minimal while layout is being corrected. Do not expand
  node kinds, support nodes, annotations, or graph-edge taxonomy in the same
  pass.
- Treat the prototype's side-panel shell as partial reference only. The useful
  idea is fixed layered panels around a stable canvas, not the broader
  contract-driven graph model.
- If dependencies are reintroduced, add only the dependencies needed by the
  narrow slice. Do not accept package changes just because the prototype used
  them.

### Defer

- Any new graph contract or status taxonomy.
- Handoff/concern graph semantics and support-node modeling.
- Runtime Codex annotation and Git/worktree annotation implementation.
- Visible handoff/concern support-node density, filtering, clustering, and edge
  styling.
- Packet 009-014 layout and polish docs.
- Architecture rolling-note edits that declare the graph implemented.
- Project-wide frontend rules added from the polish passes.
- Playwright as a committed dev dependency unless the next implementation
  packet explicitly needs repeatable browser verification.

### Reject For Now

- The returned P8-C1 graph contract as the foundation for Packet 008.
- Treating chunks, handoffs, concerns, checkpoints, threads, source layers, and
  missing-state taxonomy as a settled product model.
- Merging or cherry-picking the prototype branch wholesale.
- Treating branch `codex/p8-c1-graph-contract` as accepted or Packet 008 as
  verified.
- Accepting Packet 009-014 as real packet history.
- Replacing the current summary UI with the full polished graph before the graph
  passes a product-readiness comparison.
- Any recommendation that makes runtime state, Git history, transcript content,
  or support-node polish the source of graph truth.

## Concrete Recommendation For Packet 008

Re-open Packet 008 at a narrower next packet:

**Packet 008B: Graph Contract Reset And Stable Canvas Shell**

This is contract-reset work plus shell-stability work, not shell-only work. The
contract reset must happen before downstream graph renderer, panel, annotation,
or support-node packets build on the returned prototype's bad model.

Goal:
Reset the graph contract before downstream packets build on the wrong model,
then verify that contract through a stable graph shell. The left sidebar should
behave as a fixed layer like the right panel so sidebar state changes do not
resize the canvas or break the force simulation.

Scope:

- Define the minimal graph contract that Packet 008 should actually depend on.
- Explicitly reject the returned P8-C1 contract pieces that should not cascade:
  broad node taxonomy, broad status taxonomy, source-layer taxonomy, and support
  node semantics.
- Name the smallest source-of-truth fields needed from normalized Markdown for
  the first graph view.
- Make the left project sidebar a fixed/canvas-adjacent layer closer to the
  right panel model.
- Keep graph canvas bounds stable when the left sidebar opens, collapses,
  scrolls, or changes selected workspace.
- Preserve the current left sidebar's useful project navigation behavior.
- Keep the right panel but identify and correct the highest-impact interaction
  problem in the same shell pass only if it is tightly coupled to canvas bounds.
- Use the smallest graph data shape needed to verify both contract fit and
  canvas stability.

Out of scope:

- Expanding beyond the minimal reset contract.
- Status taxonomy work beyond the minimum states needed for the first graph
  view.
- Handoff/concern support-node semantics.
- Runtime Codex annotation.
- Git/worktree annotation.
- Full side-panel IA rewrite beyond the fixed-layer shell correction.
- Support-node density work.
- Packet 009-014 polish.
- New global architecture rules.
- Prompt generation, execution controls, Codex state mutation, transcript
  parsing, secret/env display, automatic Git/worktree action, or in-app Markdown
  editing.

Chunk planner decision:
No chunk planner needed for Packet 008B if it stays to the contract reset and
shell fix above.
Stop and return to the orchestrator if the slice expands into runtime/Git
annotations, broad graph-contract design, page IA replacement, or support-node
filtering.

## Product-Readiness Test For Packet 008B

The graph is ready to continue only if the corrected contract and shell both
hold in the current project:

- The minimal contract explains what the first graph view is allowed to show
  and what it must not model yet.
- The corrected contract does not carry forward the returned branch's broad
  node/source-layer/status model.
- Opening, collapsing, or using the left sidebar does not resize the graph
  canvas in a way that restarts or breaks the physics simulation.
- The left sidebar feels like a fixed layer comparable to the right panel.
- The graph remains framed and interactive on desktop and mobile after sidebar
  and right-panel state changes.
- The right panel does not create competing layout pressure against the canvas.
- The current project navigation remains understandable.

Hard stop:
If sidebar/right-panel behavior still changes canvas dimensions unpredictably,
or if the contract still pushes broad support-node/source-layer/status modeling,
stop before overlay polish, runtime/Git annotations, or support-node expansion.

## Hard Stops For The Orchestrator

- Do not mark Packet 008 verified from the prototype branch.
- Do not accept Packet 009-014 docs as project history.
- Do not change architecture notes from "planned/paused" to "implemented" until
  the orchestrator accepts a graph implementation.
- Do not continue from the latest prototype commit by default. Start from the
  contract and shell behavior that matter: minimal graph model, fixed left
  layer, stable graph canvas, and a right panel that does not fight the canvas.
- Do not treat the returned graph contract as accepted architecture.
- Do not require live preview evidence from the missing returned worktree as a
  condition for this handoff; use it only if the orchestrator restores the
  worktree/server intentionally.

## Verification

- Read main packet map, Packet 008, Packet 008A, Packet 008 ledger, P8-C1 spawn
  handoff, and Packet 008A spawn handoff.
- Inspected prototype branch commits and changed files with Git.
- Read prototype return handoffs for P8-C1 through P8-C5 and Packet 009 through
  Packet 014.
- Checked the advertised preview URL; it was unavailable.
- Checked the advertised returned worktree path; it was unavailable.
- Wrote only this return handoff in the main checkout.

## Env Disposition

- Source checkout: main checkout at
  `/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard`
- Action: skip
- Expected ignored filenames: none
- Classification: missing/not needed
- Allowed operations performed: local read-only inspection, Git inspection, and
  preview reachability check.
- External-state operations: none.

## Concerns To Bubble Up

- Status: open
- Concern: The returned branch overran the accepted Packet 008/P8-C1 boundary
  and self-recorded Packet 008 as verified plus Packet 009-014 as completed
  polish without orchestrator acceptance.
- Why it matters: Accepting the branch wholesale would turn prototype momentum
  into project history and obscure the current human gate.
- Affected packet/docs: Packet 008, Packet 008A, Packet 008 ledger, packet map,
  architecture rolling notes, and prototype Packet 009-014 docs.
- Recommended default: Reject the returned graph contract as the foundation;
  create Packet 008B for graph contract reset plus stable graph canvas shell;
  reject branch-level status/history changes.
- Needs human: yes

- Status: deferred
- Concern: The prototype preview and worktree were unavailable during this
  Packet 008A review.
- Why it matters: Code and handoff inspection are sufficient to classify scope
  overrun and identify the sidebar/canvas stability issue, but not sufficient
  to accept the polished UI's visual clarity.
- Affected packet/docs: Packet 008 UI implementation and any future acceptance
  of prototype visual polish.
- Recommended default: Do not accept visual polish without a fresh reachable
  preview or regenerated screenshots from an intentionally restored branch.
- Needs human: no
