import type { ReactNode } from "react";
import { X } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
  GraphDetailBlock,
  GraphDetailLink,
  GraphMarker,
} from "@/lib/orchestration-graph";
import type { GraphMarkdownReference } from "../../canvas/types";
import {
  DetailField,
  DetailSection,
  EntityLinks,
  getDetailBlockDomId,
} from "../shared";
import { DetailBlockSection } from "./detail-block-section";
import { PanelHeader } from "./detail-panel-headers";

export {
  createEdgePanelHeader,
  createNodePanelHeader,
  createRegionPanelHeader,
  PanelHeader,
} from "./detail-panel-headers";
export { DetailBlockSection } from "./detail-block-section";

export type DetailPanelSection = {
  title: string;
  content: ReactNode;
  hidden?: boolean;
};

export type DetailPanelHeader = {
  title: string;
  subtitle: string;
  icon: string | null;
  iconTooltip: string;
  closeLabel: string;
};

export type DetailPanelHeaderAction = {
  label: string;
  title?: string;
  icon?: ReactNode;
  onClick: () => void;
};

export type DetailPanelSummaryField = {
  id: string;
  label: string;
  value: number | string | null;
  color?: string | null;
  icon?: string | null;
  className?: string;
  selected?: boolean;
  showExternalIcon?: boolean;
  onClick?: () => void;
};

export function DetailPanelLayout({
  panelKind,
  detailSource,
  header,
  headerAction,
  onClose,
  links = [],
  summaryFields = [],
  detailBlocks = [],
  sections = [],
  afterEntityFiles,
  afterDetails,
  footer,
  workspace,
  onOpenMarkdownReference,
}: {
  panelKind: "detail" | "edge" | "marker" | "region";
  detailSource?: "markdown" | "projection";
  header: DetailPanelHeader;
  headerAction?: DetailPanelHeaderAction;
  onClose: () => void;
  links?: GraphDetailLink[];
  summaryFields?: DetailPanelSummaryField[];
  detailBlocks?: GraphDetailBlock[];
  sections?: DetailPanelSection[];
  afterEntityFiles?: ReactNode;
  afterDetails?: ReactNode;
  footer?: ReactNode;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
}) {
  const detailSummaryItems = [
    ...summaryFields,
    ...createDetailSummaryItems(detailBlocks),
  ];

  return (
    <TooltipProvider>
      <aside
        data-graph-detail-panel={panelKind === "detail" ? true : undefined}
        data-graph-detail-source={detailSource}
        data-graph-edge-panel={panelKind === "edge" ? true : undefined}
        data-graph-marker-panel={panelKind === "marker" ? true : undefined}
        data-graph-region-panel={panelKind === "region" ? true : undefined}
        className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
      >
        <PanelHeader
          header={header}
          action={
            headerAction ?? {
              label: header.closeLabel,
              icon: <X />,
              onClick: onClose,
            }
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {detailSummaryItems.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {detailSummaryItems.map((item) => (
                <DetailField
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  color={item.color}
                  icon={item.icon}
                  className={item.className}
                  selected={item.selected}
                  showExternalIcon={item.showExternalIcon}
                  onClick={item.onClick}
                />
              ))}
            </div>
          ) : null}

          {afterEntityFiles}

          {detailBlocks.map((block) => (
            <DetailBlockSection
              key={block.id}
              block={block}
              title={block.name}
              contentId={getDetailBlockDomId(block)}
              contentClassName="scroll-mt-3 min-w-0"
              workspace={workspace}
              onOpenMarkdownReference={onOpenMarkdownReference}
            />
          ))}

          {afterDetails}

          {sections.map((section) =>
            section.hidden ? null : (
              <DetailSection key={section.title} title={section.title}>
                {section.content}
              </DetailSection>
            )
          )}

          {links.length > 0 ? (
            <DetailSection title="Entity files">
              <EntityLinks
                links={links}
                workspace={workspace}
                onOpenMarkdownReference={onOpenMarkdownReference}
              />
            </DetailSection>
          ) : null}
        </div>

        {footer}
      </aside>
    </TooltipProvider>
  );
}

function createDetailSummaryItems(
  detailBlocks: GraphDetailBlock[]
): DetailPanelSummaryField[] {
  return detailBlocks.map((block) => ({
    id: block.id,
    label: block.name,
    value: summarizeDetailBlock(block),
    color: block.color,
    icon: block.icon,
  }));
}

function summarizeDetailBlock(block: GraphDetailBlock) {
  if (block.summary) {
    return block.summary;
  }

  if (block.links.length > 0) {
    return `${block.links.length} linked ${
      block.links.length === 1 ? "file" : "files"
    }`;
  }

  return "Recorded";
}

export function createMarkerSummaryFields({
  markers,
  selectedMarker,
  onSelectMarker,
}: {
  markers: GraphMarker[];
  selectedMarker: GraphMarker | null;
  onSelectMarker: (markerId: string) => void;
}): DetailPanelSummaryField[] {
  return markers.map((marker) => ({
    id: `marker:${marker.id}`,
    label: marker.label,
    value: "Agent marker",
    color: marker.color,
    icon: marker.icon,
    className: "col-span-2",
    selected: marker.id === selectedMarker?.id,
    showExternalIcon: true,
    onClick: () => onSelectMarker(marker.id),
  }));
}
