import type { GraphData } from "react-force-graph-2d";
import type {
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphPacketGroup,
  OrchestrationGraph,
} from "@/lib/orchestration-graph";
import {
  GRAPH_EDGE_SIGNAL_ORDER,
  LANE_X,
  LINK_COLORS,
  PACKET_PALETTE,
  STATUS_COLORS,
} from "./constants";
import { createEdgeSideLayouts, getChronologyGuideY } from "./physics";
import type { CanvasLink, CanvasNode } from "./types";

export function createCanvasGraph(graph: OrchestrationGraph): {
  data: GraphData<CanvasNode, CanvasLink>;
  packetColors: Map<string, string>;
  visiblePackets: GraphPacketGroup[];
} {
  const visiblePacketIds = new Set(
    graph.nodes
      .filter((node) => node.primary && node.packetId)
      .map((node) => node.packetId as string)
  );
  const visiblePackets = graph.packets.filter((packet) =>
    visiblePacketIds.has(packet.id)
  );
  const packetColors = new Map(
    visiblePackets.map((packet, index) => [
      packet.id,
      packet.color ?? PACKET_PALETTE[index % PACKET_PALETTE.length],
    ])
  );
  const markersByTarget = new Map<string, GraphMarker[]>();

  for (const marker of graph.markers) {
    const existing = markersByTarget.get(marker.targetId) ?? [];
    existing.push(marker);
    markersByTarget.set(marker.targetId, existing);
  }
  const chunkRank = new Map(
    graph.nodes
      .filter((node) => node.kind === "chunk")
      .sort(compareChunkNodes)
      .map((node, index) => [node.id, index])
  );
  const includedGraphNodes = getVisibleGraphNodes(graph);
  const rankSpan = Math.max(1, includedGraphNodes.length - 1);
  const supportSlotByRankLane = new Map<string, number>();
  const nodeIdsForLayout = new Set(includedGraphNodes.map((node) => node.id));
  const baseLayouts = new Map<string, { x: number; y: number }>();

  includedGraphNodes.forEach((node) => {
    const rank =
      chunkRank.get(node.id) ??
      (node.chunkId ? chunkRank.get(`chunk:${node.chunkId}`) : undefined) ??
      includedGraphNodes.indexOf(node);
    const lane = node.primary ? "main" : node.lane;

    baseLayouts.set(node.id, {
      x: LANE_X[lane],
      y: getChronologyGuideY({
        rank,
        rankSpan,
        lane,
        supportSlot: 0,
      }),
    });
  });

  const edgeSideLayouts = createEdgeSideLayouts({
    edges: graph.edges,
    nodeIds: nodeIdsForLayout,
    baseLayouts,
  });

  const nodes = includedGraphNodes.map((node) => {
    const rank =
      chunkRank.get(node.id) ??
      (node.chunkId ? chunkRank.get(`chunk:${node.chunkId}`) : undefined) ??
      includedGraphNodes.indexOf(node);
    const lane = node.primary ? "main" : node.lane;
    const supportSlotKey = `${rank}:${lane}`;
    const supportSlot = node.primary
      ? 0
      : supportSlotByRankLane.get(supportSlotKey) ?? 0;

    if (!node.primary) {
      supportSlotByRankLane.set(supportSlotKey, supportSlot + 1);
    }

    const guideX = LANE_X[lane];
    const timelineGuideY = getChronologyGuideY({
      rank,
      rankSpan,
      lane,
      supportSlot,
    });
    const edgeSideLayout = edgeSideLayouts.get(node.id);
    const resolvedGuideX = edgeSideLayout?.x ?? guideX;
    const resolvedGuideY = edgeSideLayout?.y ?? timelineGuideY;
    const offSource = node.detail.gitWorktree.some(
      (annotation) => annotation.status === "off_source_of_truth"
    );
    const nodeColor = getGraphNodeColor(node, packetColors);

    return {
      ...node,
      color: nodeColor,
      markers: markersByTarget.get(node.id) ?? [],
      guideX: resolvedGuideX,
      guideY: resolvedGuideY,
      edgeAnchored: Boolean(edgeSideLayout),
      radius: node.primary ? 122 : 94,
      visualRadius: node.primary ? 54 : 42,
      boxWidth: 0,
      boxHeight: 0,
      offSource,
      x: resolvedGuideX,
      y: resolvedGuideY,
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = graph.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      color: getLinkColor(edge),
      width: getLinkWidth(),
      dash: getLinkDash(edge),
    }));

  return {
    data: { nodes, links },
    packetColors,
    visiblePackets,
  };
}

export function countRuntimeAnnotations(graph: OrchestrationGraph) {
  return uniqueRuntimeAnnotations(
    graph.nodes.flatMap((node) => node.detail.runtimeThreads)
  ).length;
}

