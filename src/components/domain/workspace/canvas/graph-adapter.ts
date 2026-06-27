import type { GraphData } from "react-force-graph-2d";
import type {
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphPacketGroup,
  OrchestrationGraph,
} from "@/lib/graph/orchestration-graph";
import {
  DEFAULT_GRAPH_NEUTRAL_STROKE,
  GRAPH_EDGE_SIGNAL_ORDER,
  LINK_COLORS,
  PACKET_PALETTE,
  STATUS_COLORS,
} from "./constants";
import {
  DEFAULT_CANVAS_LAYOUT_MODE,
  type CanvasLayoutMode,
} from "./layout-mode";
import { getChronologyGuideY } from "./physics";
import type { CanvasLink, CanvasNode, CanvasRegion } from "./types";

const DEFAULT_WORK_NODE_COLOR = DEFAULT_GRAPH_NEUTRAL_STROKE;
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
const CROSS_REGION_GRAVITY_DEPTH_MULTIPLIER = 1.75;
const LANE_X_SPACING = 620;
const LANE_RANK_SPACING = 310;
const LANE_COMPONENT_NODE_SPACING = 240;
const LANE_SHELF_GAP = 4;
const LANE_SHELF_COLUMNS = 3;
const LANE_SHELF_ROW_SPACING = 300;

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

type CanvasNodeLayout = {
  guideX: number;
  guideY: number;
  x: number;
  y: number;
  fx?: number;
  fy?: number;
  vy?: number;
};

