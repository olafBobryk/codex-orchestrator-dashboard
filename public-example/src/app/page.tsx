import { WorkspaceDashboard } from "@/components/domain/workspace";
import {
  buildProjectionGraph,
  type RawProjection,
} from "@/lib/graph-projection";
import type { CodexProjectReadResult } from "@/lib/codex-projects";
import projection from "@/data/public-example-projection.json";

const PUBLIC_WORKSPACE = "/public/static-shape-strategy-example";

const graph = buildProjectionGraph(projection as RawProjection, {
  relativePath: "public-example-projection.json",
  sourceLabel: "Public static projection",
  sourceLayer: "graph_projection",
  extractionRules: [
    "This public example feeds a static JSON projection into the real dashboard graph renderer.",
    "The production sidecar still reads local project Markdown from .codex-orchestration/.",
    "Local filesystem, Codex runtime, service, and VS Code actions are disabled for this public demo.",
  ],
});

const codexProjects: CodexProjectReadResult = {
  state: "ready",
  sourcePath: "public-example-projection.json",
  message: "Public static example data.",
  projects: [
    {
      path: PUBLIC_WORKSPACE,
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

export default function Home() {
  return (
    <main className="relative min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <WorkspaceDashboard
        codexProjects={codexProjects}
        graph={graph}
        projectionQualityWarnings={[]}
        resolvedWorkspace={PUBLIC_WORKSPACE}
        workspace={PUBLIC_WORKSPACE}
        stats={{
          docs: 1,
          packets: graph.packets.length,
          ledgers: 0,
          summaries: graph.nodes.length,
          liveAgents: graph.markers.length,
          activeThreads: 0,
        }}
      />
    </main>
  );
}
