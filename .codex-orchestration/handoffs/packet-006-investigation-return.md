# Packet 006 Investigation Return

Status: complete

## Sources Inspected

- `/Users/olafbobryk/.codex/.codex-global-state.json` - Codex global JSON state.
- `/Users/olafbobryk/.codex/.codex-global-state.json.bak` - Codex global JSON state backup.
- `/Users/olafbobryk/.codex/.codex-global-state.json.bak-before-mazi-averlo-20260527190704` - older Codex global JSON state backup.
- `/Users/olafbobryk/.codex/.codex-global-state.json.bak-before-mazi-averlo-prod-20260527194847` - older Codex global JSON state backup.
- `/Users/olafbobryk/.codex/state_5.sqlite` - Codex thread/runtime SQLite state.
- `/Users/olafbobryk/.codex/logs_2.sqlite` - Codex log SQLite state.
- `/Users/olafbobryk/.codex/memories_1.sqlite` - Codex memory SQLite state.
- `/Users/olafbobryk/.codex/goals_1.sqlite` - Codex goal SQLite state.
- `/Users/olafbobryk/.codex/sqlite/codex-dev.db` - Codex automation/inbox SQLite state.
- `/Users/olafbobryk/.codex/session_index.jsonl` - Codex session index JSONL.
- `/Users/olafbobryk/.codex/archived_sessions/*.jsonl` - Codex archived session transcripts, inspected by path/key search only.
- `/Users/olafbobryk/Library/Application Support/com.openai.chat/gizmos-5e04883a-94ea-485c-8d83-09438608a071/projects.data` - ChatGPT app binary project/gizmo data.
- `/Users/olafbobryk/Library/Application Support/com.openai.chat/codex-taskItems-v2-default-5e04883a-94ea-485c-8d83-09438608a071` - ChatGPT app Codex task item directory.
- `/Users/olafbobryk/Library/Application Support/com.openai.chat/codex-taskDetails-v1-5e04883a-94ea-485c-8d83-09438608a071` - ChatGPT app Codex task detail directory.
- `/Users/olafbobryk/Library/Application Support/Codex/browser-sidebar-local-servers.json` - Codex app browser sidebar local-server JSON.
- `/Users/olafbobryk/Library/Application Support/Codex` - Codex Electron/Chromium app support directory.
- `/Users/olafbobryk/Library/Application Support/com.openai.codex` - Codex web crash/app support directory.
- `/Users/olafbobryk/Library/Application Support/OpenAI/Codex` - OpenAI Codex app support directory, no files found in this scan.

## Findings

The closest match to Codex's project UI structure is `/Users/olafbobryk/.codex/.codex-global-state.json`. Its top-level fields include:

- `electron-saved-workspace-roots`: array of strings, 21 entries in the current file.
- `active-workspace-roots`: array of strings, 1 entry in the current file.
- `project-order`: array of strings, 21 entries in the current file.
- `thread-workspace-root-hints`: object mapping thread IDs to workspace-root strings, 48 entries in the current file.
- `projectless-thread-ids`: array of strings, 39 entries in the current file.
- `thread-projectless-output-directories`: object mapping thread IDs to output-directory strings, 6 entries in the current file.
- `pinned-thread-ids`: array of strings, 0 entries in the current file.

Older backups show the same project/workspace-oriented keys with lower counts: 16 saved roots, 16 project-order entries, 30 thread-root hints, and 30 projectless thread IDs. That suggests this shape has existed across at least these local backups, but it is still private Codex app state rather than an advertised integration contract.

`/Users/olafbobryk/.codex/state_5.sqlite` has a structured `threads` table with fields that can describe thread context: `id`, `rollout_path`, `created_at`, `updated_at`, `source`, `model_provider`, `cwd`, `title`, `sandbox_policy`, `approval_mode`, `tokens_used`, `archived`, `git_sha`, `git_branch`, `git_origin_url`, `agent_nickname`, `agent_role`, `agent_path`, `thread_source`, and `preview`. It also has indexes on `threads(archived, cwd, created_at_ms...)` and `threads(archived, cwd, updated_at_ms...)`. This database contained 751 threads, 93 distinct `cwd` values, 145 active threads, and 606 archived threads during inspection. This is useful for deriving recent workspace activity, but it is also private runtime state and includes many fields unrelated to a sidecar workspace selector.

