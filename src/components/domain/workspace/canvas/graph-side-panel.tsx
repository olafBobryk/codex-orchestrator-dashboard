"use client";

import { AnimatePresence, motion } from "motion/react";
import type {
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphPacketGroup,
  OrchestrationGraph,
} from "@/lib/orchestration-graph";
import type {
  CanvasNode,
  CanvasRegion,
  GraphCanvasStats,
  GraphMarkdownReference,
  OrchestrationGraphCanvasProps,
} from "./types";

type GraphSidePanelMode = "markdown" | "detail" | "edge" | "region" | "status";

type GraphSidePanelProps = Pick<
  OrchestrationGraphCanvasProps,
  | "renderDetailPanel"
  | "renderEdgePanel"
  | "renderRegionPanel"
  | "renderMarkdownViewer"
  | "renderStatusPanel"
> & {
  sidePanelMode: GraphSidePanelMode | null;
  graph: OrchestrationGraph;
  workspace: string;
  stats: GraphCanvasStats;
  packetColors: Map<string, string>;
  visiblePackets: GraphPacketGroup[];
  flowSignalCounts: Array<{ type: GraphEdge["type"]; count: number }>;
  runtimeAnnotationCount: number;
  sourceStatus: string;
  primaryNodes: CanvasNode[];
  markdownReference: GraphMarkdownReference | null;
  selectedDetailNode: GraphNode | null;
  selectedNodeMarkers: GraphMarker[];
  selectedMarker: GraphMarker | null;
  selectedNodeEdges: GraphEdge[];
  relatedDetailNodes: GraphNode[];
  selectedEdge: GraphEdge | null;
  selectedEdgeSourceNode: GraphNode | null;
  selectedEdgeTargetNode: GraphNode | null;
  selectedRegion: CanvasRegion | null;
  onOpenMarkdownReference: (reference: GraphMarkdownReference) => void;
  onCloseMarkdownReference: () => void;
  onSelectMarker: (markerId: string | null) => void;
  onSelectNode: (nodeId: string, markerId?: string | null) => void;
  onSelectRegionNode: (nodeId: string) => void;
  onCloseDetail: () => void;
  onCloseEdge: () => void;
  onCloseRegion: () => void;
  onCloseStatus: () => void;
};

export function GraphSidePanel({
  sidePanelMode,
  graph,
  workspace,
  stats,
  packetColors,
  visiblePackets,
  flowSignalCounts,
  runtimeAnnotationCount,
  sourceStatus,
  primaryNodes,
  markdownReference,
  selectedDetailNode,
  selectedNodeMarkers,
  selectedMarker,
  selectedNodeEdges,
  relatedDetailNodes,
  selectedEdge,
  selectedEdgeSourceNode,
  selectedEdgeTargetNode,
  selectedRegion,
  renderDetailPanel,
  renderEdgePanel,
  renderRegionPanel,
  renderMarkdownViewer,
  renderStatusPanel,
  onOpenMarkdownReference,
  onCloseMarkdownReference,
  onSelectMarker,
  onSelectNode,
  onSelectRegionNode,
  onCloseDetail,
  onCloseEdge,
  onCloseRegion,
  onCloseStatus,
}: GraphSidePanelProps) {
  return (
    <AnimatePresence mode="wait">
      {sidePanelMode ? (
        <motion.div
          key={
            sidePanelMode === "detail"
              ? "graph-detail-panel"
              : sidePanelMode === "markdown"
                ? "graph-markdown-panel"
                : sidePanelMode === "edge"
                  ? "graph-edge-panel"
                  : sidePanelMode === "region"
                    ? "graph-region-panel"
                    : "graph-status-panel"
          }
          data-graph-side-panel={sidePanelMode}
          initial={{ x: "calc(100% + 16px)", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "calc(100% + 16px)", opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
          className={`fixed right-3 top-3 z-10 ${
            sidePanelMode === "markdown"
              ? "bottom-3 w-[min(560px,calc(100vw_-_1.5rem))]"
              : sidePanelMode === "detail" ||
                  sidePanelMode === "edge" ||
                  sidePanelMode === "region"
                ? "bottom-3 w-[min(390px,calc(100vw_-_1.5rem))]"
                : "w-[min(340px,calc(100vw_-_1.5rem))]"
          }`}
          style={{
            maxHeight:
              sidePanelMode === "detail" ||
              sidePanelMode === "edge" ||
              sidePanelMode === "markdown" ||
              sidePanelMode === "region"
                ? "calc(100vh - 1.5rem)"
                : "min(520px, calc(100vh - 1.5rem))",
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseMove={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {sidePanelMode === "markdown" && markdownReference ? (
            renderMarkdownViewer({
              workspace,
              reference: markdownReference,
              onBack: onCloseMarkdownReference,
            })
          ) : sidePanelMode === "detail" && selectedDetailNode ? (
            renderDetailPanel({
              node: selectedDetailNode,
              markers: selectedNodeMarkers,
              selectedMarker,
              edges: selectedNodeEdges,
              relatedNodes: relatedDetailNodes,
              workspace,
              onOpenMarkdownReference,
              onSelectMarker,
              onClose: onCloseDetail,
            })
          ) : sidePanelMode === "edge" && selectedEdge ? (
            renderEdgePanel({
              edge: selectedEdge,
              sourceNode: selectedEdgeSourceNode,
              targetNode: selectedEdgeTargetNode,
              workspace,
              onOpenMarkdownReference,
              onClose: onCloseEdge,
            })
          ) : sidePanelMode === "region" && selectedRegion ? (
            renderRegionPanel({
              region: selectedRegion,
              workspace,
              onOpenMarkdownReference,
              onSelectNode: onSelectRegionNode,
              onClose: onCloseRegion,
            })
          ) : (
            renderStatusPanel({
              graph,
              stats,
              packetColors,
              visiblePackets,
              flowSignalCounts,
              runtimeAnnotationCount,
              sourceStatus,
              primaryNodes,
              onSelectNode,
              onClose: onCloseStatus,
            })
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
