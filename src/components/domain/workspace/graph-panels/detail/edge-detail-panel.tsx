import type { GraphEdgePanelProps } from "../../canvas/types";
import type { GraphDetailLink } from "@/lib/orchestration-graph";
import { DetailField } from "../shared";
import {
  createEdgePanelHeader,
  DetailPanelLayout,
} from "./detail-panel-layout";

export function EdgeDetailPanel({
  edge,
  sourceNode,
  targetNode,
  workspace,
  onOpenMarkdownReference,
  onClose,
}: GraphEdgePanelProps) {
  const detailBlocks = edge.detailBlocks ?? [];
  const links = edge.relativePath
    ? [
        {
          label: edge.relativePath,
          href: "",
          relativePath: edge.relativePath,
          kind: "reference",
        } satisfies GraphDetailLink,
      ]
    : [];

  return (
    <DetailPanelLayout
      panelKind="edge"
      header={createEdgePanelHeader({ edge, sourceNode, targetNode })}
      onClose={onClose}
      links={links}
      detailBlocks={detailBlocks}
      workspace={workspace}
      onOpenMarkdownReference={onOpenMarkdownReference}
      sections={[
        {
          title: "Edge",
          content: (
          <div className="grid grid-cols-2 gap-2">
            <DetailField label="ID" value={edge.id} mono />
            <DetailField label="Type" value={edge.rawType ?? edge.type} />
            <DetailField label="Status" value={edge.status} />
            <DetailField
              label="Direction"
              value={edge.directional === false ? "Non-directional" : "Directional"}
            />
            <DetailField label="Source" value={sourceNode?.label ?? edge.source} />
            <DetailField label="Target" value={targetNode?.label ?? edge.target} />
          </div>
          ),
        },
      ]}
    />
  );
}
