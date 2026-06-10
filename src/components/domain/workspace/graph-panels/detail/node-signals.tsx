import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { GraphNode } from "@/lib/orchestration-graph";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import { SignalTile } from "../shared";
import type { NodeSignalPanel } from "../../canvas/types";

export function NodeSignalSummary({
  node,
  files,
  relatedNodes,
  workspace,
  runtimeAnnotations,
  gitAnnotations,
  relatedCount,
  runtimeCount,
  gitCount,
  activePanel,
  onSelectPanel,
}: {
  node: GraphNode;
  files: string[];
  relatedNodes: GraphNode[];
  workspace: string;
  runtimeAnnotations: GraphNode["detail"]["runtimeThreads"];
  gitAnnotations: GraphNode["detail"]["gitWorktree"];
  relatedCount: number;
  runtimeCount: number;
  gitCount: number;
  activePanel: NodeSignalPanel | null;
  onSelectPanel: (panel: NodeSignalPanel) => void;
}) {
  const missingMeta =
    node.missing.length > 0
      ? {
          label: String(node.missing.length),
          color: "#d97706",
          tooltip: `${node.missing.length} missing state marker${
            node.missing.length === 1 ? "" : "s"
          }: ${node.missing.join(", ")}`,
        }
      : {
          label: "0",
          color: "#16a34a",
          tooltip: "No missing state is recorded for this node.",
        };

  const verifiedCount = node.detail.verification.filter(
    (item) => item.result === "verified" || item.result === "complete"
  ).length;

  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2 [grid-auto-rows:minmax(64px,1fr)]">
        <SignalTile
          icon={FileText}
          label="Files"
          value={files.length}
          color="#2563eb"
          tooltip={`${files.length} source file${files.length === 1 ? "" : "s"} recorded for this node.`}
          active={activePanel === "files"}
          onSelect={() => onSelectPanel("files")}
        />
        <SignalTile
          icon={ShieldCheck}
          label="Checks"
          value={`${verifiedCount}/${node.detail.verification.length}`}
          color="#16a34a"
          tooltip="Verified checks compared with all recorded verification evidence."
          active={activePanel === "verification"}
          onSelect={() => onSelectPanel("verification")}
        />
        <SignalTile
          icon={GitCommitHorizontal}
          label="Git"
          value={gitCount}
          color="#64748b"
          tooltip={`${gitCount} Git or worktree annotation${gitCount === 1 ? "" : "s"} attached to this node.`}
          active={activePanel === "git"}
          onSelect={() => onSelectPanel("git")}
        />
        <SignalTile
          icon={Radio}
          label="Runtime"
          value={runtimeCount}
          color="#0891b2"
          tooltip={`${runtimeCount} live or recorded Codex runtime annotation${runtimeCount === 1 ? "" : "s"} connected to this node.`}
          active={activePanel === "runtime"}
          onSelect={() => onSelectPanel("runtime")}
        />
        <SignalTile
          icon={GitBranch}
          label="Related"
          value={relatedCount}
          color="#7c3aed"
          tooltip={`${relatedCount} graph neighbor${relatedCount === 1 ? "" : "s"} connected by normalized edges.`}
          active={activePanel === "related"}
          onSelect={() => onSelectPanel("related")}
        />
        <SignalTile
          icon={AlertTriangle}
          label="Missing"
          value={missingMeta.label}
          color={missingMeta.color}
          tooltip={missingMeta.tooltip}
          active={activePanel === "missing"}
          onSelect={() => onSelectPanel("missing")}
        />
      </div>

      {activePanel ? (
        <NodeSignalDrilldown
          panel={activePanel}
          node={node}
          files={files}
          relatedNodes={relatedNodes}
          workspace={workspace}
          runtimeAnnotations={runtimeAnnotations}
          gitAnnotations={gitAnnotations}
        />
      ) : null}
    </div>
  );
}

