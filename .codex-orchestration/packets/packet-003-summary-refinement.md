# Packet 003: Summary Refinement

Status: verified

## Goal

Improve tolerant parsing for plain Markdown orchestration docs.

## Outcome

- Extracts title, status, and excerpt for grouped doc rows.
- Concern, gate, handoff, verification, and preview docs stay plain Markdown
  documents rather than separate workflow surfaces.
- Malformed or partial docs are tolerated by design.

## Verification

- `npm run lint`
- `npm run build`
- Ignored sample workspace loaded packet, ledger, handoff, and verification
  summaries.

## Process Note

This packet was implemented directly in the orchestrator chat before durable
packet docs existed.