export function createCanvasGraph(
  graph: OrchestrationGraph,
  layoutMode: CanvasLayoutMode = DEFAULT_CANVAS_LAYOUT_MODE
): {
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
  const visibleEdges = graph.edges.filter(
    (edge) =>
      visibleGraphNodeIds.has(edge.source) && visibleGraphNodeIds.has(edge.target)
  );
  const edgeTopology = createEdgeTopology(visibleEdges);
  const deterministicLaneLayout =
    layoutMode === "lanes"
      ? createDeterministicLaneLayout({
          nodes: includedGraphNodes,
          edges: visibleEdges,
        })
      : null;
  const initialRegionLayouts =
    layoutMode === "physics"
      ? createInitialRegionStrandLayouts({
          regions: graph.regions,
          edges: graph.edges,
          visibleNodeIds: visibleGraphNodeIds,
        })
      : new Map<string, { x: number; y: number }>();
  const initialGravityDepthLayout =
    layoutMode === "physics"
      ? createInitialGravityDepthLayout({
          nodes: includedGraphNodes,
          edges: graph.edges,
          regionIdsByNode,
        })
      : null;

  const nodes = includedGraphNodes.map((node) => {
    const nodeLayout =
      deterministicLaneLayout?.get(node.id) ??
      createPhysicsNodeLayout({
        node,
        initialGravityDepthLayout,
        initialRegionLayouts,
      });
    const offSource = node.detail.gitWorktree.some(
      (annotation) => annotation.status === "off_source_of_truth"
    );
    const nodeColor = getGraphNodeColor(node, packetColors);

    return {
      ...node,
      color: nodeColor,
      markers: markersByTarget.get(node.id) ?? [],
      regionIds: regionIdsByNode.get(node.id) ?? [],
      guideX: nodeLayout.guideX,
      guideY: nodeLayout.guideY,
      radius: node.primary ? 122 : 94,
      visualRadius: node.primary ? 54 : 42,
      boxWidth: 0,
      boxHeight: 0,
      offSource,
      x: nodeLayout.x,
      y: nodeLayout.y,
      vx: 0,
      vy: nodeLayout.vy,
      fx: nodeLayout.fx,
      fy: nodeLayout.fy,
    };
  });

  const links = visibleEdges.map((edge) => ({
    ...edge,
    color: getLinkColor(edge),
    width: getLinkWidth(),
    dash: getLinkDash(edge),
    crossesRegionBoundary: edgeCrossesRegionBoundary(edge, regionIdsByNode),
    physicsMode: getLinkPhysicsMode(edge, edgeTopology),
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
    layoutKey: createLayoutKey(nodes, layoutMode),
    initialFocusNodeId: getInitialFocusNodeId(nodes, initialGravityDepthLayout),
  };
}

function createPhysicsNodeLayout({
  node,
  initialGravityDepthLayout,
  initialRegionLayouts,
}: {
  node: GraphNode;
  initialGravityDepthLayout: InitialGravityDepthLayout | null;
  initialRegionLayouts: Map<string, { x: number; y: number }>;
}): CanvasNodeLayout {
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

  return {
    guideX: resolvedGuideX,
    guideY: resolvedGuideY,
    x: resolvedGuideX,
    y: resolvedInitialY,
    vy: getInitialGravityVelocityY(node, initialGravityDepthLayout),
    fy: node.chronology === "start" ? resolvedGuideY : undefined,
  };
}

type LaneComponent = {
  id: string;
  nodeIds: Set<string>;
  nodes: GraphNode[];
  order: number;
};

type LaneComponentGraph = {
  incoming: Map<string, Set<string>>;
  outgoing: Map<string, Set<string>>;
  weakAdjacency: Map<string, Set<string>>;
};

type ShelfPlacement = {
  lane: number;
  row: number;
};

function createDeterministicLaneLayout({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) {
  const startY = getChronologyGuideY("start") ?? 0;
  const flowEdges = edges.filter(isDirectionalLayoutEdge);
  const components = createStrongComponents(nodes, flowEdges);
  const componentByNodeId = createComponentByNodeId(components);
  const componentGraph = createLaneComponentGraph(
    components,
    flowEdges,
    componentByNodeId
  );
  const startComponentIds = new Set(
    components
      .filter((component) =>
        component.nodes.some((node) => node.chronology === "start")
      )
      .map((component) => component.id)
  );
  const mainComponentIds = getMainLaneComponentIds(
    components,
    componentGraph,
    startComponentIds
  );
  const ranks = createLaneComponentRanks(
    components,
    componentGraph,
    startComponentIds
  );
  const lanes = spreadComponentLanesByRank(
    createLaneAssignments({
      components,
      componentGraph,
      mainComponentIds,
      ranks,
    }),
    components,
    ranks,
    mainComponentIds
  );
  const shelfPlacements = createShelfPlacements({
    componentGraph,
    components,
    mainComponentIds,
    ranks,
    shelfBaseLane: getShelfBaseLane(lanes, mainComponentIds),
  });
  const layout = new Map<string, CanvasNodeLayout>();

  for (const component of components) {
    const isMainComponent = mainComponentIds.has(component.id);
    const componentLane = isMainComponent
      ? lanes.get(component.id) ?? 0
      : shelfPlacements.get(component.id)?.lane ?? getShelfBaseLane(lanes, mainComponentIds);
    const componentRank = isMainComponent
      ? ranks.get(component.id) ?? 0
      : shelfPlacements.get(component.id)?.row ?? 0;
    const sortedNodes = [...component.nodes].sort(compareLaneNode);
    const centeredNodeOffset = (sortedNodes.length - 1) / 2;

    sortedNodes.forEach((node, index) => {
      const nodeOffset = index - centeredNodeOffset;
      const x =
        getInitialNodeX() +
        componentLane * LANE_X_SPACING +
        nodeOffset * LANE_COMPONENT_NODE_SPACING;
      const y =
        startY +
        componentRank *
          (isMainComponent ? LANE_RANK_SPACING : LANE_SHELF_ROW_SPACING);

      layout.set(node.id, {
        guideX: x,
        guideY: y,
        x,
        y,
        vy: 0,
      });
    });
  }

  return layout;
}

function createStrongComponents(
  nodes: GraphNode[],
  edges: GraphEdge[]
): LaneComponent[] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, string[]>(
    nodes.map((node) => [node.id, []])
  );

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    adjacency.get(edge.source)?.push(edge.target);
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort((left, right) => left.localeCompare(right));
  }

  let nextIndex = 0;
  const nodeIndexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const stacked = new Set<string>();
  const components: LaneComponent[] = [];

  const visit = (nodeId: string) => {
    nodeIndexes.set(nodeId, nextIndex);
    lowLinks.set(nodeId, nextIndex);
    nextIndex += 1;
    stack.push(nodeId);
    stacked.add(nodeId);

    for (const neighborId of adjacency.get(nodeId) ?? []) {
      if (!nodeIndexes.has(neighborId)) {
        visit(neighborId);
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId) ?? 0, lowLinks.get(neighborId) ?? 0)
        );
      } else if (stacked.has(neighborId)) {
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId) ?? 0, nodeIndexes.get(neighborId) ?? 0)
        );
      }
    }

    if (lowLinks.get(nodeId) !== nodeIndexes.get(nodeId)) {
      return;
    }

    const componentNodeIds: string[] = [];
    let currentId: string | undefined;

    do {
      currentId = stack.pop();

      if (!currentId) {
        break;
      }

      stacked.delete(currentId);
      componentNodeIds.push(currentId);
    } while (currentId !== nodeId);

    const componentNodes = componentNodeIds
      .map((componentNodeId) => nodesById.get(componentNodeId))
      .filter((node): node is GraphNode => Boolean(node))
      .sort(compareLaneNode);
    const sortedIds = componentNodes.map((node) => node.id).sort();

    components.push({
      id: sortedIds.join("\u0000"),
      nodeIds: new Set(sortedIds),
      nodes: componentNodes,
      order: Math.max(...componentNodes.map((node) => node.order)),
    });
  };

  for (const node of nodes) {
    if (!nodeIndexes.has(node.id)) {
      visit(node.id);
    }
  }

  return components.sort(compareLaneComponent);
}

