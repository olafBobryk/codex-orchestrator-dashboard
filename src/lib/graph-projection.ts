import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildOrchestrationGraph,
  type GraphDetailBlock,
  type GraphEdge,
  type GraphEdgeType,
  type GraphMarker,
  type GraphNode,
  type GraphNodeChronology,
  type GraphNodeKind,
  type GraphPacketGroup,
  type GraphRegion,
  type GraphSourceLayer,
  type GraphStatus,
  type OrchestrationGraph,
} from "@/lib/orchestration-graph";
import { ORCHESTRATION_DIR } from "@/lib/orchestration";
import { inspectGraphProjectionQuality } from "@/lib/graph-projection-quality.mjs";
import { readShapeStrategyProjection } from "@/lib/shape-strategy-adapter";

export const GRAPH_PROJECTION_FILENAME = "graph-projection.json";

export type GraphProjectionQualityWarning = {
  id: string;
  title: string;
  message: string;
  details: Array<{
    label: string;
    message: string;
  }>;
};

export type GraphProjectionReadResult =
  | {
      state: "ready";
      relativePath: typeof GRAPH_PROJECTION_FILENAME;
      graph: OrchestrationGraph;
      qualityWarnings: GraphProjectionQualityWarning[];
    }
  | {
      state: "missing" | "invalid";
      relativePath: typeof GRAPH_PROJECTION_FILENAME;
      graph: null;
      message: string;
    };

export type RawProjection = {
  title?: unknown;
  legend?: unknown;
  nodes?: unknown;
  edges?: unknown;
  markers?: unknown;
  regions?: unknown;
};

type RawLegendItem = {
  key?: unknown;
  label?: unknown;
  status?: unknown;
  color?: unknown;
  muted?: unknown;
};

type RawNode = {
  id?: unknown;
  label?: unknown;
  legendKey?: unknown;
  color?: unknown;
  status?: unknown;
  muted?: unknown;
  kind?: unknown;
  icon?: unknown;
  chronology?: unknown;
  summary?: unknown;
  detail?: unknown;
  links?: unknown;
  artifacts?: unknown;
  relativePath?: unknown;
  path?: unknown;
};

type RawEdge = {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  label?: unknown;
  style?: unknown;
  status?: unknown;
  directional?: unknown;
  muted?: unknown;
  detail?: unknown;
  relativePath?: unknown;
  path?: unknown;
};

type RawMarker = {
  id?: unknown;
  targetId?: unknown;
  label?: unknown;
  description?: unknown;
  color?: unknown;
  muted?: unknown;
  icon?: unknown;
  loader?: unknown;
  links?: unknown;
  artifacts?: unknown;
};

type RawDetailBlock = {
  id?: unknown;
  name?: unknown;
  icon?: unknown;
  summary?: unknown;
  color?: unknown;
  body?: unknown;
  links?: unknown;
};

type RawDetailLink = {
  label?: unknown;
  name?: unknown;
  aliases?: unknown;
  searchNames?: unknown;
  href?: unknown;
  relativePath?: unknown;
  path?: unknown;
  kind?: unknown;
  type?: unknown;
};

type RawRegion = {
  id?: unknown;
  label?: unknown;
  category?: unknown;
  legendKey?: unknown;
  color?: unknown;
  muted?: unknown;
  nodeIds?: unknown;
  targetNodeIds?: unknown;
  regionIds?: unknown;
  childRegionIds?: unknown;
  detail?: unknown;
  links?: unknown;
  artifacts?: unknown;
};

const FALLBACK_GRAPH = buildOrchestrationGraph([]);
const PROJECTION_RELATIVE_PATH = GRAPH_PROJECTION_FILENAME;
const STATUS_ALIASES: Record<string, GraphStatus> = {
  active: "in_progress",
  blocked: "blocked",
  complete: "complete",
  completed: "complete",
  deferred: "deferred",
  done: "complete",
  fixed: "fixed",
  in_progress: "in_progress",
  muted: "deferred",
  needs_human: "needs_human",
  open: "needs_human",
  planned: "queued",
  queued: "queued",
  ready: "queued",
  reached: "verified",
  resolved: "resolved",
  signed_off: "signed_off",
  superseded: "superseded",
  unknown: "unknown",
  verified: "verified",
};

