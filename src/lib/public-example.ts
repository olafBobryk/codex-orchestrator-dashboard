import projection from "@/data/public-example-projection.json";
import type { CodexProjectReadResult } from "@/lib/codex-projects";
import {
  buildProjectionGraph,
  type RawProjection,
} from "@/lib/graph-projection";

export const PUBLIC_EXAMPLE_WORKSPACE = "/public/static-shape-strategy-example";

export const publicExampleGraph = buildProjectionGraph(
  projection as RawProjection,
  {
    relativePath: "public-example-projection.json",
    sourceLabel: "Public static projection",
    sourceLayer: "graph_projection",
    extractionRules: [
      "This public example feeds a static JSON projection into the real dashboard graph renderer.",
      "The production sidecar still reads local project Markdown from .codex-orchestration/.",
      "Local filesystem, Codex runtime, service, and VS Code actions are disabled for this public demo.",
    ],
  }
);

export const publicExampleProjects: CodexProjectReadResult = {
  state: "ready",
  sourcePath: "public-example-projection.json",
  message: "Public static example data.",
  projects: [
    {
      path: PUBLIC_EXAMPLE_WORKSPACE,
      name: "Static Shape Strategy",
      isActive: true,
      order: 0,
      state: "ready",
      activity: {
        activeThreads: 2,
        unreadThreads: 0,
        workingAgentThreads: 2,
        updatedAt: null,
      },
    },
  ],
  counts: {
    projects: 1,
    ready: 1,
    active: 1,
  },
};
