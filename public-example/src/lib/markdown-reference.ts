import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { readGraphProjection } from "@/lib/graph-projection";
import {
  ORCHESTRATION_DIR,
  readWorkspace,
} from "@/lib/orchestration";
import type {
  GraphDetailBlock,
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphRegion,
  OrchestrationGraph,
} from "@/lib/orchestration-graph";

export type MarkdownReferenceReadResult =
  | {
      state: "ready";
      relativePath: string;
      title: string;
      content: string;
      size: number;
    }
  | {
      state: "unavailable";
      relativePath: string;
      message: string;
    };

export async function readMarkdownReference({
  workspace,
  relativePath,
}: {
  workspace: string;
  relativePath: string;
}): Promise<MarkdownReferenceReadResult> {
  const normalizedPath = normalizeMarkdownReferencePath(relativePath);

  if (!normalizedPath) {
    return unavailable(relativePath, "This reference is not a readable Markdown document.");
  }

  const resolvedWorkspace = path.resolve(/*turbopackIgnore: true*/ workspace);
  const allowedReferences = await getAllowedMarkdownReferences(resolvedWorkspace);

  if (!allowedReferences.has(normalizedPath)) {
    return unavailable(
      normalizedPath,
      "This Markdown reference is not part of the current graph context."
    );
  }

  const orchestrationPath = path.join(
    /*turbopackIgnore: true*/ resolvedWorkspace,
    ORCHESTRATION_DIR
  );
  const targetPath = path.resolve(
    /*turbopackIgnore: true*/ orchestrationPath,
    normalizedPath
  );

  if (!isInsideDirectory(targetPath, orchestrationPath)) {
    return unavailable(normalizedPath, "This reference cannot be resolved safely.");
  }

  try {
    const [content, fileStat] = await Promise.all([
      readFile(/*turbopackIgnore: true*/ targetPath, "utf8"),
      stat(/*turbopackIgnore: true*/ targetPath),
    ]);

    if (!fileStat.isFile()) {
      return unavailable(normalizedPath, "This reference is not a file.");
    }

    return {
      state: "ready",
      relativePath: normalizedPath,
      title: readMarkdownTitle(content) ?? path.basename(normalizedPath),
      content,
      size: fileStat.size,
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return unavailable(normalizedPath, "This Markdown file is missing.");
    }

    return unavailable(normalizedPath, "This Markdown file could not be read.");
  }
}

async function getAllowedMarkdownReferences(workspace: string) {
  const allowed = new Set<string>();
  const workspaceResult = await readWorkspace(workspace);

  if (workspaceResult.state === "ready") {
    for (const doc of workspaceResult.docs) {
      addMarkdownReference(allowed, doc.relativePath);
    }
  }

  const projection = await readGraphProjection(workspace);

  if (projection.state === "ready") {
    collectGraphMarkdownReferences(allowed, projection.graph);
  }

  return allowed;
}

function collectGraphMarkdownReferences(
  allowed: Set<string>,
  graph: OrchestrationGraph
) {
  for (const packet of graph.packets) {
    addMarkdownReference(allowed, packet.relativePath);
  }

  for (const node of graph.nodes) {
    collectNodeMarkdownReferences(allowed, node);
  }

  for (const edge of graph.edges) {
    collectEdgeMarkdownReferences(allowed, edge);
  }

  for (const marker of graph.markers) {
    collectMarkerMarkdownReferences(allowed, marker);
  }

  for (const region of graph.regions) {
    collectRegionMarkdownReferences(allowed, region);
  }
}

function collectNodeMarkdownReferences(allowed: Set<string>, node: GraphNode) {
  addMarkdownReference(allowed, node.relativePath);

  for (const link of node.links) {
    addMarkdownReference(allowed, link.relativePath);
  }

  for (const source of node.sources) {
    addMarkdownReference(allowed, source.relativePath);
  }

  for (const file of node.detail.files) {
    addMarkdownReference(allowed, file);
  }

  for (const block of node.detail.blocks) {
    collectBlockMarkdownReferences(allowed, block);
  }
}

function collectMarkerMarkdownReferences(
  allowed: Set<string>,
  marker: GraphMarker
) {
  for (const link of marker.links) {
    addMarkdownReference(allowed, link.relativePath);
  }
}

function collectRegionMarkdownReferences(
  allowed: Set<string>,
  region: GraphRegion
) {
  for (const link of region.links) {
    addMarkdownReference(allowed, link.relativePath);
  }

  for (const block of region.detail) {
    collectBlockMarkdownReferences(allowed, block);
  }
}

function collectEdgeMarkdownReferences(allowed: Set<string>, edge: GraphEdge) {
  addMarkdownReference(allowed, edge.relativePath);

  for (const block of edge.detailBlocks ?? []) {
    collectBlockMarkdownReferences(allowed, block);
  }
}

function collectBlockMarkdownReferences(
  allowed: Set<string>,
  block: GraphDetailBlock
) {
  for (const link of block.links) {
    addMarkdownReference(allowed, link.relativePath);
  }
}

function addMarkdownReference(allowed: Set<string>, relativePath: string | null) {
  const normalizedPath = normalizeMarkdownReferencePath(relativePath);

  if (normalizedPath) {
    allowed.add(normalizedPath);
  }
}

function normalizeMarkdownReferencePath(relativePath: string | null) {
  if (!relativePath) {
    return null;
  }

  const normalizedPath = path.posix.normalize(relativePath.replace(/\\/g, "/"));

  if (
    normalizedPath.startsWith("../") ||
    normalizedPath === ".." ||
    path.posix.isAbsolute(normalizedPath) ||
    path.posix.extname(normalizedPath).toLowerCase() !== ".md"
  ) {
    return null;
  }

  return normalizedPath;
}

function isInsideDirectory(targetPath: string, directoryPath: string) {
  const relativePath = path.relative(directoryPath, targetPath);

  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function readMarkdownTitle(content: string) {
  const heading = content
    .split(/\r?\n/)
    .find((line) => /^#\s+/.test(line.trim()));

  return heading?.replace(/^#\s+/, "").trim() || null;
}

function unavailable(
  relativePath: string,
  message: string
): MarkdownReferenceReadResult {
  return {
    state: "unavailable",
    relativePath,
    message,
  };
}
