#!/usr/bin/env node

import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ACCEPTED_STRATEGY_LINE,
  ARCHITECTURE_FILENAME,
  GUIDE_DIR,
  LEGACY_ACCEPTED_STRATEGY_LINE,
  LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE,
  LEGACY_META_DIR,
  LEGACY_PRESSURE_LEDGER_LINE,
  LEGACY_STRATEGY_GUIDE_LINE,
  LEGACY_STRATEGY_MAP_LINE,
  LEGACY_STRATEGY_RELATIVE_DIR,
  LEGACY_STRATEGY_TEMPLATES_LINE,
  LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE,
  LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE,
  LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE,
  ORCHESTRATION_DIR,
  PRESSURE_LEDGER_FILENAME,
  PRESSURE_LEDGER_LINE,
  PRESSURE_LEDGER_TEMPLATE,
  SOURCE_STRATEGY_RELATIVE_DIR,
  STARTER_DIRECTORIES,
  STRATEGY_EXPERIMENTS_DIR,
  STRATEGY_GUIDE_LINE,
  STRATEGY_MAP_LINE,
  STRATEGY_TEMPLATES_LINE,
  TEMPLATES_DIR,
  shapeStrategyArchitectureBlock,
  starterDirectoryReadme,
  strategyExperimentsReadme,
} from "./shape-strategy-template.mjs";

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
const targetArg = args[0];

if (!targetArg) {
  console.error("Usage: npm run update:shape-strategy -- <target-repo>");
  process.exit(1);
}

const targetRepo = path.resolve(targetArg);
const targetOrchestrationDir = path.join(targetRepo, ORCHESTRATION_DIR);
const targetNestedStrategyDir = path.join(
  targetOrchestrationDir,
  LEGACY_STRATEGY_RELATIVE_DIR
);
const targetArchitecturePath = path.join(
  targetOrchestrationDir,
  ARCHITECTURE_FILENAME
);

