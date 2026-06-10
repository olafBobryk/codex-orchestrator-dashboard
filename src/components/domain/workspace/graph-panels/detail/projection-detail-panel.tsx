import { TooltipProvider } from "@/components/ui/tooltip";
import type { GraphDetailBlock } from "@/lib/orchestration-graph";
import { getNodeProvenanceFiles } from "../../canvas/graph-adapter";
import { DetailBlockCard, DetailSection } from "../shared";
import { GraphDetailHeader } from "./header";
import { GraphPanelPreviewContent, MarkerIsland } from "../preview";
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
  onSelectMarker,
  onClose,
}: GraphDetailOverlayProps) {
  const provenanceFiles = getNodeProvenanceFiles(node);

  return (
    <TooltipProvider>
      <aside
        data-graph-detail-panel
        data-graph-detail-source="projection"
        className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
      >
        <GraphDetailHeader
          node={node}
          markers={markers}
          onClose={onClose}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {markers.length > 0 ? (
            <DetailSection title="Markers">
              <div className="grid gap-2">
                {markers.map((marker) => (
                  <MarkerIsland
                    key={marker.id}
                    marker={marker}
                    selected={marker.id === selectedMarker?.id}
                    onSelect={() =>
                      onSelectMarker(
                        marker.id === selectedMarker?.id ? null : marker.id
                      )
                    }
                  />
                ))}
              </div>
            </DetailSection>
          ) : null}

          {node.detail.summary || node.detail.blocks.length > 0 ? (
            <DetailSection title="Summary">
              {node.detail.summary ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {node.detail.summary}
                </p>
              ) : null}
              {node.detail.blocks.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {node.detail.blocks.map((block, index) => (
                    <DetailSummaryTile
                      key={block.id}
                      block={block}
                      index={index}
                    />
                  ))}
                </div>
              ) : null}
            </DetailSection>
          ) : null}

          {node.detail.blocks.length > 0 ? (
            <DetailSection title="Details">
              <div className="grid gap-2">
                {node.detail.blocks.map((block) => (
                  <DetailBlockCard
                    key={block.id}
                    block={block}
                    workspace={workspace}
                    domId={getDetailBlockDomId(block)}
                  />
                ))}
              </div>
            </DetailSection>
          ) : null}

          {edges.length > 0 ? (
            <DetailSection title="Relationships">
              <ProjectionRelationshipList
                node={node}
                edges={edges}
                relatedNodes={relatedNodes}
              />
            </DetailSection>
          ) : null}
        </div>

        <ProjectionProvenanceFooter files={provenanceFiles} workspace={workspace} />
      </aside>
    </TooltipProvider>
  );
}

function DetailSummaryTile({
  block,
  index,
}: {
  block: GraphDetailBlock;
  index: number;
}) {
  const color = block.color ?? "#64748b";
  const href = `#${getDetailBlockDomId(block)}`;
  const stat = block.summary ?? String(index + 1);

  return (
    <a
      href={href}
      className="block min-w-0 rounded-md border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      style={{ borderColor: color }}
    >
      <GraphPanelPreviewContent
        icon={block.icon}
        color={color}
        primary={stat}
        secondary={block.name}
        primaryIsStat
      />
    </a>
  );
}

function getDetailBlockDomId(block: Pick<GraphDetailBlock, "id">) {
  return `graph-detail-block-${block.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
