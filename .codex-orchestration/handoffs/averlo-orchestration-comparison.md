# Averlo Orchestration Comparison

Status: planning reference

## Current Sidecar Repo

Structure:

- `.codex-orchestration/architecture.md`
- `.codex-orchestration/packets/packet-map.md`
- `.codex-orchestration/packets/*.md`
- `.codex-orchestration/ledgers/*.md`
- `.codex-orchestration/handoffs/*.md`

Strengths:

- The orchestration state is separated from product architecture docs.
- Packets, ledgers, and handoffs have predictable directories.
- It is easier for the sidecar to parse because paths encode document roles.
- The visible orchestrator-thread policy is explicit.

Weaknesses:

- It is newer and thinner than Averlo's docs.
- It has packet records, but not yet a rich graph model of dependencies,
  detours, spawned threads, and return paths.
- The current sidecar UI mostly summarizes docs; it does not yet show
  orchestration topology.

## Averlo Brand Dashboard

Structure:

- `docs/architecture/orchestration-strategy.md`
- `docs/architecture/implementation-packets.md`
- `docs/delivery-ledger.md`
- `docs/handoffs/*.md`
- `docs/architecture-rolling-notes.md`

Strengths:

- Very mature packet/chunk history.
- `docs/delivery-ledger.md` captures a rolling chunk window, chunk status,
  acceptance criteria, verification, and gates in one durable record.
- Handoffs are detailed and practical for return/consolidation.
- The docs show real examples of detours, repasses, production smoke, env
  gates, and product-readiness checks.

Weaknesses:

- The orchestration docs are mixed into `docs/architecture` and `docs/handoffs`
  rather than a dedicated machine-readable orchestration directory.
- `docs/delivery-ledger.md` is powerful but large; it can become hard to scan
  without a visual index.
- Packet/chunk/thread relationships are implicit in text and tables rather than
  explicit graph edges.

## Contrast

The sidecar repo has the better **shape for a parser**. Averlo has the better
**evidence model for real delivery**.

The sidecar should not simply copy Averlo's one-ledger pattern. Instead, it
should support both:

- a normalized `.codex-orchestration/` structure for new projects;
- tolerant reading of older Averlo-style docs so mature projects can still be
  visualized.

## Dashboard Implication

The next major sidecar value is not another summary table. It is a graph view:

- packet trunk,
- packet-scoped chunk branches,
- visible spawned thread nodes,
- returned handoff nodes,
- detour/repass branches,
- concern and human-gate blockers,
- verification/preview closeout nodes.

This would turn old Averlo-style delivery ledgers and new
`.codex-orchestration/` docs into the same visual language.
