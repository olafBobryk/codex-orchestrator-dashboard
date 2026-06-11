"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import type { SVGProps } from "react";
import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import type { CodexProject, CodexProjectActivity } from "@/lib/codex-projects";
import { cn } from "@/lib/utils";

const ACTIVITY_POLL_INTERVAL_MS = 5_000;

type ProjectActivityResponse = {
  activityByPath?: Record<string, CodexProjectActivity>;
};

export function CodexProjectList({
  projects,
  currentWorkspace,
}: {
  projects: CodexProject[];
  currentWorkspace: string;
}) {
  const [activityByPath, setActivityByPath] = useState<
    Record<string, CodexProjectActivity>
  >({});
  const [runtimeReady, setRuntimeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshActivity = async () => {
      if (!cancelled) {
        setRuntimeReady(true);
      }

      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await fetch("/api/codex-project-activity", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ProjectActivityResponse;
        if (!cancelled) {
          setActivityByPath(payload.activityByPath ?? {});
        }
      } catch {
        // Keep the server-rendered activity snapshot if runtime polling fails.
      }
    };

    const interval = window.setInterval(
      refreshActivity,
      ACTIVITY_POLL_INTERVAL_MS
    );
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshActivity();
      }
    };

    void refreshActivity();
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

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
      {projects.map((project) => {
        const activity = runtimeReady
          ? activityByPath[project.path] ?? project.activity
          : project.activity;

        return (
          <CodexProjectLink
            key={project.path}
            project={{
              ...project,
              activity,
            }}
            isCurrent={project.path === currentWorkspace}
          />
        );
      })}
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
  const hasReadyOrchestration = project.state === "ready";
  const Icon = hasReadyOrchestration ? FilledFolderCheckIcon : Folder;
  const activityTitle = getProjectActivityTitle(project);
  const orchestrationTitle = getProjectStateTitle(project);

  return (
    <Link
      href={`/?workspace=${encodeURIComponent(project.path)}`}
      prefetch={false}
      title={[project.path, orchestrationTitle, activityTitle]
        .filter(Boolean)
        .join("\n")}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:size-9 group-data-[collapsed=true]/sidebar:place-items-center group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:p-0",
        "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isCurrent
          ? "border-border bg-background"
          : "border-transparent bg-transparent"
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          hasReadyOrchestration ? "text-foreground" : "text-muted-foreground"
        )}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsed=true]/sidebar:hidden">
        {project.name}
      </span>
      <ProjectActivityIndicator project={project} />
    </Link>
  );
}

function FilledFolderCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        d="M3 7.75A2.75 2.75 0 0 1 5.75 5h4.1c.74 0 1.45.3 1.97.82L13 7h5.25A2.75 2.75 0 0 1 21 9.75v6.5A2.75 2.75 0 0 1 18.25 19H5.75A2.75 2.75 0 0 1 3 16.25v-8.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="m10.3 14.05 1.35 1.35 3.35-3.35"
        stroke="var(--sidebar)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ProjectActivityIndicator({ project }: { project: CodexProject }) {
  if (project.activity.unreadThreads > 0) {
    return (
      <span
        aria-label={`${project.activity.unreadThreads} unread thread${
          project.activity.unreadThreads === 1 ? "" : "s"
        }`}
        className="ml-auto flex size-3.5 shrink-0 items-center justify-center group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-1 group-data-[collapsed=true]/sidebar:top-1 group-data-[collapsed=true]/sidebar:ml-0"
      >
        <span className="size-2 rounded-full bg-[#0a84ff]" />
      </span>
    );
  }

  if (project.activity.workingAgentThreads > 0) {
    return (
      <Loader
        aria-label={`${project.activity.workingAgentThreads} working agent thread${
          project.activity.workingAgentThreads === 1 ? "" : "s"
        }`}
        size="sm"
        surface="sidebar-collapsed"
        className="ml-auto group-data-[collapsed=true]/sidebar:absolute group-data-[collapsed=true]/sidebar:right-1 group-data-[collapsed=true]/sidebar:top-1 group-data-[collapsed=true]/sidebar:ml-0"
      />
    );
  }

  return null;
}

function getProjectStateTitle(project: CodexProject) {
  if (project.state === "ready") {
    return "Ready orchestration layer";
  }

  if (project.state === "missing_docs") {
    return "Missing .codex-orchestration";
  }

  return "Missing project directory";
}

function getProjectActivityTitle(project: CodexProject) {
  if (project.activity.unreadThreads > 0) {
    return `${project.activity.unreadThreads} unread thread${
      project.activity.unreadThreads === 1 ? "" : "s"
    }`;
  }

  if (project.activity.workingAgentThreads > 0) {
    return `${project.activity.workingAgentThreads} working agent thread${
      project.activity.workingAgentThreads === 1 ? "" : "s"
    }`;
  }

  return null;
}
