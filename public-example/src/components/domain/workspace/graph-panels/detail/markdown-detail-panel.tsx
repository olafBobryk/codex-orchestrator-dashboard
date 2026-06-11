import { CheckCircle2, GitCommitHorizontal, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GraphDetailLink } from "@/lib/orchestration-graph";
import {
  uniqueRuntimeAnnotations,
  uniqueStrings,
} from "../../canvas/graph-adapter";
import { DetailField, EntityLinks } from "../shared";
import {
  createMarkerSummaryFields,
  createNodePanelHeader,
  DetailBlockSection,
  DetailPanelLayout,
} from "./detail-panel-layout";
import type { GraphDetailOverlayProps } from "../shared";

export function MarkdownDetailPanel({
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
  const files = uniqueStrings([
    ...node.detail.files,
    ...node.sources.flatMap((source) =>
      source.relativePath ? [source.relativePath] : []
    ),
  ]);
  const runtimeAnnotations = uniqueRuntimeAnnotations([
    ...node.detail.runtimeThreads,
    ...relatedNodes.flatMap((relatedNode) => relatedNode.detail.runtimeThreads),
  ]);
  const gitAnnotations = node.detail.gitWorktree;
  const fileLinks = files.map(
    (relativePath) =>
      ({
        label: relativePath,
        href: "",
        relativePath,
        kind: "reference",
      }) satisfies GraphDetailLink
  );
  const entityLinks = [
    ...node.links,
    ...fileLinks.filter(
      (fileLink) =>
        !node.links.some((link) => link.relativePath === fileLink.relativePath)
    ),
  ];
  const relatedLinks = relatedNodes.flatMap(createRelatedNodeLinks);

  return (
    <DetailPanelLayout
      panelKind="detail"
      detailSource="markdown"
      header={createNodePanelHeader({ node, markers })}
      onClose={onClose}
      links={entityLinks}
      summaryFields={createMarkerSummaryFields({
        markers,
        selectedMarker,
        onSelectMarker,
      })}
      detailBlocks={node.detail.blocks}
      workspace={workspace}
      onOpenMarkdownReference={onOpenMarkdownReference}
      afterDetails={
        edges.some((edge) => (edge.detailBlocks ?? []).length > 0) ? (
          <>
            {edges.flatMap((edge) =>
              (edge.detailBlocks ?? []).map((block) => (
                <DetailBlockSection
                  key={`${edge.id}:${block.id}`}
                  block={block}
                  title={`${edge.label}: ${block.name}`}
                  contentClassName="min-w-0"
                  workspace={workspace}
                  onOpenMarkdownReference={onOpenMarkdownReference}
                />
              ))
            )}
          </>
        ) : null
      }
      sections={[
        {
          title: "Handoff Summary",
          hidden: !node.detail.handoff,
          content: node.detail.handoff ? (
            <div className="grid gap-2">
              <DetailField label="Packet" value={node.detail.handoff.packet} />
              <DetailField label="Chunk" value={node.detail.handoff.chunk} />
              <DetailField
                label="Source thread"
                value={node.detail.handoff.sourceThread}
                mono
              />
              <DetailField label="Worktree" value={node.detail.handoff.worktree} mono />
              <DetailField
                label="Returned to"
                value={node.detail.handoff.returnedTo}
              />
              <DetailField
                label="Review link"
                value={node.detail.handoff.reviewLink}
              />
            </div>
          ) : null,
        },
        {
          title: "Concern",
          hidden: !node.detail.concern,
          content: node.detail.concern ? (
            <div className="grid gap-2">
              <DetailField label="Concern" value={node.detail.concern.concern} />
              <DetailField
                label="Why it matters"
                value={node.detail.concern.whyItMatters}
              />
              <DetailField label="Affected" value={node.detail.concern.affected} />
              <DetailField
                label="Recommended default"
                value={node.detail.concern.recommendedDefault}
              />
              <DetailField
                label="Needs human"
                value={node.detail.concern.needsHuman}
              />
            </div>
          ) : null,
        },
        {
          title: "Verification",
          hidden: node.detail.verification.length === 0,
          content: (
            <div className="grid gap-2">
              {node.detail.verification.map((item) => (
                <div
                  key={`${item.relativePath}:${item.commandOrCheck}`}
                  className="min-w-0 overflow-hidden rounded-md border border-border px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{item.commandOrCheck}</span>
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {item.result}
                    </Badge>
                  </div>
                  {item.evidence ? (
                    <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                      {item.evidence}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ),
        },
        {
          title: "Related",
          hidden: relatedLinks.length === 0,
          content: (
            <EntityLinks
              links={relatedLinks}
              workspace={workspace}
              onOpenMarkdownReference={onOpenMarkdownReference}
            />
          ),
        },
        {
          title: "Runtime",
          hidden: runtimeAnnotations.length === 0,
          content: (
            <div className="grid gap-2">
              {runtimeAnnotations.map((thread) => (
                <div
                  key={thread.threadId}
                  className="rounded-md border border-border px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <Radio className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{thread.title ?? "Codex thread"}</span>
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {thread.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    {thread.threadId}
                  </p>
                </div>
              ))}
            </div>
          ),
        },
        {
          title: "Git / Worktree",
          hidden: gitAnnotations.length === 0,
          content: (
            <div className="grid gap-2">
              {gitAnnotations.map((annotation) => (
                <div
                  key={`${annotation.kind}:${annotation.ref}:${annotation.path}`}
                  className="rounded-md border border-border px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{annotation.label}</span>
                    <Badge variant="outline" className="ml-auto shrink-0">
                      {annotation.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {annotation.path ? (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {annotation.path}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ),
        },
        {
          title: "Completeness",
          hidden: node.missing.length === 0,
          content: (
            <div className="flex flex-wrap gap-1.5">
              {node.missing.map((state) => (
                <Badge key={state} variant="outline">
                  {state}
                </Badge>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

function createRelatedNodeLinks(
  relatedNode: GraphDetailOverlayProps["relatedNodes"][number]
): GraphDetailLink[] {
  if (!relatedNode.relativePath) {
    return [];
  }

  return [
    {
      label: relatedNode.label,
      href: "",
      relativePath: relatedNode.relativePath,
      kind: "reference",
    },
  ];
}
