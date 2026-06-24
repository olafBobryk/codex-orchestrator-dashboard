#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  GUIDE_DIR,
  LEGACY_STRATEGY_RELATIVE_DIR,
  MAP_TEMPLATE,
  ORCHESTRATION_DIR,
  PRESSURE_LEDGER_FILENAME,
  PRESSURE_LEDGER_TEMPLATE,
  SOURCE_STRATEGY_RELATIVE_DIR,
  STARTER_DIRECTORIES,
  STRATEGY_EXPERIMENTS_DIR,
  TEMPLATES_DIR,
  starterDirectoryReadme,
  strategyExperimentsReadme,
} from "./shape-strategy-template.mjs";

const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
const ORCHESTRATION_POINTER_RELATIVE_PATH = "docs/ORCHESTRATION.md";
const ORCHESTRATION_BRANCH = "orchestration";
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const SOURCE_STRATEGY_DIR = path.join(
  REPO_ROOT,
  ORCHESTRATION_DIR,
  SOURCE_STRATEGY_RELATIVE_DIR
);
const SOURCE_GUIDE_DIR = path.join(SOURCE_STRATEGY_DIR, GUIDE_DIR);
const SOURCE_TEMPLATES_DIR = path.join(SOURCE_STRATEGY_DIR, TEMPLATES_DIR);

const args = process.argv.slice(2);
const force = args.includes("--force");
const targetArg = args.find((arg) => arg !== "--force");

if (!targetArg) {
  console.error(
    "Usage: npm run init:orchestration-dock -- <product-repo> [--force]"
  );
  process.exit(1);
}

const productRepo = path.resolve(targetArg);
const dockRoot = path.join(productRepo, DOCKED_ORCHESTRATION_RELATIVE_DIR);
const legacyRoot = path.join(productRepo, ORCHESTRATION_DIR);
const pointerPath = path.join(productRepo, ORCHESTRATION_POINTER_RELATIVE_PATH);

