"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { PanelRightOpen } from "lucide-react";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  countFlowSignals,
  countRuntimeAnnotations,
  createCanvasGraph,
  findRelatedDetailNodes,
  getVisibleSourceStatus,
} from "./graph-adapter";
import { installGraphForces } from "./physics";
import {
  drawRegionOverlays,
  drawLink,
  drawLinkPointerArea,
  drawNode,
  drawNodePointerArea,
  drawRegions,
  type GraphHitResult,
  isLinkCoveredByActiveRegions,
  isNodeCoveredByActiveRegion,
  readCanvasTheme,
  resolveGraphHit,
} from "./drawing";
import type {
  GraphMarkdownReference,
  GraphMethods,
  GraphProps,
  OrchestrationGraphCanvasProps,
} from "./types";

export type { GraphCanvasStats } from "./types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <GraphLoadingState />,
}) as ComponentType<GraphProps>;

const INITIAL_FOCUS_ZOOM = 0.52;
const MARKER_LOADER_TRANSITION_REDRAW_MS = 760;

type HoveredGraphTooltip = {
  target: Exclude<GraphHitResult, { type: "background" }>;
  x: number;
  y: number;
};

export function OrchestrationGraphCanvas({
  graph,
  workspace,
  stats,
  commandAction,
  renderDetailPanel,
  renderEdgePanel,
  renderRegionPanel,
  renderMarkdownViewer,
  renderStatusPanel,
}: OrchestrationGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const initialFocusAppliedKeyRef = useRef<string | null>(null);
  const [size, setSize] = useState({ width: 960, height: 620 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [markdownReference, setMarkdownReference] =
    useState<GraphMarkdownReference | null>(null);
  const [statusPanelOpen, setStatusPanelOpen] = useState(true);
  const [graphMountVersion, setGraphMountVersion] = useState(0);
  const [hoveredGraphTooltip, setHoveredGraphTooltip] =
    useState<HoveredGraphTooltip | null>(null);
  const [markerLoaderTransitionRedraw, setMarkerLoaderTransitionRedraw] =
    useState(false);
  const markerLoaderSnapshotRef = useRef<string | null>(null);
  const canvasTheme = useMemo(() => readCanvasTheme(), []);
  const bindGraphRef = useCallback((instance: GraphMethods | null) => {
    graphRef.current = instance ?? undefined;

    if (instance) {
      setGraphMountVersion((version) => version + 1);
    }
  }, []);

  const {
    data,
    regions,
    packetColors,
    visiblePackets,
    layoutKey,
    initialFocusNodeId,
  } = useMemo(() => createCanvasGraph(graph), [graph]);
  const runtimeAnnotationCount = countRuntimeAnnotations(graph);
  const sourceStatus = getVisibleSourceStatus(graph);
  const flowSignalCounts = countFlowSignals(graph.edges);
  const hasLoadingMarkers = data.nodes.some((node) =>
    node.markers.some((marker) => marker.loader)
  );
  const markerLoaderSnapshot = data.nodes
    .flatMap((node) =>
      node.markers.map((marker) => `${marker.id}:${marker.loader ? 1 : 0}`)
    )
    .join("|");

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
  const selectedRegion = selectedRegionId
    ? regions.find((region) => region.id === selectedRegionId) ?? null
    : null;
  const selectedEdge = selectedEdgeId
    ? graph.edges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null;
  const selectedEdgeSourceNode = selectedEdge
    ? graph.nodes.find((node) => node.id === selectedEdge.source) ?? null
    : null;
  const selectedEdgeTargetNode = selectedEdge
    ? graph.nodes.find((node) => node.id === selectedEdge.target) ?? null
    : null;
  const selectedNodeEdges = selectedDetailNode
    ? graph.edges.filter(
        (edge) =>
          edge.source === selectedDetailNode.id || edge.target === selectedDetailNode.id
      )
    : [];
  const sidePanelMode = markdownReference
    ? "markdown"
    : selectedEdge
      ? "edge"
      : selectedDetailNode
      ? "detail"
      : selectedRegion
        ? "region"
        : statusPanelOpen
          ? "status"
          : null;
  const initialFocusKey = `${layoutKey}:${initialFocusNodeId ?? ""}`;

  const focusInitialNode = useCallback(
    () => {
      const instance = graphRef.current;
      const focusNode = data.nodes.find(
        (node) => node.id === initialFocusNodeId
      );

      if (!instance || !focusNode) {
        return false;
      }

      instance.zoom(INITIAL_FOCUS_ZOOM, 0);
      instance.centerAt(focusNode.guideX, focusNode.guideY, 0);

      return true;
    },
    [data.nodes, initialFocusNodeId]
  );

  const selectEdge = useCallback((edgeId: string) => {
    setSelectedNodeId(null);
    setSelectedEdgeId(edgeId);
    setSelectedMarkerId(null);
    setSelectedRegionId(null);
    setMarkdownReference(null);
    setStatusPanelOpen(false);
  }, []);

  const selectNode = useCallback((nodeId: string, markerId: string | null = null) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setSelectedMarkerId(markerId);
    setSelectedRegionId(null);
    setMarkdownReference(null);
    setStatusPanelOpen(false);
  }, []);

  const selectRegion = useCallback((regionId: string) => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedMarkerId(null);
    setSelectedRegionId(regionId);
    setMarkdownReference(null);
    setStatusPanelOpen(false);
  }, []);

  const clearGraphSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedMarkerId(null);
    setSelectedRegionId(null);
    setMarkdownReference(null);
  }, []);

  const selectGraphHit = useCallback(
    (hit: GraphHitResult) => {
      if (hit.type === "marker") {
        selectNode(hit.node.id, hit.marker.id);
        return;
      }

      if (hit.type === "node") {
        selectNode(hit.node.id);
        return;
      }

      if (hit.type === "edge") {
        selectEdge(hit.edge.id);
        return;
      }

      if (hit.type === "region") {
        selectRegion(hit.region.id);
        return;
      }

      clearGraphSelection();
    },
    [clearGraphSelection, selectEdge, selectNode, selectRegion]
  );

  const resolveHitFromEvent = useCallback(
    (event: MouseEvent | ReactMouseEvent<HTMLDivElement>) => {
      const point = readGraphEventPoint(event, containerRef.current);

      if (!point) {
        return { type: "background" } satisfies GraphHitResult;
      }

      return resolveGraphHit({
        nodes: data.nodes,
        links: data.links,
        regions,
        graph: graphRef.current,
        screenX: point.x,
        screenY: point.y,
      });
    },
    [data.links, data.nodes, regions]
  );

  const refreshGraphTooltip = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const point = readGraphEventPoint(event, containerRef.current);

      if (!point) {
        setHoveredGraphTooltip(null);
        return;
      }

      const hit = resolveGraphHit({
        nodes: data.nodes,
        links: data.links,
        regions,
        graph: graphRef.current,
        screenX: point.x,
        screenY: point.y,
      });

      if (hit.type === "background") {
        setHoveredGraphTooltip(null);
        return;
      }

      setHoveredGraphTooltip({
        target: hit,
        x: point.x,
        y: point.y,
      });
    },
    [data.links, data.nodes, regions]
  );

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

  useLayoutEffect(() => {
    if (initialFocusAppliedKeyRef.current === initialFocusKey) {
      return;
    }

    if (focusInitialNode()) {
      initialFocusAppliedKeyRef.current = initialFocusKey;
    }
  }, [focusInitialNode, graphMountVersion, initialFocusKey]);

  useEffect(() => {
    const instance = graphRef.current;

    if (!instance) {
      return;
    }

    return installGraphForces({ instance });
  }, [data, graphMountVersion]);

  useEffect(() => {
    if (!commandAction) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (commandAction.type === "show-status-panel") {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedMarkerId(null);
        setSelectedRegionId(null);
        setMarkdownReference(null);
        setStatusPanelOpen(true);
        return;
      }

      if (commandAction.type === "select-node") {
        setSelectedNodeId(commandAction.nodeId);
        setSelectedEdgeId(null);
        setSelectedMarkerId(commandAction.markerId ?? null);
        setSelectedRegionId(null);
        setMarkdownReference(null);
        setStatusPanelOpen(false);
        return;
      }

      if (commandAction.type === "select-region") {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedMarkerId(null);
        setSelectedRegionId(commandAction.regionId);
        setMarkdownReference(null);
        setStatusPanelOpen(false);
        return;
      }

      if (commandAction.type === "select-edge") {
        setSelectedNodeId(null);
        setSelectedEdgeId(commandAction.edgeId);
        setSelectedMarkerId(null);
        setSelectedRegionId(null);
        setMarkdownReference(null);
        setStatusPanelOpen(false);
        return;
      }

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedMarkerId(null);
      setSelectedRegionId(null);
      setMarkdownReference(commandAction.reference);
      setStatusPanelOpen(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [commandAction]);

  useEffect(() => {
    if (markerLoaderSnapshotRef.current === null) {
      markerLoaderSnapshotRef.current = markerLoaderSnapshot;
      return;
    }

    if (markerLoaderSnapshotRef.current === markerLoaderSnapshot) {
      return;
    }

    markerLoaderSnapshotRef.current = markerLoaderSnapshot;

    const startTimer = window.setTimeout(() => {
      setMarkerLoaderTransitionRedraw(true);
    }, 0);
    const stopTimer = window.setTimeout(() => {
      setMarkerLoaderTransitionRedraw(false);
    }, MARKER_LOADER_TRANSITION_REDRAW_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
    };
  }, [markerLoaderSnapshot]);

  return (
    <section
      aria-label="Orchestration graph"
      className="h-full min-h-0 overflow-hidden bg-background text-foreground"
    >
      <div
        ref={containerRef}
        className="relative h-full min-h-[520px] bg-background"
        onMouseMove={refreshGraphTooltip}
        onMouseLeave={() => {
          setHoveredGraphTooltip(null);
        }}
      >
        {data.nodes.length > 0 ? (
          <div className="h-full">
            <ForceGraph2D
              key={layoutKey}
              ref={bindGraphRef}
              graphData={data}
              width={size.width}
              height={size.height}
              backgroundColor="rgba(0,0,0,0)"
              nodeId="id"
              autoPauseRedraw={!hasLoadingMarkers && !markerLoaderTransitionRedraw}
              nodeRelSize={1}
              nodeVal={(node) => (node.primary ? 14 : 7)}
              nodeLabel={() => ""}
              onRenderFramePre={(context, globalScale) => {
                drawRegions({
                  regions,
                  nodes: data.nodes,
                  context,
                  globalScale,
                });
              }}
              onRenderFramePost={(context, globalScale) =>
                {
                  drawRegionOverlays({
                    regions,
                    nodes: data.nodes,
                    context,
                    theme: canvasTheme,
                    globalScale,
                  });
                }
              }
              nodeCanvasObject={(node, context, globalScale) => {
                if (
                  isNodeCoveredByActiveRegion({
                    node,
                    regions,
                    nodes: data.nodes,
                    context,
                    globalScale,
                  })
                ) {
                  return;
                }

                drawNode({
                  node,
                  context,
                  selected: node.id === selectedNodeId,
                  selectedMarkerId,
                  theme: canvasTheme,
                  globalScale,
                });
              }}
              nodePointerAreaPaint={(node, color, context) =>
                drawNodePointerArea(node, color, context)
              }
              linkCanvasObject={(link, context, globalScale) => {
                if (
                  isLinkCoveredByActiveRegions({
                    link,
                    regions,
                    nodes: data.nodes,
                    context,
                    globalScale,
                  })
                ) {
                  return;
                }

                drawLink(link, context);
              }}
              linkCanvasObjectMode={() => "replace"}
              linkPointerAreaPaint={(link, color, context) =>
                drawLinkPointerArea(link, color, context)
              }
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
              d3VelocityDecay={0.46}
              cooldownTicks={320}
              onLinkClick={(_link, event) => {
                event.stopPropagation();
                selectGraphHit(resolveHitFromEvent(event));
              }}
              onNodeClick={(_node, event) => {
                event.stopPropagation();
                selectGraphHit(resolveHitFromEvent(event));
              }}
              onBackgroundClick={(event) => {
                const hit = resolveHitFromEvent(event);

                if (hit.type !== "background") {
                  event.stopPropagation();
                }

                selectGraphHit(hit);
              }}
              enableNodeDrag
            />
          </div>
        ) : (
          <GraphEmptyState />
        )}

        <AnimatePresence>
          {hoveredGraphTooltip ? (
            <GraphHitTooltip tooltip={hoveredGraphTooltip} />
          ) : null}
        </AnimatePresence>

        {/*
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-md border border-border/70 bg-background/86 px-2.5 py-1 text-[11px] font-medium tabular-nums text-muted-foreground shadow-sm backdrop-blur">
          zoom {zoomLevel.toFixed(2)}x
        </div>
        */}

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
                  onBack: () => setMarkdownReference(null),
                })
              ) : sidePanelMode === "detail" && selectedDetailNode ? (
                renderDetailPanel({
                  node: selectedDetailNode,
                  markers: selectedNodeMarkers,
                  selectedMarker,
                  edges: selectedNodeEdges,
                  relatedNodes: relatedDetailNodes,
                  workspace,
                  onOpenMarkdownReference: setMarkdownReference,
                  onSelectMarker: setSelectedMarkerId,
                  onClose: () => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setSelectedMarkerId(null);
                    setMarkdownReference(null);
                  },
                })
              ) : sidePanelMode === "edge" && selectedEdge ? (
                renderEdgePanel({
                  edge: selectedEdge,
                  sourceNode: selectedEdgeSourceNode,
                  targetNode: selectedEdgeTargetNode,
                  workspace,
                  onOpenMarkdownReference: setMarkdownReference,
                  onClose: () => {
                    setSelectedEdgeId(null);
                    setMarkdownReference(null);
                  },
                })
              ) : sidePanelMode === "region" && selectedRegion ? (
                renderRegionPanel({
                  region: selectedRegion,
                  workspace,
                  onOpenMarkdownReference: setMarkdownReference,
                  onSelectNode: (nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    setSelectedMarkerId(null);
                    setSelectedRegionId(null);
                    setMarkdownReference(null);
                    setStatusPanelOpen(false);
                  },
                  onClose: () => {
                    setSelectedRegionId(null);
                    setMarkdownReference(null);
                  },
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
                  primaryNodes: data.nodes.filter((node) => node.primary),
                  onSelectNode: (nodeId, markerId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    setSelectedMarkerId(markerId ?? null);
                    setSelectedRegionId(null);
                    setMarkdownReference(null);
                    setStatusPanelOpen(false);
                  },
                  onClose: () => setStatusPanelOpen(false),
                })
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!selectedDetailNode && !selectedEdge && !selectedRegion && !statusPanelOpen ? (
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Show graph panel"
            title="Show graph panel"
            className="fixed right-3 top-3 z-20 shadow-sm"
            onClick={() => setStatusPanelOpen(true)}
          >
            <PanelRightOpen />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function GraphLoadingState() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background/72 backdrop-blur-[1px]">
      <Loader aria-label="Loading graph" size="lg" />
    </div>
  );
}

