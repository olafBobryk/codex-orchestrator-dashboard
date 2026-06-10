# Packet 006: Investigate Codex Project List Integration

Status: human_gate

## Goal

Investigate whether the Codex Orchestrator Sidecar can closely match Codex's
project UI structure by reading an existing local Codex project/context list or
related files.

## Product Spine

The sidecar should feel aligned with the way Codex already represents projects.
If Codex maintains a local project list or context metadata, the sidecar may be
able to use that as an input for recent/workspace selection instead of inventing
a separate project model.

## Scope

- Read-only investigation.
- Identify local Codex files, databases, config, or metadata that appear to
  describe saved projects, recent projects, workspaces, thread cwd values, or
  project UI grouping.
- Determine whether any source is stable and appropriate for a sidecar to read.
- Compare possible integration approaches:
  - keep localStorage recents only,
  - import/sync from Codex project metadata,
  - display Codex projects as a separate read-only source,
  - ask the user for an explicit project registry file.
- Produce a recommendation with risks and a minimal implementation packet if a
  safe source exists.

## Out Of Scope

- No implementation.
- No mutation of Codex app files.
- No reading secrets.
- No telemetry, account sync, cloud sync, or external APIs.
- No prompt generation.
- No changing the sidecar UI yet.

## Verification

- Inspect likely local Codex config/state locations read-only.
- Do not print secrets or sensitive values.
- Report only file paths, schema shape, field names, counts, and suitability.
- Write findings to `.codex-orchestration/handoffs/packet-006-investigation-return.md`.

## Chunk Planner Decision

One-pass investigation packet. No chunk ledger unless the investigation reveals
multiple incompatible data sources that require a broader architecture decision.

## Hard Stops

- Stop before modifying any Codex-owned state.
- Stop before reading or quoting secret/token/env values.
- Stop if the only viable source is private, unstable, or clearly unsupported.

## Expected Spawn Target

Visible Codex thread, local project environment, read-only investigation.

## Returned Result

- Spawned thread: `019ea695-ac00-7582-8c55-2e2161d767b0`
- Handoff: `.codex-orchestration/handoffs/packet-006-investigation-return.md`
- Status: investigation complete; follow-up implementation is gated.

## Concern Disposition

Cleared immediately:

- Do not use `/Users/olafbobryk/.codex/state_5.sqlite` for V1 workspace
  selection. It is too broad for the sidecar selector because it contains
  runtime/thread metadata beyond project-list shape.
- Do not use archived session transcripts, ChatGPT binary `projects.data`, task
  item/detail directories, logs, memories, goals, or automation DBs as project
  list sources.

Needs human thought:

- Whether to read `/Users/olafbobryk/.codex/.codex-global-state.json`
  read-only as a best-effort "Codex local projects" source.
- Whether the safer next packet should instead define a sidecar-owned explicit
  local registry file and optionally support a one-shot import.
