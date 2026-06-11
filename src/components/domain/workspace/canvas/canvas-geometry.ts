import type { CanvasNode } from "./types";

export type LinkEndpoint = {
  x: number;
  y: number;
  hitRadius: number;
};

export function drawRoundedRect(
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

export function getLinkEndpoint(endpoint: unknown): LinkEndpoint | null {
  if (
    endpoint &&
    typeof endpoint === "object" &&
    "x" in endpoint &&
    "y" in endpoint &&
    typeof endpoint.x === "number" &&
    typeof endpoint.y === "number"
  ) {
    return {
      x: endpoint.x,
      y: endpoint.y,
      hitRadius: readEndpointHitRadius(endpoint),
    };
  }

  return null;
}

export function getLinkEndpointId(endpoint: unknown) {
  if (typeof endpoint === "string") {
    return endpoint;
  }

  if (
    endpoint &&
    typeof endpoint === "object" &&
    "id" in endpoint &&
    typeof endpoint.id === "string"
  ) {
    return endpoint.id;
  }

  return null;
}

export function getMarkerIslandRect(
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

export function getPointToSegmentDistance(
  point: { x: number; y: number },
  source: { x: number; y: number },
  target: { x: number; y: number }
) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - source.x, point.y - source.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - source.x) * dx + (point.y - source.y) * dy) / lengthSquared
    )
  );
  const projectedX = source.x + t * dx;
  const projectedY = source.y + t * dy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function readEndpointHitRadius(endpoint: object) {
  if (
    "radius" in endpoint &&
    typeof endpoint.radius === "number" &&
    Number.isFinite(endpoint.radius)
  ) {
    return Math.max(0, endpoint.radius);
  }

  if (
    "visualRadius" in endpoint &&
    typeof endpoint.visualRadius === "number" &&
    Number.isFinite(endpoint.visualRadius)
  ) {
    return Math.max(0, endpoint.visualRadius);
  }

  return 0;
}
