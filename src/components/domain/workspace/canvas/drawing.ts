import type { NodeObject } from "react-force-graph-2d";
import type { GraphMarker, GraphNode } from "@/lib/orchestration-graph";
import { DEFAULT_CANVAS_THEME, STATUS_COLORS } from "./constants";
import type { CanvasLink, CanvasNode, CanvasTheme, GraphMethods } from "./types";

export function readCanvasTheme(): CanvasTheme {
  if (typeof window === "undefined") {
    return DEFAULT_CANVAS_THEME;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const cssVar = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    surface: cssVar("--card", DEFAULT_CANVAS_THEME.surface),
    surfaceForeground: cssVar(
      "--card-foreground",
      DEFAULT_CANVAS_THEME.surfaceForeground
    ),
  };
}

export function drawNode({
  node,
  context,
  selected,
  selectedMarkerId,
  theme,
}: {
  node: NodeObject<CanvasNode>;
  context: CanvasRenderingContext2D;
  selected: boolean;
  selectedMarkerId: string | null;
  theme: CanvasTheme;
}) {
  const statusColor = STATUS_COLORS[node.status];
  const strokeColor = node.offSource ? "#64748b" : statusColor.stroke;
  const radius = node.visualRadius;
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const label = getNodeDisplayId(node);

  context.save();
  context.shadowColor = "rgba(15,23,42,0.12)";
  context.shadowBlur = selected ? 16 : 8;
  context.shadowOffsetY = selected ? 5 : 3;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = theme.surface;
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = strokeColor;
  context.lineWidth = 1.5;
  context.stroke();

  drawNodeMarkers({ node, context, radius, selectedMarkerId, theme });

  context.fillStyle = theme.surfaceForeground;
  context.font = `600 ${node.primary ? 15 : 13}px ui-sans-serif, system-ui`;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillText(truncateCanvasText(context, label, radius * 1.65), x, y);
  context.restore();
}

function drawNodeMarkers({
  node,
  context,
  radius,
  selectedMarkerId,
  theme,
}: {
  node: NodeObject<CanvasNode>;
  context: CanvasRenderingContext2D;
  radius: number;
  selectedMarkerId: string | null;
  theme: CanvasTheme;
}) {
  if (node.markers.length === 0) {
    return;
  }

  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const ringGap = 8;

  node.markers.slice(0, 4).forEach((marker, index) => {
    const ringRadius = radius + ringGap + index * 5;
    const island = getMarkerIslandRect(node, index);
    const selected = selectedMarkerId === marker.id;

    context.save();
    context.globalAlpha = marker.muted ? 0.48 : 1;
    context.beginPath();
    context.arc(x, y, ringRadius, 0, Math.PI * 2);
    context.strokeStyle = marker.color;
    context.lineWidth = selected ? 4 : 2.8;
    context.stroke();

    drawRoundedRect(context, island.x, island.y, island.width, island.height, 12);
    context.fillStyle = theme.surface;
    context.fill();
    context.strokeStyle = marker.color;
    context.lineWidth = selected ? 2.5 : 1.5;
    context.stroke();

    drawRoundedRect(context, island.x + 8, island.y + 8, 34, 34, 9);
    context.fillStyle = marker.color;
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 13px ui-sans-serif, system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      getCanvasMarkerIcon(marker),
      island.x + 25,
      island.y + island.height / 2
    );

    context.fillStyle = theme.surfaceForeground;
    context.font = "600 12px ui-sans-serif, system-ui";
    context.textAlign = "left";
    context.fillText(
      truncateCanvasText(context, marker.label, island.width - 54),
      island.x + 50,
      island.y + island.height / 2
    );
    context.restore();
  });
}

export function drawNodePointerArea(
  node: NodeObject<CanvasNode>,
  color: string,
  context: CanvasRenderingContext2D
) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(node.x ?? 0, node.y ?? 0, node.radius + 12, 0, Math.PI * 2);
  context.fill();

  node.markers.slice(0, 4).forEach((_, index) => {
    const island = getMarkerIslandRect(node, index);

    drawRoundedRect(
      context,
      island.x - 4,
      island.y - 4,
      island.width + 8,
      island.height + 8,
      14
    );
    context.fill();
  });
}

export function drawLink(
  link: CanvasLink,
  context: CanvasRenderingContext2D
) {
  const source = getLinkEndpoint(link.source as unknown);
  const target = getLinkEndpoint(link.target as unknown);

  if (!source || !target) {
    return;
  }

  context.save();
  context.beginPath();
  context.moveTo(source.x, source.y);
  context.lineTo(target.x, target.y);
  context.strokeStyle = link.color;
  context.lineWidth = link.width;
  context.setLineDash(link.dash ?? []);
  context.stroke();
  context.restore();
}

export function getClickedNodeMarker({
  node,
  event,
  graph,
}: {
  node: NodeObject<CanvasNode>;
  event: MouseEvent;
  graph: GraphMethods | undefined;
}) {
  if (!graph || node.markers.length === 0) {
    return null;
  }

  const eventWithOffset = event as MouseEvent & {
    offsetX?: number;
    offsetY?: number;
  };
  const offsetX = eventWithOffset.offsetX;
  const offsetY = eventWithOffset.offsetY;

  if (typeof offsetX !== "number" || typeof offsetY !== "number") {
    return null;
  }

  const point = graph.screen2GraphCoords(offsetX, offsetY);

  return (
    node.markers.slice(0, 4).find((_, index) => {
      const island = getMarkerIslandRect(node, index);

      return (
        point.x >= island.x &&
        point.x <= island.x + island.width &&
        point.y >= island.y &&
        point.y <= island.y + island.height
      );
    }) ?? null
  );
}

function getLinkEndpoint(endpoint: unknown): { x: number; y: number } | null {
  if (
    endpoint &&
    typeof endpoint === "object" &&
    "x" in endpoint &&
    "y" in endpoint &&
    typeof endpoint.x === "number" &&
    typeof endpoint.y === "number"
  ) {
    return { x: endpoint.x, y: endpoint.y };
  }

  return null;
}

function getMarkerIslandRect(
  node: Pick<CanvasNode, "x" | "y" | "visualRadius">,
  index: number
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const width = 118;
  const height = 50;
  const gap = 25;

  return {
    x: x + node.visualRadius + gap,
    y: y - height / 2 + index * (height + 8),
    width,
    height,
  };
}

function getCanvasMarkerIcon(marker: GraphMarker) {
  switch (marker.icon) {
    case "archive":
      return "A";
    case "file-json":
      return "{}";
    case "lock":
      return "L";
    case "route":
      return "R";
    default:
      return marker.label.slice(0, 1).toUpperCase();
  }
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function getNodeDisplayId(node: NodeObject<CanvasNode>) {
  return getGraphNodeDisplayId(node);
}

export function getGraphNodeDisplayId(
  node: Pick<GraphNode, "chunkId" | "id" | "kind">
) {
  if (node.chunkId) {
    return node.chunkId;
  }

  if (node.kind === "handoff") {
    return "H";
  }

  if (node.kind === "concern") {
    return "C";
  }

  return node.id.replace(/^[^:]+:/, "");
}

function truncateCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let truncated = value;

  while (
    truncated.length > 1 &&
    context.measureText(`${truncated}...`).width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated.trimEnd()}...`;
}
