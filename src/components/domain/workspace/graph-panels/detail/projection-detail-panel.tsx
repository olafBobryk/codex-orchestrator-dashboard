import { getNodeProvenanceFiles } from "../../canvas/graph-adapter";
import {
  createMarkerSummaryFields,
  createNodePanelHeader,
  DetailPanelLayout,
} from "./detail-panel-layout";
import { ProjectionProvenanceFooter } from "./provenance-footer";
import { ProjectionRelationshipList } from "./relationships";
import type { GraphDetailOverlayProps } from "../shared";

export function ProjectionDetailPanel({
  node,
  markers,
  selectedMarker,
  edges,
  relatedNodes,
  workspace,
  onOpenMarkdownReference,
  onSelectMarker,
  onClose,
}: GraphDetailOverlayProps) {
  const provenanceFiles = getNodeProvenanceFiles(node);

  return (
    <DetailPanelLayout
      panelKind="detail"
      detailSource="projection"
      header={createNodePanelHeader({ node, markers })}
      onClose={onClose}
      links={node.links}
      summaryFields={createMarkerSummaryFields({
        markers,
        selectedMarker,
        onSelectMarker,
      })}
      detailBlocks={node.detail.blocks}
      workspace={workspace}
      onOpenMarkdownReference={onOpenMarkdownReference}
      sections={[
        {
          title: "Relationships",
          hidden: edges.length === 0,
          content: (
            <ProjectionRelationshipList
              node={node}
              edges={edges}
              relatedNodes={relatedNodes}
            />
          ),
        },
      ]}
      footer={
        <ProjectionProvenanceFooter files={provenanceFiles} workspace={workspace} />
      }
    />
  );
}