`/Users/olafbobryk/.codex/session_index.jsonl` is a lighter index with 687 JSONL items and keys `id`, `thread_name`, and `updated_at`. It does not expose workspace roots directly.

`/Users/olafbobryk/.codex/archived_sessions/*.jsonl` contains transcript objects with top-level keys `timestamp`, `type`, and `payload`. A key search found many files containing workspace-related text, but archived sessions are transcript content and should not be used as a project-list source.

`/Users/olafbobryk/.codex/sqlite/codex-dev.db` has automation tables with `cwds` and `source_cwd` fields, but all inspected automation/run counts were zero. It is not a general project source here.

`/Users/olafbobryk/Library/Application Support/Codex/browser-sidebar-local-servers.json` is valid JSON with keys `hiddenServers`, `version`, and `servers`. Each server entry has keys like `title`, `url`, `routes`, `lastOpenedAt`, `lastRunningAt`, `lastSeenAt`, `hiddenRouteUrls`, and `previewImageDataUrl`. It describes browser local servers, not Codex projects or workspaces.

The ChatGPT app `projects.data` file is binary data. The Codex task item/detail directories under `com.openai.chat` were empty in this scan. They should not be treated as stable sidecar inputs.

No secret, token, credential, or env contents were read or printed.

## Options

**LocalStorage-only recents**

- Keep the existing `codex-orchestrator-dashboard:recent-workspaces` browser-local list.
- Lowest coupling and safest privacy posture.
- Does not align automatically with Codex's project UI or project order.
- Works even if Codex internals change.

**Codex metadata read-only**

- Read `/Users/olafbobryk/.codex/.codex-global-state.json` for saved workspace roots and project order, or read `/Users/olafbobryk/.codex/state_5.sqlite` for thread `cwd` activity.
- Best alignment with Codex's existing local project/workspace representation.
- High coupling to private Codex state. The sidecar would depend on names like `electron-saved-workspace-roots`, `project-order`, and `threads.cwd` without a documented stability guarantee.
- Requires careful redaction and read-only discipline because neighboring fields include runtime identifiers and thread metadata.

**Display Codex projects as a separate read-only source**

- If accepted by the orchestrator, show Codex-derived workspaces separately from sidecar recents, labeled as read-only/imported.
- Avoids silently merging private app state into the sidecar's own localStorage model.
- Still depends on private state and should remain behind an explicit setting or documented local opt-in.

**Explicit project registry file**

- Add a user-controlled ignored file such as `.codex-orchestration/local-projects.json` or `.codex-orchestration/local-projects.md`.
- Stable, auditable, and repo/project-local. The sidecar can own the format.
- Does not automatically match Codex project order unless the user or a future one-shot import updates it.

**One-shot import from Codex state**

- Provide a deliberate import action that reads the Codex global-state project fields once and writes selected workspace paths into a sidecar-owned ignored registry or localStorage.
- Reduces ongoing coupling.
- Still needs human acceptance because it reads private Codex state.

## Recommendation

Default to localStorage-only recents for V1 and do not automatically read Codex-owned state.

The investigation found useful local metadata, but no safe supported source. The best private source is `.codex-global-state.json` for project-like lists and ordering; the best activity source is `state_5.sqlite` via `threads.cwd`. Both are implementation details of Codex. Depending on either by default would cross the current architecture gate: do not read, mutate, or depend on private Codex app state without a clear local-file contract and explicit follow-up acceptance.

If closer Codex alignment is still desired, the safest next step is a user-controlled, opt-in sidecar registry file plus an optional one-shot importer from Codex private state. The importer should be explicit, read-only toward Codex files, and should copy only workspace root strings into sidecar-owned storage.

## Low-Friction Revision

After a closer look at the actual contents, the practical low-friction path is to treat `/Users/olafbobryk/.codex/.codex-global-state.json` as a best-effort read-only convenience source, while still avoiding writes to Codex-owned state.

Recommended product behavior:

