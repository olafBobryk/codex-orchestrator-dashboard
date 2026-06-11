import type { GraphEdge, GraphNode, GraphStatus } from "@/lib/orchestration-graph";
import type { CanvasLink, CanvasTheme, SignalMeta } from "./types";

export const PACKET_PALETTE = [
  "#2563eb",
  "#0f766e",
  "#d97706",
  "#7c3aed",
  "#be123c",
  "#0891b2",
  "#4f46e5",
  "#16a34a",
];

export const DEFAULT_CANVAS_THEME: CanvasTheme = {
  surface: "#27272a",
  surfaceForeground: "#fafafa",
};

export const DEFAULT_GRAPH_NEUTRAL_STROKE = "#94a3b8";

export const STATUS_COLORS: Record<
  GraphStatus,
  { fill: string; stroke: string }
> = {
  queued: { fill: "#f8fafc", stroke: DEFAULT_GRAPH_NEUTRAL_STROKE },
  in_progress: { fill: "#eff6ff", stroke: "#2563eb" },
  needs_human: { fill: "#fff7ed", stroke: "#d97706" },
  blocked: { fill: "#fff1f2", stroke: "#be123c" },
  fixed: { fill: "#f0fdfa", stroke: "#0f766e" },
  verified: { fill: "#f0fdf4", stroke: "#16a34a" },
  signed_off: { fill: "#eef2ff", stroke: "#4f46e5" },
  complete: { fill: "#f8fafc", stroke: "#64748b" },
  superseded: { fill: "#f1f5f9", stroke: DEFAULT_GRAPH_NEUTRAL_STROKE },
  resolved: { fill: "#f0fdf4", stroke: "#16a34a" },
  deferred: { fill: "#fafaf9", stroke: "#a8a29e" },
  unknown: { fill: "#f8fafc", stroke: "#cbd5e1" },
};

export const STATUS_META: Record<GraphStatus, SignalMeta> = {
  queued: {
    label: "Queued",
    description: "Planned work that has not started yet.",
    color: DEFAULT_GRAPH_NEUTRAL_STROKE,
  },
  in_progress: {
    label: "In progress",
    description: "Active work currently being implemented or reviewed.",
    color: "#2563eb",
  },
  needs_human: {
    label: "Needs human",
    description: "A human decision or review is needed before this can move.",
    color: "#d97706",
  },
  blocked: {
    label: "Blocked",
    description: "Progress is stopped by a recorded blocker.",
    color: "#be123c",
  },
  fixed: {
    label: "Fixed",
    description: "A correction was made and is ready for verification.",
    color: "#0f766e",
  },
  verified: {
    label: "Verified",
    description: "Evidence says this work passed its checks.",
    color: "#16a34a",
  },
  signed_off: {
    label: "Signed off",
    description: "The orchestrator accepted this work as complete.",
    color: "#4f46e5",
  },
  complete: {
    label: "Complete",
    description: "The work is complete, with no stronger verification state recorded.",
    color: "#64748b",
  },
  superseded: {
    label: "Superseded",
    description: "This item was replaced by a newer accepted direction.",
    color: DEFAULT_GRAPH_NEUTRAL_STROKE,
  },
  resolved: {
    label: "Resolved",
    description: "A concern or blocker was dispositioned as resolved.",
    color: "#16a34a",
  },
  deferred: {
    label: "Deferred",
    description: "This was intentionally postponed.",
    color: "#a8a29e",
  },
  unknown: {
    label: "Unknown",
    description: "The normalized docs did not provide a known status.",
    color: "#cbd5e1",
  },
};

export const KIND_META: Record<GraphNode["kind"], SignalMeta> = {
  chunk: {
    label: "Chunk",
    description: "Primary packet work item shown as a main graph node.",
    color: "#2563eb",
  },
  handoff: {
    label: "Handoff",
    description: "Returned worker evidence attached to packet work.",
    color: "#16a34a",
  },
  concern: {
    label: "Concern",
    description: "A recorded risk, blocker, or review concern.",
    color: "#d97706",
  },
  checkpoint: {
    label: "Checkpoint",
    description: "A durable orchestration milestone.",
    color: "#7c3aed",
  },
  thread: {
    label: "Thread",
    description: "Codex runtime annotation, not a durable workflow node.",
    color: "#0891b2",
  },
};

export const LINK_COLORS: Record<CanvasLink["type"], string> = {
  annotates: DEFAULT_GRAPH_NEUTRAL_STROKE,
  blocked: "#be123c",
  detour: "#d97706",
  documents: DEFAULT_GRAPH_NEUTRAL_STROKE,
  repass: "#7c3aed",
  returned: "#16a34a",
  sequence: "#2563eb",
  spawned: "#0891b2",
  verified: "#16a34a",
};

export const GRAPH_EDGE_SIGNAL_ORDER: GraphEdge["type"][] = [
  "sequence",
  "spawned",
  "returned",
  "detour",
  "repass",
  "blocked",
  "verified",
  "documents",
  "annotates",
];

export const GRAPH_VERTICAL_CENTER_Y = 820;
