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
  OrchestrationGraph,
} from "@/lib/orchestration-graph";

export type CanvasNode = GraphNode & {
  color: string;
  markers: GraphMarker[];
  guideX: number;
  guideY: number;
  edgeAnchored: boolean;
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
  workspace: string;
  stats: GraphCanvasStats;
  renderDetailPanel: (props: GraphDetailPanelProps) => ReactNode;
  renderStatusPanel: (props: GraphStatusPanelProps) => ReactNode;
};

export type NodeSignalPanel =
  | "files"
  | "verification"
  | "git"
  | "runtime"
  | "related"
  | "missing";

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
  onSelectMarker: (markerId: string | null) => void;
  onClose: () => void;
};

export type GraphStatusPanelProps = {
  graph: OrchestrationGraph;
  stats: GraphCanvasStats;
  packetColors: Map<string, string>;
  visiblePackets: GraphPacketGroup[];
  primaryChunkCount: number;
  supportNodeCount: number;
  edgeCount: number;
  flowSignalCounts: Array<{ type: GraphEdge["type"]; count: number }>;
  runtimeAnnotationCount: number;
  sourceStatus: string;
  primaryNodes: CanvasNode[];
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
};
