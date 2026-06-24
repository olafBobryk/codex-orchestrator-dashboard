#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const NEXT_DEV_LOCK_PATH = path.join(REPO_ROOT, ".next", "dev", "lock");
const NEXT_DIR = path.join(REPO_ROOT, ".next");
const NEXT_BUILD_ID_PATH = path.join(REPO_ROOT, ".next", "BUILD_ID");
const SERVICE_DIR = path.join(REPO_ROOT, ".codex", "tmp", "orchestrator-service");
const CONFIG_PATH = path.join(SERVICE_DIR, "config.json");
const LOG_DIR = path.join(SERVICE_DIR, "logs");
const CHROME_PROFILE_DIR = path.join(SERVICE_DIR, "chrome-profile");
const OPEN_STAMP_PATH = path.join(LOG_DIR, "last-opened-at");
const OPEN_GUARD_MS = 2 * 60 * 1000;
const SERVICE_PATH = [
  path.dirname(process.execPath),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

const config = await readConfig();
const url = `http://${config.host}:${config.port}`;
const dashboardUrl = createDashboardUrl(url, config.defaultWorkspace);
const healthUrl = `${url}/api/service-status`;

await mkdir(LOG_DIR, { recursive: true });
await exitIfAnotherNextDevServerIsRunning();
await assertPortAvailable(config.host, config.port);

const nextBin = path.join(REPO_ROOT, "node_modules", "next", "dist", "bin", "next");
await ensureProductionBuild(nextBin);
const child = spawn(
  process.execPath,
  [
    nextBin,
    "start",
    "--hostname",
    config.host,
    "--port",
    String(config.port),
  ],
  {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      CODEX_ORCHESTRATOR_SERVICE: "1",
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
      PATH: process.env.PATH ? `${SERVICE_PATH}:${process.env.PATH}` : SERVICE_PATH,
    },
    stdio: "inherit",
  }
);

if (config.openBrowserOnStart) {
  void openWhenReady(dashboardUrl);
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));

async function readConfig() {
  const content = await readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(content);

  return {
    host: typeof parsed.host === "string" ? parsed.host : "127.0.0.1",
    port: Number.isInteger(parsed.port) ? parsed.port : 26339,
    openBrowserOnStart: parsed.openBrowserOnStart !== false,
    defaultWorkspace:
      typeof parsed.defaultWorkspace === "string"
        ? parsed.defaultWorkspace
        : REPO_ROOT,
  };
}

async function assertPortAvailable(host, port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", () => {
      reject(
        new Error(
          `Port ${host}:${port} is already in use. Stop the owner before starting the dashboard service.`
        )
      );
    });
    server.once("listening", () => {
      server.close(resolve);
    });
    server.listen(port, host);
  });
}

async function exitIfAnotherNextDevServerIsRunning() {
  const lock = await readNextDevLock();

  if (!lock || !isProcessAlive(lock.pid)) {
    return;
  }

  console.error(
    [
      "Codex Orchestrator service did not start because another Next dev server",
      "is already running for this repo.",
      `Existing server: ${lock.appUrl ?? `port ${lock.port ?? "unknown"}`}`,
      `PID: ${lock.pid}`,
      "Stop that server before starting the LaunchAgent service.",
    ].join("\n")
  );
  process.exit(0);
}

async function ensureProductionBuild(nextBin) {
  const initialHealth = await inspectProductionBuild();

  if (initialHealth.ok) {
    return;
  }

  console.error(
    `Production build needs refresh: ${formatBuildHealth(initialHealth)}`
  );
  await removeInvalidBuildFiles(initialHealth.invalidFiles);

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? "1",
      PATH: process.env.PATH ? `${SERVICE_PATH}:${process.env.PATH}` : SERVICE_PATH,
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const rebuiltHealth = await inspectProductionBuild();

  if (!rebuiltHealth.ok) {
    console.error(
      `Production build is still invalid after rebuild: ${formatBuildHealth(
        rebuiltHealth
      )}`
    );
    process.exit(1);
  }
}

async function readNextDevLock() {
  try {
    const content = await readFile(NEXT_DEV_LOCK_PATH, "utf8");
    const parsed = JSON.parse(content);

    return {
      pid: Number.isInteger(parsed.pid) ? parsed.pid : null,
      port: Number.isInteger(parsed.port) ? parsed.port : null,
      appUrl: typeof parsed.appUrl === "string" ? parsed.appUrl : null,
    };
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function openWhenReady(url) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isReachable(healthUrl)) {
      if (await openUrl(url)) {
        await markWindowOpened();
      }
      return;
    }

    await wait(1_000);
  }
}

