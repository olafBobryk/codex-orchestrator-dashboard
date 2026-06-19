#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import {
  formatSamples,
  inspectGraphProjectionQuality,
} from "../src/lib/graph/projection-quality.mjs";
import { readShapeStrategyProjection } from "../src/lib/strategies/shape-strategy-adapter.ts";

const inputPath = process.argv[2] ?? process.cwd();
const workspace = path.resolve(inputPath);

try {
  const result = await readShapeStrategyProjection(workspace);

  if (result.state === "missing") {
    console.log("Shape strategy: missing");
    process.exitCode = 1;
  } else {
    const projection = result.projection;
    const quality = inspectGraphProjectionQuality(projection);
    const nodes = Array.isArray(projection.nodes) ? projection.nodes : [];
    const edges = Array.isArray(projection.edges) ? projection.edges : [];
    const regions = Array.isArray(projection.regions) ? projection.regions : [];
    const warnings = [...result.warnings, ...quality.warnings];

    console.log(`Shape strategy: ${workspace}`);
    console.log(`Nodes: ${nodes.length}`);
    console.log(`Edges: ${edges.length}`);
    console.log(`Regions: ${regions.length}`);
    console.log(`Connected components: ${quality.components.length}`);
    console.log(`Active connected components: ${quality.activeComponents.length}`);

    quality.components.forEach((component, index) => {
      console.log(
        `- Component ${index + 1}: ${component.nodes.length} node(s), ` +
          `${component.activeCount} active; samples: ${formatSamples(component.nodes)}`
      );
    });

    if (quality.missingEdges.length > 0) {
      console.log("Missing edge endpoints:");
      for (const edge of quality.missingEdges) {
        console.log(
          `- ${edge.id}: ${edge.source} -> ${edge.target}; missing ${edge.missing.join(", ")}`
        );
      }
    } else {
      console.log("Missing edge endpoints: none");
    }

    if (warnings.length > 0) {
      console.log("Warnings:");
      for (const warning of warnings) {
        console.log(`- ${warning.title}: ${warning.message}`);
      }
    } else {
      console.log("Warnings: none");
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
