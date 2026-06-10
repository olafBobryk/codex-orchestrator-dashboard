"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { PanelRightOpen } from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  countFlowSignals,
  countRuntimeAnnotations,
  createCanvasGraph,
  findRelatedDetailNodes,
  getVisibleSourceStatus,
} from "./graph-adapter";
import { installGraphForces } from "./physics";
import {
  drawLink,
  drawNode,
  drawNodePointerArea,
  getClickedNodeMarker,
  readCanvasTheme,
} from "./drawing";
import type {
  GraphMethods,
  GraphProps,
  OrchestrationGraphCanvasProps,
} from "./types";

export type { GraphCanvasStats } from "./types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Preparing graph
    </div>
  ),
}) as ComponentType<GraphProps>;


export function OrchestrationGraphCanvas({
  graph,
  workspace,
  stats,
  renderDetailPanel,
  renderStatusPanel,
}: OrchestrationGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 960, height: 620 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [statusPanelOpen, setStatusPanelOpen] = useState(true);
  const [graphMountVersion, setGraphMountVersion] = useState(0);
  const canvasTheme = useMemo(() => readCanvasTheme(), []);
  const bindGraphRef = useCallback((instance: GraphMethods | null) => {
    graphRef.current = instance ?? undefined;

    if (instance) {
      setGraphMountVersion((version) => version + 1);
    }
  }, []);

  const { data, packetColors, visiblePackets } = useMemo(
    () => createCanvasGraph(graph),
    [graph]
  );
  const runtimeAnnotationCount = countRuntimeAnnotations(graph);
  const sourceStatus = getVisibleSourceStatus(graph);
  const flowSignalCounts = countFlowSignals(graph.edges);
  const supportNodeCount = data.nodes.filter((node) => !node.primary).length;
  const primaryChunkCount = data.nodes.filter((node) => node.primary).length;

  const selectedDetailNode = selectedNodeId
    ? graph.nodes.find((node) => node.id === selectedNodeId)
    : null;
  const relatedDetailNodes = selectedDetailNode
    ? findRelatedDetailNodes(graph, selectedDetailNode)
    : [];
  const selectedNodeMarkers = selectedDetailNode
    ? graph.markers.filter((marker) => marker.targetId === selectedDetailNode.id)
    : [];
  const selectedMarker =
    selectedMarkerId && selectedDetailNode
      ? selectedNodeMarkers.find((marker) => marker.id === selectedMarkerId) ?? null
      : null;
  const selectedNodeEdges = selectedDetailNode
    ? graph.edges.filter(
        (edge) =>
          edge.source === selectedDetailNode.id || edge.target === selectedDetailNode.id
      )
    : [];
  const sidePanelMode = selectedDetailNode
    ? "detail"
    : statusPanelOpen
      ? "status"
      : null;

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(460, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const instance = graphRef.current;

    if (!instance) {
      return;
    }

    return installGraphForces({ instance, sizeWidth: size.width });
  }, [data, graphMountVersion, size.width]);

  return (
    <section
      aria-label="Orchestration graph"
      className="h-full min-h-0 overflow-hidden bg-background text-foreground"
    >
      <div
        ref={containerRef}
        className="relative h-full min-h-[520px] bg-background"
      >
        {data.nodes.length > 0 ? (
          <ForceGraph2D
            ref={bindGraphRef}
            graphData={data}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            nodeId="id"
            nodeRelSize={1}
            nodeVal={(node) => (node.primary ? 14 : 7)}
            nodeLabel={(node) =>
              `${node.chunkId ?? node.kind}: ${node.label} (${node.status})`
            }
            nodeCanvasObject={(node, context) =>
              drawNode({
                node,
                context,
                selected: node.id === selectedNodeId,
                selectedMarkerId,
                theme: canvasTheme,
              })
            }
            nodePointerAreaPaint={(node, color, context) =>
              drawNodePointerArea(node, color, context)
            }
            linkCanvasObject={(link, context) => drawLink(link, context)}
            linkCanvasObjectMode={() => "replace"}
            linkColor={(link) => link.color}
            linkWidth={(link) => link.width}
            linkLineDash={(link) => link.dash}
            linkDirectionalArrowLength={(link) =>
              link.directional === false
                ? 0
                : link.directional === true
                  ? 5
                  : link.type === "sequence"
                    ? 5
                    : 3
            }
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={(link) =>
              link.type === "sequence" && link.status === "in_progress" ? 1 : 0
            }
            linkDirectionalParticleWidth={2}
            d3VelocityDecay={0.28}
            cooldownTicks={320}
            onNodeClick={(node, event) => {
              event.stopPropagation();
              const marker = getClickedNodeMarker({
                node,
                event,
                graph: graphRef.current,
              });

              setSelectedNodeId(node.id);
              setSelectedMarkerId(marker?.id ?? null);
            }}
            onBackgroundClick={() => {
              setSelectedNodeId(null);
              setSelectedMarkerId(null);
            }}
            enableNodeDrag
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            No graph nodes are available for this workspace.
          </div>
        )}

        <AnimatePresence mode="wait">
          {sidePanelMode ? (
            <motion.div
              key={sidePanelMode === "detail" ? "graph-detail-panel" : "graph-status-panel"}
              data-graph-side-panel={sidePanelMode}
              initial={{ x: "calc(100% + 16px)", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "calc(100% + 16px)", opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className={`absolute right-3 top-3 z-10 ${
                sidePanelMode === "detail"
                  ? "bottom-3 w-[min(390px,calc(100%_-_1.5rem))]"
                  : "w-[min(340px,calc(100%_-_1.5rem))]"
              }`}
              style={{
                maxHeight:
                  sidePanelMode === "detail"
                    ? "calc(100vh - 1.5rem)"
                    : "min(520px, calc(100vh - 1.5rem))",
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {sidePanelMode === "detail" && selectedDetailNode ? (
                renderDetailPanel({
                  node: selectedDetailNode,
                  markers: selectedNodeMarkers,
                  selectedMarker,
                  edges: selectedNodeEdges,
                  relatedNodes: relatedDetailNodes,
                  workspace,
                  onSelectMarker: setSelectedMarkerId,
                  onClose: () => {
                    setSelectedNodeId(null);
                    setSelectedMarkerId(null);
                  },
                })
              ) : (
                renderStatusPanel({
                  graph,
                  stats,
                  packetColors,
                  visiblePackets,
                  primaryChunkCount,
                  supportNodeCount,
                  edgeCount: data.links.length,
                  flowSignalCounts,
                  runtimeAnnotationCount,
                  sourceStatus,
                  primaryNodes: data.nodes.filter((node) => node.primary),
                  onSelectNode: (nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedMarkerId(null);
                  },
                  onClose: () => setStatusPanelOpen(false),
                })
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!selectedDetailNode && !statusPanelOpen ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Show graph panel"
            title="Show graph panel"
            className="absolute right-3 top-3 z-20 shadow-sm"
            onClick={() => setStatusPanelOpen(true)}
          >
            <PanelRightOpen />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
