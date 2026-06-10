import {
  CheckCircle2,
  ExternalLink,
  FileText,
  GitCommitHorizontal,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  createVsCodeDocHref,
  uniqueRuntimeAnnotations,
  uniqueStrings,
} from "../../canvas/graph-adapter";
import type { NodeSignalPanel } from "../../canvas/types";
import { DetailBlockCard, DetailField, DetailSection } from "../shared";
import { GraphDetailHeader } from "./header";
import { MarkerIsland } from "../preview";
import { NodeSignalSummary } from "./node-signals";
import type { GraphDetailOverlayProps } from "../shared";

export function MarkdownDetailPanel({
  node,
  markers,
  selectedMarker,
  edges,
  relatedNodes,
  workspace,
  onSelectMarker,
  onClose,
}: GraphDetailOverlayProps) {
  const [activeSignalPanel, setActiveSignalPanel] =
    useState<NodeSignalPanel | null>(null);
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

  return (
    <TooltipProvider>
      <aside
        data-graph-detail-panel
        data-graph-detail-source="markdown"
        className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
      >
        <GraphDetailHeader
          node={node}
          markers={[]}
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

        <NodeSignalSummary
          node={node}
          files={files}
          relatedNodes={relatedNodes}
          workspace={workspace}
          runtimeAnnotations={runtimeAnnotations}
          gitAnnotations={gitAnnotations}
          relatedCount={relatedNodes.length}
          runtimeCount={runtimeAnnotations.length}
          gitCount={gitAnnotations.length}
          activePanel={activeSignalPanel}
          onSelectPanel={(panel) =>
            setActiveSignalPanel((currentPanel) =>
              currentPanel === panel ? null : panel
            )
          }
        />

        <DetailSection title="Summary">
          <p className="text-sm leading-6 text-muted-foreground">
            {node.detail.summary ?? "No summary section was found."}
          </p>
        </DetailSection>

        {node.detail.blocks.length > 0 ? (
          <DetailSection title="Details">
            <div className="grid gap-2">
              {node.detail.blocks.map((block) => (
                <DetailBlockCard
                  key={block.id}
                  block={block}
                  workspace={workspace}
                />
              ))}
            </div>
          </DetailSection>
        ) : null}

        {edges.some((edge) => (edge.detailBlocks ?? []).length > 0) ? (
          <DetailSection title="Edge Details">
            <div className="grid gap-2">
              {edges.flatMap((edge) =>
                (edge.detailBlocks ?? []).map((block) => (
                  <DetailBlockCard
                    key={`${edge.id}:${block.id}`}
                    block={{
                      ...block,
                      name: `${edge.label}: ${block.name}`,
                    }}
                    workspace={workspace}
                  />
                ))
              )}
            </div>
          </DetailSection>
        ) : null}

        {node.detail.handoff ? (
          <DetailSection title="Handoff Summary">
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
          </DetailSection>
        ) : null}

        {node.detail.concern ? (
          <DetailSection title="Concern">
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
          </DetailSection>
        ) : null}

        <DetailSection title="Files">
          {files.length > 0 ? (
            <div className="grid gap-2">
              {files.map((relativePath) => (
                <a
                  key={relativePath}
                  href={createVsCodeDocHref(workspace, relativePath)}
                  title="Open Markdown file in VS Code"
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border px-2.5 py-2 text-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono">{relativePath}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No source file recorded.</p>
          )}
        </DetailSection>

        <DetailSection title="Verification">
          {node.detail.verification.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No verification evidence recorded for this item.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Related">
          {relatedNodes.length > 0 ? (
            <div className="grid gap-2">
              {relatedNodes.map((relatedNode) => (
                <div
                  key={relatedNode.id}
                  className="rounded-md border border-border px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline">{relatedNode.kind}</Badge>
                    <span className="truncate text-xs font-medium">
                      {relatedNode.label}
                    </span>
                  </div>
                  {relatedNode.relativePath ? (
                    <a
                      href={createVsCodeDocHref(workspace, relatedNode.relativePath)}
                      className="mt-1 inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate font-mono">
                        {relatedNode.relativePath}
                      </span>
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No related handoff, concern, thread, or file item is recorded.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Runtime">
          {runtimeAnnotations.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No runtime annotation is recorded for this item.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Git / Worktree">
          {gitAnnotations.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">
              No Git or worktree annotation is recorded for this item.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Completeness">
          {node.missing.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {node.missing.map((state) => (
                <Badge key={state} variant="outline">
                  {state}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No missing state recorded for this item.
            </p>
          )}
        </DetailSection>
      </div>
    </aside>
    </TooltipProvider>
  );
}