function createComponentByNodeId(components: LaneComponent[]) {
  const componentByNodeId = new Map<string, string>();

  for (const component of components) {
    for (const nodeId of component.nodeIds) {
      componentByNodeId.set(nodeId, component.id);
    }
  }

  return componentByNodeId;
}

function createLaneComponentGraph(
  components: LaneComponent[],
  edges: GraphEdge[],
  componentByNodeId: Map<string, string>
): LaneComponentGraph {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  const weakAdjacency = new Map<string, Set<string>>();

  for (const component of components) {
    incoming.set(component.id, new Set());
    outgoing.set(component.id, new Set());
    weakAdjacency.set(component.id, new Set());
  }

  for (const edge of edges) {
    const sourceComponentId = componentByNodeId.get(edge.source);
    const targetComponentId = componentByNodeId.get(edge.target);

    if (
      !sourceComponentId ||
      !targetComponentId ||
      sourceComponentId === targetComponentId
    ) {
      continue;
    }

    outgoing.get(sourceComponentId)?.add(targetComponentId);
    incoming.get(targetComponentId)?.add(sourceComponentId);
    weakAdjacency.get(sourceComponentId)?.add(targetComponentId);
    weakAdjacency.get(targetComponentId)?.add(sourceComponentId);
  }

  return { incoming, outgoing, weakAdjacency };
}

function getMainLaneComponentIds(
  components: LaneComponent[],
  graph: LaneComponentGraph,
  startComponentIds: Set<string>
) {
  if (startComponentIds.size > 0) {
    return collectWeaklyConnectedComponents(graph, startComponentIds);
  }

  const largestGroup = createWeakComponentGroups(
    components.map((component) => component.id),
    graph
  ).sort((left, right) => right.length - left.length || left[0].localeCompare(right[0]))[0];

  return new Set(largestGroup ?? []);
}

function collectWeaklyConnectedComponents(
  graph: LaneComponentGraph,
  rootIds: Set<string>
) {
  const visited = new Set<string>();
  const queue = [...rootIds].sort((left, right) => left.localeCompare(right));

  while (queue.length > 0) {
    const componentId = queue.shift();

    if (!componentId || visited.has(componentId)) {
      continue;
    }

    visited.add(componentId);

    for (const nextId of graph.weakAdjacency.get(componentId) ?? []) {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }

    queue.sort((left, right) => left.localeCompare(right));
  }

  return visited;
}

