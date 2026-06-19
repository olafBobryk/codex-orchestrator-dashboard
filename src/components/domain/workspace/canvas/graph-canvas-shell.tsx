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
import { isPublicDemoDashboard } from "../dashboard-mode";
import {
  countFlowSignals,
  countRuntimeAnnotations,
  createCanvasGraph,
  findRelatedDetailNodes,
  getVisibleSourceStatus,
} from "./graph-adapter";
import { installGraphForces } from "./physics";
import {
  drawPromotedMarkerIslands,
  drawRegionOverlays,
  drawLink,
  drawLinkPointerArea,
  drawNode,
  drawNodePointerArea,
  drawRegions,
  getPromotedMarkerIds,
  isLinkCoveredByActiveRegions,
  isNodeCoveredByActiveRegion,
  readCanvasTheme,
  type PromotedMarkerHitArea,
} from "./drawing";
import { readGraphEventPoint } from "./graph-event-point";
import { GraphEmptyState, GraphLoadingState } from "./graph-canvas-states";
import {
  GraphHitTooltip,
  type HoveredGraphTooltip,
} from "./graph-canvas-tooltip";
import { GraphSidePanel } from "./graph-side-panel";
import { type GraphHitResult, resolveGraphHit } from "./hit-testing";
import { ReadmeScreenshotStageControls } from "./readme-screenshot-stage-controls";
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

const INITIAL_FIT_DURATION_MS = 420;
const SETTLED_FIT_DURATION_MS = 560;
const FIT_VIEWPORT_MARGIN_DESKTOP = 28;
const FIT_VIEWPORT_MARGIN_MOBILE = 18;
const FIT_WORLD_PADDING = 132;
const MIN_VISIBLE_FIT_WIDTH = 280;
const MIN_VISIBLE_FIT_HEIGHT = 260;
const MIN_OVERLAY_SIZE = 120;
const MIN_INITIAL_ZOOM = 0.02;
const MAX_INITIAL_ZOOM = 2.5;
const MARKER_LOADER_TRANSITION_REDRAW_MS = 760;
const PROMOTED_MARKER_TRANSITION_REDRAW_MS = 280;
const README_STAGE_CAPTURE_ENABLED = process.env.NEXT_PUBLIC_CAPTURE === "true";

