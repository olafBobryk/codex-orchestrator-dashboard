import path from "node:path";
import Link from "next/link";
import {
  BookOpenText,
  Bot,
  Clock3,
  ExternalLink,
  FileText,
  Folder,
  FolderCheck,
  FolderTree,
  FolderX,
  Layers3,
  ListChecks,
  Radio,
  RefreshCw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ORCHESTRATION_DIR,
  type DocGroup,
  type OrchestrationDoc,
  readWorkspace,
} from "@/lib/orchestration";
import {
  type CodexProject,
  type CodexProjectReadResult,
  readCodexProjects,
} from "@/lib/codex-projects";
import {
  type CodexLiveThread,
  type CodexLiveThreadsResult,
  readCodexLiveThreads,
} from "@/lib/codex-threads";
import { cn } from "@/lib/utils";
import { WorkspacePathMenu } from "@/components/workspace-path-menu";
import { WorkspaceStatusBanner } from "@/components/workspace-status-banner";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const groups: DocGroup[] = ["Core", "Packets", "Ledgers", "Doc Summaries"];

export default async function Home({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedWorkspace = readParam(params.workspace);
  const codexProjects = await readCodexProjects();
  const workspace = requestedWorkspace || codexProjects.projects[0]?.path || "";
  const [result, liveThreads] = await Promise.all([
    readWorkspace(workspace),
    readCodexLiveThreads(workspace),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[340px_minmax(0,1fr)]">
        <ProjectSidebar
          codexProjects={codexProjects}
          workspace={workspace}
          resolvedWorkspace={result.resolvedWorkspace}
        />

        <div className="min-w-0 lg:border-l lg:border-border">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-border pb-5">
              <div className="max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Local sidecar</Badge>
                  <Badge variant="outline">Plain Markdown</Badge>
                  <Badge variant="outline">Codex projects</Badge>
                </div>
                <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                  Codex Orchestrator Sidecar
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Read project-local orchestration docs without replacing Codex
                  chat, running implementation work, or generating prompts.
                </p>
              </div>
            </header>

            <WorkspaceStatusBanner result={result} />

            <LiveThreadsPanel liveThreads={liveThreads} />

            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard
                icon={<FileText />}
                label="Markdown docs"
                value={result.counts.docs}
              />
              <MetricCard
                icon={<Layers3 />}
                label="Packets"
                value={result.counts.packets}
              />
              <MetricCard
                icon={<ListChecks />}
                label="Ledgers"
                value={result.counts.ledgers}
              />
              <MetricCard
                icon={<BookOpenText />}
                label="Summaries"
                value={result.counts.summaries + result.counts.handoffs}
              />
            </section>

            <section>
              <Card className="min-w-0">
                <CardHeader className="gap-2">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle>Workspace Summary</CardTitle>
                      <CardDescription>
                        Tolerant summaries from Markdown files in
                        <span className="font-mono"> .codex-orchestration/</span>.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DocTabs
                    docs={result.docs}
                    workspace={result.resolvedWorkspace ?? workspace}
                  />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function ProjectSidebar({
  codexProjects,
  workspace,
  resolvedWorkspace,
}: {
  codexProjects: CodexProjectReadResult;
  workspace: string;
  resolvedWorkspace: string | null;
}) {
  const refreshHref = workspace
    ? `/?workspace=${encodeURIComponent(workspace)}&refresh=projects`
    : "/?refresh=projects";

  return (
    <aside className="flex min-h-screen min-w-0 flex-col bg-sidebar px-3 py-4 text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold">Projects</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={refreshHref}
            title="Refresh projects"
            aria-label="Refresh projects"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Link>
          <WorkspacePathMenu workspace={workspace} />
        </div>
      </div>

      <Separator className="my-4" />

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <CodexProjectList
          projects={codexProjects.projects}
          currentWorkspace={resolvedWorkspace ?? workspace}
        />
      </ScrollArea>
    </aside>
  );
}

function LiveThreadsPanel({
  liveThreads,
}: {
  liveThreads: CodexLiveThreadsResult;
}) {
  return (
    <section className="grid gap-3" aria-label="Live agents">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-base font-medium">Live agents</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <Badge variant="secondary">{liveThreads.counts.agents} agents</Badge>
          <Badge variant="outline">{liveThreads.counts.active} threads</Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{liveThreads.message}</p>

      {liveThreads.threads.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {liveThreads.threads.slice(0, 8).map((thread) => (
            <LiveThreadItem key={thread.id} thread={thread} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LiveThreadItem({ thread }: { thread: CodexLiveThread }) {
  const isAgent = Boolean(thread.agentName) || thread.threadSource === "subagent";
  const Icon = isAgent ? Bot : Radio;

  return (
    <div className="grid min-w-0 gap-2 rounded-md border bg-card px-3 py-2.5 text-card-foreground">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {thread.agentName ?? (isAgent ? "Spawned agent" : "User thread")}
        </span>
        {thread.agentRole ? (
          <Badge variant="outline" className="shrink-0">
            {thread.agentRole}
          </Badge>
        ) : null}
      </div>
      <p className="truncate text-sm text-muted-foreground" title={thread.title}>
        {thread.title}
      </p>
      <div className="flex min-w-0 items-center gap-1.5 text-[0.7rem] text-muted-foreground">
        <Clock3 className="h-3 w-3 shrink-0" />
        <span className="truncate">{formatThreadTime(thread.updatedAt)}</span>
        <span className="font-mono">{thread.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

function CodexProjectList({
  projects,
  currentWorkspace,
}: {
  projects: CodexProject[];
  currentWorkspace: string;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-sidebar-border bg-background/50 p-4 text-sm text-muted-foreground">
        Codex local projects are not available. Use the workspace path field to
        load a project manually.
      </div>
    );
  }

  return (
    <nav aria-label="Codex projects" className="grid gap-1">
      {projects.map((project) => (
        <CodexProjectLink
          key={project.path}
          project={project}
          isCurrent={project.path === currentWorkspace}
        />
      ))}
    </nav>
  );
}

function CodexProjectLink({
  project,
  isCurrent,
}: {
  project: CodexProject;
  isCurrent: boolean;
}) {
  const Icon =
    project.state === "ready"
      ? FolderCheck
      : project.state === "missing_docs"
        ? Folder
        : FolderX;

  return (
    <Link
      href={`/?workspace=${encodeURIComponent(project.path)}`}
      title={project.path}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "grid min-w-0 gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
        "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isCurrent
          ? "border-border bg-background"
          : "border-transparent bg-transparent"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{project.name}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Badge variant={project.state === "ready" ? "secondary" : "outline"}>
          {projectStatusLabel(project.state)}
        </Badge>
        {project.isActive ? <Badge variant="outline">Active</Badge> : null}
      </span>
    </Link>
  );
}

function projectStatusLabel(state: CodexProject["state"]) {
  if (state === "ready") {
    return "Docs";
  }

  if (state === "missing_docs") {
    return "No docs";
  }

  return "Missing";
}

function formatThreadTime(value: string | null) {
  if (!value) {
    return "Updated time unknown";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">{icon}</div>
      </CardContent>
    </Card>
  );
}

function DocTabs({
  docs,
  workspace,
}: {
  docs: OrchestrationDoc[];
  workspace: string;
}) {
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/25 p-8 text-center">
        <Search className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 text-sm font-medium">No Markdown docs loaded</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Create project-local docs under
          <span className="font-mono"> .codex-orchestration/</span>, then load
          the workspace again.
        </p>
      </div>
    );
  }

  const defaultGroup = docs[0].group;

  return (
    <Tabs defaultValue={defaultGroup} className="gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        {groups.map((group) => {
          const count = docs.filter((doc) => doc.group === group).length;

          return (
            <TabsTrigger
              key={group}
              value={group}
              disabled={count === 0}
              className="flex-none px-3"
            >
              {group}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {count}
              </Badge>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {groups.map((group) => (
        <TabsContent key={group} value={group}>
          <DocTable
            docs={docs.filter((doc) => doc.group === group)}
            workspace={workspace}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DocTable({
  docs,
  workspace,
}: {
  docs: OrchestrationDoc[];
  workspace: string;
}) {
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
        No Markdown files found for this group.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doc</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead className="w-36 text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => {
            const vscodeHref = createVsCodeDocHref(workspace, doc.relativePath);

            return (
              <TableRow key={doc.relativePath}>
                <TableCell className="min-w-48 align-top">
                  <a
                    href={vscodeHref}
                    title="Open Markdown file in VS Code"
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {doc.title}
                  </a>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {doc.relativePath}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  {doc.status ? (
                    <Badge variant="outline">{doc.status}</Badge>
                  ) : (
                    <Badge variant="secondary">Unstated</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xl align-top text-sm text-muted-foreground">
                  {doc.excerpt}
                </TableCell>
                <TableCell className="align-top text-right">
                  <a
                    href={vscodeHref}
                    title="Open Markdown file in VS Code"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    VS Code
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function createVsCodeDocHref(workspace: string, relativePath: string) {
  const docPath = path.join(workspace, ORCHESTRATION_DIR, relativePath);

  return `vscode://file${encodeURI(docPath)}`;
}
