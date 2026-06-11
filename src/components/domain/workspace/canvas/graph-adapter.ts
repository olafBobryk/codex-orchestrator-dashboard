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
  LINK_COLORS,
  PACKET_PALETTE,
  STATUS_COLORS,
} from "./constants";
import { getChronologyGuideY } from "./physics";
import type { CanvasLink, CanvasNode, CanvasRegion } from "./types";

const DEFAULT_WORK_NODE_COLOR = "#94a3b8";
const NEUTRAL_WORK_PACKET_IDS = new Set([
  "work",
  "default",
  "default_work",
  "work_unit",
  "work-unit",
]);
const DEFAULT_INITIAL_Y_SPREAD = 520;
const INITIAL_REGION_SPACING = 520;
const REGION_STRAND_SPACING = 190;
const REGION_STRAND_JITTER = 34;
const PRIMARY_INITIAL_X = -120;
const GRAVITY_FIRST_DEPTH_DROP = 460;
const GRAVITY_DEPTH_SPACING = 220;
const GRAVITY_INITIAL_FALL_DISTANCE = 180;
const GRAVITY_INITIAL_VELOCITY_Y = 1.8;
const GRAVITY_FALLBACK_DEPTH_BASE = 2.25;
const GRAVITY_FALLBACK_DEPTH_SPREAD = 3;

type InitialRegionOffset = {
  x: number;
  y: number;
  axisX: number;
  axisY: number;
};

type InitialGravityDepthLayout = {
  depths: Map<string, number>;
  startY: number;
};

