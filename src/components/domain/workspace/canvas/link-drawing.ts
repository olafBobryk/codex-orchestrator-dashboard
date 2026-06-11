import { getLinkEndpoint } from "./canvas-geometry";
import type { CanvasLink } from "./types";

const EDGE_HIT_DISTANCE = 18;

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

export function drawLinkPointerArea(
  link: CanvasLink,
  color: string,
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
  context.strokeStyle = color;
  context.lineWidth = Math.max(EDGE_HIT_DISTANCE * 2, link.width + 12);
  context.lineCap = "round";
  context.stroke();
  context.restore();
}