export async function readGraphProjection(
  workspace: string
): Promise<GraphProjectionReadResult> {
  const shapeStrategyProjection = await readShapeStrategyProjection(workspace);

  if (shapeStrategyProjection.state === "ready") {
    return {
      state: "ready",
      relativePath: GRAPH_PROJECTION_FILENAME,
      graph: buildProjectionGraph(shapeStrategyProjection.projection, {
        relativePath: shapeStrategyProjection.mapRelativePath,
        sourceLabel: "Shape strategy Markdown",
        sourceLayer: "markdown",
        extractionRules: [
          "Read .codex-orchestration/map.md first, then fall back to .codex-orchestration/strategies/shape-strategy/map.md for the source repo and older projects.",
          "Translate map, shape, workpiece, edge, checkpoint, and artifact Markdown into the existing dashboard projection in memory.",
          "Keep shapes as dashboard regions; resolve shape-to-shape flow through the first and last workpieces inside each shape.",
          "Use graph-projection.json only when the authored shape strategy is absent.",
        ],
      }),
      qualityWarnings: [
        ...shapeStrategyProjection.warnings,
        ...(inspectGraphProjectionQuality(shapeStrategyProjection.projection)
          .warnings as GraphProjectionQualityWarning[]),
      ],
    };
  }

  const projectionPath = path.join(
    /*turbopackIgnore: true*/ workspace,
    ORCHESTRATION_DIR,
    GRAPH_PROJECTION_FILENAME
  );

  try {
    const content = await readFile(
      /*turbopackIgnore: true*/ projectionPath,
      "utf8"
    );
    const parsed: unknown = JSON.parse(content);

    if (!isRecord(parsed)) {
      return invalidProjection("Projection root must be a JSON object.");
    }

    return {
      state: "ready",
      relativePath: PROJECTION_RELATIVE_PATH,
      graph: buildProjectionGraph(parsed),
      qualityWarnings: inspectGraphProjectionQuality(parsed)
        .warnings as GraphProjectionQualityWarning[],
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return {
        state: "missing",
        relativePath: PROJECTION_RELATIVE_PATH,
        graph: null,
        message: `${GRAPH_PROJECTION_FILENAME} is not present.`,
      };
    }

    return invalidProjection(
      error instanceof Error ? error.message : "Projection JSON could not be read."
    );
  }
}

type BuildProjectionGraphOptions = {
  extractionRules?: string[];
  relativePath?: string;
  sourceLabel?: string;
  sourceLayer?: GraphSourceLayer;
};

