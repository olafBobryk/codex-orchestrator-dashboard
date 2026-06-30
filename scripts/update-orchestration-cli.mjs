#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const LEGACY_ORCHESTRATION_DIR = ".codex-orchestration";
const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
const MAP_FILENAME = "map.md";
const TOOL_RELATIVE_PATH = "_tools/orchestration.mjs";
const STATE_TOOL_RELATIVE_PATH = "_tools/orchestration-state.mjs";
const PRODUCT_SHIM_RELATIVE_PATH = "scripts/orchestration.mjs";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_TOOL = path.join(REPO_ROOT, "scripts/orchestration.mjs");
const SOURCE_STATE_WRAPPER = path.join(REPO_ROOT, "scripts/orchestration-state.mjs");
const usage = "Usage: npm run update:orchestration-cli -- <target-repo-or-orchestration-root>";

const targetArg = process.argv.slice(2).find((arg) => arg !== "--help" && arg !== "-h");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`${usage}

Installs or refreshes the unified read-only/mutating orchestration CLI in a target repo.

The command copies the CLI to the selected orchestration root:

  ${TOOL_RELATIVE_PATH}

When it can identify a product package.json, it also writes a tracked product shim:

  ${PRODUCT_SHIM_RELATIVE_PATH}

and adds npm scripts:

  "orchestration": "node ${PRODUCT_SHIM_RELATIVE_PATH}"
  "orchestration-state": "node ${PRODUCT_SHIM_RELATIVE_PATH} state"

The shim lets worker worktrees run the command even when ignored docs/orchestration
is absent locally. It finds a checkout that has docs/orchestration/_tools and
forwards to that tool while preserving the caller's cwd and Git/worktree facts.`);
  process.exit(0);
}

if (!targetArg) {
  console.error(usage);
  process.exit(1);
}

const target = path.resolve(targetArg);

