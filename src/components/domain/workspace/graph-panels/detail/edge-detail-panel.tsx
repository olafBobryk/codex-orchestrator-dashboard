import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GraphEdgePanelProps } from "../../canvas/types";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import {
  DetailBlockCard,
  DetailField,
  DetailSection,
  DetailSummaryTile,
  getDetailBlockDomId,
} from "../shared";

export function EdgeDetailPanel({
  edge,
  sourceNode,
  targetNode,
  workspace,
  onOpenMarkdownReference,
  onClose,
}: GraphEdgePanelProps) {
  const detailBlocks = edge.detailBlocks ?? [];

  return (
    <aside
      data-graph-edge-panel
      className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
    >
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 pr-8">
            <h3 className="truncate text-sm font-semibold">{edge.label}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {sourceNode?.label ?? edge.source}
            {" -> "}
            {targetNode?.label ?? edge.target}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close edge details"
          title="Close edge details"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <DetailSection title="Edge">
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
        </DetailSection>

        {edge.relativePath ? (
          <DetailSection title="Source">
            <EdgeSourceLink
              edge={edge}
              workspace={workspace}
              onOpenMarkdownReference={onOpenMarkdownReference}
            />
          </DetailSection>
        ) : null}

        {detailBlocks.length > 0 ? (
          <DetailSection title="Summary">
            <div className="grid grid-cols-2 gap-2">
              {detailBlocks.map((block, index) => (
                <DetailSummaryTile key={block.id} block={block} index={index} />
              ))}
            </div>
          </DetailSection>
        ) : null}

        {detailBlocks.length > 0 ? (
          <DetailSection title="Details">
            <div className="grid gap-2">
              {detailBlocks.map((block) => (
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
      </div>
    </aside>
  );
}

function EdgeSourceLink({
  edge,
  workspace,
  onOpenMarkdownReference,
}: {
  edge: GraphEdgePanelProps["edge"];
  workspace: string;
  onOpenMarkdownReference: GraphEdgePanelProps["onOpenMarkdownReference"];
}) {
  const relativePath = edge.relativePath;

  if (!relativePath) {
    return null;
  }

  const canOpenMarkdown = relativePath.toLowerCase().endsWith(".md");
  const children = (
    <>
      <span className="min-w-0 truncate font-mono">{relativePath}</span>
      <Badge variant="outline" className="shrink-0">
        Source
      </Badge>
    </>
  );

  if (canOpenMarkdown) {
    return (
      <button
        type="button"
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        onClick={() =>
          onOpenMarkdownReference({
            label: edge.label,
            relativePath,
          })
        }
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={createVsCodeDocHref(workspace, relativePath)}
      className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </a>
  );
}
