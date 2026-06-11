"use client";

import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { PanelRightOpen } from "lucide-react";
import {
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  drawRegionOverlays,
  drawLink,
  drawLinkPointerArea,
  drawNode,
  drawNodePointerArea,
  drawRegions,
  isLinkCoveredByActiveRegions,
  isNodeCoveredByActiveRegion,
  readCanvasTheme,
} from "./drawing";
import { readGraphEventPoint } from "./graph-event-point";
import { GraphEmptyState, GraphLoadingState } from "./graph-canvas-states";
import {
  GraphHitTooltip,
  type HoveredGraphTooltip,
} from "./graph-canvas-tooltip";
import { GraphSidePanel } from "./graph-side-panel";
import { type GraphHitResult, resolveGraphHit } from "./hit-testing";
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
    ? graph.nodes.find((node) => node.id === selectedNodeId) ?? null
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

        <GraphSidePanel
          sidePanelMode={sidePanelMode}
          graph={graph}
          workspace={workspace}
          stats={stats}
          packetColors={packetColors}
          visiblePackets={visiblePackets}
          flowSignalCounts={flowSignalCounts}
          runtimeAnnotationCount={runtimeAnnotationCount}
          sourceStatus={sourceStatus}
          primaryNodes={data.nodes.filter((node) => node.primary)}
          markdownReference={markdownReference}
          selectedDetailNode={selectedDetailNode}
          selectedNodeMarkers={selectedNodeMarkers}
          selectedMarker={selectedMarker}
          selectedNodeEdges={selectedNodeEdges}
          relatedDetailNodes={relatedDetailNodes}
          selectedEdge={selectedEdge}
          selectedEdgeSourceNode={selectedEdgeSourceNode}
          selectedEdgeTargetNode={selectedEdgeTargetNode}
          selectedRegion={selectedRegion}
          renderDetailPanel={renderDetailPanel}
          renderEdgePanel={renderEdgePanel}
          renderRegionPanel={renderRegionPanel}
          renderMarkdownViewer={renderMarkdownViewer}
          renderStatusPanel={renderStatusPanel}
          onOpenMarkdownReference={setMarkdownReference}
          onCloseMarkdownReference={() => setMarkdownReference(null)}
          onSelectMarker={setSelectedMarkerId}
          onSelectNode={(nodeId, markerId) => {
            setSelectedNodeId(nodeId);
            setSelectedEdgeId(null);
            setSelectedMarkerId(markerId ?? null);
            setSelectedRegionId(null);
            setMarkdownReference(null);
            setStatusPanelOpen(false);
          }}
          onSelectRegionNode={(nodeId) => {
            setSelectedNodeId(nodeId);
            setSelectedEdgeId(null);
            setSelectedMarkerId(null);
            setSelectedRegionId(null);
            setMarkdownReference(null);
            setStatusPanelOpen(false);
          }}
          onCloseDetail={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            setSelectedMarkerId(null);
            setMarkdownReference(null);
          }}
          onCloseEdge={() => {
            setSelectedEdgeId(null);
            setMarkdownReference(null);
          }}
          onCloseRegion={() => {
            setSelectedRegionId(null);
            setMarkdownReference(null);
          }}
          onCloseStatus={() => setStatusPanelOpen(false)}
        />

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