function NodeSignalDrilldown({
  panel,
  node,
  files,
  relatedNodes,
  workspace,
  runtimeAnnotations,
  gitAnnotations,
}: {
  panel: NodeSignalPanel;
  node: GraphNode;
  files: string[];
  relatedNodes: GraphNode[];
  workspace: string;
  runtimeAnnotations: GraphNode["detail"]["runtimeThreads"];
  gitAnnotations: GraphNode["detail"]["gitWorktree"];
}) {
  const title = {
    files: "Files",
    verification: "Checks",
    git: "Git / Worktree",
    runtime: "Runtime",
    related: "Related",
    missing: "Missing State",
  }[panel];

  return (
    <div
      data-node-signal-panel={panel}
      className="mt-2 rounded-md border border-border bg-background/60 p-2"
    >
      <h4 className="mb-2 text-sm font-medium text-foreground">{title}</h4>
      {panel === "files" ? (
        <CompactFileList files={files} workspace={workspace} />
      ) : null}
      {panel === "verification" ? (
        <CompactVerificationList items={node.detail.verification} />
      ) : null}
      {panel === "git" ? <CompactGitList annotations={gitAnnotations} /> : null}
      {panel === "runtime" ? (
        <CompactRuntimeList annotations={runtimeAnnotations} />
      ) : null}
      {panel === "related" ? (
        <CompactRelatedList relatedNodes={relatedNodes} workspace={workspace} />
      ) : null}
      {panel === "missing" ? <CompactMissingList missing={node.missing} /> : null}
    </div>
  );
}

function CompactFileList({
  files,
  workspace,
}: {
  files: string[];
  workspace: string;
}) {
  if (files.length === 0) {
    return <EmptySignalPanel>No source files recorded.</EmptySignalPanel>;
  }

  return (
    <div className="grid gap-1.5">
      {files.slice(0, 4).map((relativePath) => (
        <a
          key={relativePath}
          href={createVsCodeDocHref(workspace, relativePath)}
          className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono">{relativePath}</span>
          <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

function CompactVerificationList({
  items,
}: {
  items: GraphNode["detail"]["verification"];
}) {
  if (items.length === 0) {
    return <EmptySignalPanel>No verification evidence recorded.</EmptySignalPanel>;
  }

  return (
    <div className="grid gap-1.5">
      {items.slice(0, 4).map((item) => (
        <div
          key={`${item.relativePath}:${item.commandOrCheck}`}
          className="min-w-0 rounded-md border border-border px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span className="truncate">{item.commandOrCheck}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {item.result}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactGitList({
  annotations,
}: {
  annotations: GraphNode["detail"]["gitWorktree"];
}) {
  if (annotations.length === 0) {
    return <EmptySignalPanel>No Git or worktree annotation.</EmptySignalPanel>;
  }

  return (
    <div className="grid gap-1.5">
      {annotations.slice(0, 4).map((annotation) => (
        <div
          key={`${annotation.kind}:${annotation.ref}:${annotation.path}`}
          className="min-w-0 rounded-md border border-border px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{annotation.label}</span>
          </div>
          {annotation.path ? (
            <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
              {annotation.path}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CompactRuntimeList({
  annotations,
}: {
  annotations: GraphNode["detail"]["runtimeThreads"];
}) {
  if (annotations.length === 0) {
    return <EmptySignalPanel>No runtime annotation recorded.</EmptySignalPanel>;
  }

  return (
    <div className="grid gap-1.5">
      {annotations.slice(0, 4).map((thread) => (
        <div
          key={thread.threadId}
          className="min-w-0 rounded-md border border-border px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Radio className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
            <span className="truncate">{thread.title ?? "Codex thread"}</span>
            <span className="ml-auto shrink-0 text-muted-foreground">
              {thread.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactRelatedList({
  relatedNodes,
  workspace,
}: {
  relatedNodes: GraphNode[];
  workspace: string;
}) {
  if (relatedNodes.length === 0) {
    return <EmptySignalPanel>No related graph nodes.</EmptySignalPanel>;
  }

  return (
    <div className="grid gap-1.5">
      {relatedNodes.slice(0, 4).map((relatedNode) => (
        <div
          key={relatedNode.id}
          className="min-w-0 rounded-md border border-border px-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px]">
              {relatedNode.kind}
            </span>
            <span className="truncate">{relatedNode.label}</span>
          </div>
          {relatedNode.relativePath ? (
            <a
              href={createVsCodeDocHref(workspace, relatedNode.relativePath)}
              className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground hover:underline"
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
  );
}

function CompactMissingList({ missing }: { missing: GraphNode["missing"] }) {
  if (missing.length === 0) {
    return <EmptySignalPanel>No missing state recorded.</EmptySignalPanel>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {missing.map((state) => (
        <span
          key={state}
          className="rounded-md border border-amber-500/70 bg-amber-500/15 px-2 py-1 text-xs text-amber-300"
        >
          {state}
        </span>
      ))}
    </div>
  );
}

function EmptySignalPanel({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
