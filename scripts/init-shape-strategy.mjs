#!/usr/bin/env node

import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ORCHESTRATION_DIR = ".codex-orchestration";
const STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
const ARCHITECTURE_FILENAME = "architecture.md";
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const SOURCE_STRATEGY_DIR = path.join(
  REPO_ROOT,
  ORCHESTRATION_DIR,
  STRATEGY_RELATIVE_DIR
);

const args = process.argv.slice(2);
const force = args.includes("--force");
const targetArg = args.find((arg) => arg !== "--force");

if (!targetArg) {
  console.error(
    "Usage: npm run init:shape-strategy -- <target-repo> [--force]"
  );
  process.exit(1);
}

const targetRepo = path.resolve(targetArg);
const targetOrchestrationDir = path.join(targetRepo, ORCHESTRATION_DIR);
const targetStrategyDir = path.join(targetOrchestrationDir, STRATEGY_RELATIVE_DIR);
const targetArchitecturePath = path.join(
  targetOrchestrationDir,
  ARCHITECTURE_FILENAME
);

try {
  await assertDirectoryExists(targetRepo, "Target repo does not exist");
  await assertDirectoryExists(
    SOURCE_STRATEGY_DIR,
    "Source shape strategy template does not exist"
  );

  if (!force && (await exists(targetStrategyDir))) {
    throw new Error(
      `${targetStrategyDir} already exists. Re-run with --force to replace it.`
    );
  }

  await mkdir(targetOrchestrationDir, { recursive: true });
  await cp(SOURCE_STRATEGY_DIR, targetStrategyDir, {
    recursive: true,
    force,
    errorOnExist: !force,
  });
  await ensureArchitecturePointer(targetArchitecturePath);

  console.log(`Initialized shape strategy in ${targetRepo}`);
  console.log(`Strategy: ${path.join(targetStrategyDir, "map.md")}`);
  console.log(`Architecture: ${targetArchitecturePath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function ensureArchitecturePointer(architecturePath) {
  if (await exists(architecturePath)) {
    const content = await readFile(architecturePath, "utf8");

    if (content.includes(`${STRATEGY_RELATIVE_DIR}/map.md`)) {
      return;
    }

    await writeFile(
      architecturePath,
      `${content.trimEnd()}\n\n## Shape Strategy\n\n- Strategy map: \`${STRATEGY_RELATIVE_DIR}/map.md\`\n- Accepted strategy: \`${STRATEGY_RELATIVE_DIR}/meta/orchestration-shape-strategy.md\`\n`,
      "utf8"
    );
    return;
  }

  await writeFile(
    architecturePath,
    `# Architecture\n\nStatus: initialized\n\n## Shape Strategy\n\n- Strategy map: \`${STRATEGY_RELATIVE_DIR}/map.md\`\n- Accepted strategy: \`${STRATEGY_RELATIVE_DIR}/meta/orchestration-shape-strategy.md\`\n`,
    "utf8"
  );
}

async function assertDirectoryExists(directory, message) {
  if (!(await exists(directory))) {
    throw new Error(`${message}: ${directory}`);
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
