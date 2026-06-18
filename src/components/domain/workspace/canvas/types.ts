import type { Ref } from "react";
import type { ReactNode } from "react";
import type {
  ForceGraphMethods,
  ForceGraphProps,
} from "react-force-graph-2d";
import type {
  GraphEdge,
  GraphMarker,
  GraphNode,
  GraphPacketGroup,
  GraphRegion,
  OrchestrationGraph,
} from "@/lib/orchestration-graph";
import type { GraphProjectionQualityWarning } from "@/lib/graph-projection";
import type { DashboardMode } from "../dashboard-mode";

export type CanvasNode = GraphNode & {
  color: string;
  markers: GraphMarker[];
  regionIds: string[];
  guideX: number;
  guideY: number;
  radius: number;
  visualRadius: number;
  boxWidth: number;
  boxHeight: number;
  offSource: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

export type CanvasLink = GraphEdge & {
  color: string;
  width: number;
  dash: number[] | null;
  crossesRegionBoundary: boolean;
};

export type CanvasRegion = GraphRegion & {
  color: string;
};

export type GraphMethods = ForceGraphMethods<CanvasNode, CanvasLink>;

export type GraphProps = ForceGraphProps<CanvasNode, CanvasLink> & {
  ref?: Ref<GraphMethods>;
};

export type CanvasTheme = {
  surface: string;
  surfaceForeground: string;
};

export type SignalMeta = {
  label: string;
  description: string;
  color: string;
};

export type OrchestrationGraphCanvasProps = {
  graph: OrchestrationGraph;
  dashboardMode?: DashboardMode;
  workspace: string;
  stats: GraphCanvasStats;
  projectionQualityWarnings: GraphProjectionQualityWarning[];
  commandAction?: GraphCanvasCommandAction | null;
  renderDetailPanel: (props: GraphDetailPanelProps) => ReactNode;
  renderEdgePanel: (props: GraphEdgePanelProps) => ReactNode;
  renderRegionPanel: (props: GraphRegionPanelProps) => ReactNode;
  renderMarkdownViewer: (props: GraphMarkdownViewerProps) => ReactNode;
  renderStatusPanel: (props: GraphStatusPanelProps) => ReactNode;
};

export type GraphCanvasStats = {
  docs: number;
  packets: number;
  ledgers: number;
  summaries: number;
  liveAgents: number;
  activeThreads: number;
};

export type GraphDetailPanelProps = {
  node: GraphNode;
  markers: GraphMarker[];
  selectedMarker: GraphMarker | null;
  edges: GraphEdge[];
  relatedNodes: GraphNode[];
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
  onSelectMarker: (markerId: string | null) => void;
  onClose: () => void;
};

export type GraphMarkdownReference = {
  label: string;
  relativePath: string;
};

export type GraphCanvasCommandAction =
  | {
      commandId: string;
      type: "show-status-panel";
    }
  | {
      commandId: string;
      type: "select-node";
      nodeId: string;
      markerId?: string | null;
    }
  | {
      commandId: string;
      type: "select-region";
      regionId: string;
    }
  | {
      commandId: string;
      type: "select-edge";
      edgeId: string;
    }
  | {
      commandId: string;
      type: "open-markdown-reference";
      reference: GraphMarkdownReference;
    };

export type GraphRegionPanelProps = {
  region: CanvasRegion;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
};

export type GraphEdgePanelProps = {
  edge: GraphEdge;
  sourceNode: GraphNode | null;
  targetNode: GraphNode | null;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
  onClose: () => void;
};

export type GraphMarkdownViewerProps = {
  workspace: string;
  reference: GraphMarkdownReference;
  onBack: () => void;
};

export type GraphStatusPanelProps = {
  graph: OrchestrationGraph;
  stats: GraphCanvasStats;
  projectionQualityWarnings: GraphProjectionQualityWarning[];
  packetColors: Map<string, string>;
  visiblePackets: GraphPacketGroup[];
  flowSignalCounts: Array<{ type: GraphEdge["type"]; count: number }>;
  runtimeAnnotationCount: number;
  sourceStatus: string;
  primaryNodes: CanvasNode[];
  onSelectNode: (nodeId: string, markerId?: string | null) => void;
  onClose: () => void;
};
