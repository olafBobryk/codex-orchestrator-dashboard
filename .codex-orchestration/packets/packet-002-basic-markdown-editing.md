# Packet 002: Markdown Editing Direction

Status: superseded

## Goal

Earlier goal: add whole-file Markdown editing for selected orchestration docs.

Current direction: remove in-app Markdown editing and edit docs in VS Code,
opened to the selected Markdown file.

## Outcome

- Superseded by the VS Code editing direction.
- The sidecar should not include a Markdown textarea editor.
- The sidecar should not expose a Markdown save API.
- Doc rows may link to VS Code, and links should open the selected Markdown
  file.

## Superseded Verification

- Historical implementation was verified with `npm run lint` and
  `npm run build`.
- Current verification should confirm the editor and save API are absent and VS
  Code links open selected Markdown files.

## Process Note

This packet was implemented directly in the orchestrator chat before durable
packet docs existed.
