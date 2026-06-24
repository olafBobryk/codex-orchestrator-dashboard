import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphRegion,
} from "@/lib/graph/orchestration-graph";
import { KIND_META, STATUS_META } from "../../canvas/constants";
import { renderGraphPanelIcon } from "../preview";
import type { DetailPanelHeader, DetailPanelHeaderAction } from "./detail-panel-layout";

export function createNodePanelHeader({
  node,
  markers,
  closeLabel = "Close details",
}: {
  node: GraphNode;
  markers: GraphMarker[];
  closeLabel?: string;
}): DetailPanelHeader {
  const statusMeta = STATUS_META[node.status];
  const kindMeta = KIND_META[node.kind];

  return {
    title: node.detail.title,
    subtitle: `${node.packetId ?? "No packet"} · ${node.chunkId ?? node.id}`,
    icon: getNodeHeaderIcon(node, markers),
    iconTooltip: `${node.label} is a ${kindMeta.label.toLowerCase()} node with ${statusMeta.label.toLowerCase()} status.`,
    closeLabel,
  };
}

export function createRegionPanelHeader({
  region,
}: {
  region: GraphRegion;
}): DetailPanelHeader {
  return {
    title: region.label,
    subtitle: `${region.category ?? "Uncategorized region"} · ${region.id}`,
    icon: "layers",
    iconTooltip: `${region.label} is a graph region.`,
    closeLabel: "Close region details",
  };
}

export function createEdgePanelHeader({
  edge,
  sourceNode,
  targetNode,
}: {
  edge: GraphEdge;
  sourceNode: GraphNode | null;
  targetNode: GraphNode | null;
}): DetailPanelHeader {
  return {
    title: edge.label,
    subtitle: `${sourceNode?.label ?? edge.source} -> ${
      targetNode?.label ?? edge.target
    }`,
    icon: "route",
    iconTooltip: `${edge.label} is a graph edge.`,
    closeLabel: "Close edge details",
  };
}

export function PanelHeader({
  header,
  action,
}: {
  header: DetailPanelHeader;
  action: DetailPanelHeaderAction;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 pr-8">
          <Tooltip content={header.iconTooltip} className="shrink-0 rounded-sm">
            {renderGraphPanelIcon(
              header.icon,
              "h-4 w-4 shrink-0 text-muted-foreground"
            )}
          </Tooltip>
          <h3 className="truncate text-sm font-semibold">{header.title}</h3>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {header.subtitle}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={action.label}
        title={action.title ?? action.label}
        onClick={action.onClick}
      >
        {action.icon ?? <X />}
      </Button>
    </div>
  );
}

function getNodeHeaderIcon(node: GraphNode, markers: GraphMarker[]) {
  if (node.icon) {
    return node.icon;
  }

  if (node.detail.blocks[0]?.icon) {
    return node.detail.blocks[0].icon;
  }

  if (markers[0]?.icon) {
    return markers[0].icon;
  }

  switch (node.kind) {
    case "concern":
      return "lock";
    case "handoff":
      return "split";
    case "thread":
      return "route";
    case "checkpoint":
      return "layers";
    default:
      return null;
  }
}
