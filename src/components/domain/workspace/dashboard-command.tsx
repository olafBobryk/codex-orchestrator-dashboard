"use client";

import {
  Archive,
  CircleDot,
  FileText,
  FolderOpen,
  Home,
  Layers3,
  LinkIcon,
  Map,
  Search,
  Shapes,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  filterDashboardSurfaceResults,
  getDashboardSurfaceAncestryLabel,
  type DashboardSurfaceAction,
  type DashboardSurfaceIcon,
  type DashboardSurfaceNode,
  type DashboardSurfaceResult,
} from "./dashboard-surface-map";

type DashboardCommandTreeNode = {
  id: string;
  action?: DashboardSurfaceAction;
  children: DashboardCommandTreeNode[];
  description?: string;
  directlyMatched: boolean;
  icon: DashboardSurfaceIcon;
  label: string;
  result?: DashboardSurfaceResult;
};

export function DashboardCommandTrigger({
  open,
  onOpen,
}: {
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      title="Search dashboard"
      aria-label="Search dashboard"
      aria-expanded={open}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-expanded:bg-background aria-expanded:text-foreground"
      onClick={onOpen}
    >
      <Search className="h-3.5 w-3.5" />
    </button>
  );
}

export function DashboardCommandSearch({
  open,
  query,
  surfaceMap,
  onClose,
  onQueryChange,
  onRunAction,
}: {
  open: boolean;
  query: string;
  surfaceMap: DashboardSurfaceNode[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onRunAction: (action: DashboardSurfaceAction) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const results = useMemo(
    () => filterDashboardSurfaceResults(query, surfaceMap).slice(0, 64),
    [query, surfaceMap]
  );
  const tree = useMemo(() => buildDashboardCommandTree(results), [results]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background/20 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Dashboard search"
        data-dashboard-command-panel
        className="fixed left-1/2 top-20 flex max-h-[min(680px,calc(100vh-6rem))] w-[min(720px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }

          if (event.key !== "Tab") {
            return;
          }

          window.requestAnimationFrame(() => {
            const panel = panelRef.current;

            if (!panel || panel.contains(document.activeElement)) {
              return;
            }

            onClose();
          });
        }}
      >
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              placeholder="Search current project, graph, artifacts, projects"
              className="pl-8 focus-visible:bg-background focus-visible:ring-0"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="p-3">
            {tree.length > 0 ? (
              <DashboardCommandTree
                nodes={tree}
                depth={0}
                onRunAction={onRunAction}
              />
            ) : (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                No matching surfaces.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCommandTree({
  nodes,
  depth,
  onRunAction,
}: {
  nodes: DashboardCommandTreeNode[];
  depth: number;
  onRunAction: (action: DashboardSurfaceAction) => void;
}) {
  return (
    <div className="grid gap-2">
      {nodes.map((node) => (
        <div key={node.id} className="min-w-0">
          <DashboardCommandTreeItem
            node={node}
            depth={depth}
            onRunAction={onRunAction}
          />
          {node.children.length > 0 ? (
            <div className="relative ml-[1.625rem] mt-2 grid gap-2 pl-5 before:absolute before:bottom-1 before:left-0 before:top-0 before:w-px before:bg-border">
              <DashboardCommandTree
                nodes={node.children}
                depth={depth + 1}
                onRunAction={onRunAction}
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DashboardCommandTreeItem({
  node,
  depth,
  onRunAction,
}: {
  node: DashboardCommandTreeNode;
  depth: number;
  onRunAction: (action: DashboardSurfaceAction) => void;
}) {
  const isActionable = Boolean(node.action && node.directlyMatched);
  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 grid shrink-0 place-items-center text-muted-foreground",
          depth === 0 ? "size-7" : "size-6"
        )}
      >
        {renderSurfaceIcon(node.icon)}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block break-words text-sm font-medium leading-snug">
          {node.label}
        </span>
        {node.description ? (
          <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
            {node.description}
          </span>
        ) : null}
      </span>
    </>
  );

  if (!isActionable || !node.action) {
    return (
      <div
        className={cn(
          "flex w-full min-w-0 items-start gap-3 rounded-md px-2.5 py-2.5 text-left",
          depth === 0
            ? "bg-muted/70 text-foreground"
            : "text-muted-foreground"
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-md border border-transparent px-2.5 py-2.5 text-left transition-colors",
        "hover:border-border hover:bg-muted focus:border-transparent focus:bg-muted! focus:ring-0 focus:outline-none focus-visible:border-transparent focus-visible:bg-muted! focus-visible:ring-0 focus-visible:outline-none"
      )}
      onClick={() => onRunAction(node.action!)}
    >
      {content}
    </button>
  );
}

function buildDashboardCommandTree(results: DashboardSurfaceResult[]) {
  const firstTopLevelAncestor = results[0]?.ancestors[0];
  const hideSingleTopLevelGroup =
    firstTopLevelAncestor &&
    !firstTopLevelAncestor.action &&
    results.every(
      (result) => result.ancestors[0]?.id === firstTopLevelAncestor.id
    );
  const tree: DashboardCommandTreeNode[] = [];

  for (const result of results) {
    const fullPath = [...result.ancestors, result.node];
    const hideCurrentProjectRoot = fullPath[0]?.id.startsWith(
      "current-project:"
    );
    const displayPath =
      hideCurrentProjectRoot || hideSingleTopLevelGroup
        ? fullPath.slice(1)
        : fullPath;

    insertCommandTreeNode(tree, displayPath, result);
  }

  return tree.map((node) => ({
    ...node,
    children: collapseRedundantCommandTreeContext(node.children),
  }));
}

function insertCommandTreeNode(
  tree: DashboardCommandTreeNode[],
  path: DashboardSurfaceNode[],
  result: DashboardSurfaceResult
) {
  let siblings = tree;

  path.forEach((surfaceNode, index) => {
    const nodeId = path
      .slice(0, index + 1)
      .map((item) => item.id)
      .join(">");
    let treeNode = siblings.find((candidate) => candidate.id === nodeId);

    if (!treeNode) {
      const isLeaf = index === path.length - 1;
      treeNode = {
        id: nodeId,
        action: isLeaf ? result.action : surfaceNode.action,
        children: [],
        description: isLeaf
          ? result.node.description ?? getDashboardSurfaceAncestryLabel(result)
          : surfaceNode.description,
        directlyMatched: isLeaf,
        icon: surfaceNode.icon,
        label: surfaceNode.label,
        result: isLeaf ? result : undefined,
      };
      siblings.push(treeNode);
    }

    if (index === path.length - 1) {
      treeNode.action = result.action;
      treeNode.directlyMatched = true;
      treeNode.result = result;
    }

    siblings = treeNode.children;
  });
}

function collapseRedundantCommandTreeContext(
  nodes: DashboardCommandTreeNode[]
): DashboardCommandTreeNode[] {
  const collapsedNodes = nodes.map((node) => ({
    ...node,
    children: collapseRedundantCommandTreeContext(node.children),
  }));

  if (collapsedNodes.length !== 1) {
    return collapsedNodes;
  }

  const [node] = collapsedNodes;

  if (
    node.directlyMatched ||
    node.children.length === 0 ||
    isArtifactCategoryNode(node)
  ) {
    return collapsedNodes;
  }

  return node.children;
}

function isArtifactCategoryNode(node: DashboardCommandTreeNode) {
  return (
    node.id === "artifacts" ||
    node.id.startsWith("artifacts.") ||
    node.id.includes(">artifacts.")
  );
}

function renderSurfaceIcon(icon: DashboardSurfaceIcon) {
  const className = "h-4 w-4";

  switch (icon) {
    case "artifact":
      return <Archive className={className} />;
    case "file":
      return <FileText className={className} />;
    case "home":
      return <Home className={className} />;
    case "link":
      return <LinkIcon className={className} />;
    case "marker":
      return <CircleDot className={className} />;
    case "project":
      return <FolderOpen className={className} />;
    case "region":
      return <Shapes className={className} />;
    case "summary":
      return <Layers3 className={className} />;
    case "node":
    default:
      return <Map className={className} />;
  }
}
