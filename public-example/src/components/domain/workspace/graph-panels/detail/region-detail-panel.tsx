import { ExternalLink } from "lucide-react";
import type { GraphRegionPanelProps } from "../../canvas/types";
import {
  createRegionPanelHeader,
  DetailPanelLayout,
} from "./detail-panel-layout";

export function RegionDetailPanel({
  region,
  workspace,
  onOpenMarkdownReference,
  onSelectNode,
  onClose,
}: GraphRegionPanelProps) {
  return (
    <DetailPanelLayout
      panelKind="region"
      header={createRegionPanelHeader({ region })}
      onClose={onClose}
      links={region.links}
      detailBlocks={region.detail}
      workspace={workspace}
      onOpenMarkdownReference={onOpenMarkdownReference}
      sections={[
        {
          title: "Child Regions",
          hidden: region.regionIds.length === 0,
          content: <TokenList values={region.regionIds} />,
        },
        {
          title: "Nodes",
          hidden: region.nodeIds.length === 0,
          content: (
            <NodeActionList
              nodeIds={region.nodeIds}
              onSelectNode={onSelectNode}
            />
          ),
        },
      ]}
    />
  );
}

function NodeActionList({
  nodeIds,
  onSelectNode,
}: {
  nodeIds: string[];
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {nodeIds.map((nodeId) => (
        <button
          key={nodeId}
          type="button"
          className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => onSelectNode(nodeId)}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-mono">{nodeId}</span>
        </button>
      ))}
    </div>
  );
}

function TokenList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="max-w-full truncate rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
        >
          {value}
        </span>
      ))}
    </div>
  );
}