export function createCanvasGraph(graph: OrchestrationGraph): {
  data: GraphData<CanvasNode, CanvasLink>;
  regions: CanvasRegion[];
  packetColors: Map<string, string>;
  visiblePackets: GraphPacketGroup[];
  layoutKey: string;
  initialFocusNodeId: string | null;
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
  const regionIdsByNode = new Map<string, string[]>();

  for (const region of graph.regions) {
    for (const nodeId of region.nodeIds) {
      const existing = regionIdsByNode.get(nodeId) ?? [];
      existing.push(region.id);
      regionIdsByNode.set(nodeId, existing);
    }
  }

  const includedGraphNodes = getVisibleGraphNodes(graph);
  const visibleGraphNodeIds = new Set(includedGraphNodes.map((node) => node.id));
  const initialRegionLayouts = createInitialRegionStrandLayouts({
    regions: graph.regions,
    edges: graph.edges,
    visibleNodeIds: visibleGraphNodeIds,
  });
  const initialGravityDepthLayout = createInitialGravityDepthLayout({
    nodes: includedGraphNodes,
    edges: graph.edges,
  });

  const nodes = includedGraphNodes.map((node) => {
    const gravityGuideY = getGravityGuideY(node, initialGravityDepthLayout);
    const gravitySpawnY = getGravitySpawnY(
      node,
      initialGravityDepthLayout,
      gravityGuideY
    );
    const regionLayout = initialRegionLayouts.get(node.id);
    const resolvedGuideX = regionLayout?.x ?? getInitialNodeX();
    const resolvedGuideY =
      gravityGuideY ?? regionLayout?.y ?? getInitialGuideY(node);
    const resolvedInitialY =
      gravitySpawnY ?? regionLayout?.y ?? getInitialGuideY(node);
    const offSource = node.detail.gitWorktree.some(
      (annotation) => annotation.status === "off_source_of_truth"
    );
    const nodeColor = getGraphNodeColor(node, packetColors);

    return {
      ...node,
      color: nodeColor,
      markers: markersByTarget.get(node.id) ?? [],
      regionIds: regionIdsByNode.get(node.id) ?? [],
      guideX: resolvedGuideX,
      guideY: resolvedGuideY,
      radius: node.primary ? 122 : 94,
      visualRadius: node.primary ? 54 : 42,
      boxWidth: 0,
      boxHeight: 0,
      offSource,
      x: resolvedGuideX,
      y: resolvedInitialY,
      vy: getInitialGravityVelocityY(node, initialGravityDepthLayout),
      fy: node.chronology === "start" ? resolvedGuideY : undefined,
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
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const rawRegions = graph.regions.map((region) => ({
    ...region,
    nodeIds: region.nodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)),
    regionIds: region.regionIds.filter((regionId) =>
      graph.regions.some((candidate) => candidate.id === regionId)
    ),
  }));
  const visibleRegionIds = new Set(
    rawRegions
      .filter((region) => region.nodeIds.length > 0)
      .map((region) => region.id)
  );
  let regionVisibilityChanged = true;

  while (regionVisibilityChanged) {
    regionVisibilityChanged = false;

    for (const region of rawRegions) {
      if (visibleRegionIds.has(region.id)) {
        continue;
      }

      if (region.regionIds.some((regionId) => visibleRegionIds.has(regionId))) {
        visibleRegionIds.add(region.id);
        regionVisibilityChanged = true;
      }
    }
  }

  const regions = rawRegions
    .map((region) => ({
      ...region,
      regionIds: region.regionIds.filter((regionId) =>
        visibleRegionIds.has(regionId)
      ),
    }))
    .filter((region) => visibleRegionIds.has(region.id));

  return {
    data: { nodes, links },
    regions,
    packetColors,
    visiblePackets,
    layoutKey: createLayoutKey(nodes),
    initialFocusNodeId: getInitialFocusNodeId(nodes, initialGravityDepthLayout),
  };
}

function getInitialFocusNodeId(
  nodes: CanvasNode[],
  layout: InitialGravityDepthLayout | null
) {
  if (nodes.length === 0) {
    return null;
  }

  if (!layout) {
    return (
      [...nodes]
        .sort((left, right) => {
          const yDelta = (right.guideY ?? 0) - (left.guideY ?? 0);

          return yDelta || left.id.localeCompare(right.id);
        })
        .at(0)?.id ??
      null
    );
  }

  return (
    [...nodes]
      .sort((left, right) => {
        const leftDepth = layout.depths.get(left.id) ?? 0;
        const rightDepth = layout.depths.get(right.id) ?? 0;

        return (
          rightDepth - leftDepth ||
          left.id.localeCompare(right.id)
        );
      })
      .at(0)?.id ?? null
  );
}

function getInitialGuideY(node: GraphNode) {
  const chronologyGuideY = getChronologyGuideY(node.chronology);

  if (chronologyGuideY !== null) {
    return chronologyGuideY;
  }

  return (
    getStableNodeUnit(node.id) * DEFAULT_INITIAL_Y_SPREAD -
    DEFAULT_INITIAL_Y_SPREAD / 2
  );
}

function getInitialNodeX() {
  return PRIMARY_INITIAL_X;
}

function getGravityGuideY(
  node: GraphNode,
  layout: InitialGravityDepthLayout | null
) {
  if (node.chronology === "start") {
    return getChronologyGuideY("start");
  }

  if (!layout) {
    return getChronologyGuideY(node.chronology);
  }

  const depth = layout.depths.get(node.id);

  if (depth === undefined) {
    return null;
  }

  return layout.startY + getGravityDepthOffset(depth);
}

function getGravitySpawnY(
  node: GraphNode,
  layout: InitialGravityDepthLayout | null,
  guideY: number | null
) {
  if (!layout || guideY === null || node.chronology === "start") {
    return guideY;
  }

  const depth = layout.depths.get(node.id);

  if (depth === undefined || depth <= 0) {
    return guideY;
  }

  const belowStartY = layout.startY + GRAVITY_FIRST_DEPTH_DROP * 0.66;

  return Math.max(belowStartY, guideY - GRAVITY_INITIAL_FALL_DISTANCE);
}

function getInitialGravityVelocityY(
  node: GraphNode,
  layout: InitialGravityDepthLayout | null
) {
  if (!layout || node.chronology === "start") {
    return undefined;
  }

  return GRAVITY_INITIAL_VELOCITY_Y;
}

function getStableNodeUnit(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function createInitialGravityDepthLayout({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}): InitialGravityDepthLayout | null {
  const startY = getChronologyGuideY("start");
  const startNodeIds = nodes
    .filter((node) => node.chronology === "start")
    .map((node) => node.id)
    .sort((left, right) => left.localeCompare(right));

  if (startY === null || startNodeIds.length === 0) {
    return null;
  }

  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const depths = new Map<string, number>();
  const depthEdges = edges
    .filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
    .sort(compareDepthEdge);

  for (const nodeId of startNodeIds) {
    depths.set(nodeId, 0);
  }

  for (let pass = 0; pass < visibleNodeIds.size; pass += 1) {
    let changed = false;

    for (const edge of depthEdges) {
      const depthStep = getGravityDepthStep(edge);

      changed =
        relaxGravityDepth(depths, edge.source, edge.target, depthStep) ||
        changed;

      if (edge.directional === false) {
        changed =
          relaxGravityDepth(depths, edge.target, edge.source, depthStep) ||
          changed;
      }
    }

    if (!changed) {
      break;
    }
  }

  const reachedMaxDepth = Math.max(1, ...depths.values());

  for (const node of nodes) {
    if (depths.has(node.id)) {
      continue;
    }

    const fallbackDepth =
      GRAVITY_FALLBACK_DEPTH_BASE +
      Math.floor(
        getStableNodeUnit(`${node.id}:gravity-fallback`) *
          GRAVITY_FALLBACK_DEPTH_SPREAD
      );

    depths.set(node.id, Math.min(reachedMaxDepth + 1, fallbackDepth));
  }

  return {
    depths,
    startY,
  };
}

function getGravityDepthOffset(depth: number) {
  if (depth <= 0) {
    return 0;
  }

  return GRAVITY_FIRST_DEPTH_DROP + (depth - 1) * GRAVITY_DEPTH_SPACING;
}

function createLayoutKey(nodes: CanvasNode[]) {
  return nodes
    .map(
      (node) =>
        `${node.id}:${Math.round(node.guideX)}:${Math.round(node.guideY)}`
    )
    .join("|");
}

function relaxGravityDepth(
  depths: Map<string, number>,
  sourceId: string,
  targetId: string,
  depthStep: number
) {
  const sourceDepth = depths.get(sourceId);

  if (sourceDepth === undefined) {
    return false;
  }

  const nextDepth = sourceDepth + depthStep;
  const targetDepth = depths.get(targetId);

  if (targetDepth !== undefined && targetDepth <= nextDepth) {
    return false;
  }

  depths.set(targetId, nextDepth);
  return true;
}

function compareDepthEdge(left: GraphEdge, right: GraphEdge) {
  return (
    left.source.localeCompare(right.source) ||
    left.target.localeCompare(right.target) ||
    left.id.localeCompare(right.id)
  );
}

function getGravityDepthStep(edge: GraphEdge) {
  if (edge.style === "dotted") {
    return 1.8;
  }

  if (edge.style === "dashed") {
    return 1.35;
  }

  return 1;
}

function createInitialRegionStrandLayouts({
  regions,
  edges,
  visibleNodeIds,
}: {
  regions: OrchestrationGraph["regions"];
  edges: GraphEdge[];
  visibleNodeIds: Set<string>;
}) {
  const regionOffsets = createInitialRegionOffsets(regions);
  const layoutSums = new Map<
    string,
    { x: number; y: number; count: number }
  >();

  for (const region of regions) {
    const offset = regionOffsets.get(region.id);
    const regionNodeIds = region.nodeIds.filter((nodeId) =>
      visibleNodeIds.has(nodeId)
    );

    if (!offset || regionNodeIds.length === 0) {
      continue;
    }

    const orderedNodeIds = orderRegionNodeIds(regionNodeIds, edges);
    const centerX = getInitialNodeX() + offset.x;
    const centerY = offset.y;
    const normalX = -offset.axisY;
    const normalY = offset.axisX;

    orderedNodeIds.forEach((nodeId, index) => {
      const centeredIndex = index - (orderedNodeIds.length - 1) / 2;
      const along = centeredIndex * REGION_STRAND_SPACING;
      const jitter =
        (getStableNodeUnit(`${region.id}:${nodeId}:strand`) - 0.5) *
        REGION_STRAND_JITTER;
      const x = centerX + offset.axisX * along + normalX * jitter;
      const y = centerY + offset.axisY * along + normalY * jitter;
      const existing = layoutSums.get(nodeId) ?? { x: 0, y: 0, count: 0 };

      layoutSums.set(nodeId, {
        x: existing.x + x,
        y: existing.y + y,
        count: existing.count + 1,
      });
    });
  }

  return new Map(
    [...layoutSums.entries()].map(([nodeId, position]) => [
      nodeId,
      {
        x: position.x / position.count,
        y: position.y / position.count,
      },
    ])
  );
}

function createInitialRegionOffsets(regions: OrchestrationGraph["regions"]) {
  const offsets = new Map<string, InitialRegionOffset>();
  const visibleRegions = regions.filter((region) => region.nodeIds.length > 0);
  const radius = Math.max(
    INITIAL_REGION_SPACING,
    (visibleRegions.length * INITIAL_REGION_SPACING) / Math.PI / 2
  );

  visibleRegions.forEach((region, index) => {
    const angle =
      visibleRegions.length <= 1
        ? 0
        : (index / visibleRegions.length) * Math.PI * 2 - Math.PI / 2;

    offsets.set(region.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      axisX: Math.cos(angle + Math.PI / 2),
      axisY: Math.sin(angle + Math.PI / 2),
    });
  });

  return offsets;
}

function orderRegionNodeIds(nodeIds: string[], edges: GraphEdge[]) {
  const nodeSet = new Set(nodeIds);
  const adjacency = new Map<string, Array<{ nodeId: string; weight: number }>>();

  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }

  for (const edge of edges) {
    if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) {
      continue;
    }

    const weight = getEdgeOrderWeight(edge);

    adjacency.get(edge.source)?.push({ nodeId: edge.target, weight });
    adjacency.get(edge.target)?.push({ nodeId: edge.source, weight });
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort(compareWeightedNeighbor);
  }

  const visited = new Set<string>();
  const connectedNodeIds = nodeIds
    .filter((nodeId) => (adjacency.get(nodeId)?.length ?? 0) > 0)
    .sort((left, right) => compareRegionOrderCandidate(left, right, adjacency));
  const ordered: string[] = [];

  while (connectedNodeIds.some((nodeId) => !visited.has(nodeId))) {
    let current = connectedNodeIds.find((nodeId) => !visited.has(nodeId));

    while (current) {
      visited.add(current);
      ordered.push(current);

      current =
        adjacency
          .get(current)
          ?.find((neighbor) => !visited.has(neighbor.nodeId))?.nodeId ??
        undefined;
    }
  }

  const isolatedNodeIds = nodeIds
    .filter((nodeId) => !visited.has(nodeId))
    .sort((left, right) => left.localeCompare(right));

  return [...ordered, ...isolatedNodeIds];
}

