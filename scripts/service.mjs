#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import {
  access,
  chmod,
  readdir,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const SERVICE_DIR = path.join(REPO_ROOT, ".codex", "tmp", "orchestrator-service");
const CONFIG_PATH = path.join(SERVICE_DIR, "config.json");
const LOG_DIR = path.join(SERVICE_DIR, "logs");
const CHROME_PROFILE_DIR = path.join(SERVICE_DIR, "chrome-profile");
const RUNNER_PATH = path.join(REPO_ROOT, "scripts", "service-runner.mjs");
const NEXT_DIR = path.join(REPO_ROOT, ".next");
const NEXT_DEV_LOCK_PATH = path.join(REPO_ROOT, ".next", "dev", "lock");
const NEXT_BUILD_ID_PATH = path.join(REPO_ROOT, ".next", "BUILD_ID");
const APP_NAME = "Codex Orchestration Dashboard";
const APP_DIR = path.join(os.homedir(), "Applications", `${APP_NAME}.app`);
const APP_CONTENTS_DIR = path.join(APP_DIR, "Contents");
const APP_MACOS_DIR = path.join(APP_CONTENTS_DIR, "MacOS");
const APP_EXECUTABLE_PATH = path.join(APP_MACOS_DIR, "launcher");
const LSREGISTER_PATH =
  "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
const DEFAULT_CONFIG = {
  host: "127.0.0.1",
  port: 26339,
  launchAgentLabel: "com.codex-orchestrator.dashboard",
  openBrowserOnStart: true,
  defaultWorkspace: REPO_ROOT,
};
const SERVICE_PATH = [
  path.dirname(process.execPath),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
].join(":");

const command = process.argv[2] ?? "status";
const config = await readConfig();
const plistPath = path.join(
  os.homedir(),
  "Library",
  "LaunchAgents",
  `${config.launchAgentLabel}.plist`
);
const serviceTarget = `gui/${currentUid()}/${config.launchAgentLabel}`;
const serviceUrl = `http://${config.host}:${config.port}`;
const serviceHealthUrl = `${serviceUrl}/api/service-status`;
const dashboardUrl = createDashboardUrl(serviceUrl, config.defaultWorkspace);
const packageName = await readPackageName(REPO_ROOT);

