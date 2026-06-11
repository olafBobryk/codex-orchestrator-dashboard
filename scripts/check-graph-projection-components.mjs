#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  formatSamples,
  inspectGraphProjectionQuality,
} from "../src/lib/graph-projection-quality.mjs";

const ORCHESTRATION_DIR = ".codex-orchestration";
const PROJECTION_FILENAME = "graph-projection.json";

const inputPath = process.argv[2] ?? process.cwd();

try {
  const projectionPath = await resolveProjectionPath(inputPath);
  const projection = await readProjection(projectionPath);
  const result = inspectGraphProjectionQuality(projection);

  printReport(projectionPath, result);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}

async function resolveProjectionPath(input) {
  const absoluteInput = path.resolve(input);
  const inputStat = await stat(absoluteInput);

  if (inputStat.isDirectory()) {
    return path.join(absoluteInput, ORCHESTRATION_DIR, PROJECTION_FILENAME);
  }

  return absoluteInput;
}

async function readProjection(projectionPath) {
  const content = await readFile(projectionPath, "utf8");
  const parsed = JSON.parse(content);

  if (!isRecord(parsed)) {
    throw new Error("Projection root must be a JSON object.");
  }

  return parsed;
}

function printReport(projectionPath, result) {
  console.log(`Projection: ${projectionPath}`);
  console.log(`Nodes: ${result.nodes.length}`);
  console.log(`Connected components: ${result.components.length}`);
  console.log(`Active connected components: ${result.activeComponents.length}`);

  if (result.intentional) {
    console.log("Intentional disconnected components: yes");
  }

  result.components.forEach((component, index) => {
    const samples = formatSamples(component.nodes);

    console.log(
      `- Component ${index + 1}: ${component.nodes.length} node(s), ` +
        `${component.activeCount} active; samples: ${samples || "(none)"}`
    );
  });

  if (result.isolatedNodes.length > 0) {
    console.log("Isolated nodes:");
    for (const node of result.isolatedNodes) {
      console.log(`- ${node.label} (${node.id})`);
    }
  } else {
    console.log("Isolated nodes: none");
  }

  if (result.missingEdges.length > 0) {
    console.log("Missing edge endpoints:");
    for (const edge of result.missingEdges) {
      console.log(
        `- ${edge.id}: ${edge.source} -> ${edge.target}; missing ${edge.missing.join(", ")}`
      );
    }
  } else {
    console.log("Missing edge endpoints: none");
  }

  if (result.warnings.some((warning) => warning.id === "active-connected-components")) {
    console.log(
      "Warning: projection has more than one active connected component. " +
        "If this is intentional, add disconnectedComponents.intentional: true."
    );
  } else {
    console.log("Patchiness warning: none");
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
