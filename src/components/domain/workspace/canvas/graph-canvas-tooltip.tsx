import { motion } from "motion/react";
import type { GraphHitResult } from "./hit-testing";

export type HoveredGraphTooltip = {
  target: Exclude<GraphHitResult, { type: "background" }>;
  x: number;
  y: number;
};

export function GraphHitTooltip({ tooltip }: { tooltip: HoveredGraphTooltip }) {
  const content = formatGraphHitTooltip(tooltip.target);

  return (
    <motion.div
      key={content.key}
      data-graph-tooltip={tooltip.target.type}
      className="pointer-events-none absolute z-30 max-w-[260px]"
      style={{ left: tooltip.x, top: tooltip.y }}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -3 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md border border-border/80 bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/10 backdrop-blur">
        <div className="max-w-[220px] truncate font-medium capitalize leading-snug">
          {content.label}
        </div>
        <div className="mt-1 text-[11px] capitalize leading-none text-muted-foreground">
          {content.detail}
        </div>
        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border/80 bg-popover/95" />
      </div>
    </motion.div>
  );
}

function formatGraphHitTooltip(
  target: Exclude<GraphHitResult, { type: "background" }>
) {
  if (target.type === "marker") {
    return {
      key: `marker:${target.marker.id}`,
      label: target.marker.label,
      detail: "Marker details",
    };
  }

  if (target.type === "node") {
    return {
      key: `node:${target.node.id}`,
      label: target.node.label,
      detail: "Node details",
    };
  }

  if (target.type === "edge") {
    return {
      key: `edge:${target.edge.id}`,
      label: target.edge.label,
      detail: "Edge details",
    };
  }

  return {
    key: `region:${target.region.id}`,
    label: target.region.label,
    detail: "Shape details",
  };
}
