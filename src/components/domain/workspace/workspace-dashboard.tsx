"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CodexProjectReadResult } from "@/lib/codex-projects";
import type { GraphProjectionQualityWarning } from "@/lib/graph-projection";
import type { OrchestrationGraph } from "@/lib/orchestration-graph";
import type {
  GraphCanvasCommandAction,
  GraphCanvasStats,
} from "./canvas/types";
import { DashboardCommandSearch } from "./dashboard-command";
import {
  buildDashboardSurfaceMap,
  type DashboardSurfaceAction,
} from "./dashboard-surface-map";
import { WorkspaceCanvas } from "./canvas";
import { WorkspaceSidebar } from "./sidebar";
import {
  isPublicDemoDashboard,
  type DashboardMode,
} from "./dashboard-mode";
import { GraphProjectionQualityToast } from "./status";

export function WorkspaceDashboard({
  codexProjects,
  dashboardMode = "local",
  graph,
  projectionQualityWarnings,
  resolvedWorkspace,
  stats,
  workspace,
}: {
  codexProjects: CodexProjectReadResult;
  dashboardMode?: DashboardMode;
  graph: OrchestrationGraph;
  projectionQualityWarnings: GraphProjectionQualityWarning[];
  resolvedWorkspace: string;
  stats: GraphCanvasStats;
  workspace: string;
}) {
  const router = useRouter();
  const [graphCommand, setGraphCommand] =
    useState<GraphCanvasCommandAction | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const surfaceMap = useMemo(
    () =>
      buildDashboardSurfaceMap({
        codexProjects,
        currentWorkspace: resolvedWorkspace,
        dashboardMode,
        graph,
        workspace: resolvedWorkspace,
      }),
    [codexProjects, dashboardMode, graph, resolvedWorkspace]
  );
  const closeCommand = () => {
    setCommandOpen(false);
    setCommandQuery("");
  };
  const runCommandAction = (action: DashboardSurfaceAction) => {
    if (action.type === "navigate") {
      router.push(action.href);
      closeCommand();
      return;
    }

    if (action.type === "open-external-link") {
      if (!isPublicDemoDashboard(dashboardMode)) {
        window.location.href = action.href;
      }
      closeCommand();
      return;
    }

    const commandId = `${action.type}:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2)}`;

    if (action.type === "show-status-panel") {
      setGraphCommand({ commandId, type: "show-status-panel" });
    } else if (action.type === "select-node") {
      setGraphCommand({
        commandId,
        type: "select-node",
        nodeId: action.nodeId,
        markerId: action.markerId ?? null,
      });
    } else if (action.type === "select-region") {
      setGraphCommand({
        commandId,
        type: "select-region",
        regionId: action.regionId,
      });
    } else if (action.type === "select-edge") {
      setGraphCommand({
        commandId,
        type: "select-edge",
        edgeId: action.edgeId,
      });
    } else {
      setGraphCommand({
        commandId,
        type: "open-markdown-reference",
        reference: action.reference,
      });
    }

    closeCommand();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      setCommandOpen((value) => !value);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <WorkspaceSidebar
        codexProjects={codexProjects}
        workspace={workspace}
        resolvedWorkspace={resolvedWorkspace}
        dashboardMode={dashboardMode}
        commandOpen={commandOpen}
        onOpenCommand={() => setCommandOpen(true)}
      />
      <DashboardCommandSearch
        open={commandOpen}
        query={commandQuery}
        surfaceMap={surfaceMap}
        onClose={closeCommand}
        onQueryChange={setCommandQuery}
        onRunAction={runCommandAction}
      />

      <div className="min-h-screen min-w-0 bg-background lg:h-screen lg:overflow-hidden">
        <GraphProjectionQualityToast
          workspace={resolvedWorkspace}
          warnings={projectionQualityWarnings}
        />
        <WorkspaceCanvas
          graph={graph}
          dashboardMode={dashboardMode}
          workspace={resolvedWorkspace}
          stats={stats}
          projectionQualityWarnings={projectionQualityWarnings}
          commandAction={graphCommand}
        />
      </div>
    </>
  );
}
