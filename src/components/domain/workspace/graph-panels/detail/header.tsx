import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { GraphMarker, GraphNode } from "@/lib/orchestration-graph";
import { KIND_META, STATUS_META } from "../../canvas/constants";
import { renderGraphPanelIcon } from "../preview";

export function GraphDetailHeader({
  node,
  markers,
  onClose,
}: {
  node: GraphNode;
  markers: GraphMarker[];
  onClose: () => void;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 pr-8">
          <NodeHeaderIcon node={node} markers={markers} />
          <h3 className="truncate text-sm font-semibold">
            {node.detail.title}
          </h3>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {node.packetId ?? "No packet"} · {node.chunkId ?? node.id}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close details"
        title="Close details"
        onClick={onClose}
      >
        <X />
      </Button>
    </div>
  );
}

function NodeHeaderIcon({
  node,
  markers,
}: {
  node: GraphNode;
  markers: GraphMarker[];
}) {
  const statusMeta = STATUS_META[node.status];
  const kindMeta = KIND_META[node.kind];
  const headerIcon = getNodeHeaderIcon(node, markers);

  return (
    <Tooltip
      content={`${node.label} is a ${kindMeta.label.toLowerCase()} node with ${statusMeta.label.toLowerCase()} status.`}
      className="shrink-0 rounded-sm"
    >
      {renderGraphPanelIcon(headerIcon, "h-4 w-4 shrink-0 text-muted-foreground")}
    </Tooltip>
  );
}

function getNodeHeaderIcon(node: GraphNode, markers: GraphMarker[]) {
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