try {
  switch (command) {
    case "install":
      await install();
      break;
    case "start":
      await start();
      break;
    case "stop":
      await stop();
      break;
    case "restart":
      await stop({ quiet: true });
      await waitForPortRelease();
      await install();
      await start();
      break;
    case "status":
      await status();
      break;
    case "open":
      await openDashboard();
      break;
    case "install-app":
      await installApp();
      break;
    case "uninstall-app":
      await uninstallApp();
      break;
    case "uninstall":
      await stop({ quiet: true });
      await uninstall();
      break;
    default:
      throw new Error(`Unknown service command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function install() {
  await ensureServiceFiles();
  await mkdir(path.dirname(plistPath), { recursive: true });
  await writeFile(plistPath, createPlist(), "utf8");
  console.log(`Installed LaunchAgent: ${plistPath}`);
  console.log(`Service URL: ${serviceUrl}`);
}

async function start() {
  await install();

  const launchAgentLoaded = await isLaunchAgentLoaded();
  const serviceReachable = await isReachable(serviceHealthUrl);

  if (serviceReachable && launchAgentLoaded) {
    console.log(`Service already responds: ${serviceUrl}`);
    await openDashboard();
    return;
  }

  if (launchAgentLoaded || (await readPortOwner(config.port))) {
    await stop({ quiet: true });
    await waitForPortRelease();
  }

  await assertPortAvailable(config.host, config.port);
  await assertNoConflictingNextDevServer();
  runLaunchctl(["bootstrap", `gui/${currentUid()}`, plistPath], {
    allowFailure: true,
  });
  const kickstart = runLaunchctl(["kickstart", "-k", serviceTarget], {
    allowFailure: true,
    capture: true,
  });

  if (!kickstart.ok && !(await isLaunchAgentLoaded())) {
    process.stderr.write(kickstart.stderr || kickstart.stdout);
    process.exit(kickstart.status ?? 1);
  }

  console.log(`Started LaunchAgent: ${config.launchAgentLabel}`);
  console.log(`Service URL: ${serviceUrl}`);

  if (!(await waitForReachable(serviceHealthUrl, 60_000))) {
    await printStartupDiagnostics();
    throw new Error(
      `Service did not become reachable at ${serviceUrl} after launch.`
    );
  }
}

async function stop({ quiet = false } = {}) {
  runLaunchctl(["bootout", serviceTarget], { allowFailure: true });
  await terminateManagedOrphanServiceProcesses();

  if (!quiet) {
    console.log(`Stopped LaunchAgent: ${config.launchAgentLabel}`);
  }
}

async function waitForPortRelease() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!(await readPortOwner(config.port))) {
      return;
    }

    await wait(250);
  }

  throw new Error(
    `Port ${config.host}:${config.port} did not release after stopping the service.`
  );
}

async function uninstall() {
  await rm(plistPath, { force: true });
  console.log(`Uninstalled LaunchAgent: ${plistPath}`);
}

async function installApp() {
  await mkdir(APP_MACOS_DIR, { recursive: true });
  await writeFile(path.join(APP_CONTENTS_DIR, "Info.plist"), createAppPlist(), "utf8");
  await writeFile(APP_EXECUTABLE_PATH, createAppLauncherScript(), "utf8");
  await chmod(APP_EXECUTABLE_PATH, 0o755);
  spawnSync(LSREGISTER_PATH, ["-f", APP_DIR], { stdio: "ignore" });

  console.log(`Installed app launcher: ${APP_DIR}`);
}

async function uninstallApp() {
  await rm(APP_DIR, { force: true, recursive: true });
  console.log(`Uninstalled app launcher: ${APP_DIR}`);
}

async function isLaunchAgentLoaded() {
  return runLaunchctl(["print", serviceTarget], {
    allowFailure: true,
    capture: true,
  }).ok;
}

async function status() {
  const launchctl = runLaunchctl(["print", serviceTarget], {
    allowFailure: true,
    capture: true,
  });
  const reachable = await isReachable(serviceHealthUrl);
  const owners = await readPortOwners(config.port);
  const devLock = await readNextDevLock();
  const launchDetails = parseLaunchctlPrint(launchctl.stdout);
  const buildHealth = await inspectProductionBuild();
  const logHints = await readRecentLogHints();

  console.log(`Service: ${config.launchAgentLabel}`);
  console.log(`URL: ${serviceUrl}`);
  console.log(`LaunchAgent: ${launchctl.ok ? "loaded" : "not loaded"}`);
  if (launchDetails.length > 0) {
    console.log(`LaunchAgent details: ${launchDetails.join("; ")}`);
  }
  console.log(`HTTP: ${reachable ? "reachable" : "not reachable"}`);
  console.log(
    `Port owner: ${owners.length > 0 ? formatPortOwners(owners) : "none detected"}`
  );
  console.log(
    `Next dev lock: ${
      devLock && isProcessAlive(devLock.pid)
        ? formatNextDevLock(devLock)
        : "none detected"
    }`
  );
  console.log(`Production build: ${formatBuildHealth(buildHealth)}`);
  if (logHints.length > 0) {
    console.log(`Recent log hints: ${logHints.join("; ")}`);
  }
  if (!reachable) {
    await printRecentLogTail();
  }
  console.log(`Logs: ${LOG_DIR}`);
}

async function openDashboard() {
  const chromeAvailable = await exists("/Applications/Google Chrome.app");

  if (chromeAvailable && reloadExistingChromeWindow(serviceUrl, dashboardUrl)) {
    return;
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
        `--app=${dashboardUrl}`,
      ]
    : [dashboardUrl];
  const result = spawnSync("open", args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
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

async function ensureServiceFiles() {
  await mkdir(LOG_DIR, { recursive: true });

  if (!(await exists(CONFIG_PATH))) {
    await writeFile(
      CONFIG_PATH,
      `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`,
      "utf8"
    );
  }
}

async function readConfig() {
  await mkdir(SERVICE_DIR, { recursive: true });

  if (!(await exists(CONFIG_PATH))) {
    await writeFile(
      CONFIG_PATH,
      `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`,
      "utf8"
    );
    return DEFAULT_CONFIG;
  }

  const content = await readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(content);

  return {
    host: typeof parsed.host === "string" ? parsed.host : DEFAULT_CONFIG.host,
    port: Number.isInteger(parsed.port) ? parsed.port : DEFAULT_CONFIG.port,
    launchAgentLabel:
      typeof parsed.launchAgentLabel === "string"
        ? parsed.launchAgentLabel
        : DEFAULT_CONFIG.launchAgentLabel,
    openBrowserOnStart: parsed.openBrowserOnStart !== false,
    defaultWorkspace:
      typeof parsed.defaultWorkspace === "string"
        ? parsed.defaultWorkspace
        : DEFAULT_CONFIG.defaultWorkspace,
  };
}

async function readPackageName(repoRoot) {
  try {
    const content = await readFile(path.join(repoRoot, "package.json"), "utf8");
    const parsed = JSON.parse(content);

    return typeof parsed.name === "string" ? parsed.name : null;
  } catch {
    return null;
  }
}

function createPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(config.launchAgentLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(process.execPath)}</string>
    <string>${escapeXml(RUNNER_PATH)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(REPO_ROOT)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(LOG_DIR, "out.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(LOG_DIR, "err.log"))}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>CODEX_ORCHESTRATOR_SERVICE</key>
    <string>1</string>
    <key>NEXT_TELEMETRY_DISABLED</key>
    <string>1</string>
    <key>PATH</key>
    <string>${escapeXml(SERVICE_PATH)}</string>
  </dict>
</dict>
</plist>
`;
}

function createAppPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleIdentifier</key>
  <string>${escapeXml(`${config.launchAgentLabel}.launcher`)}</string>
  <key>CFBundleName</key>
  <string>${escapeXml(APP_NAME)}</string>
  <key>CFBundleDisplayName</key>
  <string>${escapeXml(APP_NAME)}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSUIElement</key>
  <true/>
</dict>
</plist>
`;
}

function createAppLauncherScript() {
  return `#!/bin/zsh
export PATH=${shellQuote(SERVICE_PATH)}:$PATH
cd ${shellQuote(REPO_ROOT)} || exit 1
${shellQuote(process.execPath)} ${shellQuote(path.join(REPO_ROOT, "scripts", "service.mjs"))} start >/dev/null 2>&1 &
exit 0
`;
}

function createDashboardUrl(baseUrl, workspacePath) {
  if (!workspacePath.trim()) {
    return baseUrl;
  }

  return `${baseUrl}/?workspace=${encodeURIComponent(workspacePath)}`;
}

async function assertPortAvailable(host, port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", async () => {
      const owner = await readPortOwner(port);
      reject(
        new Error(
          `Port ${host}:${port} is already in use${owner ? ` by ${owner}` : ""}.`
        )
      );
    });
    server.once("listening", () => {
      server.close(resolve);
    });
    server.listen(port, host);
  });
}

async function assertNoConflictingNextDevServer() {
  const lock = await readNextDevLock();

  if (!lock || !isProcessAlive(lock.pid)) {
    return;
  }

  throw new Error(
    [
      "Another Next dev server is already running for this repo.",
      `Existing server: ${lock.appUrl ?? `port ${lock.port ?? "unknown"}`}`,
      `PID: ${lock.pid}`,
      "Stop that server before starting the dashboard service.",
    ].join("\n")
  );
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

async function readPortOwner(port) {
  return formatPortOwners(await readPortOwners(port));
}

async function readPortOwners(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return await Promise.all(
    result.stdout
    .trim()
    .split("\n")
    .slice(1)
      .map(async (line) => {
        const columns = line.trim().split(/\s+/);
        const pid = Number.parseInt(columns[1] ?? "", 10);
        const details = Number.isInteger(pid)
          ? await readProcessDetails(pid)
          : null;

        return {
          line,
          pid: Number.isInteger(pid) ? pid : null,
          details,
        };
      })
  );
}

function formatPortOwners(owners) {
  return owners
    .map((owner) => {
      if (!owner.details?.command) {
        return owner.line;
      }

      return `${owner.line} [cwd: ${owner.details.cwd ?? "unknown"}, command: ${owner.details.command}]`;
    })
    .join("; ");
}

async function readProcessDetails(pid) {
  const ps = spawnSync("ps", ["-p", String(pid), "-o", "pid=,ppid=,command="], {
    encoding: "utf8",
  });
  const cwd = readProcessCwd(pid);

  if (ps.status !== 0 || !ps.stdout.trim()) {
    return { pid, ppid: null, command: "", cwd };
  }

  const match = ps.stdout.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);

  return {
    pid,
    ppid: match ? Number.parseInt(match[2], 10) : null,
    command: match?.[3] ?? ps.stdout.trim(),
    cwd,
  };
}

function readProcessCwd(pid) {
  const result = spawnSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return null;
  }

  const line = result.stdout
    .split("\n")
    .find((entry) => entry.startsWith("n"));

  return line ? line.slice(1) : null;
}

async function terminateManagedOrphanServiceProcesses() {
  const owners = await readPortOwners(config.port);
  const candidates = new Map();

  for (const owner of owners) {
    const serviceProcess = await findManagedServiceProcess(owner.details);

    if (serviceProcess) {
      candidates.set(serviceProcess.pid, serviceProcess);
    }
  }

  for (const processDetails of candidates.values()) {
    try {
      process.kill(processDetails.pid, "SIGTERM");
    } catch {
      continue;
    }
  }
}

async function findManagedServiceProcess(details) {
  if (!details) {
    return null;
  }

  if (await isManagedServiceRunner(details)) {
    return details;
  }

  if (!details.ppid) {
    return null;
  }

  const parentDetails = await readProcessDetails(details.ppid);

  if (await isManagedServiceRunner(parentDetails)) {
    return parentDetails;
  }

  return null;
}

async function isManagedServiceRunner(details) {
  if (!details?.command.includes("scripts/service-runner.mjs")) {
    return false;
  }

  if (details.cwd === REPO_ROOT) {
    return true;
  }

  if (!details.cwd || !packageName) {
    return false;
  }

  return (await readPackageName(details.cwd)) === packageName;
}

async function waitForReachable(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
      return true;
    }

    await wait(1_000);
  }

  return false;
}

async function printStartupDiagnostics() {
  const launchctl = runLaunchctl(["print", serviceTarget], {
    allowFailure: true,
    capture: true,
  });
  const owners = await readPortOwners(config.port);
  const buildHealth = await inspectProductionBuild();
  const logHints = await readRecentLogHints();

  console.error(`LaunchAgent: ${launchctl.ok ? "loaded" : "not loaded"}`);
  const launchDetails = parseLaunchctlPrint(launchctl.stdout);
  if (launchDetails.length > 0) {
    console.error(`LaunchAgent details: ${launchDetails.join("; ")}`);
  }
  console.error(
    `Port owner: ${owners.length > 0 ? formatPortOwners(owners) : "none detected"}`
  );
  console.error(`Production build: ${formatBuildHealth(buildHealth)}`);
  if (logHints.length > 0) {
    console.error(`Recent log hints: ${logHints.join("; ")}`);
  }
  await printRecentLogTail(console.error);
}

function parseLaunchctlPrint(output) {
  if (!output) {
    return [];
  }

  const keys = [
    "state",
    "pid",
    "last exit code",
    "last terminating signal",
    "last spawn",
    "runs",
    "successive crashes",
    "spawn type",
    "throttle interval",
  ];
  const details = [];

  for (const key of keys) {
    const match = output.match(new RegExp(`^\\s*${escapeRegex(key)} = (.+)$`, "m"));

    if (match) {
      details.push(`${key}: ${match[1].trim()}`);
    }
  }

  return details;
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

function formatBuildHealth(health) {
  if (health.ok) {
    return `ok (${health.manifestCount} manifest files checked)`;
  }

  const issueText = health.issues.slice(0, 4).join("; ");
  const suffix = health.issues.length > 4 ? `; +${health.issues.length - 4} more` : "";

  return `needs rebuild (${issueText}${suffix})`;
}

async function readRecentLogHints() {
  const hints = new Set();
  const logs = [
    ["err.log", path.join(LOG_DIR, "err.log")],
    ["out.log", path.join(LOG_DIR, "out.log")],
  ];

  for (const [name, logPath] of logs) {
    const content = await readFile(logPath, "utf8").catch(() => "");
    const tail = tailLines(content, 120).join("\n");

    if (/Manifest file is empty|Unexpected end of JSON input/i.test(tail)) {
      hints.add(`${name}: stale or corrupt Next manifest output`);
    }
    if (/EADDRINUSE|Port .* already in use/i.test(tail)) {
      hints.add(`${name}: service port conflict`);
    }
    if (/another Next dev server/i.test(tail)) {
      hints.add(`${name}: conflicting Next dev server`);
    }
    if (/Could not find a production build|No production build/i.test(tail)) {
      hints.add(`${name}: missing production build`);
    }
  }

  return [...hints];
}

async function printRecentLogTail(write = console.log) {
  const errLog = path.join(LOG_DIR, "err.log");
  const content = await readFile(errLog, "utf8").catch(() => "");
  const lines = tailLines(content, 8);

  if (lines.length === 0) {
    return;
  }

  write("Recent err.log tail:");
  for (const line of lines) {
    write(`  ${line}`);
  }
}

function tailLines(content, count) {
  return content.trimEnd().split("\n").filter(Boolean).slice(-count);
}

function runLaunchctl(args, options = {}) {
  const result = spawnSync("launchctl", args, {
    encoding: "utf8",
  });
  const ok = result.status === 0;

  if (!ok && !options.allowFailure) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  if (options.capture) {
    return { ok, status: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  return { ok, status: result.status };
}

function currentUid() {
  return (
    process.getuid?.() ??
    execFileSync("id", ["-u"], { encoding: "utf8" }).trim()
  );
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

function formatNextDevLock(lock) {
  return `${lock.appUrl ?? `port ${lock.port ?? "unknown"}`} (PID ${lock.pid})`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
