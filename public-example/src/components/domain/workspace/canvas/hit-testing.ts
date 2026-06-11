import type { NodeObject } from "react-force-graph-2d";
import type { GraphMarker } from "@/lib/orchestration-graph";
import {
  getLinkEndpoint,
  getMarkerIslandRect,
  getPointToSegmentDistance,
  getRegionAtScreenPoint,
} from "./drawing";
import type { CanvasLink, CanvasNode, CanvasRegion, GraphMethods } from "./types";

const NODE_HIT_PADDING = 12;
const MARKER_HIT_PADDING = 8;
const EDGE_HIT_DISTANCE = 18;

export type GraphHitResult =
  | {
      type: "marker";
      node: CanvasNode;
      marker: GraphMarker;
    }
  | {
      type: "node";
      node: CanvasNode;
    }
  | {
      type: "edge";
      edge: CanvasLink;
    }
  | {
      type: "region";
      region: CanvasRegion;
    }
  | {
      type: "background";
    };

export function resolveGraphHit({
  nodes,
  links,
  regions,
  graph,
  screenX,
  screenY,
  maxEdgeDistance = EDGE_HIT_DISTANCE,
}: {
  nodes: NodeObject<CanvasNode>[];
  links: CanvasLink[];
  regions: CanvasRegion[];
  graph: GraphMethods | undefined;
  screenX: number;
  screenY: number;
  maxEdgeDistance?: number;
}): GraphHitResult {
  if (!graph) {
    return { type: "background" };
  }

  const point = graph.screen2GraphCoords(screenX, screenY);

  for (const node of [...nodes].reverse()) {
    const marker = getMarkerAtGraphPoint(node, point);

    if (marker) {
      return { type: "marker", node, marker };
    }
  }

  for (const node of [...nodes].reverse()) {
    if (isNodeHitAtGraphPoint(node, point)) {
      return { type: "node", node };
    }
  }

  const edge = getClosestEdgeAtGraphPoint({
    links,
    point,
    maxDistance: maxEdgeDistance,
  });

  if (edge) {
    return { type: "edge", edge };
  }

  const region = getRegionAtScreenPoint({
    regions,
    nodes,
    graph,
    x: screenX,
    y: screenY,
  });

  if (region) {
    return { type: "region", region };
  }

  return { type: "background" };
}

function getClosestEdgeAtGraphPoint({
  links,
  point,
  maxDistance,
}: {
  links: CanvasLink[];
  point: { x: number; y: number };
  maxDistance: number;
}) {
  let closestLink: CanvasLink | null = null;
  let closestDistance = maxDistance;

  for (const link of links) {
    const source = getLinkEndpoint(link.source as unknown);
    const target = getLinkEndpoint(link.target as unknown);

    if (!source || !target) {
      continue;
    }

    const distance = getPointToSegmentDistance(point, source, target);

    if (distance <= closestDistance) {
      closestDistance = distance;
      closestLink = link;
    }
  }

  return closestLink;
}

function getMarkerAtGraphPoint(
  node: NodeObject<CanvasNode>,
  point: { x: number; y: number }
) {
  if (node.markers.length === 0) {
    return null;
  }

  return (
    node.markers.slice(0, 4).find((_, index) => {
      const island = getMarkerIslandRect(node, index);

      return (
        point.x >= island.x - MARKER_HIT_PADDING &&
        point.x <= island.x + island.width + MARKER_HIT_PADDING &&
        point.y >= island.y - MARKER_HIT_PADDING &&
        point.y <= island.y + island.height + MARKER_HIT_PADDING
      );
    }) ?? null
  );
}

function isNodeHitAtGraphPoint(
  node: NodeObject<CanvasNode>,
  point: { x: number; y: number }
) {
  const x = node.x ?? node.guideX ?? 0;
  const y = node.y ?? node.guideY ?? 0;
  const hitRadius = node.visualRadius + NODE_HIT_PADDING;

  return Math.hypot(point.x - x, point.y - y) <= hitRadius;
}
