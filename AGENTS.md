<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Codex Orchestrator Dashboard

This project has accepted the V1 local sidecar direction.

Keep the boundary strict:

- The dashboard visualizes durable orchestration docs.
- The dashboard does not replace Codex chat.
- The dashboard does not execute implementation work.
- The dashboard does not generate prompts in V1.
- The dashboard does not track agents, concerns, gates, verification, or previews
  as separate workflow systems in V1; it only summarizes those states from docs.
- Markdown editing should happen in VS Code. The dashboard may link to specific
  Markdown files in VS Code, but it should not provide a separate `/editor`
  route or in-app Markdown editor.
- The dashboard does not become a second overlay unless that direction is
  explicitly accepted later.
- The V1 document format is plain Markdown under `.codex-orchestration/`.
- This thread is the orchestrator chat. It owns durable docs, packet order,
  gates, spawned-chat coordination, and returned-work review. It should not be
  the default implementation chat for feature packets.
- Use one visible orchestrator chat as the project control plane. Its primary
  job is to serve bounded packets, record packet order/gates/concerns, and
  consolidate returned work. Do not treat each packet chat as a new strategy
  authority.
- Use chunk ledgers only per packet when the packet needs durable execution
  state. Do not use a chunk ledger as the global project strategy doc.
- When splitting work for this project, prefer visible Codex threads over
  hidden/background subagents unless the user explicitly asks for hidden
  delegation.

If a task needs a local secret, token, API key, chat ID, or env value, do not ask
the user to paste it into terminal or chat. Prefer an ignored repo-local
secret/env file that code can read directly. Never print, quote, summarize, log,
or commit the secret.

When work produces something reviewable, include the most direct review link
available in the final response. Do not invent preview links.