function createLaneComponentRanks(
  components: LaneComponent[],
  graph: LaneComponentGraph,
  startComponentIds: Set<string>
) {
  const ranks = new Map<string, number>();
  const remainingIncomingCounts = new Map(
    components.map((component) => [
      component.id,
      graph.incoming.get(component.id)?.size ?? 0,
    ])
  );
  const ready = components
    .filter((component) => remainingIncomingCounts.get(component.id) === 0)
    .map((component) => component.id);

  for (const component of components) {
    if (
      startComponentIds.has(component.id) ||
      remainingIncomingCounts.get(component.id) === 0
    ) {
      ranks.set(component.id, 0);
    }
  }

  sortComponentIds(ready, components, ranks);

  while (ready.length > 0) {
    const componentId = ready.shift();

    if (!componentId) {
      continue;
    }

    const componentRank = ranks.get(componentId) ?? 0;

    for (const targetId of graph.outgoing.get(componentId) ?? []) {
      ranks.set(targetId, Math.max(ranks.get(targetId) ?? 0, componentRank + 1));
      remainingIncomingCounts.set(
        targetId,
        Math.max(0, (remainingIncomingCounts.get(targetId) ?? 0) - 1)
      );

      if (remainingIncomingCounts.get(targetId) === 0) {
        ready.push(targetId);
      }
    }

    sortComponentIds(ready, components, ranks);
  }

  for (const component of components) {
    if (!ranks.has(component.id)) {
      ranks.set(component.id, 0);
    }
  }

  return ranks;
}

function createLaneAssignments({
  components,
  componentGraph,
  mainComponentIds,
  ranks,
}: {
  components: LaneComponent[];
  componentGraph: LaneComponentGraph;
  mainComponentIds: Set<string>;
  ranks: Map<string, number>;
}) {
  const lanes = new Map<string, number>();
  const orderedComponents = [...components]
    .filter((component) => mainComponentIds.has(component.id))
    .sort((left, right) => compareLaneComponentByRank(left, right, ranks));

  for (const component of orderedComponents) {
    const incomingLanes = getIncomingComponentLanes(
      component.id,
      componentGraph,
      lanes,
      mainComponentIds
    );

    if (incomingLanes.length > 1) {
      lanes.set(component.id, getMedian(incomingLanes));
    } else if (!lanes.has(component.id)) {
      lanes.set(component.id, incomingLanes[0] ?? 0);
    }

    const parentLane = lanes.get(component.id) ?? 0;
    const children = [...(componentGraph.outgoing.get(component.id) ?? [])]
      .filter((componentId) => mainComponentIds.has(componentId))
      .sort((leftId, rightId) =>
        compareComponentIdsByRank(leftId, rightId, components, ranks)
      );

    if (children.length === 1) {
      const childId = children[0];

      if (!lanes.has(childId)) {
        lanes.set(childId, parentLane);
      }
      continue;
    }

    children.forEach((childId, index) => {
      if (lanes.has(childId)) {
        return;
      }

      lanes.set(childId, parentLane + getCenteredOffset(index, children.length));
    });
  }

  return lanes;
}

function spreadComponentLanesByRank(
  lanes: Map<string, number>,
  components: LaneComponent[],
  ranks: Map<string, number>,
  mainComponentIds: Set<string>
) {
  const result = new Map(lanes);
  const componentsByRank = new Map<number, LaneComponent[]>();

  for (const component of components) {
    if (!mainComponentIds.has(component.id)) {
      continue;
    }

    const rank = ranks.get(component.id) ?? 0;
    const rankedComponents = componentsByRank.get(rank) ?? [];
    rankedComponents.push(component);
    componentsByRank.set(rank, rankedComponents);
  }

  for (const rankedComponents of componentsByRank.values()) {
    const sortedComponents = rankedComponents.sort(
      (left, right) =>
        (result.get(left.id) ?? 0) - (result.get(right.id) ?? 0) ||
        compareLaneComponent(left, right)
    );
    const clusters: LaneComponent[][] = [];

    for (const component of sortedComponents) {
      const lane = result.get(component.id) ?? 0;
      const cluster = clusters.at(-1);

      if (
        !cluster ||
        Math.abs(lane - (result.get(cluster[0].id) ?? 0)) > 0.4
      ) {
        clusters.push([component]);
      } else {
        cluster.push(component);
      }
    }

    for (const cluster of clusters) {
      if (cluster.length <= 1) {
        continue;
      }

      const startComponent = cluster.find(componentHasStartNode);

      if (startComponent) {
        const anchorLane = result.get(startComponent.id) ?? 0;
        result.set(startComponent.id, 0);
        cluster
          .filter((component) => component.id !== startComponent.id)
          .forEach((component, index) => {
            result.set(
              component.id,
              anchorLane + getAlternatingLaneOffset(index)
            );
          });
        continue;
      }

      const baseLane =
        cluster.reduce((sum, component) => sum + (result.get(component.id) ?? 0), 0) /
        cluster.length;

      cluster.forEach((component, index) => {
        result.set(
          component.id,
          baseLane + getCenteredOffset(index, cluster.length)
        );
      });
    }
  }

  return result;
}