try {
  await assertFileExists(SOURCE_TOOL, "Source orchestration CLI is missing.");
  await assertFileExists(SOURCE_STATE_WRAPPER, "Source orchestration-state wrapper is missing.");

  const resolution = await resolveTarget(target);

  if (!resolution) {
    throw new Error(
      "No orchestration root found. Expected a selected root with map.md, docs/orchestration, or .codex-orchestration."
    );
  }

  const toolPath = path.join(resolution.orchestrationRoot, TOOL_RELATIVE_PATH);
  const stateToolPath = path.join(resolution.orchestrationRoot, STATE_TOOL_RELATIVE_PATH);
  await mkdir(path.dirname(toolPath), { recursive: true });
  await copyFile(SOURCE_TOOL, toolPath);
  await copyFile(SOURCE_STATE_WRAPPER, stateToolPath);

  let packageUpdated = false;
  let shimWritten = false;
  if (resolution.productRoot) {
    const shimPath = path.join(resolution.productRoot, PRODUCT_SHIM_RELATIVE_PATH);
    await mkdir(path.dirname(shimPath), { recursive: true });
    await writeFile(shimPath, createProductShim(), "utf8");
    shimWritten = true;
    packageUpdated = await ensurePackageScripts(path.join(resolution.productRoot, "package.json"));
  }

  console.log(`Updated orchestration CLI: ${toolPath}`);
  console.log(`Updated state wrapper: ${stateToolPath}`);
  console.log(`Orchestration root: ${resolution.orchestrationRoot}`);
  console.log(`Root kind: ${resolution.kind}`);
  if (resolution.productRoot) {
    console.log(`Product package: ${path.join(resolution.productRoot, "package.json")}`);
    console.log(shimWritten ? `Product shim: ${path.join(resolution.productRoot, PRODUCT_SHIM_RELATIVE_PATH)}` : "Product shim: skipped");
    console.log(packageUpdated ? "Package scripts: updated" : "Package scripts: already current");
  } else {
    console.log("Product package: not found; copied CLI only");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function resolveTarget(inputPath) {
  const selected = await resolveOrchestrationRoot(inputPath);
  if (selected) {
    return selected;
  }

  let current = inputPath;
  while (true) {
    const candidate = await resolveOrchestrationRoot(current);
    if (candidate) {
      return candidate;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function resolveOrchestrationRoot(workspaceInput) {
  const workspace = workspaceInput.trim();
  if (!workspace) {
    return null;
  }

  const resolvedWorkspace = path.resolve(workspace);
  const candidates = [
    {
      rootDir: resolvedWorkspace,
      relativePathFromWorkspace: "",
      kind: "selected-root",
    },
    {
      rootDir: path.join(resolvedWorkspace, DOCKED_ORCHESTRATION_RELATIVE_DIR),
      relativePathFromWorkspace: DOCKED_ORCHESTRATION_RELATIVE_DIR,
      kind: "docked",
    },
    {
      rootDir: path.join(resolvedWorkspace, LEGACY_ORCHESTRATION_DIR),
      relativePathFromWorkspace: LEGACY_ORCHESTRATION_DIR,
      kind: "legacy",
    },
    {
      rootDir: path.join(
        resolvedWorkspace,
        LEGACY_ORCHESTRATION_DIR,
        SOURCE_STRATEGY_RELATIVE_DIR
      ),
      relativePathFromWorkspace: `${LEGACY_ORCHESTRATION_DIR}/${SOURCE_STRATEGY_RELATIVE_DIR}`,
      kind: "source-strategy",
    },
  ];

  for (const candidate of candidates) {
    if (await isOrchestrationRoot(candidate.rootDir)) {
      const productRoot = await findProductRoot(resolvedWorkspace, candidate);
      return {
        orchestrationRoot: candidate.rootDir,
        kind: candidate.kind,
        productRoot,
        relativePathFromProduct: productRoot
          ? path.relative(productRoot, candidate.rootDir).replace(/\\/g, "/")
          : "",
      };
    }
  }

  return null;
}

async function findProductRoot(workspace, candidate) {
  const possibleRoots = [
    candidate.relativePathFromWorkspace ? workspace : null,
    candidate.rootDir.endsWith(DOCKED_ORCHESTRATION_RELATIVE_DIR)
      ? path.resolve(candidate.rootDir, "../..")
      : null,
    candidate.rootDir.endsWith(LEGACY_ORCHESTRATION_DIR)
      ? path.dirname(candidate.rootDir)
      : null,
    workspace,
  ].filter(Boolean);

  for (const possibleRoot of possibleRoots) {
    if (await exists(path.join(possibleRoot, "package.json"))) {
      return possibleRoot;
    }
  }

  return null;
}

async function ensurePackageScripts(packagePath) {
  if (!(await exists(packagePath))) {
    return false;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const scripts = packageJson.scripts ?? {};
  const nextScripts = {
    ...scripts,
    orchestration: `node ${PRODUCT_SHIM_RELATIVE_PATH}`,
    "orchestration-state": `node ${PRODUCT_SHIM_RELATIVE_PATH} state`,
  };

  const changed =
    scripts.orchestration !== nextScripts.orchestration ||
    scripts["orchestration-state"] !== nextScripts["orchestration-state"];

  if (!changed) {
    return false;
  }

  packageJson.scripts = nextScripts;
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, "\t")}\n`, "utf8");
  return true;
}

async function isOrchestrationRoot(rootDir) {
  try {
    const [directory, mapFile] = await Promise.all([
      stat(rootDir),
      stat(path.join(rootDir, MAP_FILENAME)),
    ]);
    return directory.isDirectory() && mapFile.isFile();
  } catch {
    return false;
  }
}

async function assertFileExists(targetPath, message) {
  try {
    const file = await stat(targetPath);
    if (!file.isFile()) {
      throw new Error(message);
    }
  } catch {
    throw new Error(message);
  }
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function createProductShim() {
  return `#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ORCHESTRATION_ROOT_RELATIVE = "docs/orchestration";
const TOOL_RELATIVE = "docs/orchestration/_tools/orchestration.mjs";
const cwd = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const shimProductRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = candidateProductRoots(cwd, shimProductRoot);
const productRoot = candidates.find((candidate) => existsSync(path.join(candidate, TOOL_RELATIVE)));

if (!productRoot) {
  console.error("No docked orchestration CLI found in this checkout or sibling Git worktrees.");
  console.error("Run update:orchestration-cli from the dashboard repo against the product main checkout.");
  process.exit(1);
}

const tool = path.join(productRoot, TOOL_RELATIVE);
const orchestrationRoot = path.join(productRoot, ORCHESTRATION_ROOT_RELATIVE);
const result = spawnSync(process.execPath, [tool, ...process.argv.slice(2)], {
  cwd,
  env: {
    ...process.env,
    ORCHESTRATION_ROOT: orchestrationRoot,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);

function candidateProductRoots(startCwd, fallbackRoot) {
  const roots = [];
  addRoot(roots, gitOutput(startCwd, ["rev-parse", "--show-toplevel"]));
  addRoot(roots, fallbackRoot);

  const currentRoot = roots[0] ?? startCwd;
  const worktreeOutput = gitOutput(currentRoot, ["worktree", "list", "--porcelain"]);
  for (const match of worktreeOutput.matchAll(/^worktree (.+)$/gm)) {
    addRoot(roots, match[1]);
  }

  return roots;
}

function addRoot(roots, value) {
  const resolved = value ? path.resolve(value.trim()) : null;
  if (resolved && !roots.includes(resolved)) {
    roots.push(resolved);
  }
}

function gitOutput(cwdValue, args) {
  try {
    return execFileSync("git", args, {
      cwd: cwdValue,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
`;
}
