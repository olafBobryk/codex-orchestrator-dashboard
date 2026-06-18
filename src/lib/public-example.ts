import projection from "@/data/public-example-projection.json";
import type { CodexProjectReadResult } from "@/lib/codex-projects";
import {
  buildProjectionGraph,
  type RawProjection,
} from "@/lib/graph-projection";

export const PUBLIC_EXAMPLE_WORKSPACE = "/public/generic-orchestration-map";

export const publicExampleGraph = buildProjectionGraph(
  projection as RawProjection,
  {
    relativePath: "public-example-projection.json",
    sourceLabel: "Public static projection",
    sourceLayer: "graph_projection",
    extractionRules: [
      "This public demo feeds a sanitized static JSON fixture into the real dashboard graph renderer.",
      "The local sidecar reads project Markdown from .codex-orchestration/ only outside public demo mode.",
      "Filesystem reads, Codex runtime polling, service controls, API-backed actions, and editor links are disabled for this public demo.",
    ],
  }
);

export const publicExampleProjects: CodexProjectReadResult = {
  state: "ready",
  sourcePath: "public-example-projection.json",
  message: "Public demo fixture data.",
  projects: [
    {
      path: PUBLIC_EXAMPLE_WORKSPACE,
      name: "Generic Orchestration Map",
      isActive: true,
      order: 0,
      state: "ready",
      activity: {
        activeThreads: 0,
        unreadThreads: 0,
        workingAgentThreads: 0,
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
