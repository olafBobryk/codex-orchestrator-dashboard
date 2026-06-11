# Runtime Architecture

Status: accepted runtime direction, implementation open

This file records how the Codex Orchestrator Dashboard itself should run. It is
separate from project orchestration strategies such as
`strategies/shape-strategy/`.

## Accepted Direction

The dashboard should be able to run as an always-available local service on the
user's desktop without requiring a manual `npm run dev` each time.

For the next runtime packet, use macOS LaunchAgent plus the local Next.js dev
server as the preferred direction.

Default runtime target:

- URL: `http://127.0.0.1:26339`
- Host binding: `127.0.0.1`
- Port: `26339`
- Mode: `next start` from a production build
- LaunchAgent label: `com.codex-orchestrator.dashboard`
- Config: `.codex/tmp/orchestrator-service/config.json`

## Why This Direction

- Keeps browser-based Next.js iteration fast.
- Keeps local filesystem access for project `.codex-orchestration/` docs.
- Avoids Electron or Tauri packaging before the dashboard contract stabilizes.
- Allows the service to restart after login or process exit.

## Current Boundary

- This is dashboard runtime architecture, not shape-strategy architecture.
- The service should not execute project work.
- The service should not become a Codex replacement.
- The service should avoid ports commonly used by Next.js apps and Codex agent
  previews.
- LAN binding is deferred and not included in the first service pass.
- The service should fail loudly on port conflict. It must not kill other
  processes or silently move to another port.
- The service should also fail loudly when another Next dev server is already
  running for this repo, even if that server uses another port.
- Runtime service files belong under ignored `.codex/tmp/orchestrator-service/`,
  not under `.codex-orchestration/`.

## Accepted Service Mechanics

The first service packet should expose these commands:

```bash
npm run service:install
npm run service:start
npm run service:stop
npm run service:restart
npm run service:status
npm run service:open
npm run service:uninstall
```

The service should run the production server on the accepted URL. The
LaunchAgent runner should use `next start` against an existing production build,
building first only when `.next/BUILD_ID` is missing. Normal implementation work
can still use `npm run dev` outside the always-on service.

Runtime files should live under:

```text
.codex/tmp/orchestrator-service/
```

This folder is ignored and should contain runtime output, config, and the
dedicated Chrome profile only.

The service command implementation lives in:

```text
scripts/service.mjs
```

The LaunchAgent runner lives in:

```text
scripts/service-runner.mjs
```

## Open Window Behavior

The service should make the dashboard easy to open without requiring the user
to memorize the port.

Preferred first direction:

- After successful service start, open the dashboard in a minimal Chrome app
  window if Chrome is available.
- The window should target `http://127.0.0.1:26339`.
- The Chrome app window should use a dedicated ignored profile with extensions
  disabled so Dark Reader and other browser extensions do not alter the
  dashboard UI.
- If a Chrome window is already open at the service URL, service open/restart
  should focus and reload that window instead of creating a duplicate window.
- The left sidebar header reload button should reload the currently open
  dashboard URL from inside the page.
- Use a short duplicate-window guard so repeated service restarts do not create
  a pile of duplicate windows.
- If Chrome app-window mode is unavailable, fall back to opening the URL in the
  default browser.
- Filesystem auto-refresh should not watch service runtime files. Keeping them
  outside `.codex-orchestration/` avoids refresh loops from Chrome profile and
  service log churn.
- Filesystem auto-refresh is disabled until it can be reintroduced without
  causing repeated RSC route refreshes in the always-on app.

## Service Status UI

The dashboard may show a compact service indicator inside the left sidebar
header dropdown.

Accepted first pass:

- Label: `Service`.
- A small green indicator when reachable.
- No port text.
- No service controls.

## Open Implementation Questions

- Should some future orchestration strategies declare whether they can be
  projected by the always-on dashboard, or is runtime capability only a
  dashboard concern?

## Deferred Directions

- Electron shell.
- Tauri shell.
- Cloud-hosted dashboard.
- Phone-accessible local network mode.
- LAN binding.