function componentHasStartNode(component: LaneComponent) {
  return component.nodes.some((node) => node.chronology === "start");
}

function createShelfPlacements({
  componentGraph,
  components,
  mainComponentIds,
  ranks,
  shelfBaseLane,
}: {
  componentGraph: LaneComponentGraph;
  components: LaneComponent[];
  mainComponentIds: Set<string>;
  ranks: Map<string, number>;
  shelfBaseLane: number;
}) {
  const placements = new Map<string, ShelfPlacement>();
  const shelfGroups = createWeakComponentGroups(
    components
      .filter((component) => !mainComponentIds.has(component.id))
      .map((component) => component.id),
    componentGraph
  );
  const nextRowsByColumn = Array.from({ length: LANE_SHELF_COLUMNS }, () => 0);

  shelfGroups.forEach((group, groupIndex) => {
    const column = groupIndex % LANE_SHELF_COLUMNS;
    const groupComponents = group
      .map((componentId) =>
        components.find((component) => component.id === componentId)
      )
      .filter((component): component is LaneComponent => Boolean(component))
      .sort((left, right) => compareLaneComponentByRank(left, right, ranks));
    const minimumRank = Math.min(
      0,
      ...groupComponents.map((component) => ranks.get(component.id) ?? 0)
    );
    const baseRow = nextRowsByColumn[column];
    const lane = shelfBaseLane + column;

    for (const component of groupComponents) {
      placements.set(component.id, {
        lane,
        row: baseRow + (ranks.get(component.id) ?? 0) - minimumRank,
      });
    }

    nextRowsByColumn[column] =
      baseRow +
      Math.max(1, ...groupComponents.map((component) => ranks.get(component.id) ?? 0)) -
      minimumRank +
      2;
  });

  return placements;
}

function createWeakComponentGroups(
  componentIds: string[],
  graph: LaneComponentGraph
) {
  const allowed = new Set(componentIds);
  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const componentId of [...componentIds].sort((left, right) => left.localeCompare(right))) {
    if (visited.has(componentId)) {
      continue;
    }

    const group: string[] = [];
    const queue = [componentId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);
      group.push(currentId);

      for (const nextId of graph.weakAdjacency.get(currentId) ?? []) {
        if (allowed.has(nextId) && !visited.has(nextId)) {
          queue.push(nextId);
        }
      }

      queue.sort((left, right) => left.localeCompare(right));
    }

    groups.push(group.sort((left, right) => left.localeCompare(right)));
  }

  return groups;
}

function getShelfBaseLane(
  lanes: Map<string, number>,
  mainComponentIds: Set<string>
) {
  const mainLanes = [...lanes.entries()]
    .filter(([componentId]) => mainComponentIds.has(componentId))
    .map(([, lane]) => lane);

  return Math.max(0, ...mainLanes) + LANE_SHELF_GAP;
}

function getIncomingComponentLanes(
  componentId: string,
  graph: LaneComponentGraph,
  lanes: Map<string, number>,
  mainComponentIds: Set<string>
) {
  return [...(graph.incoming.get(componentId) ?? [])]
    .filter((incomingId) => mainComponentIds.has(incomingId))
    .map((incomingId) => lanes.get(incomingId))
    .filter((lane): lane is number => typeof lane === "number")
    .sort((left, right) => left - right);
}

function isDirectionalLayoutEdge(edge: GraphEdge) {
  return edge.directional !== false && !isAmbientLayoutEdge(edge);
}

function isAmbientLayoutEdge(edge: GraphEdge) {
  return (
    edge.style === "dotted" ||
    edge.type === "annotates" ||
    edge.type === "documents"
  );
}

function getCenteredOffset(index: number, total: number) {
  if (total <= 1) {
    return 0;
  }

  return index - (total - 1) / 2;
}

