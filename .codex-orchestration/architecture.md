# Orchestration Surface Reset

Status: reset

The previous packet/chunk orchestration structure has been intentionally retired
from the active project surface. The old docs are preserved only as legacy
reference under `_retired-packet-structure-2026-06-09/`.

The active orchestration surface is otherwise blank on purpose. The next work is
a meta exercise on this project: create fake work examples, test whether they map
cleanly to visual graph nodes and edges, and use that experience to discuss how
orchestration should be documented before any new durable schema is solidified.

## Rolling Architecture Window

This section is provisional. Keep notes narrow and avoid turning preferences
into rules too early.

### Like

- Shape Up.
- Shape down.
- Shape up.
- One durable central orchestration chat that stays synced at the application
  level across project switching.
- Highly supervised worker runs, usually no more than two or three at a time.
- A lowest-level bounded piece of work that follows normal programming flow:
  plan, build, test, loop.

### Unsure / Half-Like

- Let run.
- The exact order or relationship between shape down, let run, and shape up.
- How much should be decided live during execution versus decided beforehand in
  the plan.

### Dislike

- Packets and chunks as separate active concepts.
- Similar orchestration words that blur higher-level and lower-level work.
- Planning terms that cross responsibilities and make agents interpret scope
  differently.
- `bounded piece` as final wording.

### Working Language

- Use `bounded piece` only as a temporary placeholder for the abstract
  lowest-level unit of work.
- Do not solidify a new schema yet.

### Vocabulary

- Stewardship.
- Shaping.
- Execution.
- Steward.
- Shape: describes an intended boundary.
- Run: a worker session that may complete one or more lowest-level work units.
- Handoff: broader term for evidence, unresolved questions, and material moving
  back toward the steward.
- Return: ending of a run and going back to the steward with work.
- Checkpoint: durable "we are here" marker.
- Upward pressure.
- Downward pressure.
- Sideways pressure.
- Settled point.

### Like / Add

- The central chat is a steward, not another worker.
- The steward maintains direction, constraints, accepted decisions, unresolved
  concerns, and a rolling window of moving pieces.
- The steward also decides when something is safe to stop thinking about.
- The graph visualizes what the steward is handling.
- Bounded pieces of work can be graph nodes.
- A bounded piece should carry associated tests and test results in its node
  information, possibly as a Markdown artifact.
- Checkpoints can be graph nodes.
- Production pushes can be graph nodes.
- Worker split-offs can be represented similarly to branch points, but the graph
  should not force Git graph structure.
- Workers may need to complete multiple related bounded pieces together when
  the pieces rely on each other.
- Shaping is not one phase.
- Pre-decided, live-local, and return-required decisions seem related to
  shaping and should be considered together.
- Repeatable operational patterns can later become separate skills.

### Open Questions

- How should a bounded-piece node be represented?
- How should checkpoints be represented?
- How should shape be measured abstractly?
- How can fluid shape be shown along the graph?
- Where are the points where shape artifacts land?
- How much should workers decide live versus beforehand?
- When should a worker return to the steward for a decision?

### Avoid / Caution

- Do not use Git history as the forced graph structure.
- Do not make every bounded piece require a separate split-off and
  consolidation cycle.
- Do not recurse the orchestration model, even if a good system should be able
  to tolerate recursive-looking cases.
- Keep methodology bare bones.