try {
  await assertDirectoryExists(targetRepo, "Target repo does not exist");
  await assertDirectoryExists(
    SOURCE_GUIDE_DIR,
    "Source shape strategy guide docs do not exist"
  );
  await assertDirectoryExists(
    SOURCE_TEMPLATES_DIR,
    "Source shape strategy templates do not exist"
  );

  if (targetRepo === REPO_ROOT) {
    console.log("Source repo hosts canonical strategies under the nested path.");
    console.log("No root migration was performed.");
    console.log(`Strategy source: ${SOURCE_STRATEGY_DIR}`);
    process.exit(0);
  }

  const rootValid = await isRootShapeStrategy();
  const nestedValid = await isNestedShapeStrategy();

  if (!rootValid && !nestedValid) {
    throw new Error(
      `${targetOrchestrationDir} does not contain a recognized shape strategy. Run init:shape-strategy first or migrate manually.`
    );
  }

  if (!rootValid && nestedValid) {
    await migrateNestedShapeStrategyToRoot();
  }

  await updateSupportDocs(targetOrchestrationDir);
  const createdStarterDirectories =
    await ensureStarterDirectories(targetOrchestrationDir);
  const pressureLedgerCreated = await ensurePressureLedger(
    path.join(targetOrchestrationDir, PRESSURE_LEDGER_FILENAME)
  );
  await ensureStrategyExperimentsDirectory(targetOrchestrationDir);
  await removeLegacySupportFolders(targetOrchestrationDir);
  await ensureArchitecturePointer(targetArchitecturePath);

  console.log(`Updated shape strategy support docs in ${targetRepo}`);
  console.log(`Updated guides: ${path.join(targetOrchestrationDir, GUIDE_DIR)}`);
  console.log(
    `Updated templates: ${path.join(targetOrchestrationDir, TEMPLATES_DIR)}`
  );
  console.log(
    pressureLedgerCreated
      ? `Created pressure ledger: ${path.join(targetOrchestrationDir, PRESSURE_LEDGER_FILENAME)}`
      : `Preserved pressure ledger: ${path.join(targetOrchestrationDir, PRESSURE_LEDGER_FILENAME)}`
  );
  if (!rootValid && nestedValid) {
    console.log("Migrated nested shape strategy to root .codex-orchestration.");
  }
  if (createdStarterDirectories.length > 0) {
    console.log(
      `Created support directories: ${createdStarterDirectories.join(", ")}`
    );
  }
  console.log(`Architecture: ${targetArchitecturePath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function updateSupportDocs(strategyDir) {
  await mkdir(path.join(strategyDir, GUIDE_DIR), { recursive: true });
  await cp(SOURCE_GUIDE_DIR, path.join(strategyDir, GUIDE_DIR), {
    recursive: true,
    force: true,
  });
  await mkdir(path.join(strategyDir, TEMPLATES_DIR), { recursive: true });
  await cp(SOURCE_TEMPLATES_DIR, path.join(strategyDir, TEMPLATES_DIR), {
    recursive: true,
    force: true,
  });
}

async function migrateNestedShapeStrategyToRoot() {
  const entries = await readdir(targetNestedStrategyDir, { withFileTypes: true });

  for (const entry of entries) {
    await cp(
      path.join(targetNestedStrategyDir, entry.name),
      path.join(targetOrchestrationDir, entry.name),
      { recursive: true, force: true }
    );
  }

  await rm(targetNestedStrategyDir, { recursive: true, force: true });
}

async function ensureStarterDirectories(strategyDir) {
  const created = [];

  for (const directory of STARTER_DIRECTORIES) {
    const targetDir = path.join(strategyDir, directory);
    const readmePath = path.join(targetDir, "README.md");

    if (!(await exists(targetDir))) {
      created.push(directory);
    }

    await mkdir(targetDir, { recursive: true });

    if (!(await exists(readmePath))) {
      await writeFile(readmePath, starterDirectoryReadme(directory), "utf8");
    }
  }

  return created;
}

async function ensureStrategyExperimentsDirectory(strategyDir) {
  const experimentsDir = path.join(strategyDir, STRATEGY_EXPERIMENTS_DIR);
  const readmePath = path.join(experimentsDir, "README.md");

  await mkdir(experimentsDir, { recursive: true });

  if (!(await exists(readmePath))) {
    await writeFile(readmePath, strategyExperimentsReadme(), "utf8");
  }
}

async function ensurePressureLedger(pressureLedgerPath) {
  if (await exists(pressureLedgerPath)) {
    return false;
  }

  await writeFile(pressureLedgerPath, PRESSURE_LEDGER_TEMPLATE, "utf8");
  return true;
}

async function ensureArchitecturePointer(architecturePath) {
  const shapeStrategyBlock = shapeStrategyArchitectureBlock();

  if (await exists(architecturePath)) {
    const content = await readFile(architecturePath, "utf8");
    const hasShapeStrategyPointer = [
      STRATEGY_MAP_LINE,
      ACCEPTED_STRATEGY_LINE,
      LEGACY_STRATEGY_MAP_LINE,
      LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE,
      LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE,
      LEGACY_ACCEPTED_STRATEGY_LINE,
      LEGACY_PRESSURE_LEDGER_LINE,
      PRESSURE_LEDGER_LINE,
    ].some((line) => content.includes(line));

    if (!hasShapeStrategyPointer) {
      await writeFile(
        architecturePath,
        `${content.trimEnd()}\n\n${shapeStrategyBlock}`,
        "utf8"
      );
      return;
    }

    let nextContent = content;
    const replacements = [
      [LEGACY_STRATEGY_MAP_LINE, STRATEGY_MAP_LINE],
      [LEGACY_ACCEPTED_STRATEGY_LINE, ACCEPTED_STRATEGY_LINE],
      [LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE, ACCEPTED_STRATEGY_LINE],
      [LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE, ACCEPTED_STRATEGY_LINE],
      [LEGACY_STRATEGY_GUIDE_LINE, STRATEGY_GUIDE_LINE],
      [LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE, STRATEGY_GUIDE_LINE],
      [LEGACY_STRATEGY_TEMPLATES_LINE, STRATEGY_TEMPLATES_LINE],
      [LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE, STRATEGY_TEMPLATES_LINE],
      [LEGACY_PRESSURE_LEDGER_LINE, PRESSURE_LEDGER_LINE],
    ];

    for (const [from, to] of replacements) {
      nextContent = nextContent.replace(from, to);
    }

    for (const line of [
      STRATEGY_MAP_LINE,
      ACCEPTED_STRATEGY_LINE,
      STRATEGY_GUIDE_LINE,
      STRATEGY_TEMPLATES_LINE,
      PRESSURE_LEDGER_LINE,
    ]) {
      if (!nextContent.includes(line)) {
        nextContent = `${nextContent.trimEnd()}\n${line}\n`;
      }
    }

    if (nextContent !== content) {
      await writeFile(architecturePath, nextContent, "utf8");
    }

    return;
  }

  await writeFile(
    architecturePath,
    `# Architecture

Status: initialized

${shapeStrategyBlock}`,
    "utf8"
  );
}

async function removeLegacySupportFolders(strategyDir) {
  for (const directory of [LEGACY_META_DIR, "guide", "templates"]) {
    await rm(path.join(strategyDir, directory), {
      recursive: true,
      force: true,
    });
  }
}

async function isRootShapeStrategy() {
  return (
    (await exists(path.join(targetOrchestrationDir, "map.md"))) &&
    ((await exists(
      path.join(targetOrchestrationDir, GUIDE_DIR, "orchestration-shape-strategy.md")
    )) ||
      (await architectureContainsShapeStrategyRootPointer()))
  );
}

async function isNestedShapeStrategy() {
  return (
    (await exists(path.join(targetNestedStrategyDir, "map.md"))) &&
    ((await exists(
      path.join(
        targetNestedStrategyDir,
        GUIDE_DIR,
        "orchestration-shape-strategy.md"
      )
    )) ||
      (await exists(
        path.join(
          targetNestedStrategyDir,
          LEGACY_META_DIR,
          "orchestration-shape-strategy.md"
        )
      )) ||
      (await architectureContainsNestedShapeStrategyPointer()))
  );
}

async function architectureContainsShapeStrategyRootPointer() {
  if (!(await exists(targetArchitecturePath))) {
    return false;
  }

  const content = await readFile(targetArchitecturePath, "utf8");
  return (
    content.includes(ACCEPTED_STRATEGY_LINE) ||
    content.includes(STRATEGY_MAP_LINE)
  );
}

async function architectureContainsNestedShapeStrategyPointer() {
  if (!(await exists(targetArchitecturePath))) {
    return false;
  }

  const content = await readFile(targetArchitecturePath, "utf8");
  return (
    content.includes(LEGACY_STRATEGY_MAP_LINE) ||
    content.includes(LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE) ||
    content.includes(LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE) ||
    content.includes(LEGACY_ACCEPTED_STRATEGY_LINE)
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
