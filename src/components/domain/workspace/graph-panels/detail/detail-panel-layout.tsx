import type { ReactNode } from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import type {
  GraphDetailBlock,
  GraphDetailLink,
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphRegion,
} from "@/lib/orchestration-graph";
import { KIND_META, STATUS_META } from "../../canvas/constants";
import type { GraphMarkdownReference } from "../../canvas/types";
import { renderGraphPanelIcon } from "../preview";
import {
  DetailField,
  DetailSection,
  EntityLinks,
  getDetailBlockDomId,
} from "../shared";

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

export function DetailBlockSection({
  block,
  title,
  contentId,
  contentClassName,
  workspace,
  onOpenMarkdownReference,
}: {
  block: GraphDetailBlock;
  title: string;
  contentId?: string;
  contentClassName: string;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
}) {
  return (
    <DetailSection title={title}>
      <div id={contentId} className={contentClassName}>
        {block.summary ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {block.summary}
          </p>
        ) : null}
        {block.body ? (
          <DetailMarkdownBody content={block.body} />
        ) : null}
        <EntityLinks
          className={block.summary || block.body ? "mt-2" : ""}
          links={block.links}
          workspace={workspace}
          onOpenMarkdownReference={onOpenMarkdownReference}
        />
      </div>
    </DetailSection>
  );
}

function DetailMarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-2 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        input: (props) => (
          <input
            {...props}
            className="mr-2 h-3.5 w-3.5 align-[-2px] accent-primary"
            disabled
          />
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            rel="noreferrer"
            target={href?.startsWith("http") ? "_blank" : undefined}
          >
            {children}
          </a>
        ),
        code: ({ children, className }) =>
          className ? (
            <code className={`${className} font-mono text-xs leading-5`}>
              {children}
            </code>
          ) : (
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              {children}
            </code>
          ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-md border border-border bg-muted px-2.5 py-2 text-xs leading-5 text-foreground">
            {children}
          </pre>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="text-foreground">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function createNodePanelHeader({
  node,
  markers,
  closeLabel = "Close details",
}: {
  node: GraphNode;
  markers: GraphMarker[];
  closeLabel?: string;
}): DetailPanelHeader {
  const statusMeta = STATUS_META[node.status];
  const kindMeta = KIND_META[node.kind];

  return {
    title: node.detail.title,
    subtitle: `${node.packetId ?? "No packet"} · ${node.chunkId ?? node.id}`,
    icon: getNodeHeaderIcon(node, markers),
    iconTooltip: `${node.label} is a ${kindMeta.label.toLowerCase()} node with ${statusMeta.label.toLowerCase()} status.`,
    closeLabel,
  };
}

export function createRegionPanelHeader({
  region,
}: {
  region: GraphRegion;
}): DetailPanelHeader {
  return {
    title: region.label,
    subtitle: `${region.category ?? "Uncategorized region"} · ${region.id}`,
    icon: "layers",
    iconTooltip: `${region.label} is a graph region.`,
    closeLabel: "Close region details",
  };
}

export function createEdgePanelHeader({
  edge,
  sourceNode,
  targetNode,
}: {
  edge: GraphEdge;
  sourceNode: GraphNode | null;
  targetNode: GraphNode | null;
}): DetailPanelHeader {
  return {
    title: edge.label,
    subtitle: `${sourceNode?.label ?? edge.source} -> ${
      targetNode?.label ?? edge.target
    }`,
    icon: "route",
    iconTooltip: `${edge.label} is a graph edge.`,
    closeLabel: "Close edge details",
  };
}

export function PanelHeader({
  header,
  action,
}: {
  header: DetailPanelHeader;
  action: DetailPanelHeaderAction;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 pr-8">
          <Tooltip content={header.iconTooltip} className="shrink-0 rounded-sm">
            {renderGraphPanelIcon(
              header.icon,
              "h-4 w-4 shrink-0 text-muted-foreground"
            )}
          </Tooltip>
          <h3 className="truncate text-sm font-semibold">{header.title}</h3>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {header.subtitle}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={action.label}
        title={action.title ?? action.label}
        onClick={action.onClick}
      >
        {action.icon ?? <X />}
      </Button>
    </div>
  );
}

function getNodeHeaderIcon(node: GraphNode, markers: GraphMarker[]) {
  if (node.icon) {
    return node.icon;
  }

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
