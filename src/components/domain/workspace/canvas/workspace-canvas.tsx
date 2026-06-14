"use client";

import { useEffect, useMemo, useState } from "react";
import {
  OrchestrationGraphCanvas,
  type GraphCanvasStats,
} from "./graph-canvas-shell";
import type { GraphProjectionQualityWarning } from "@/lib/graph-projection";
import type { GraphMarker, OrchestrationGraph } from "@/lib/orchestration-graph";
import type { GraphCanvasCommandAction } from "./types";
import { GraphDetailOverlay, GraphStatusOverlay } from "../graph-panels";
import { EdgeDetailPanel } from "../graph-panels/detail/edge-detail-panel";
import { MarkdownReferenceViewer } from "../graph-panels/detail/markdown-reference-viewer";
import { RegionDetailPanel } from "../graph-panels/detail/region-detail-panel";

const MARKER_ACTIVITY_POLL_INTERVAL_MS = 5_000;

type MarkerActivityResponse = {
  markers?: Array<{
    id?: unknown;
    loader?: unknown;
  }>;
};

export type WorkspaceCanvasProps = {
  graph: OrchestrationGraph;
  workspace: string;
  stats: GraphCanvasStats;
  projectionQualityWarnings: GraphProjectionQualityWarning[];
  commandAction?: GraphCanvasCommandAction | null;
};

export function WorkspaceCanvas({
  graph,
  workspace,
  stats,
  projectionQualityWarnings,
  commandAction,
}: WorkspaceCanvasProps) {
  const [markerActivity, setMarkerActivity] = useState(
    new Map<string, Pick<GraphMarker, "loader">>()
  );
  const markerIds = useMemo(
    () => graph.markers.map((marker) => marker.id),
    [graph.markers]
  );
  const liveGraph = useMemo(
    () => mergeMarkerActivity(graph, markerActivity),
    [graph, markerActivity]
  );

  useEffect(() => {
    if (!workspace.trim() || markerIds.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshMarkerActivity = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch(
          `/api/graph-marker-activity?workspace=${encodeURIComponent(workspace)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          if (!cancelled) {
            setMarkerActivity(createIdleMarkerActivity(markerIds));
          }
          return;
        }

        const payload = (await response.json()) as MarkerActivityResponse;
        const markerActivity = readMarkerActivity(payload);

        if (markerActivity.size === 0) {
          if (!cancelled) {
            setMarkerActivity(createIdleMarkerActivity(markerIds));
          }
          return;
        }

        if (!cancelled) {
          setMarkerActivity(markerActivity);
        }
      } catch {
        if (!cancelled) {
          setMarkerActivity(createIdleMarkerActivity(markerIds));
        }
      }
    };

    const interval = window.setInterval(
      refreshMarkerActivity,
      MARKER_ACTIVITY_POLL_INTERVAL_MS
    );
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshMarkerActivity();
      }
    };

    void refreshMarkerActivity();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [markerIds, workspace]);

  return (
    <>
      <OrchestrationGraphCanvas
        graph={liveGraph}
        workspace={workspace}
        stats={stats}
        projectionQualityWarnings={projectionQualityWarnings}
        commandAction={commandAction}
        renderDetailPanel={(props) => <GraphDetailOverlay {...props} />}
        renderEdgePanel={(props) => <EdgeDetailPanel {...props} />}
        renderRegionPanel={(props) => <RegionDetailPanel {...props} />}
        renderMarkdownViewer={(props) => <MarkdownReferenceViewer {...props} />}
        renderStatusPanel={(props) => <GraphStatusOverlay {...props} />}
      />
    </>
  );
}

function readMarkerActivity(payload: MarkerActivityResponse) {
  const activity = new Map<string, Pick<GraphMarker, "loader">>();

  for (const marker of payload.markers ?? []) {
    if (typeof marker.id !== "string" || typeof marker.loader !== "boolean") {
      continue;
    }

    activity.set(marker.id, { loader: marker.loader });
  }

  return activity;
}

function createIdleMarkerActivity(markerIds: string[]) {
  return new Map(
    markerIds.map((markerId) => [markerId, { loader: false }])
  );
}

function mergeMarkerActivity(
  graph: OrchestrationGraph,
  activity: Map<string, Pick<GraphMarker, "loader">>
) {
  let changed = false;
  const markers = graph.markers.map((marker) => {
    const update = activity.get(marker.id);

    if (!update || marker.loader === update.loader) {
      return marker;
    }

    changed = true;
    return {
      ...marker,
      loader: update.loader,
    };
  });

  return changed ? { ...graph, markers } : graph;
}