function GraphEmptyState() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background px-6">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-normal text-foreground">
          No graph nodes
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This workspace has orchestration docs, but the current strategy does
          not project any workpieces or checkpoints yet.
        </p>
      </div>
    </div>
  );
}

function GraphHitTooltip({ tooltip }: { tooltip: HoveredGraphTooltip }) {
  const content = formatGraphHitTooltip(tooltip.target);

  return (
    <motion.div
      key={content.key}
      data-graph-tooltip={tooltip.target.type}
      className="pointer-events-none absolute z-30 max-w-[260px]"
      style={{ left: tooltip.x, top: tooltip.y }}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -3 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="-translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md border border-border/80 bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-lg shadow-black/10 backdrop-blur">
        <div className="max-w-[220px] truncate font-medium leading-snug">
          {content.label}
        </div>
        <div className="mt-1 text-[11px] leading-none text-muted-foreground">
          {content.detail}
        </div>
        <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border/80 bg-popover/95" />
      </div>
    </motion.div>
  );
}

function formatGraphHitTooltip(
  target: Exclude<GraphHitResult, { type: "background" }>
) {
  if (target.type === "marker") {
    return {
      key: `marker:${target.marker.id}`,
      label: target.marker.label,
      detail: "Marker details",
    };
  }

  if (target.type === "node") {
    return {
      key: `node:${target.node.id}`,
      label: target.node.label,
      detail: "Node details",
    };
  }

  if (target.type === "edge") {
    return {
      key: `edge:${target.edge.id}`,
      label: target.edge.label,
      detail: "Edge details",
    };
  }

  return {
    key: `region:${target.region.id}`,
    label: target.region.label,
    detail: "Shape details",
  };
}

function readGraphEventPoint(
  event: MouseEvent | ReactMouseEvent<HTMLDivElement>,
  container: HTMLDivElement | null
) {
  if ("nativeEvent" in event) {
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  if (
    typeof event.offsetX === "number" &&
    typeof event.offsetY === "number"
  ) {
    return {
      x: event.offsetX,
      y: event.offsetY,
    };
  }

  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