function compareWeightedNeighbor(
  left: { nodeId: string; weight: number },
  right: { nodeId: string; weight: number }
) {
  if (left.weight !== right.weight) {
    return right.weight - left.weight;
  }

  return left.nodeId.localeCompare(right.nodeId);
}

function compareRegionOrderCandidate(
  left: string,
  right: string,
  adjacency: Map<string, Array<{ nodeId: string; weight: number }>>
) {
  const leftScore = getRegionOrderScore(left, adjacency);
  const rightScore = getRegionOrderScore(right, adjacency);

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return left.localeCompare(right);
}

function getRegionOrderScore(
  nodeId: string,
  adjacency: Map<string, Array<{ nodeId: string; weight: number }>>
) {
  return (adjacency.get(nodeId) ?? []).reduce(
    (score, neighbor) => score + neighbor.weight,
    0
  );
}

function getEdgeOrderWeight(edge: GraphEdge) {
  if (edge.style === "dotted") {
    return 1;
  }

  if (edge.style === "dashed") {
    return 2;
  }

  return 3;
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
  if (node.color) {
    return node.color;
  }

  if (
    node.detail.gitWorktree.some(
      (annotation) => annotation.status === "off_source_of_truth"
    )
  ) {
    return "#64748b";
  }

  if (
    node.sourceLayer === "graph_projection" &&
    node.kind === "chunk" &&
    (!node.packetId || isNeutralWorkPacket(node.packetId))
  ) {
    return DEFAULT_WORK_NODE_COLOR;
  }

  if (node.packetId) {
    return packetColors.get(node.packetId) ?? STATUS_COLORS[node.status].stroke;
  }

  return STATUS_COLORS[node.status].stroke;
}

function isNeutralWorkPacket(packetId: string) {
  return NEUTRAL_WORK_PACKET_IDS.has(packetId.trim().toLowerCase());
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
