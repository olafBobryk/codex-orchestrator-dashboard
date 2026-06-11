import { TooltipProvider } from "@/components/ui/tooltip";
import type { GraphRegionPanelProps } from "../../canvas/types";
import {
  DetailBlockCard,
  DetailField,
  DetailSection,
  DetailSummaryTile,
  EntityLinks,
  getDetailBlockDomId,
} from "../shared";
import { GraphRegionHeader } from "./header";

export function RegionDetailPanel({
  region,
  workspace,
  onOpenMarkdownReference,
  onClose,
}: GraphRegionPanelProps) {
  const hasSummary = region.detail.some(
    (block) => block.summary || block.body
  );

  return (
    <TooltipProvider>
      <aside
        data-graph-region-panel
        className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
      >
        <GraphRegionHeader region={region} onClose={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {region.links.length > 0 ? (
            <DetailSection title="Entity files">
              <EntityLinks
                links={region.links}
                workspace={workspace}
                onOpenMarkdownReference={onOpenMarkdownReference}
              />
            </DetailSection>
          ) : null}

          {hasSummary ? (
            <DetailSection title="Summary">
              <div className="grid grid-cols-2 gap-2">
                {region.detail.map((block, index) => (
                  <DetailSummaryTile
                    key={block.id}
                    block={block}
                    index={index}
                  />
                ))}
              </div>
            </DetailSection>
          ) : null}

          {region.detail.length > 0 ? (
            <DetailSection title="Details">
              <div className="grid gap-2">
                {region.detail.map((block) => (
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

          <DetailSection title="Region">
            <div className="grid grid-cols-2 gap-2">
              <DetailField label="ID" value={region.id} mono />
              <DetailField label="Nodes" value={String(region.nodeIds.length)} />
              <DetailField
                label="Child regions"
                value={String(region.regionIds.length)}
              />
              <DetailField label="Category" value={region.category} />
              <DetailField label="Muted" value={region.muted ? "Yes" : "No"} />
            </div>
          </DetailSection>

          {region.regionIds.length > 0 ? (
            <DetailSection title="Child Regions">
              <TokenList values={region.regionIds} />
            </DetailSection>
          ) : null}

          {region.nodeIds.length > 0 ? (
            <DetailSection title="Nodes">
              <TokenList values={region.nodeIds} />
            </DetailSection>
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
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
