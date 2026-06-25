# Concept: Orchestration Source Repo Direction

Status: intended direction

## Intent

Keep orchestration projection truth close to the product repo while preventing
product worktrees from forking that truth.

The preferred direction is a nested, ignored orchestration Git repo inside the
product checkout, backed by the same remote repository on a separate orphan
branch.

## Desired Layout

Example product checkout:

```text
averlo-rebrand/
  docs/
    ORCHESTRATION.md
    orchestration/
      .git/
      map.md
      pressure-ledger.md
      agents/
      artifacts/
      checkpoints/
      edges/
      runs/
      shapes/
      workpieces/
      _guides/
      _templates/
  .gitignore
```

The product repo tracks `docs/ORCHESTRATION.md` as the pointer and setup note.
The product repo ignores `docs/orchestration/`.

Example product `.gitignore` rule:

```gitignore
/docs/orchestration/
```

The nested `docs/orchestration/` directory is its own Git checkout. It uses the
same remote repository as the product repo, but checks out an orphan branch such
as `orchestration`.

The orchestration root is shallow. Do not create an inner
`.codex-orchestration/` directory inside `docs/orchestration/`.

## Default Product Pointer

Each product repo using this strategy should keep a tracked
`docs/ORCHESTRATION.md` file that explains:

- where the local orchestration repo lives;
- which remote and branch back it;
- that dashboard projection truth is read from `docs/orchestration/`;
- that product worktrees should not edit projection docs directly;
- that worker-local orchestration notes are evidence only until the steward
  promotes them into the nested orchestration repo.

This pointer keeps agents from guessing whether `.codex-orchestration/` in a
product worktree is authoritative.

## Source Of Truth Rule

Projection docs have one steward-owned source.

For serious multi-worker projects, that source should be the nested
orchestration repo, not `.codex-orchestration/` tracked directly in the product
repo.

Product worktrees may create temporary handoff, evidence, or local notes in
ignored paths, but those files do not become projection truth until the steward
copies or rewrites the accepted state into the nested orchestration repo.

## Remote Branch Direction

Use the same remote repository with a separate orphan branch:

```text
product branch:       main
orchestration branch: orchestration
```

This keeps product code and orchestration state tied to the same remote identity
without mixing histories.

The orphan branch should contain only orchestration material and minimal setup
notes. It should not contain product source files.

## Why Not Submodules

Avoid submodules as the default. They make the local path explicit, but add
operational ceremony and failure modes that are likely too heavy for the current
workflow.

The nested ignored repo gives most of the useful separation with less Git
surface area.

## Open Implementation Questions

- Exact initialization command shape.
- Exact migration command from product-tracked `.codex-orchestration/`.
- Whether the dashboard selector should prefer `docs/orchestration/` when a
  product repo is selected.
- How to prevent agents from creating new product-worktree projection docs when
  the pointer file exists.
- Whether this should become the default for all target repos or only projects
  with active parallel worktrees.

## Deferred Cleanup: Averlo Pilot

The Averlo Rebrand pilot has a docked `docs/orchestration/` root and the
dashboard can read it through the product repo path.

Do not remove the product-tracked `.codex-orchestration/` tree while the
product checkout still has active implementation/orchestration changes mixed
into it. Treat removal as a later cleanup packet:

- confirm the docked orchestration repo contains the latest accepted projection
  truth;
- commit and push any needed `orchestration` branch updates;
- keep or update the tracked `docs/ORCHESTRATION.md` pointer in the product
  repo;
- remove the tracked `.codex-orchestration/` tree in a clean product commit;
- verify the dashboard still resolves the product path to `docs/orchestration/`.

Until that cleanup packet is done, `docs/orchestration/` is the intended
projection source and product-worktree `.codex-orchestration/` edits should be
treated as legacy/evidence, not dashboard truth.