async function shouldOpenWindow() {
  try {
    const stats = await stat(OPEN_STAMP_PATH);
    return Date.now() - stats.mtimeMs > OPEN_GUARD_MS;
  } catch {
    return true;
  }
}

async function markWindowOpened() {
  await writeFile(OPEN_STAMP_PATH, new Date().toISOString(), "utf8");
}

async function isReachable(url) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function openUrl(targetUrl) {
  const chromeAvailable = await exists("/Applications/Google Chrome.app");

  if (chromeAvailable && reloadExistingChromeWindow(url, targetUrl)) {
    return true;
  }

  if (!(await shouldOpenWindow())) {
    return false;
  }

  await mkdir(CHROME_PROFILE_DIR, { recursive: true });
  const args = chromeAvailable
    ? [
        "-na",
        "Google Chrome",
        "--args",
        `--user-data-dir=${CHROME_PROFILE_DIR}`,
        "--disable-extensions",
        "--no-first-run",
        "--no-default-browser-check",
        `--app=${targetUrl}`,
      ]
    : [targetUrl];

  spawn("open", args, {
    detached: true,
    stdio: "ignore",
  }).unref();

  return true;
}

function reloadExistingChromeWindow(serviceBaseUrl, targetUrl) {
  const script = `
on run argv
  set serviceBaseUrl to item 1 of argv
  set targetUrl to item 2 of argv
  tell application "Google Chrome"
    repeat with browserWindow in windows
      set tabNumber to 0
      repeat with browserTab in tabs of browserWindow
        set tabNumber to tabNumber + 1
        try
          if (URL of browserTab) starts with serviceBaseUrl then
            set active tab index of browserWindow to tabNumber
            set index of browserWindow to 1
            if (URL of browserTab) starts with targetUrl then
              reload browserTab
            else
              set URL of browserTab to targetUrl
            end if
            activate
            return "reloaded"
          end if
        end try
      end repeat
    end repeat
  end tell
  return "missing"
end run
`;
  const result = spawnSync("osascript", ["-e", script, serviceBaseUrl, targetUrl], {
    encoding: "utf8",
  });

  return result.status === 0 && result.stdout.trim() === "reloaded";
}

function createDashboardUrl(baseUrl, workspacePath) {
  if (!workspacePath.trim()) {
    return baseUrl;
  }

  return `${baseUrl}/?workspace=${encodeURIComponent(workspacePath)}`;
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function inspectProductionBuild() {
  const issues = [];
  const invalidFiles = [];

  if (!(await exists(NEXT_BUILD_ID_PATH))) {
    issues.push("missing .next/BUILD_ID");
  } else {
    const content = await readFile(NEXT_BUILD_ID_PATH, "utf8").catch(() => "");
    if (!content.trim()) {
      issues.push("empty .next/BUILD_ID");
      invalidFiles.push(NEXT_BUILD_ID_PATH);
    }
  }

  const manifestFiles = await findProductionManifestFiles();

  for (const filePath of manifestFiles) {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const stats = await stat(filePath).catch(() => null);

    if (!stats || stats.size === 0) {
      issues.push(`empty ${relativePath}`);
      invalidFiles.push(filePath);
      continue;
    }

    if (filePath.endsWith(".json")) {
      try {
        JSON.parse(await readFile(filePath, "utf8"));
      } catch {
        issues.push(`invalid JSON in ${relativePath}`);
        invalidFiles.push(filePath);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    invalidFiles,
    manifestCount: manifestFiles.length,
  };
}

async function findProductionManifestFiles() {
  if (!(await exists(NEXT_DIR))) {
    return [];
  }

  const files = [];
  await collectManifestFiles(NEXT_DIR, files);

  return files.filter((filePath) => {
    const relativePath = path.relative(NEXT_DIR, filePath);
    return !relativePath.split(path.sep).includes("dev");
  });
}

async function collectManifestFiles(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await collectManifestFiles(entryPath, files);
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.includes("manifest") &&
      (entry.name.endsWith(".json") || entry.name.endsWith(".js"))
    ) {
      files.push(entryPath);
    }
  }
}

async function removeInvalidBuildFiles(filePaths) {
  for (const filePath of filePaths) {
    if (filePath.startsWith(`${NEXT_DIR}${path.sep}`) || filePath === NEXT_BUILD_ID_PATH) {
      await rm(filePath, { force: true });
    }
  }
}

function formatBuildHealth(health) {
  const issueText = health.issues.slice(0, 4).join("; ");
  const suffix = health.issues.length > 4 ? `; +${health.issues.length - 4} more` : "";

  return `${issueText}${suffix || ""}`;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
