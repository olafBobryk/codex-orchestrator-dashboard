#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  readFile,
  rm,
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
const NEXT_DEV_LOCK_PATH = path.join(REPO_ROOT, ".next", "dev", "lock");
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

  if (await isReachable(serviceHealthUrl)) {
    console.log(`Service already responds: ${serviceUrl}`);
    await openDashboard();
    return;
  }

  if ((await isLaunchAgentLoaded()) || (await readPortOwner(config.port))) {
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
}

async function stop({ quiet = false } = {}) {
  runLaunchctl(["bootout", serviceTarget], { allowFailure: true });

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
  const owner = await readPortOwner(config.port);
  const devLock = await readNextDevLock();

  console.log(`Service: ${config.launchAgentLabel}`);
  console.log(`URL: ${serviceUrl}`);
  console.log(`LaunchAgent: ${launchctl.ok ? "loaded" : "not loaded"}`);
  console.log(`HTTP: ${reachable ? "reachable" : "not reachable"}`);
  console.log(`Port owner: ${owner || "none detected"}`);
  console.log(
    `Next dev lock: ${
      devLock && isProcessAlive(devLock.pid)
        ? formatNextDevLock(devLock)
        : "none detected"
    }`
  );
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
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return "";
  }

  return result.stdout
    .trim()
    .split("\n")
    .slice(1)
    .join("; ");
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