try {
  await assertDirectoryExists(productRepo, "Product repo does not exist");
  await assertDirectoryExists(
    SOURCE_GUIDE_DIR,
    "Source shape strategy guide docs do not exist"
  );
  await assertDirectoryExists(
    SOURCE_TEMPLATES_DIR,
    "Source shape strategy templates do not exist"
  );

  const remoteUrl = readProductRemoteUrl(productRepo);

  await ensureProductGitignore(productRepo);
  await writePointerDoc(pointerPath, remoteUrl);
  await mkdir(dockRoot, { recursive: true });
  await ensureNestedGitRepo(dockRoot, remoteUrl);

  if (await exists(path.join(dockRoot, "map.md"))) {
    if (!force) {
      throw new Error(
        `${dockRoot} already contains orchestration docs. Re-run with --force to replace support docs.`
      );
    }
  }

  if (await exists(path.join(legacyRoot, "map.md"))) {
    await copyLegacyRootToDock();
  } else if (
    await exists(path.join(legacyRoot, LEGACY_STRATEGY_RELATIVE_DIR, "map.md"))
  ) {
    await cp(path.join(legacyRoot, LEGACY_STRATEGY_RELATIVE_DIR), dockRoot, {
      recursive: true,
      force: true,
    });
  } else if (!(await exists(path.join(dockRoot, "map.md")))) {
    await writeStarterDocs(dockRoot);
    await writePressureLedger(dockRoot);
  }

  await updateSupportDocs(dockRoot);
  await ensureStarterDirectories(dockRoot);
  await ensureStrategyExperimentsDirectory(dockRoot);

  console.log(`Initialized docked orchestration root: ${dockRoot}`);
  console.log(`Pointer: ${pointerPath}`);
  console.log(`Remote: ${remoteUrl}`);
  console.log(`Branch: ${ORCHESTRATION_BRANCH}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function copyLegacyRootToDock() {
  const ignored = new Set([".git"]);

  for (const entry of await readdir(legacyRoot, { withFileTypes: true })) {
    if (ignored.has(entry.name)) {
      continue;
    }

    await cp(path.join(legacyRoot, entry.name), path.join(dockRoot, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function updateSupportDocs(strategyDir) {
  await cp(SOURCE_GUIDE_DIR, path.join(strategyDir, GUIDE_DIR), {
    recursive: true,
    force: true,
  });
  await cp(SOURCE_TEMPLATES_DIR, path.join(strategyDir, TEMPLATES_DIR), {
    recursive: true,
    force: true,
  });
}

async function writeStarterDocs(strategyDir) {
  await writeFile(path.join(strategyDir, "map.md"), MAP_TEMPLATE, "utf8");
}

async function writePressureLedger(strategyDir) {
  const pressureLedgerPath = path.join(strategyDir, PRESSURE_LEDGER_FILENAME);

  if (!(await exists(pressureLedgerPath))) {
    await writeFile(pressureLedgerPath, PRESSURE_LEDGER_TEMPLATE, "utf8");
  }
}

async function ensureStarterDirectories(strategyDir) {
  for (const directory of STARTER_DIRECTORIES) {
    const targetDir = path.join(strategyDir, directory);
    const readmePath = path.join(targetDir, "README.md");

    await mkdir(targetDir, { recursive: true });

    if (!(await exists(readmePath))) {
      await writeFile(readmePath, starterDirectoryReadme(directory), "utf8");
    }
  }
}

async function ensureStrategyExperimentsDirectory(strategyDir) {
  const experimentsDir = path.join(strategyDir, STRATEGY_EXPERIMENTS_DIR);
  const readmePath = path.join(experimentsDir, "README.md");

  await mkdir(experimentsDir, { recursive: true });

  if (!(await exists(readmePath))) {
    await writeFile(readmePath, strategyExperimentsReadme(), "utf8");
  }
}

async function ensureProductGitignore(repo) {
  const gitignorePath = path.join(repo, ".gitignore");
  const rule = `/${DOCKED_ORCHESTRATION_RELATIVE_DIR}/`;
  const content = (await exists(gitignorePath))
    ? await readFile(gitignorePath, "utf8")
    : "";

  if (content.split(/\r?\n/).includes(rule)) {
    return;
  }

  await writeFile(
    gitignorePath,
    `${content.trimEnd()}${content.trim() ? "\n" : ""}${rule}\n`,
    "utf8"
  );
}

async function writePointerDoc(pointer, remoteUrl) {
  await mkdir(path.dirname(pointer), { recursive: true });
  await writeFile(
    pointer,
    `# Codex Orchestration

Status: active pointer

This project uses Codex Orchestration with a docked orchestration root.

- Local orchestration root: \`${DOCKED_ORCHESTRATION_RELATIVE_DIR}/\`
- Git branch: \`${ORCHESTRATION_BRANCH}\`
- Remote: \`${remoteUrl}\`
- Dashboard source: select this product repo or \`${DOCKED_ORCHESTRATION_RELATIVE_DIR}/\`

The \`${DOCKED_ORCHESTRATION_RELATIVE_DIR}/\` directory is an ignored nested Git
repo. It is the steward-owned projection source of truth.

Product worktrees should not edit projection docs directly. Worker-local
orchestration notes are evidence only until the steward promotes accepted state
into the docked orchestration root.
`,
    "utf8"
  );
}

async function ensureNestedGitRepo(repo, remoteUrl) {
  await mkdir(repo, { recursive: true });

  if (!(await exists(path.join(repo, ".git")))) {
    git(repo, ["init"]);
    git(repo, ["symbolic-ref", "HEAD", `refs/heads/${ORCHESTRATION_BRANCH}`]);
  }

  const remotes = git(repo, ["remote"], { allowFailure: true })
    .split(/\r?\n/)
    .filter(Boolean);

  if (remotes.includes("origin")) {
    git(repo, ["remote", "set-url", "origin", remoteUrl]);
  } else {
    git(repo, ["remote", "add", "origin", remoteUrl]);
  }
}

function readProductRemoteUrl(repo) {
  const branch = git(repo, ["branch", "--show-current"], { allowFailure: true });
  const upstreamRemote = branch
    ? git(repo, ["config", "--get", `branch.${branch}.remote`], {
        allowFailure: true,
      })
    : "";
  const remoteName =
    upstreamRemote ||
    (git(repo, ["remote"], { allowFailure: true })
      .split(/\r?\n/)
      .filter(Boolean)
      .includes("origin")
      ? "origin"
      : git(repo, ["remote"], { allowFailure: true })
          .split(/\r?\n/)
          .filter(Boolean)[0]);

  if (!remoteName) {
    throw new Error("Product repo has no Git remote to share.");
  }

  return git(repo, ["remote", "get-url", remoteName]);
}

function git(cwd, args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }

    throw error;
  }
}

async function assertDirectoryExists(target, message) {
  try {
    const targetStat = await stat(target);

    if (!targetStat.isDirectory()) {
      throw new Error(message);
    }
  } catch {
    throw new Error(message);
  }
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
