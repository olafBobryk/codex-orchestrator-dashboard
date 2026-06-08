"use client";

import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkspaceState =
  | "missing_workspace"
  | "missing_directory"
  | "ready"
  | "error";

type RecentWorkspaceSelectorProps = {
  currentWorkspace: string;
  workspaceState: WorkspaceState;
};

const STORAGE_KEY = "codex-orchestrator-dashboard:recent-workspaces";
const STORAGE_CHANGE_EVENT =
  "codex-orchestrator-dashboard:recent-workspaces-changed";
const MAX_RECENT_WORKSPACES = 8;

export function RecentWorkspaceSelector({
  currentWorkspace,
  workspaceState,
}: RecentWorkspaceSelectorProps) {
  const [clearedWorkspace, setClearedWorkspace] = useState<string | null>(null);
  const storageSnapshot = useSyncExternalStore(
    subscribeToRecentWorkspaceChanges,
    readRecentWorkspaceSnapshot,
    readServerRecentWorkspaceSnapshot
  );
  const recents = useMemo(
    () => parseRecentWorkspaceSnapshot(storageSnapshot),
    [storageSnapshot]
  );

  useEffect(() => {
    if (workspaceState !== "ready" || currentWorkspace === clearedWorkspace) {
      return;
    }

    const nextRecents = addRecentWorkspace(recents, currentWorkspace);

    if (!areEqual(recents, nextRecents)) {
      writeRecentWorkspaces(nextRecents);
    }
  }, [clearedWorkspace, currentWorkspace, recents, workspaceState]);

  function clearRecents() {
    setClearedWorkspace(currentWorkspace);
    localStorage.removeItem(STORAGE_KEY);
    notifyRecentWorkspaceChange();
  }

  if (recents.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <History className="h-3.5 w-3.5 shrink-0" />
          <span>Recent workspaces</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[0.7rem]">
            {recents.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={clearRecents}
        >
          <Trash2 />
          Clear
        </Button>
      </div>
      <div className="mt-2 grid gap-1">
        {recents.map((workspace) => (
          <Link
            key={workspace}
            href={`/?workspace=${encodeURIComponent(workspace)}`}
            title={workspace}
            className={cn(
              "grid min-w-0 rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors",
              "hover:border-border hover:bg-background focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            )}
          >
            <span className="truncate font-medium text-foreground">
              {workspaceName(workspace)}
            </span>
            <span className="truncate font-mono text-[0.7rem] text-muted-foreground">
              {workspace}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function subscribeToRecentWorkspaceChanges(callback: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(STORAGE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_CHANGE_EVENT, callback);
  };
}

function readRecentWorkspaceSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function readServerRecentWorkspaceSnapshot() {
  return "[]";
}

function parseRecentWorkspaceSnapshot(snapshot: string) {
  try {
    const parsedValue: unknown = JSON.parse(snapshot);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return normalizeWorkspaces(parsedValue);
  } catch {
    return [];
  }
}

function writeRecentWorkspaces(workspaces: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  notifyRecentWorkspaceChange();
}

function notifyRecentWorkspaceChange() {
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function addRecentWorkspace(workspaces: string[], workspace: string) {
  const normalizedWorkspace = workspace.trim();

  if (!normalizedWorkspace) {
    return workspaces;
  }

  return normalizeWorkspaces([normalizedWorkspace, ...workspaces]).slice(
    0,
    MAX_RECENT_WORKSPACES
  );
}

function normalizeWorkspaces(values: unknown[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const workspace = value.trim();

    if (!workspace || seen.has(workspace)) {
      continue;
    }

    seen.add(workspace);
    normalized.push(workspace);
  }

  return normalized;
}

function workspaceName(workspace: string) {
  return workspace.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace;
}

function areEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((item, index) => item === right[index])
  );
}