- Keep the current manual workspace field and localStorage recents.
- Add a "Codex projects" read-only group sourced from `.codex-global-state.json` when the file exists.
- Read only these fields: `electron-saved-workspace-roots`, `active-workspace-roots`, and `project-order`.
- Order by `project-order`, mark paths present in `active-workspace-roots`, and include any saved paths missing from `project-order` at the end.
- Validate each path locally and show whether `.codex-orchestration/` exists.
- Never read `electron-persisted-atom-state`, prompt history, thread permission maps, runtime IDs, auth/config files, transcript archives, or SQLite `preview`/message fields for this selector.
- Fail quietly back to localStorage-only recents if the Codex global-state file is missing, malformed, or changes shape.

This is less pure than an explicit registry, but it matches the product goal: the sidecar becomes useful with almost no setup. The risk is manageable if the integration is read-only, narrow-field, best-effort, and visibly labeled as "from Codex local projects."

Do not use `/Users/olafbobryk/.codex/state_5.sqlite` as the default source. It can produce strong recent-activity ordering from `threads.cwd`, but it also contains thread titles, prompt excerpts in `preview`, git metadata, remote-control metadata, and source details. Use it only for a later explicitly accepted "thread activity" view or diagnostic import.

## Proposed Follow-Up Packet

Packet 007: Add Explicit Workspace Registry And Optional Codex Import Design

Scope:

- Add a sidecar-owned ignored local registry file, for example `.codex-orchestration/local-workspaces.json`.
- Define a minimal schema: workspace path, display name override, source, imported timestamp, and disabled flag.
- Add documentation for manually editing the registry.
- Optionally add a design-only or gated implementation path for a one-shot Codex import from `.codex-global-state.json`, reading only `electron-saved-workspace-roots`, `active-workspace-roots`, and `project-order`.
- Keep existing localStorage recents working.

Out of scope:

- No automatic background sync from Codex private state.
- No mutation of Codex files.
- No reading transcript payloads, auth files, config secrets, or credential-bearing files.
- No prompt generation, thread execution, telemetry, cloud sync, or account sync.

Verification:

- Unit-test registry parsing with malformed, missing, and duplicate entries.
- Verify the sidecar still loads with no registry file.
- If the importer is accepted, test it with fixture JSON only; do not require a real Codex private file in automated tests.
- Manual review should confirm Codex-derived workspaces are clearly labeled as imported/read-only.

## Concerns To Bubble Up

- Status: open
- Concern: Codex has local project/workspace metadata, but the useful sources are private app/runtime state with no documented compatibility contract.
- Why it matters: A V1 sidecar that reads these files by default could break when Codex changes internals, expose more local context than intended, or violate the project's boundary against depending on private Codex app state.
- Affected packet/docs: Packet 006, Packet 007 if created, `.codex-orchestration/architecture.md`, `.codex-orchestration/packets/packet-map.md`.
- Recommended default: Keep localStorage recents as the default. Use an explicit sidecar-owned registry file for stable project selection. Treat Codex private state import as opt-in and one-shot only after orchestrator acceptance.
- Needs human: yes

- Status: deferred
- Concern: `state_5.sqlite` can derive recent workspace activity from `threads.cwd`, but the database also contains thread titles, git metadata, remote-control enrollment metadata, and other runtime state.
- Why it matters: Even read-only access has a larger privacy and coupling surface than a simple project list.
- Affected packet/docs: Packet 006, proposed Packet 007.
- Recommended default: Do not use `state_5.sqlite` for V1 workspace selection. Reconsider only if the user accepts a dedicated read-only diagnostic/import feature.
- Needs human: yes

## Closeout

Handoff file path: `.codex-orchestration/handoffs/packet-006-investigation-return.md`

Commands run:

- `sed -n` reads of required AGENTS, architecture, packet, ledger, and source files.
- `pwd`
- `git status --short`
- `find` scans of `.codex`, `Library/Application Support`, `Library/Containers`, and relevant Codex/OpenAI app support paths.
- `file` and `stat` on candidate JSON, SQLite, binary data, and app-support files.
- `sqlite3` `.tables`, `.schema`, and count queries on Codex SQLite candidates.
- `jq` top-level key and structural-shape queries on JSON/JSONL candidates.
- `rg -l` workspace-key search over archived session paths.
- `xxd -l 64` header checks for binary/text classification.
- `ls -la /Users/olafbobryk/.codex`

No safe supported Codex project-list source was found. Private source candidates were found and documented.
