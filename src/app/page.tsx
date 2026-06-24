import Link from "next/link";
import {
  readWorkspace,
  type WorkspaceReadResult,
} from "@/lib/orchestration/workspace";
import {
  type CodexProjectReadResult,
  readCodexProjects,
} from "@/lib/codex/projects";
import { readCodexLiveThreads } from "@/lib/codex/threads";
import {
  WorkspaceDashboard,
  WorkspacePathMenu,
  WorkspaceSidebar,
  WorkspaceStatusToast,
} from "@/components/domain/workspace";
import { readGraphProjection } from "@/lib/graph/projection";
import { buildMarkdownGraph, readParam } from "@/lib/workspace-dashboard";
import {
  PUBLIC_EXAMPLE_WORKSPACE,
  publicExampleGraph,
  publicExampleProjects,
} from "@/lib/demo/public-example";
import { isPublicDemoMode } from "@/lib/demo/public-demo-mode";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  if (isPublicDemoMode()) {
    return <PublicExampleDashboard />;
  }

  const params = (await searchParams) ?? {};
  const requestedWorkspace = readParam(params.workspace);
  const codexProjects = await readCodexProjects();
  const workspace = requestedWorkspace.trim();

  if (
    workspace === PUBLIC_EXAMPLE_WORKSPACE ||
    (!workspace && codexProjects.state === "missing_file")
  ) {
    return <PublicExampleDashboard />;
  }

  if (!workspace) {
    return <HomePage codexProjects={codexProjects} />;
  }

  const result = await readWorkspace(workspace);

  if (result.state !== "ready") {
    return (
      <HomePage
        codexProjects={codexProjects}
        statusResult={result}
        workspacePathMenuValue={workspace}
      />
    );
  }

  const resolvedWorkspace = result.resolvedWorkspace ?? workspace;
  const orchestrationWorkspace = result.orchestrationPath ?? resolvedWorkspace;
  const liveThreads = await readCodexLiveThreads(resolvedWorkspace);
  const projection =
    await readGraphProjection(orchestrationWorkspace);
  const graph =
    projection?.state === "ready"
      ? projection.graph
      : await buildMarkdownGraph(result.docs, resolvedWorkspace, liveThreads);
  const projectionQualityWarnings =
    projection.state === "ready" ? projection.qualityWarnings : [];

  return (
    <main className="relative min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <WorkspaceDashboard
        codexProjects={codexProjects}
        graph={graph}
        orchestrationWorkspace={orchestrationWorkspace}
        projectionQualityWarnings={projectionQualityWarnings}
        resolvedWorkspace={resolvedWorkspace}
        workspace={workspace}
        stats={{
          docs: result.counts.docs,
          packets: result.counts.packets,
          ledgers: result.counts.ledgers,
          summaries: result.counts.summaries + result.counts.handoffs,
          liveAgents: liveThreads.counts.agents,
          activeThreads: liveThreads.counts.active,
        }}
      />
    </main>
  );
}

function PublicExampleDashboard() {
  return (
    <main className="relative min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <WorkspaceDashboard
        codexProjects={publicExampleProjects}
        graph={publicExampleGraph}
        dashboardMode="public-demo"
        orchestrationWorkspace={PUBLIC_EXAMPLE_WORKSPACE}
        projectionQualityWarnings={[]}
        resolvedWorkspace={PUBLIC_EXAMPLE_WORKSPACE}
        workspace={PUBLIC_EXAMPLE_WORKSPACE}
        stats={{
          docs: publicExampleGraph.nodes.length + publicExampleGraph.regions.length,
          packets: publicExampleGraph.packets.length,
          ledgers: 0,
          summaries: publicExampleGraph.nodes.length,
          liveAgents: 0,
          activeThreads: 0,
        }}
      />
    </main>
  );
}

function HomePage({
  codexProjects,
  statusResult,
  workspacePathMenuValue = "",
}: {
  codexProjects: CodexProjectReadResult;
  statusResult?: WorkspaceReadResult;
  workspacePathMenuValue?: string;
}) {
  return (
    <main className="relative min-h-screen bg-background lg:h-screen lg:overflow-hidden">
      <WorkspaceSidebar
        codexProjects={codexProjects}
        workspace=""
        resolvedWorkspace={null}
      />
      <HomeSurface
        codexProjects={codexProjects}
        statusResult={statusResult}
        workspacePathMenuValue={workspacePathMenuValue}
      />
    </main>
  );
}

function HomeSurface({
  codexProjects,
  statusResult,
  workspacePathMenuValue = "",
}: {
  codexProjects: CodexProjectReadResult;
  statusResult?: WorkspaceReadResult;
  workspacePathMenuValue?: string;
}) {
  const readyProjects = codexProjects.projects.filter(
    (project) => project.state === "ready"
  );
  const firstReadyProject = readyProjects[0];

  return (
    <section className="grid min-h-screen place-items-center px-6 lg:h-screen lg:min-h-0">
      <div className="w-full max-w-2xl">
        {statusResult ? (
          <WorkspaceStatusToast result={statusResult} />
        ) : null}
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Codex Orchestrator Sidecar
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Select a project to inspect its orchestration graph, returned work,
          live agent annotations, and source-of-truth state.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {firstReadyProject ? (
            <Link
              href={`/?workspace=${encodeURIComponent(firstReadyProject.path)}`}
              prefetch={false}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Open first project
            </Link>
          ) : null}
          <WorkspacePathMenu workspace={workspacePathMenuValue} />
        </div>
      </div>
    </section>
  );
}
