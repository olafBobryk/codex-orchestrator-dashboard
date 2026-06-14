#!/usr/bin/env node

import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ACCEPTED_STRATEGY_LINE,
  ARCHITECTURE_FILENAME,
  GUIDE_DIR,
  LEGACY_ACCEPTED_STRATEGY_LINE,
  LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE,
  LEGACY_STRATEGY_MAP_LINE,
  LEGACY_STRATEGY_GUIDE_LINE,
  LEGACY_STRATEGY_TEMPLATES_LINE,
  LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE,
  LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE,
  LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE,
  MAP_TEMPLATE,
  ORCHESTRATION_DIR,
  PRESSURE_LEDGER_FILENAME,
  PRESSURE_LEDGER_LINE,
  PRESSURE_LEDGER_TEMPLATE,
  SHAPE_RUN_RETURN_LINE,
  SOURCE_STRATEGY_RELATIVE_DIR,
  STARTER_DIRECTORIES,
  STRATEGY_EXPERIMENTS_DIR,
  STRATEGY_GUIDE_LINE,
  LEGACY_PRESSURE_LEDGER_LINE,
  STRATEGY_MAP_LINE,
  STRATEGY_TEMPLATES_LINE,
  TEMPLATES_DIR,
  shapeStrategyArchitectureBlock,
  strategyExperimentsReadme,
  starterDirectoryReadme,
} from "./shape-strategy-template.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const SOURCE_GUIDE_DIR = path.join(
  REPO_ROOT,
  ORCHESTRATION_DIR,
  SOURCE_STRATEGY_RELATIVE_DIR,
  GUIDE_DIR
);
const SOURCE_TEMPLATES_DIR = path.join(
  REPO_ROOT,
  ORCHESTRATION_DIR,
  SOURCE_STRATEGY_RELATIVE_DIR,
  TEMPLATES_DIR
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
const targetStrategyDir = targetOrchestrationDir;
const targetNestedStrategyDir = path.join(
  targetOrchestrationDir,
  SOURCE_STRATEGY_RELATIVE_DIR
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

  if (!force && (await hasAnyShapeStrategyState())) {
    throw new Error(
      `${targetOrchestrationDir} already contains shape strategy state. Re-run with --force to replace it.`
    );
  }

  if (force) {
    await removeRootShapeStrategyState();
    await rm(targetNestedStrategyDir, { recursive: true, force: true });
  }

  await mkdir(targetOrchestrationDir, { recursive: true });
  await cp(SOURCE_GUIDE_DIR, path.join(targetStrategyDir, GUIDE_DIR), {
    recursive: true,
    force: true,
  });
  await cp(SOURCE_TEMPLATES_DIR, path.join(targetStrategyDir, TEMPLATES_DIR), {
    recursive: true,
    force: true,
  });
  await writeProjectLocalStarterDocs(targetStrategyDir);
  await writeProjectLocalPressureLedger(targetStrategyDir);
  await writeStrategyExperimentsDirectory(targetStrategyDir);
  await ensureArchitecturePointer(targetArchitecturePath);

  console.log(`Initialized shape strategy in ${targetRepo}`);
  console.log(`Strategy: ${path.join(targetStrategyDir, "map.md")}`);
  console.log(`Architecture: ${targetArchitecturePath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function writeProjectLocalStarterDocs(strategyDir) {
  await writeFile(path.join(strategyDir, "map.md"), MAP_TEMPLATE, "utf8");

  for (const directory of STARTER_DIRECTORIES) {
    const targetDir = path.join(strategyDir, directory);
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      path.join(targetDir, "README.md"),
      starterDirectoryReadme(directory),
      "utf8"
    );
  }
}

async function writeProjectLocalPressureLedger(strategyDir) {
  await writeFile(
    path.join(strategyDir, PRESSURE_LEDGER_FILENAME),
    PRESSURE_LEDGER_TEMPLATE,
    "utf8"
  );
}

async function writeStrategyExperimentsDirectory(strategyDir) {
  const experimentsDir = path.join(strategyDir, STRATEGY_EXPERIMENTS_DIR);
  await mkdir(experimentsDir, { recursive: true });
  await writeFile(
    path.join(experimentsDir, "README.md"),
    strategyExperimentsReadme(),
    "utf8"
  );
}

async function ensureArchitecturePointer(architecturePath) {
  const shapeStrategyBlock = shapeStrategyArchitectureBlock();

  if (await exists(architecturePath)) {
    const content = await readFile(architecturePath, "utf8");
    const hasShapeStrategyPointer = [
      STRATEGY_MAP_LINE,
      ACCEPTED_STRATEGY_LINE,
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

    if (nextContent.includes(LEGACY_STRATEGY_MAP_LINE)) {
      nextContent = nextContent.replace(LEGACY_STRATEGY_MAP_LINE, STRATEGY_MAP_LINE);
    }

    if (nextContent.includes(LEGACY_ACCEPTED_STRATEGY_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_ACCEPTED_STRATEGY_LINE,
        ACCEPTED_STRATEGY_LINE
      );
    }

    if (nextContent.includes(LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_GUIDE_ACCEPTED_STRATEGY_LINE,
        ACCEPTED_STRATEGY_LINE
      );
    }

    if (nextContent.includes(LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_UNDERSCORE_ACCEPTED_STRATEGY_LINE,
        ACCEPTED_STRATEGY_LINE
      );
    }

    if (nextContent.includes(LEGACY_STRATEGY_GUIDE_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_STRATEGY_GUIDE_LINE,
        STRATEGY_GUIDE_LINE
      );
    }

    if (nextContent.includes(LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_UNDERSCORE_STRATEGY_GUIDE_LINE,
        STRATEGY_GUIDE_LINE
      );
    }

    if (nextContent.includes(LEGACY_STRATEGY_TEMPLATES_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_STRATEGY_TEMPLATES_LINE,
        STRATEGY_TEMPLATES_LINE
      );
    }

    if (nextContent.includes(LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_UNDERSCORE_STRATEGY_TEMPLATES_LINE,
        STRATEGY_TEMPLATES_LINE
      );
    }

    if (nextContent.includes(LEGACY_PRESSURE_LEDGER_LINE)) {
      nextContent = nextContent.replace(
        LEGACY_PRESSURE_LEDGER_LINE,
        PRESSURE_LEDGER_LINE
      );
    }

    for (const line of [
      ACCEPTED_STRATEGY_LINE,
      STRATEGY_GUIDE_LINE,
      STRATEGY_TEMPLATES_LINE,
      PRESSURE_LEDGER_LINE,
      SHAPE_RUN_RETURN_LINE,
    ]) {
      if (!nextContent.includes(line)) {
        nextContent = `${nextContent.trimEnd()}\n${line}\n`;
      }
    }

    if (nextContent !== content) {
      await writeFile(architecturePath, nextContent, "utf8");
      return;
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

async function assertDirectoryExists(directory, message) {
  if (!(await exists(directory))) {
    throw new Error(`${message}: ${directory}`);
  }
}

async function hasAnyShapeStrategyState() {
  return (
    (await exists(path.join(targetOrchestrationDir, "map.md"))) ||
    (await exists(path.join(targetOrchestrationDir, GUIDE_DIR))) ||
    (await exists(path.join(targetOrchestrationDir, TEMPLATES_DIR))) ||
    (await exists(targetNestedStrategyDir))
  );
}

async function removeRootShapeStrategyState() {
  await rm(path.join(targetOrchestrationDir, "map.md"), { force: true });
  await rm(path.join(targetOrchestrationDir, PRESSURE_LEDGER_FILENAME), {
    force: true,
  });

  for (const directory of [
    ...STARTER_DIRECTORIES,
    GUIDE_DIR,
    TEMPLATES_DIR,
    STRATEGY_EXPERIMENTS_DIR,
  ]) {
    await rm(path.join(targetOrchestrationDir, directory), {
      recursive: true,
      force: true,
    });
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
