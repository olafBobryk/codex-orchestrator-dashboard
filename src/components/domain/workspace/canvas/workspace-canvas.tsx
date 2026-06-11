"use client";

import {
  OrchestrationGraphCanvas,
  type GraphCanvasStats,
} from "./graph-canvas-shell";
import type { OrchestrationGraph } from "@/lib/orchestration-graph";
import { GraphDetailOverlay, GraphStatusOverlay } from "../graph-panels";
import { MarkdownReferenceViewer } from "../graph-panels/detail/markdown-reference-viewer";
import { RegionDetailPanel } from "../graph-panels/detail/region-detail-panel";
import { OrchestrationAutoRefresh } from "./orchestration-auto-refresh";

export type WorkspaceCanvasProps = {
  graph: OrchestrationGraph;
  workspace: string;
  stats: GraphCanvasStats;
};

export function WorkspaceCanvas({
  graph,
  workspace,
  stats,
}: WorkspaceCanvasProps) {
  return (
    <>
      <OrchestrationAutoRefresh workspace={workspace} />
      <OrchestrationGraphCanvas
        graph={graph}
        workspace={workspace}
        stats={stats}
        renderDetailPanel={(props) => <GraphDetailOverlay {...props} />}
        renderRegionPanel={(props) => <RegionDetailPanel {...props} />}
        renderMarkdownViewer={(props) => <MarkdownReferenceViewer {...props} />}
        renderStatusPanel={(props) => <GraphStatusOverlay {...props} />}
      />
    </>
  );
}