export function OrchestrationGraphCanvas({
  graph,
  dashboardMode = "local",
  workspace,
  stats,
  projectionQualityWarnings,
  commandAction,
  renderDetailPanel,
  renderEdgePanel,
  renderRegionPanel,
  renderMarkdownViewer,
  renderStatusPanel,
}: OrchestrationGraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const provisionalFitAppliedKeyRef = useRef<string | null>(null);
  const settledFitAppliedKeyRef = useRef<string | null>(null);
  const userCameraInteractedKeyRef = useRef<string | null>(null);
  const [size, setSize] = useState({ width: 960, height: 620 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [markdownReference, setMarkdownReference] =
    useState<GraphMarkdownReference | null>(null);
  const [statusPanelOpen, setStatusPanelOpen] = useState(true);
  const [readmeStageControlsHidden, setReadmeStageControlsHidden] =
    useState(false);
  const [readmeStageCapture, setReadmeStageCapture] = useState<{
    dataUrl: string | null;
    error: string | null;
    rendering: boolean;
  }>({
    dataUrl: null,
    error: null,
    rendering: false,
  });
  const [graphMountVersion, setGraphMountVersion] = useState(0);
  const [hoveredGraphTooltip, setHoveredGraphTooltip] =
    useState<HoveredGraphTooltip | null>(null);
  const [markerLoaderTransitionRedraw, setMarkerLoaderTransitionRedraw] =
    useState(false);
  const [promotedMarkerTransitionRedraw, setPromotedMarkerTransitionRedraw] =
    useState(false);
  const markerLoaderSnapshotRef = useRef<string | null>(null);
  const promotedMarkerSnapshotRef = useRef<string | null>(null);
  const promotedMarkerTransitionTimersRef = useRef<{
    start: number | null;
    stop: number | null;
  }>({ start: null, stop: null });
  const promotedMarkerHitAreasRef = useRef<PromotedMarkerHitArea[]>([]);
  const promotedMarkerIdsRef = useRef<Set<string>>(new Set());
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
  const initialFocusKey = `${layoutKey}:${size.width}x${size.height}`;
  const publicDemo = isPublicDemoDashboard(dashboardMode);
  const readmeStageMode = README_STAGE_CAPTURE_ENABLED;

  const fitInitialGraph = useCallback((durationMs = INITIAL_FIT_DURATION_MS) => {
    const instance = graphRef.current;
    const container = containerRef.current;

    if (!instance || !container || data.nodes.length === 0) {
      return false;
    }

    const graphBounds = getGraphFitBounds(data.nodes);

    if (!graphBounds) {
      return false;
    }

    const visibleViewport = getVisibleFitViewport(container, size);
    const zoom = clamp(
      Math.min(
        visibleViewport.width / (graphBounds.right - graphBounds.left),
        visibleViewport.height / (graphBounds.bottom - graphBounds.top)
      ),
      MIN_INITIAL_ZOOM,
      MAX_INITIAL_ZOOM
    );
    const graphCenter = {
      x: (graphBounds.left + graphBounds.right) / 2,
      y: (graphBounds.top + graphBounds.bottom) / 2,
    };
    const viewportOffset = {
      x: visibleViewport.left + visibleViewport.width / 2 - size.width / 2,
      y: visibleViewport.top + visibleViewport.height / 2 - size.height / 2,
    };

    instance.centerAt(
      graphCenter.x - viewportOffset.x / zoom,
      graphCenter.y - viewportOffset.y / zoom,
      durationMs
    );
    instance.zoom(zoom, durationMs);

    return true;
  }, [data.nodes, size]);

  const fitSettledInitialGraph = useCallback(() => {
    if (
      settledFitAppliedKeyRef.current === initialFocusKey ||
      userCameraInteractedKeyRef.current === initialFocusKey
    ) {
      return;
    }

    if (fitInitialGraph(SETTLED_FIT_DURATION_MS)) {
      settledFitAppliedKeyRef.current = initialFocusKey;
    }
  }, [fitInitialGraph, initialFocusKey]);

  const markCameraInteraction = useCallback(() => {
    userCameraInteractedKeyRef.current = initialFocusKey;
  }, [initialFocusKey]);

  const renderReadmeStageCapture = useCallback(async () => {
    setReadmeStageControlsHidden(true);
    setReadmeStageCapture({
      dataUrl: null,
      error: null,
      rendering: true,
    });

    try {
      await waitForReadmeCaptureFrame();

      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(document.body, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        cacheBust: true,
        filter: (node) => {
          if (!(node instanceof Element)) {
            return true;
          }

          return !node.closest(
            "[data-readme-stage-controls], [data-readme-stage-result]"
          );
        },
        height: window.innerHeight,
        pixelRatio: 1,
        width: window.innerWidth,
      });

      setReadmeStageCapture({
        dataUrl,
        error: null,
        rendering: false,
      });
    } catch (error) {
      setReadmeStageCapture({
        dataUrl: null,
        error:
          error instanceof Error
            ? error.message
            : "The screenshot renderer failed.",
        rendering: false,
      });
    }
  }, []);

  useEffect(() => {
    if (!readmeStageMode) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "h") {
        event.preventDefault();
        setReadmeStageControlsHidden((hidden) => !hidden);
        return;
      }

      if (key === "c") {
        event.preventDefault();
        void renderReadmeStageCapture();
        return;
      }

      if (key === "f") {
        event.preventDefault();
        userCameraInteractedKeyRef.current = null;
        void fitInitialGraph(SETTLED_FIT_DURATION_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fitInitialGraph, readmeStageMode, renderReadmeStageCapture]);

  useEffect(() => {
    if (!readmeStageMode) {
      return;
    }

    document.documentElement.dataset.readmeStage = readmeStageControlsHidden
      ? "clean"
      : "editing";

    return () => {
      delete document.documentElement.dataset.readmeStage;
    };
  }, [readmeStageControlsHidden, readmeStageMode]);

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
        promotedMarkerHitAreas: promotedMarkerHitAreasRef.current,
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
        promotedMarkerHitAreas: promotedMarkerHitAreasRef.current,
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
    if (provisionalFitAppliedKeyRef.current === initialFocusKey) {
      return;
    }

    if (fitInitialGraph()) {
      provisionalFitAppliedKeyRef.current = initialFocusKey;
    }
  }, [fitInitialGraph, graphMountVersion, initialFocusKey]);

  useEffect(() => {
    const instance = graphRef.current;

    if (!instance) {
      return;
    }

    return installGraphForces({ instance, regions });
  }, [data, graphMountVersion, regions]);

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

      if (!publicDemo) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setSelectedMarkerId(null);
        setSelectedRegionId(null);
        setMarkdownReference(commandAction.reference);
        setStatusPanelOpen(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [commandAction, publicDemo]);

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

  const triggerPromotedMarkerTransitionRedraw = useCallback(() => {
    if (promotedMarkerTransitionTimersRef.current.start !== null) {
      window.clearTimeout(promotedMarkerTransitionTimersRef.current.start);
    }

    if (promotedMarkerTransitionTimersRef.current.stop !== null) {
      window.clearTimeout(promotedMarkerTransitionTimersRef.current.stop);
    }

    promotedMarkerTransitionTimersRef.current.start = window.setTimeout(() => {
      setPromotedMarkerTransitionRedraw(true);
    }, 0);
    promotedMarkerTransitionTimersRef.current.stop = window.setTimeout(() => {
      setPromotedMarkerTransitionRedraw(false);
      promotedMarkerTransitionTimersRef.current.start = null;
      promotedMarkerTransitionTimersRef.current.stop = null;
    }, PROMOTED_MARKER_TRANSITION_REDRAW_MS);
  }, []);

  useEffect(() => {
    const transitionTimers = promotedMarkerTransitionTimersRef.current;

    return () => {
      if (transitionTimers.start !== null) {
        window.clearTimeout(transitionTimers.start);
      }

      if (transitionTimers.stop !== null) {
        window.clearTimeout(transitionTimers.stop);
      }
    };
  }, []);

  return (
    <section
      aria-label="Orchestration graph"
      className="h-full min-h-0 overflow-hidden bg-background text-foreground"
    >
      <div
        ref={containerRef}
        className="relative h-full min-h-[520px] bg-background"
        onPointerDown={markCameraInteraction}
        onWheelCapture={markCameraInteraction}
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
              autoPauseRedraw={
                !hasLoadingMarkers &&
                !markerLoaderTransitionRedraw &&
                !promotedMarkerTransitionRedraw
              }
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
              onRenderFramePost={(context, globalScale) => {
                const labelRects = drawRegionOverlays({
                  regions,
                  nodes: data.nodes,
                  context,
                  theme: canvasTheme,
                  globalScale,
                });
                const promotedMarkerHitAreas = drawPromotedMarkerIslands({
                  regions,
                  nodes: data.nodes,
                  context,
                  globalScale,
                  selectedMarkerId,
                  avoidanceRects: labelRects,
                });
                promotedMarkerHitAreasRef.current = promotedMarkerHitAreas;
                promotedMarkerIdsRef.current =
                  getPromotedMarkerIds(promotedMarkerHitAreas);
                const promotedMarkerSnapshot = promotedMarkerHitAreas
                  .map(
                    (hitArea) =>
                      `${hitArea.marker.id}:${hitArea.transitioning ? 1 : 0}:` +
                      `${Math.round(hitArea.rect.left)},${Math.round(
                        hitArea.rect.top
                      )}`
                  )
                  .join("|");

                if (promotedMarkerSnapshotRef.current === null) {
                  promotedMarkerSnapshotRef.current = promotedMarkerSnapshot;
                } else if (
                  promotedMarkerSnapshotRef.current !== promotedMarkerSnapshot
                ) {
                  promotedMarkerSnapshotRef.current = promotedMarkerSnapshot;
                  triggerPromotedMarkerTransitionRedraw();
                }
              }}
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
                  promotedMarkerIds: promotedMarkerIdsRef.current,
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
              onEngineStop={fitSettledInitialGraph}
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
          projectionQualityWarnings={projectionQualityWarnings}
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
          onOpenMarkdownReference={publicDemo ? undefined : setMarkdownReference}
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

        {readmeStageMode ? (
          <ReadmeScreenshotStageControls
            captureError={readmeStageCapture.error}
            capturedImageUrl={readmeStageCapture.dataUrl}
            capturing={readmeStageCapture.rendering}
            controlsHidden={readmeStageControlsHidden}
            onClearCapture={() =>
              setReadmeStageCapture({
                dataUrl: null,
                error: null,
                rendering: false,
              })
            }
            onFit={() => {
              userCameraInteractedKeyRef.current = null;
              void fitInitialGraph(SETTLED_FIT_DURATION_MS);
            }}
            onHide={() => setReadmeStageControlsHidden(true)}
            onRender={renderReadmeStageCapture}
          />
        ) : null}
      </div>
    </section>
  );
}