export function buildProjectionGraph(
  raw: RawProjection,
  options: BuildProjectionGraphOptions = {}
): OrchestrationGraph {
  const sourceLayer = options.sourceLayer ?? "graph_projection";
  const relativePath = options.relativePath ?? PROJECTION_RELATIVE_PATH;
  const sourceLabel = options.sourceLabel ?? "Graph projection node";
  const legend = readLegend(raw.legend, {
    relativePath,
    sourceLayer,
  });
  const packetLookup = new Map(legend.map((packet) => [packet.id, packet]));
  const nodes = readNodes(raw.nodes, packetLookup, {
    relativePath,
    sourceLabel,
    sourceLayer,
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = readEdges(raw.edges, nodeIds, {
    relativePath,
    sourceLayer,
  });
  const markers = readMarkers(raw.markers, nodeIds);
  const regions = readRegions(raw.regions, nodeIds, packetLookup);

  return {
    ...FALLBACK_GRAPH,
    sourceLayers: FALLBACK_GRAPH.sourceLayers,
    extractionRules: options.extractionRules ?? [
      "Read .codex-orchestration/graph-projection.json as a project-local dashboard projection.",
      "Render projected nodes, edges, markers, regions, legend colors, muted states, detail blocks, and links without executing project adapters.",
      "Fall back to Markdown-derived graph behavior when the projection artifact is absent or invalid.",
    ],
    packets: legend,
    nodes,
    edges,
    markers,
    regions,
    counts: {
      packets: legend.length,
      primaryChunks: nodes.filter((node) => node.primary).length,
      supportingNodes: nodes.filter((node) => !node.primary).length,
      edges: edges.length,
    },
  };
}

function readLegend(
  value: unknown,
  options: Pick<BuildProjectionGraphOptions, "relativePath" | "sourceLayer">
): GraphPacketGroup[] {
  const entries = Array.isArray(value) ? value : [];

  return entries
    .filter(isRecord)
    .map((entry: RawLegendItem, index) => {
      const key = readString(entry.key) ?? `legend-${index + 1}`;
      const label = readString(entry.label) ?? key;

      return {
        id: key,
        number: index + 1,
        label,
        name: label,
        status: readProjectionStatus(entry.status, entry.muted, "in_progress"),
        rawStatus:
          readString(entry.status) ??
          (readBoolean(entry.muted) ? "muted" : "active"),
        relativePath: options.relativePath ?? PROJECTION_RELATIVE_PATH,
        sourceLayer: options.sourceLayer ?? "graph_projection",
        missing: [],
        color: readString(entry.color) ?? "#64748b",
        muted: readBoolean(entry.muted) ?? false,
      };
    });
}

function readNodes(
  value: unknown,
  packetLookup: Map<string, GraphPacketGroup>,
  options: Required<
    Pick<
      BuildProjectionGraphOptions,
      "relativePath" | "sourceLabel" | "sourceLayer"
    >
  >
): GraphNode[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).map((entry: RawNode, index) => {
    const id = readString(entry.id) ?? `node-${index + 1}`;
    const label = readString(entry.label) ?? id;
    const legendKey = readString(entry.legendKey);
    const muted = readBoolean(entry.muted) ?? false;
    const rawStatus = readString(entry.status) ?? (muted ? "muted" : "active");
    const detailBlocks = readDetailBlocks(entry.detail);
    const relativePath =
      normalizeReferencePath(
        readString(entry.relativePath) ?? readString(entry.path)
      ) ?? options.relativePath;

    if (legendKey && !packetLookup.has(legendKey)) {
      packetLookup.set(legendKey, {
        id: legendKey,
        number: packetLookup.size + 1,
        label: legendKey,
        name: legendKey,
        status: "unknown",
        rawStatus: null,
        relativePath,
        sourceLayer: options.sourceLayer,
        missing: [],
      });
    }

    return {
      id,
      kind: readNodeKind(entry.kind),
      primary: true,
      label,
      color: readString(entry.color),
      icon: readString(entry.icon),
      chronology: readNodeChronology(entry.chronology),
      packetId: legendKey,
      chunkId: null,
      status: readProjectionStatus(entry.status, entry.muted, "in_progress"),
      rawStatus,
      sourceLayer: options.sourceLayer,
      relativePath,
      order: index + 1,
      lane: "main",
      sources: [
        {
          layer: options.sourceLayer,
          relativePath,
          label: options.sourceLabel,
          section: "nodes",
          rawValue: id,
        },
      ],
      missing: [],
      links: readEntityLinks(entry.links, entry.artifacts),
      detail: {
        title: label,
        summary: readString(entry.summary),
        handoff: null,
        concern: null,
        files: [relativePath],
        verification: [],
        threadIds: [],
        runtimeThreads: [],
        gitWorktree: [],
        blocks: detailBlocks,
      },
    };
  });
}

function readEdges(
  value: unknown,
  nodeIds: Set<string>,
  options: Required<Pick<BuildProjectionGraphOptions, "relativePath" | "sourceLayer">>
): GraphEdge[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawEdge, index) => {
    const source = readString(entry.source);
    const target = readString(entry.target);
    const relativePath =
      normalizeReferencePath(
        readString(entry.relativePath) ?? readString(entry.path)
      ) ?? options.relativePath;

    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) {
      return [];
    }

    const style = readEdgeStyle(entry.style);

    return [
      {
        id: readString(entry.id) ?? `projection-edge-${index + 1}`,
        type: edgeTypeForStyle(style),
        source,
        target,
        label: readString(entry.label) ?? "related",
        status: readProjectionStatus(entry.status, entry.muted, "unknown"),
        rawType: style,
        sourceLayer: options.sourceLayer,
        relativePath,
        missing: [],
        directional: readBoolean(entry.directional) ?? false,
        style,
        detailBlocks: readDetailBlocks(entry.detail),
      },
    ];
  });
}

function readMarkers(value: unknown, nodeIds: Set<string>): GraphMarker[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawMarker, index) => {
    const targetId = readString(entry.targetId);

    if (!targetId || !nodeIds.has(targetId)) {
      return [];
    }

    return [
      {
        id: readString(entry.id) ?? `projection-marker-${index + 1}`,
        targetId,
        label: readString(entry.label) ?? "Marker",
        description: readString(entry.description),
        color: readString(entry.color) ?? "#64748b",
        muted: readBoolean(entry.muted) ?? false,
        icon: readString(entry.icon),
        loader: readBoolean(entry.loader) ?? false,
        links: readEntityLinks(entry.links, entry.artifacts),
      },
    ];
  });
}

