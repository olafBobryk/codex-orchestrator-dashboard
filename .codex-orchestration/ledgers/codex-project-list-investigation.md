# Codex Project List Investigation Ledger

Status: verified packet ledger for Packet 006.

This is a lightweight investigation ledger, not a multi-chunk delivery ledger.

## Status Legend

- `untouched`: found but not assessed or changed.
- `partial`: assessed or partly changed, still not done.
- `complete`: implementation done but not verified.
- `verified`: done and checked.
- `human_gate`: needs a user/product/design/architecture decision.
- `blocked`: cannot proceed because of dependency, conflict, or missing state.

## Inventory

| Item | Owner/file | Current shape | Target strategy | Status | Notes / gate |
|---|---|---|---|---|---|
| Codex local state sources | spawned investigation thread | Unknown | Read-only inventory of likely project/context files | verified | Handoff lists inspected paths and schemas without secrets |
| Project list suitability | spawned investigation thread | Unknown | Recommend whether sidecar should read/sync/import | verified | Accepted narrow read-only `.codex-global-state.json` source |
| UI structure mapping | spawned investigation thread | localStorage recents only | Compare Codex project UI structure to sidecar selector | verified | Recommends localStorage default plus optional Codex project source/registry |
| Follow-up packet proposal | spawned investigation thread | Missing | Minimal implementation packet if safe | verified | Packet 007 recorded from accepted direction |
| Handoff | `.codex-orchestration/handoffs/packet-006-investigation-return.md` | Missing | Durable findings and concerns | verified | Present and reviewed by orchestrator |

## Spawned Thread

- Thread ID: `019ea695-ac00-7582-8c55-2e2161d767b0`
- Status: returned
- Target: visible Codex project thread
- Scope: read-only investigation plus handoff file
- Orchestrator owns: packet docs, disposition of findings, next packet decision

## Concern Disposition

| Concern | Disposition | Reason |
|---|---|---|
| Prior V1 work happened before durable packet docs existed | resolved | Packet docs and map now exist; future work must update packets first. |
| Orchestrator model was not explicit enough | resolved | AGENTS, architecture docs, packet map, and skill docs now state visible orchestrator control-plane policy. |
| `state_5.sqlite` as workspace source | deferred/rejected for V1 | Too broad; contains thread/runtime metadata beyond a project selector. |
| `.codex-global-state.json` read-only project source | resolved | Accepted as narrow, read-only, best-effort source. |
| Explicit sidecar registry file | deferred | Do not define first; revisit only if needed. |
