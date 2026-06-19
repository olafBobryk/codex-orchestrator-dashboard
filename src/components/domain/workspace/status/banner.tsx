"use client";

import { AlertCircle, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { WorkspaceReadResult } from "@/lib/orchestration/workspace";

const DISMISSED_STATUS_KEY_PREFIX =
  "codex-orchestrator-dashboard:workspace-status-dismissed";
const DISMISSED_STATUS_EVENT =
  "codex-orchestrator-dashboard:workspace-status-dismissed-changed";

export function WorkspaceStatusBanner({
  result,
}: {
  result: WorkspaceReadResult;
}) {
  const dismissKey = getDismissedStatusKey(result);
  const dismissed = useSyncExternalStore(
    subscribeToDismissedStatus,
    () => readDismissedStatus(dismissKey),
    readServerDismissedStatus
  );

  if (result.state === "ready" || dismissed) {
    return null;
  }

  function dismiss() {
    localStorage.setItem(dismissKey, "true");
    window.dispatchEvent(new Event(DISMISSED_STATUS_EVENT));
  }

  return (
    <Alert
      variant={result.state === "error" ? "destructive" : "default"}
      className="relative pr-10"
    >
      <AlertCircle />
      <AlertTitle>{statusTitle(result.state)}</AlertTitle>
      <AlertDescription>{result.message}</AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute right-2 top-2 text-muted-foreground"
        onClick={dismiss}
        aria-label="Dismiss workspace status"
      >
        <X />
      </Button>
    </Alert>
  );
}

function subscribeToDismissedStatus(callback: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(DISMISSED_STATUS_KEY_PREFIX)) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(DISMISSED_STATUS_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(DISMISSED_STATUS_EVENT, callback);
  };
}

function readDismissedStatus(key: string) {
  return localStorage.getItem(key) === "true";
}

function readServerDismissedStatus() {
  return false;
}

function getDismissedStatusKey(result: WorkspaceReadResult) {
  return `${DISMISSED_STATUS_KEY_PREFIX}:${encodeURIComponent(
    result.resolvedWorkspace ?? result.workspace
  )}:${result.state}`;
}

function statusTitle(state: WorkspaceReadResult["state"]) {
  if (state === "missing_workspace") {
    return "Workspace path needed";
  }

  if (state === "error") {
    return "Workspace read failed";
  }

  return "Workspace needs docs";
}