function readRegions(
  value: unknown,
  nodeIds: Set<string>,
  packetLookup: Map<string, GraphPacketGroup>
): GraphRegion[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawRegion, index) => {
    const id = readString(entry.id) ?? `projection-region-${index + 1}`;
    const label = readString(entry.label) ?? id;
    const category = readString(entry.category) ?? readString(entry.legendKey);
    const targetNodeIds = readStringArray(entry.nodeIds ?? entry.targetNodeIds)
      .filter((nodeId) => nodeIds.has(nodeId));
    const targetRegionIds = readStringArray(
      entry.regionIds ?? entry.childRegionIds
    ).filter((regionId) => regionId !== id);

    if (targetNodeIds.length === 0 && targetRegionIds.length === 0) {
      return [];
    }

    const categoryColor =
      category && packetLookup.has(category)
        ? packetLookup.get(category)?.color
        : null;

    return [
      {
        id,
        label,
        category,
        color: readString(entry.color) ?? categoryColor ?? "#64748b",
        muted: readBoolean(entry.muted) ?? false,
        nodeIds: targetNodeIds,
        regionIds: targetRegionIds,
        detail: readDetailBlocks(entry.detail),
        links: readEntityLinks(entry.links, entry.artifacts),
      },
    ];
  });
}

function readDetailBlocks(value: unknown): GraphDetailBlock[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).map((entry: RawDetailBlock, index) => ({
    id: readString(entry.id) ?? `detail-${index + 1}`,
    name: readString(entry.name) ?? `Detail ${index + 1}`,
    icon: readString(entry.icon),
    summary: readString(entry.summary),
    color: readString(entry.color),
    body: readString(entry.body),
    links: readDetailLinks(entry.links),
  }));
}

function readEntityLinks(linksValue: unknown, artifactsValue: unknown) {
  return [
    ...readDetailLinks(linksValue),
    ...readDetailLinks(artifactsValue, "artifact"),
  ];
}

function readDetailLinks(
  value: unknown,
  defaultKind: "artifact" | "meta_template" | "reference" = "reference"
) {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawDetailLink) => {
    const href = readString(entry.href);
    const relativePath = normalizeReferencePath(
      readString(entry.relativePath) ?? readString(entry.path)
    );

    if (!href && !relativePath) {
      return [];
    }

    return [
      {
        label: readString(entry.label) ?? relativePath ?? href ?? "Reference",
        href: href ?? "",
        relativePath,
        kind: readLinkKind(entry.kind ?? entry.type, defaultKind),
        searchNames: uniqueStrings([
          readString(entry.name),
          ...readStringArray(entry.aliases),
          ...readStringArray(entry.searchNames),
        ]),
      },
    ];
  });
}

function uniqueStrings(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function readLinkKind(
  value: unknown,
  fallback: "artifact" | "meta_template" | "reference"
) {
  const normalized = normalizeKey(readString(value) ?? "");

  if (normalized === "artifact") {
    return "artifact";
  }

  if (
    normalized === "meta_template" ||
    normalized === "meta-template" ||
    normalized === "metatemplate" ||
    normalized === "template"
  ) {
    return "meta_template";
  }

  if (normalized === "reference") {
    return "reference";
  }

  return fallback;
}

function normalizeReferencePath(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .replace(/\\/g, "/")
    .replace(/^\.?\/?\.codex-orchestration\//, "");
}

function readNodeKind(value: unknown): GraphNodeKind {
  const normalized = normalizeKey(readString(value) ?? "");

  if (
    normalized === "handoff" ||
    normalized === "concern" ||
    normalized === "thread" ||
    normalized === "checkpoint"
  ) {
    return normalized;
  }

  return "chunk";
}

function readNodeChronology(value: unknown): GraphNodeChronology {
  const normalized = normalizeKey(readString(value) ?? "");

  if (normalized === "start") {
    return normalized;
  }

  return null;
}

function readEdgeStyle(value: unknown): "solid" | "dashed" | "dotted" {
  const normalized = normalizeKey(readString(value) ?? "");

  if (normalized === "dashed" || normalized === "dotted") {
    return normalized;
  }

  return "solid";
}

function edgeTypeForStyle(style: "solid" | "dashed" | "dotted"): GraphEdgeType {
  if (style === "dashed") {
    return "detour";
  }

  if (style === "dotted") {
    return "annotates";
  }

  return "sequence";
}

function readProjectionStatus(
  statusValue: unknown,
  mutedValue: unknown,
  fallback: GraphStatus
): GraphStatus {
  const normalized = normalizeKey(readString(statusValue) ?? "");

  if (Object.hasOwn(STATUS_ALIASES, normalized)) {
    return STATUS_ALIASES[normalized];
  }

  if (readBoolean(mutedValue)) {
    return "deferred";
  }

  return fallback;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const text = readString(entry);

    return text ? [text] : [];
  });
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function invalidProjection(message: string): GraphProjectionReadResult {
  return {
    state: "invalid",
    relativePath: PROJECTION_RELATIVE_PATH,
    graph: null,
    message,
  };
}