function getGraphFitBounds(
  nodes: Array<{ x?: number; y?: number; visualRadius?: number }>
) {
  const positionedNodes = nodes.filter(
    (node): node is { x: number; y: number; visualRadius?: number } =>
      Number.isFinite(node.x) && Number.isFinite(node.y)
  );

  if (positionedNodes.length === 0) {
    return null;
  }

  return positionedNodes.reduce(
    (bounds, node) => {
      const radius = (node.visualRadius ?? 48) + FIT_WORLD_PADDING;

      return {
        left: Math.min(bounds.left, node.x - radius),
        right: Math.max(bounds.right, node.x + radius),
        top: Math.min(bounds.top, node.y - radius),
        bottom: Math.max(bounds.bottom, node.y + radius),
      };
    },
    {
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    }
  );
}

async function waitForReadmeCaptureFrame() {
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
  await new Promise((resolve) => window.setTimeout(resolve, 80));
}

function getVisibleFitViewport(
  container: HTMLDivElement,
  size: { width: number; height: number }
) {
  const margin =
    size.width < 700 ? FIT_VIEWPORT_MARGIN_MOBILE : FIT_VIEWPORT_MARGIN_DESKTOP;
  const containerRect = container.getBoundingClientRect();
  let left = margin;
  let right = size.width - margin;
  let top = margin;
  let bottom = size.height - margin;

  for (const element of document.querySelectorAll("aside, [data-graph-status-panel]")) {
    const overlay = getFixedOverlayElement(element);

    if (!overlay) {
      continue;
    }

    const rect = overlay.getBoundingClientRect();

    if (
      rect.width < MIN_OVERLAY_SIZE ||
      rect.height < MIN_OVERLAY_SIZE ||
      rect.right <= containerRect.left ||
      rect.left >= containerRect.right ||
      rect.bottom <= containerRect.top ||
      rect.top >= containerRect.bottom
    ) {
      continue;
    }

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (rect.height > containerRect.height * 0.35) {
      if (centerX < containerRect.left + containerRect.width / 2) {
        left = Math.max(left, rect.right - containerRect.left + margin);
      } else {
        right = Math.min(right, rect.left - containerRect.left - margin);
      }
    }

    if (rect.width > containerRect.width * 0.35) {
      if (centerY < containerRect.top + containerRect.height / 2) {
        top = Math.max(top, rect.bottom - containerRect.top + margin);
      } else {
        bottom = Math.min(bottom, rect.top - containerRect.top - margin);
      }
    }
  }

  if (right - left < MIN_VISIBLE_FIT_WIDTH || bottom - top < MIN_VISIBLE_FIT_HEIGHT) {
    return {
      left: margin,
      top: margin,
      width: Math.max(MIN_VISIBLE_FIT_WIDTH, size.width - margin * 2),
      height: Math.max(MIN_VISIBLE_FIT_HEIGHT, size.height - margin * 2),
    };
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function getFixedOverlayElement(element: Element) {
  let current: Element | null = element;

  while (current && current !== document.body) {
    if (window.getComputedStyle(current).position === "fixed") {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
