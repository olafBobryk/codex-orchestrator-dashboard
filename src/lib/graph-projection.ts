import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildOrchestrationGraph,
  type GraphDetailBlock,
  type GraphEdge,
  type GraphEdgeType,
  type GraphMarker,
  type GraphNode,
  type GraphNodeKind,
  type GraphPacketGroup,
  type GraphStatus,
  type OrchestrationGraph,
} from "@/lib/orchestration-graph";
import { ORCHESTRATION_DIR } from "@/lib/orchestration";

export const GRAPH_PROJECTION_FILENAME = "graph-projection.json";

export type GraphProjectionReadResult =
  | {
      state: "ready";
      relativePath: typeof GRAPH_PROJECTION_FILENAME;
      graph: OrchestrationGraph;
    }
  | {
      state: "missing" | "invalid";
      relativePath: typeof GRAPH_PROJECTION_FILENAME;
      graph: null;
      message: string;
    };

type RawProjection = {
  title?: unknown;
  legend?: unknown;
  nodes?: unknown;
  edges?: unknown;
  markers?: unknown;
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
  summary?: unknown;
  detail?: unknown;
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
};

type RawMarker = {
  id?: unknown;
  targetId?: unknown;
  label?: unknown;
  description?: unknown;
  color?: unknown;
  muted?: unknown;
  icon?: unknown;
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
  href?: unknown;
  relativePath?: unknown;
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
  queued: "queued",
  ready: "queued",
  resolved: "resolved",
  signed_off: "signed_off",
  superseded: "superseded",
  unknown: "unknown",
  verified: "verified",
};

export async function readGraphProjection(
  workspace: string
): Promise<GraphProjectionReadResult> {
  const projectionPath = path.join(
    workspace,
    ORCHESTRATION_DIR,
    GRAPH_PROJECTION_FILENAME
  );

  try {
    const content = await readFile(projectionPath, "utf8");
    const parsed: unknown = JSON.parse(content);

    if (!isRecord(parsed)) {
      return invalidProjection("Projection root must be a JSON object.");
    }

    return {
      state: "ready",
      relativePath: PROJECTION_RELATIVE_PATH,
      graph: buildProjectionGraph(parsed),
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

function buildProjectionGraph(raw: RawProjection): OrchestrationGraph {
  const legend = readLegend(raw.legend);
  const packetLookup = new Map(legend.map((packet) => [packet.id, packet]));
  const nodes = readNodes(raw.nodes, packetLookup);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = readEdges(raw.edges, nodeIds);
  const markers = readMarkers(raw.markers, nodeIds);

  return {
    ...FALLBACK_GRAPH,
    sourceLayers: FALLBACK_GRAPH.sourceLayers,
    extractionRules: [
      "Read .codex-orchestration/graph-projection.json as a project-local dashboard projection.",
      "Render projected nodes, edges, markers, legend colors, muted states, detail blocks, and links without executing project adapters.",
      "Fall back to Markdown-derived graph behavior when the projection artifact is absent or invalid.",
    ],
    packets: legend,
    nodes,
    edges,
    markers,
    counts: {
      packets: legend.length,
      primaryChunks: nodes.filter((node) => node.primary).length,
      supportingNodes: nodes.filter((node) => !node.primary).length,
      edges: edges.length,
    },
  };
}

function readLegend(value: unknown): GraphPacketGroup[] {
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
        relativePath: PROJECTION_RELATIVE_PATH,
        sourceLayer: "graph_projection",
        missing: [],
        color: readString(entry.color) ?? "#64748b",
        muted: readBoolean(entry.muted) ?? false,
      };
    });
}

function readNodes(
  value: unknown,
  packetLookup: Map<string, GraphPacketGroup>
): GraphNode[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).map((entry: RawNode, index) => {
    const id = readString(entry.id) ?? `node-${index + 1}`;
    const label = readString(entry.label) ?? id;
    const legendKey = readString(entry.legendKey);
    const muted = readBoolean(entry.muted) ?? false;
    const rawStatus = readString(entry.status) ?? (muted ? "muted" : "active");
    const detailBlocks = readDetailBlocks(entry.detail);

    if (legendKey && !packetLookup.has(legendKey)) {
      packetLookup.set(legendKey, {
        id: legendKey,
        number: packetLookup.size + 1,
        label: legendKey,
        name: legendKey,
        status: "unknown",
        rawStatus: null,
        relativePath: PROJECTION_RELATIVE_PATH,
        sourceLayer: "graph_projection",
        missing: [],
      });
    }

    return {
      id,
      kind: readNodeKind(entry.kind),
      primary: true,
      label,
      packetId: legendKey,
      chunkId: null,
      status: readProjectionStatus(entry.status, entry.muted, "in_progress"),
      rawStatus,
      sourceLayer: "graph_projection",
      relativePath: PROJECTION_RELATIVE_PATH,
      order: index + 1,
      lane: "main",
      sources: [
        {
          layer: "graph_projection",
          relativePath: PROJECTION_RELATIVE_PATH,
          label: "Graph projection node",
          section: "nodes",
          rawValue: id,
        },
      ],
      missing: [],
      detail: {
        title: label,
        summary: readString(entry.summary),
        handoff: null,
        concern: null,
        files: [PROJECTION_RELATIVE_PATH],
        verification: [],
        threadIds: [],
        runtimeThreads: [],
        gitWorktree: [],
        blocks: detailBlocks,
      },
    };
  });
}

function readEdges(value: unknown, nodeIds: Set<string>): GraphEdge[] {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawEdge, index) => {
    const source = readString(entry.source);
    const target = readString(entry.target);

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
        sourceLayer: "graph_projection",
        relativePath: PROJECTION_RELATIVE_PATH,
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

function readDetailLinks(value: unknown) {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry: RawDetailLink) => {
    const href = readString(entry.href);
    const relativePath = readString(entry.relativePath);

    if (!href && !relativePath) {
      return [];
    }

    return [
      {
        label: readString(entry.label) ?? relativePath ?? href ?? "Reference",
        href: href ?? "",
        relativePath,
      },
    ];
  });
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

  return "checkpoint";
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
