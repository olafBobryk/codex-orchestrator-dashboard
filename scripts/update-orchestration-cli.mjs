#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const LEGACY_ORCHESTRATION_DIR = ".codex-orchestration";
const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
const MAP_FILENAME = "map.md";
const TOOL_RELATIVE_PATH = "_tools/orchestration-state.mjs";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_TOOL = path.join(REPO_ROOT, "scripts/orchestration-state.mjs");
const usage = "Usage: npm run update:orchestration-cli -- <target-repo-or-orchestration-root>";

const targetArg = process.argv.slice(2).find((arg) => arg !== "--help" && arg !== "-h");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`${usage}

Installs or refreshes the read-only orchestration-state CLI in a target repo.

The command copies the CLI to the selected orchestration root at
${TOOL_RELATIVE_PATH}. When it can identify a product package.json, it also
adds an npm script:

  "orchestration-state": "node <orchestration-root>/${TOOL_RELATIVE_PATH}"

It does not edit map, run, agent, shape, workpiece, checkpoint, or artifact docs.`);
  process.exit(0);
}

if (!targetArg) {
  console.error(usage);
  process.exit(1);
}

const target = path.resolve(targetArg);

try {
  await assertFileExists(SOURCE_TOOL, "Source orchestration-state CLI is missing.");

  const resolution = await resolveTarget(target);

  if (!resolution) {
    throw new Error(
      "No orchestration root found. Expected a selected root with map.md, docs/orchestration, or .codex-orchestration."
    );
  }

  const toolPath = path.join(resolution.orchestrationRoot, TOOL_RELATIVE_PATH);
  await mkdir(path.dirname(toolPath), { recursive: true });
  await copyFile(SOURCE_TOOL, toolPath);

  let packageUpdated = false;
  if (resolution.productRoot) {
    packageUpdated = await ensurePackageScript(
      path.join(resolution.productRoot, "package.json"),
      path.posix.join(resolution.relativePathFromProduct, TOOL_RELATIVE_PATH)
    );
  }

  console.log(`Updated orchestration CLI: ${toolPath}`);
  console.log(`Orchestration root: ${resolution.orchestrationRoot}`);
  console.log(`Root kind: ${resolution.kind}`);
  if (resolution.productRoot) {
    console.log(`Product package: ${path.join(resolution.productRoot, "package.json")}`);
    console.log(packageUpdated ? "Package script: updated" : "Package script: already current");
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

async function ensurePackageScript(packagePath, relativeToolPath) {
  if (!(await exists(packagePath))) {
    return false;
  }

  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const scripts = packageJson.scripts ?? {};
  const command = `node ${relativeToolPath}`;

  if (scripts["orchestration-state"] === command) {
    return false;
  }

  packageJson.scripts = {
    ...scripts,
    "orchestration-state": command,
  };

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
