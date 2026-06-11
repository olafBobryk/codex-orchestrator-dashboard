import { X } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { GraphRegionPanelProps } from "../../canvas/types";
import {
  DetailBlockCard,
  DetailField,
  DetailSection,
  EntityLinks,
} from "../shared";

export function RegionDetailPanel({
  region,
  workspace,
  onOpenMarkdownReference,
  onClose,
}: GraphRegionPanelProps) {
  return (
    <TooltipProvider>
      <aside
        data-graph-region-panel
        className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
      >
        <div
          className="border-b border-border px-3 py-3"
          style={{ borderTop: `3px solid ${region.color}` }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-1 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: region.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {region.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {region.category ?? "Uncategorized region"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close region details"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
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

          {region.links.length > 0 ? (
            <DetailSection title="Entity files">
              <EntityLinks
                links={region.links}
                workspace={workspace}
                onOpenMarkdownReference={onOpenMarkdownReference}
              />
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
                    onOpenMarkdownReference={onOpenMarkdownReference}
                  />
                ))}
              </div>
            </DetailSection>
          ) : null}

          {region.regionIds.length > 0 ? (
            <DetailSection title="Child Regions">
              <div className="flex flex-wrap gap-1.5">
                {region.regionIds.map((regionId) => (
                  <span
                    key={regionId}
                    className="max-w-full truncate rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {regionId}
                  </span>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {region.nodeIds.length > 0 ? (
            <DetailSection title="Nodes">
              <div className="flex flex-wrap gap-1.5">
                {region.nodeIds.map((nodeId) => (
                  <span
                    key={nodeId}
                    className="max-w-full truncate rounded-md border border-border px-2 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {nodeId}
                  </span>
                ))}
              </div>
            </DetailSection>
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}
