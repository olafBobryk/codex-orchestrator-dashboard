import Link from "next/link";
import { Folder, FolderCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CodexProject } from "@/lib/codex-projects";
import { cn } from "@/lib/utils";

export function CodexProjectList({
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
  const Icon = project.isActive ? FolderCheck : Folder;

  return (
    <Link
      href={`/?workspace=${encodeURIComponent(project.path)}`}
      title={project.path}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "grid min-w-0 gap-1 rounded-md border px-2.5 py-2 text-left transition-colors group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:flex group-data-[collapsed=true]/sidebar:size-9 group-data-[collapsed=true]/sidebar:place-items-center group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:p-0",
        "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isCurrent
          ? "border-border bg-background"
          : "border-transparent bg-transparent"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium group-data-[collapsed=true]/sidebar:hidden">
          {project.name}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5 group-data-[collapsed=true]/sidebar:hidden">
        <Badge variant={project.isActive ? "secondary" : "outline"}>
          {project.isActive ? "Active" : "Inactive"}
        </Badge>
      </span>
    </Link>
  );
}
