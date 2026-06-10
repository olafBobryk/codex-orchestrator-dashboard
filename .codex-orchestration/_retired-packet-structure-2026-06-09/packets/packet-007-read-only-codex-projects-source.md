# Packet 007: Read-Only Codex Local Projects Source

Status: verified

## Goal

Use Codex's local project list as the sidecar's project selector source without
mutating Codex state or introducing a separate registry first.

## Product Spine

The sidecar should closely match Codex's own project UI structure with almost no
setup. Codex local projects are a convenience input for workspace selection, not
durable orchestration truth.

## Accepted Source

Read only:

- `/Users/olafbobryk/.codex/.codex-global-state.json`

Read only these fields:

- `electron-saved-workspace-roots`
- `active-workspace-roots`
- `project-order`

## Scope

- Load saved workspace roots.
- Order workspaces by `project-order`.
- Mark active workspaces from `active-workspace-roots`.
- Validate whether each workspace exists and has `.codex-orchestration/`.
- Fail quietly if the file is missing, malformed, or changes shape.

## Out Of Scope

- No sidecar-owned explicit registry file yet.
- No mutation of Codex app state.
- No reading Codex transcripts, prompt history, auth/config files, SQLite thread
  previews, logs, memories, goals, or archived sessions for project selection.
- No account sync, cloud sync, telemetry, project execution, or prompt
  generation.

## Implementation Notes

Current implementation exists in:

- `src/lib/codex-projects.ts`
- `src/app/page.tsx`

## Verification

- `npm run lint`
- `npm run build`
- `http://localhost:3000/?workspace=/Users/olafbobryk/Documents/Code/Personal/2026/codex-orchestrator-dashboard` returns HTTP 200.

## Chunk Planner Decision

One-pass packet. No chunk ledger needed because this is a narrow read-only
source integration.

## Direction Warning Triggers

- Reading additional Codex private fields beyond the accepted three.
- Using `state_5.sqlite` as a selector source.
- Writing to Codex-owned files.
- Adding a sidecar registry before a new accepted decision.
