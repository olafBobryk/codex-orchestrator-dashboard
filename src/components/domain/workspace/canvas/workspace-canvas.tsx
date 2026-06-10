"use client";

import {
  OrchestrationGraphCanvas,
  type GraphCanvasStats,
} from "./graph-canvas-shell";
import type { OrchestrationGraph } from "@/lib/orchestration-graph";
import { GraphDetailOverlay, GraphStatusOverlay } from "../graph-panels";

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
    <OrchestrationGraphCanvas
      graph={graph}
      workspace={workspace}
      stats={stats}
      renderDetailPanel={(props) => <GraphDetailOverlay {...props} />}
      renderStatusPanel={(props) => <GraphStatusOverlay {...props} />}
    />
  );
}
