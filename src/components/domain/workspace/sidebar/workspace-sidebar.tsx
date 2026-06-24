import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DashboardCommandTrigger } from "../dashboard-command";
import { isPublicDemoDashboard } from "../dashboard-mode";
import { CodexProjectList } from "./project-list";
import { ReloadButton } from "./reload-button";
import { WorkspaceSidebarShell } from "./shell";
import type { WorkspaceSidebarProps } from "./types";
import { WorkspacePathMenu } from "./workspace-menu";

export function WorkspaceSidebar({
  codexProjects,
  dashboardMode = "local",
  workspace,
  resolvedWorkspace,
  onOpenCommand,
  commandOpen = false,
}: WorkspaceSidebarProps) {
  const isHome = !workspace;
  const currentWorkspace = resolvedWorkspace ?? workspace;
  const publicDemo = isPublicDemoDashboard(dashboardMode);

  return (
    <WorkspaceSidebarShell
      headerStart={
        <div className="flex min-w-0 items-center gap-2 group-data-[collapsed=true]/sidebar:hidden">
          <h2 className="truncate text-sm font-semibold">Codex Orchestration</h2>
        </div>
      }
      headerActions={
        <>
          {onOpenCommand ? (
            <DashboardCommandTrigger
              open={commandOpen}
              onOpen={onOpenCommand}
            />
          ) : null}
          {publicDemo ? null : (
            <>
              <ReloadButton />
              <WorkspacePathMenu workspace={workspace} />
            </>
          )}
        </>
      }
    >
      <Separator className="mt-4" />

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-3 pr-5 group-data-[collapsed=true]/sidebar:px-2 group-data-[collapsed=true]/sidebar:pr-2">
          <nav aria-label="Home" className="mb-3">
            <Link
              href="/"
              prefetch={false}
              aria-current={isHome ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-sm font-medium transition-colors group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:size-9 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:p-0",
                "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isHome
                  ? "border-border bg-background"
                  : "border-transparent bg-transparent"
              )}
            >
              <HomeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="group-data-[collapsed=true]/sidebar:hidden">Home</span>
            </Link>
          </nav>
          <CodexProjectList
            projects={codexProjects.projects}
            currentWorkspace={currentWorkspace}
            dashboardMode={dashboardMode}
          />
        </div>
      </ScrollArea>
    </WorkspaceSidebarShell>
  );
}
