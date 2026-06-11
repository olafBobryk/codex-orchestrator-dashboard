import { TooltipProvider } from "@/components/ui/tooltip";
import type { GraphMarker } from "@/lib/orchestration-graph";
import { getNodeProvenanceFiles } from "../../canvas/graph-adapter";
import {
  DetailBlockCard,
  DetailField,
  DetailSection,
  DetailSummaryTile,
  EntityLinks,
  getDetailBlockDomId,
} from "../shared";
import { GraphDetailHeader } from "./header";
import { MarkerGlyph, MarkerIsland } from "../preview";
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
              {selectedMarker ? (
                <MarkerDetailCard
                  marker={selectedMarker}
                  workspace={workspace}
                  onOpenMarkdownReference={onOpenMarkdownReference}
                />
              ) : null}
            </DetailSection>
          ) : null}

          {node.links.length > 0 ? (
            <DetailSection title="Entity files">
              <EntityLinks
                links={node.links}
                workspace={workspace}
                onOpenMarkdownReference={onOpenMarkdownReference}
              />
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
                    onOpenMarkdownReference={onOpenMarkdownReference}
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

function MarkerDetailCard({
  marker,
  workspace,
  onOpenMarkdownReference,
}: {
  marker: GraphMarker;
  workspace: string;
  onOpenMarkdownReference: GraphDetailOverlayProps["onOpenMarkdownReference"];
}) {
  return (
    <div
      className="mt-2 min-w-0 rounded-md border border-border px-2.5 py-2"
      style={{ borderColor: marker.color }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MarkerGlyph marker={marker} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">
            {marker.label}
          </p>
          {marker.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {marker.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <DetailField label="Loader" value={marker.loader ? "Active" : "Off"} />
        <DetailField label="Muted" value={marker.muted ? "Yes" : "No"} />
      </div>
      <EntityLinks
        className="mt-2"
        links={marker.links}
        workspace={workspace}
        onOpenMarkdownReference={onOpenMarkdownReference}
      />
    </div>
  );
}
