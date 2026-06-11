"use client";

import Link from "next/link";
import { Folder, FolderCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import type { CodexProject, CodexProjectActivity } from "@/lib/codex-projects";
import { cn } from "@/lib/utils";

const ACTIVITY_POLL_INTERVAL_MS = 5_000;
const EMPTY_PROJECT_ACTIVITY: CodexProjectActivity = {
  activeThreads: 0,
  unreadThreads: 0,
  workingAgentThreads: 0,
  updatedAt: null,
};

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
          : EMPTY_PROJECT_ACTIVITY;

        return (
          <CodexProjectLink
            key={project.path}
            project={{
              ...project,
              activity,
              isActive: runtimeReady ? project.isActive : false,
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
  const Icon = project.isActive ? FolderCheck : Folder;
  const activityTitle = getProjectActivityTitle(project);

  return (
    <Link
      href={`/?workspace=${encodeURIComponent(project.path)}`}
      prefetch={false}
      title={activityTitle ? `${project.path}\n${activityTitle}` : project.path}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors group-data-[collapsed=true]/sidebar:mx-auto group-data-[collapsed=true]/sidebar:size-9 group-data-[collapsed=true]/sidebar:place-items-center group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:p-0",
        "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isCurrent
          ? "border-border bg-background"
          : "border-transparent bg-transparent"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsed=true]/sidebar:hidden">
        {project.name}
      </span>
      <ProjectActivityIndicator project={project} />
    </Link>
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
