# Packet 005: Recent Workspace Selector

Status: verified

## Goal

Add a recent workspace selector so the sidecar is pleasant to reopen and switch
between local projects.

## Product Spine

The app should remember recently loaded workspace paths locally and let the user
select them without retyping. This is an ergonomics feature only; it must not
become project execution, account sync, telemetry, or a second orchestration
state store.

## Scope

- Persist recent workspace paths locally in the browser.
- Add a compact recent workspace selector near the workspace input.
- Add the current workspace to recents after a successful load.
- Allow selecting a recent workspace to reload the dashboard.
- Allow clearing the recent list.
- Keep all durable orchestration truth in the target project's
  `.codex-orchestration/` docs.

## Out Of Scope

- No accounts, cloud sync, telemetry, or external storage.
- No prompt generation.
- No agent lifecycle tracker.
- No workspace creation wizard.
- No in-app Markdown editor or `/editor` route.
- No Electron shell.

## Verification

- `npm run lint`
- `npm run build`
- Start local server and verify HTTP 200.
- Browser/manual check:
  - loading a valid workspace adds it to recents,
  - selecting a recent workspace reloads with that path,
  - clearing recents removes the list,
  - missing `.codex-orchestration/` paths are not automatically promoted as
    successful recent workspaces.

## Result

- Spawned worker: Avicenna
- Changed files:
  - `src/app/page.tsx`
  - `src/components/recent-workspace-selector.tsx`
- Orchestrator verification:
  - `npm run lint` passed.
  - `npm run build` passed.
  - `http://localhost:3000/?workspace=/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard` returned HTTP 200.
  - Worker reported browser checks for promotion, invalid-workspace behavior,
    recent selection navigation, and clear behavior.

## Chunk Planner Decision

One-pass packet. No chunk ledger was needed because implementation stayed local
to one UI feature and one client component.

## Direction Warning Triggers

- Any attempt to store project truth outside the project docs.
- Any account, sync, telemetry, or external storage proposal.
- Any prompt-generation or execution-control behavior.
- Any move toward a full IDE/workspace manager.