export function countFlowSignals(edges: GraphEdge[]) {
  const counts = new Map<GraphEdge["type"], number>();

  for (const edge of edges) {
    counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1);
  }

  return GRAPH_EDGE_SIGNAL_ORDER.map((type) => ({
    type,
    count: counts.get(type) ?? 0,
  })).filter((signal) => signal.count > 0);
}

export function getVisibleSourceStatus(graph: OrchestrationGraph) {
  const gitAnnotations = graph.nodes.flatMap((node) => node.detail.gitWorktree);

  if (
    gitAnnotations.some(
      (annotation) => annotation.status === "off_source_of_truth"
    )
  ) {
    return "off_source_of_truth";
  }

  if (
    gitAnnotations.some((annotation) => annotation.status === "source_of_truth")
  ) {
    return "source_of_truth";
  }

  return "unknown_source";
}

export function uniqueRuntimeAnnotations(
  annotations: GraphNode["detail"]["runtimeThreads"]
) {
  const annotationsById = new Map<string, (typeof annotations)[number]>();

  for (const annotation of annotations) {
    annotationsById.set(annotation.threadId, annotation);
  }

  return [...annotationsById.values()];
}

export function findRelatedDetailNodes(
  graph: OrchestrationGraph,
  node: GraphNode
) {
  const relatedIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.source === node.id) {
      relatedIds.add(edge.target);
    }

    if (edge.target === node.id) {
      relatedIds.add(edge.source);
    }
  }

  return graph.nodes.filter(
    (candidate) => relatedIds.has(candidate.id) && candidate.id !== node.id
  );
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function getNodeProvenanceFiles(node: GraphNode) {
  return uniqueStrings([
    ...node.detail.files,
    ...node.sources.flatMap((source) =>
      source.relativePath ? [source.relativePath] : []
    ),
  ]);
}

export function createVsCodeDocHref(workspace: string, relativePath: string) {
  const workspacePath = workspace.replace(/\/+$/, "");
  const docPath = `${workspacePath}/.codex-orchestration/${relativePath}`;

  return `vscode://file${encodeURI(docPath)}`;
}

function getVisibleGraphNodes(graph: OrchestrationGraph) {
  const primaryNodes = graph.nodes.filter((node) => node.primary);
  const primaryIds = new Set(primaryNodes.map((node) => node.id));
  const connectedSupportIds = new Set<string>();

  for (const edge of graph.edges) {
    if (primaryIds.has(edge.source)) {
      connectedSupportIds.add(edge.target);
    }

    if (primaryIds.has(edge.target)) {
      connectedSupportIds.add(edge.source);
    }
  }

  const supportNodes = graph.nodes.filter((node) => {
    if (node.primary || !connectedSupportIds.has(node.id)) {
      return false;
    }

    return node.kind === "handoff" || node.kind === "concern";
  });

  return [...primaryNodes, ...supportNodes].sort((left, right) => {
    if (left.primary !== right.primary) {
      return left.primary ? -1 : 1;
    }

    return right.order - left.order;
  });
}

export function getGraphNodeColor(
  node: GraphNode,
  packetColors: Map<string, string>
) {
  if (
    node.detail.gitWorktree.some(
      (annotation) => annotation.status === "off_source_of_truth"
    )
  ) {
    return "#64748b";
  }

  if (node.packetId) {
    return packetColors.get(node.packetId) ?? STATUS_COLORS[node.status].stroke;
  }

  return STATUS_COLORS[node.status].stroke;
}

function getLinkWidth() {
  return 1.8;
}

function getLinkColor(edge: GraphEdge) {
  if (edge.status === "blocked" || edge.status === "needs_human") {
    return LINK_COLORS.blocked;
  }

  if (edge.status === "verified" || edge.status === "resolved") {
    return LINK_COLORS.verified;
  }

  if (edge.status === "deferred") {
    return "#a8a29e";
  }

  return LINK_COLORS[edge.type];
}

function getLinkDash(edge: GraphEdge) {
  if (edge.style === "dashed") {
    return [8, 5];
  }

  if (edge.style === "dotted") {
    return [2, 5];
  }

  if (edge.type === "documents" || edge.type === "annotates") {
    return [4, 4];
  }

  return null;
}

function compareChunkNodes(left: GraphNode, right: GraphNode) {
  return chunkSortKey(right.chunkId) - chunkSortKey(left.chunkId);
}

function chunkSortKey(chunkId: string | null) {
  const match = chunkId?.match(/^P(\d+)-([A-Z]+)(\d+)$/);

  if (!match) {
    return 99_999;
  }

  return Number(match[1]) * 1000 + Number(match[3]);
}