function getAlternatingLaneOffset(index: number) {
  const magnitude = Math.floor(index / 2) + 1;

  return index % 2 === 0 ? magnitude : -magnitude;
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return sortedValues[middle];
  }

  return (sortedValues[middle - 1] + sortedValues[middle]) / 2;
}

function compareLaneNode(left: GraphNode, right: GraphNode) {
  if (left.chronology !== right.chronology) {
    return left.chronology === "start" ? -1 : 1;
  }

  return right.order - left.order || left.id.localeCompare(right.id);
}

function compareLaneComponent(left: LaneComponent, right: LaneComponent) {
  return right.order - left.order || left.id.localeCompare(right.id);
}

function compareLaneComponentByRank(
  left: LaneComponent,
  right: LaneComponent,
  ranks: Map<string, number>
) {
  return (
    (ranks.get(left.id) ?? 0) - (ranks.get(right.id) ?? 0) ||
    compareLaneComponent(left, right)
  );
}

function compareComponentIdsByRank(
  leftId: string,
  rightId: string,
  components: LaneComponent[],
  ranks: Map<string, number>
) {
  const componentsById = new Map(
    components.map((component) => [component.id, component])
  );
  const left = componentsById.get(leftId);
  const right = componentsById.get(rightId);

  if (!left || !right) {
    return leftId.localeCompare(rightId);
  }

  return compareLaneComponentByRank(left, right, ranks);
}

function sortComponentIds(
  componentIds: string[],
  components: LaneComponent[],
  ranks: Map<string, number>
) {
  componentIds.sort((leftId, rightId) =>
    compareComponentIdsByRank(leftId, rightId, components, ranks)
  );
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
  regionIdsByNode,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  regionIdsByNode: Map<string, string[]>;
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
      const depthStep =
        getGravityDepthStep(edge) *
        (edgeCrossesRegionBoundary(edge, regionIdsByNode)
          ? CROSS_REGION_GRAVITY_DEPTH_MULTIPLIER
          : 1);

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

function createLayoutKey(nodes: CanvasNode[], layoutMode: CanvasLayoutMode) {
  return `${layoutMode}:` + nodes
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

function edgeCrossesRegionBoundary(
  edge: Pick<GraphEdge, "source" | "target">,
  regionIdsByNode: Map<string, string[]>
) {
  const sourceRegionIds = regionIdsByNode.get(edge.source) ?? [];
  const targetRegionIds = regionIdsByNode.get(edge.target) ?? [];

  if (sourceRegionIds.length === 0 || targetRegionIds.length === 0) {
    return sourceRegionIds.length !== targetRegionIds.length;
  }

  return !sourceRegionIds.some((regionId) => targetRegionIds.includes(regionId));
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
  const docPath = `${workspacePath}/${relativePath}`;

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

  return DEFAULT_WORK_NODE_COLOR;
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

type EdgeTopology = {
  incomingCounts: Map<string, number>;
  outgoingCounts: Map<string, number>;
};

function getLinkPhysicsMode(
  edge: GraphEdge,
  topology: EdgeTopology
): CanvasLink["physicsMode"] {
  if (
    edge.style === "dotted" ||
    edge.type === "annotates" ||
    edge.type === "documents"
  ) {
    return "ambient";
  }

  if (
    edge.style === "dashed" ||
    edge.type === "detour" ||
    edge.type === "returned" ||
    edge.type === "blocked" ||
    edge.type === "repass"
  ) {
    return "weak";
  }

  if (isTopologyBranchEdge(edge, topology) || isLowPriorityEdge(edge)) {
    return "weak";
  }

  return "structural";
}

function createEdgeTopology(edges: GraphEdge[]): EdgeTopology {
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();

  for (const edge of edges) {
    if (edge.directional === false) {
      continue;
    }

    outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) ?? 0) + 1);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  }

  return {
    incomingCounts,
    outgoingCounts,
  };
}

function isTopologyBranchEdge(edge: GraphEdge, topology: EdgeTopology) {
  if (edge.directional === false) {
    return false;
  }

  return (
    (topology.outgoingCounts.get(edge.source) ?? 0) > 1 ||
    (topology.incomingCounts.get(edge.target) ?? 0) > 1
  );
}

function isLowPriorityEdge(edge: GraphEdge) {
  return (
    edge.status === "deferred" ||
    edge.status === "queued" ||
    edge.status === "superseded"
  );
}
