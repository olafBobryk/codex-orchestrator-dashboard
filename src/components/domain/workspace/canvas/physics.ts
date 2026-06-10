import { forceCollide, forceManyBody, forceX, forceY } from "d3-force";
import type { Force } from "d3-force";
import type { GraphEdge } from "@/lib/orchestration-graph";
import {
  LANE_Y_OFFSET,
  NODE_RANK_SPACING,
  NODE_RANK_STRETCH,
  NODE_TIMELINE_CENTER_Y,
  NODE_TIMELINE_MIN_GAP,
  NODE_TIMELINE_SEPARATION_STRENGTH,
  SIDE_EDGE_X_OFFSET,
  SIDE_EDGE_Y_OFFSET,
  SUPPORT_SLOT_SPACING,
} from "./constants";
import type { CanvasNode, GraphMethods } from "./types";

export function installGraphForces({
  instance,
  sizeWidth,
}: {
  instance: GraphMethods;
  sizeWidth: number;
}) {
  instance.d3Force(
    "laneX",
    forceX<CanvasNode>((node) => node.guideX).strength((node) =>
      node.primary ? 0.9 : 1.35
    )
  );
  instance.d3Force(
    "chronologyY",
    forceY<CanvasNode>((node) => node.guideY).strength((node) =>
      node.primary ? 0.9 : 0.75
    )
  );
  instance.d3Force("timelineSeparation", createTimelineSeparationForce());
  instance.d3Force(
    "collide",
    forceCollide<CanvasNode>((node) => node.radius + 72)
      .strength(1)
      .iterations(4)
  );
  instance.d3Force(
    "charge",
    forceManyBody<CanvasNode>()
      .strength((node) => (node.primary ? -140 : -100))
      .distanceMax(420)
  );
  instance.d3Force("link", null);
  instance.d3ReheatSimulation();

  const fitTimer = window.setTimeout(() => {
    if (sizeWidth < 640) {
      instance.centerAt(-240, NODE_TIMELINE_CENTER_Y, 500);
      instance.zoom(0.42, 500);
      return;
    }

    instance.centerAt(-190, NODE_TIMELINE_CENTER_Y, 500);
    instance.zoom(0.58, 500);
  }, 250);
  const settledFitTimer = window.setTimeout(() => {
    instance.zoomToFit(650, sizeWidth < 640 ? 80 : 150);
  }, 1400);

  return () => {
    window.clearTimeout(fitTimer);
    window.clearTimeout(settledFitTimer);
  };
}

export function getChronologyGuideY({
  rank,
  rankSpan,
  lane,
  supportSlot,
}: {
  rank: number;
  rankSpan: number;
  lane: CanvasNode["lane"];
  supportSlot: number;
}) {
  const middle = rankSpan / 2;
  const distanceFromMiddle = rank - middle;
  const stretchedDistance =
    distanceFromMiddle *
    (NODE_RANK_SPACING + Math.abs(distanceFromMiddle) * NODE_RANK_STRETCH);

  return (
    NODE_TIMELINE_CENTER_Y +
    stretchedDistance +
    LANE_Y_OFFSET[lane] +
    supportSlot * SUPPORT_SLOT_SPACING
  );
}

export function createEdgeSideLayouts({
  edges,
  nodeIds,
  baseLayouts,
}: {
  edges: GraphEdge[];
  nodeIds: Set<string>;
  baseLayouts: Map<string, { x: number; y: number }>;
}) {
  const solidSpineNodeIds = new Set<string>();
  const sideLayouts = new Map<string, { x: number; y: number }>();
  const sideSlotsByAnchor = new Map<string, number>();

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }

    if (isSolidSpineEdge(edge)) {
      solidSpineNodeIds.add(edge.source);
      solidSpineNodeIds.add(edge.target);
    }
  }

  for (const edge of edges) {
    if (
      !nodeIds.has(edge.source) ||
      !nodeIds.has(edge.target) ||
      isSolidSpineEdge(edge)
    ) {
      continue;
    }

    const sourceOnSpine = solidSpineNodeIds.has(edge.source);
    const targetOnSpine = solidSpineNodeIds.has(edge.target);
    const anchorId = sourceOnSpine && !targetOnSpine ? edge.source : edge.target;
    const sideNodeId = anchorId === edge.source ? edge.target : edge.source;
    const anchor = baseLayouts.get(anchorId);

    if (!anchor || sideLayouts.has(sideNodeId)) {
      continue;
    }

    const sideSlot = sideSlotsByAnchor.get(anchorId) ?? 0;
    sideSlotsByAnchor.set(anchorId, sideSlot + 1);
    const direction = getSideEdgeDirection(edge);
    const slotOffset =
      sideSlot === 0
        ? 0
        : Math.ceil(sideSlot / 2) *
          SIDE_EDGE_Y_OFFSET *
          (sideSlot % 2 === 0 ? -1 : 1);

    sideLayouts.set(sideNodeId, {
      x: anchor.x + direction * SIDE_EDGE_X_OFFSET,
      y: anchor.y + slotOffset,
    });
  }

  return sideLayouts;
}

function isSolidSpineEdge(edge: GraphEdge) {
  return edge.style !== "dashed" && edge.style !== "dotted" && edge.directional !== false;
}

function getSideEdgeDirection(edge: GraphEdge) {
  if (edge.style === "dotted") {
    return -1;
  }

  return 1;
}

function createTimelineSeparationForce(): Force<CanvasNode, undefined> {
  let nodes: CanvasNode[] = [];

  const force: Force<CanvasNode, undefined> = (alpha) => {
    const sortedNodes = nodes
      .filter((node) => !node.edgeAnchored)
      .sort((left, right) => left.guideY - right.guideY);

    for (let index = 1; index < sortedNodes.length; index += 1) {
      const previous = sortedNodes[index - 1];
      const current = sortedNodes[index];
      const previousY = previous.y ?? previous.guideY;
      const currentY = current.y ?? current.guideY;
      const currentGap = currentY - previousY;
      const minimumGap = Math.max(
        NODE_TIMELINE_MIN_GAP,
        (previous.radius + current.radius) * 1.35
      );

      if (currentGap >= minimumGap) {
        continue;
      }

      const push =
        (minimumGap - currentGap) *
        NODE_TIMELINE_SEPARATION_STRENGTH *
        alpha *
        0.5;

      previous.vy = (previous.vy ?? 0) - push;
      current.vy = (current.vy ?? 0) + push;
    }
  };

  force.initialize = (initializedNodes) => {
    nodes = initializedNodes;
  };

  return force;
}
