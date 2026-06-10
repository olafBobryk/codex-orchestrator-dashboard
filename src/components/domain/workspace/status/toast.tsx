"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { WorkspaceReadResult } from "@/lib/orchestration";

export function WorkspaceStatusToast({
  result,
}: {
  result: WorkspaceReadResult;
}) {
  useEffect(() => {
    if (result.state === "ready" || result.state === "missing_workspace") {
      return;
    }

    toast.error(statusTitle(result.state), {
      description: result.message,
      id: `workspace-status:${result.resolvedWorkspace ?? result.workspace}:${result.state}`,
    });
  }, [result.message, result.resolvedWorkspace, result.state, result.workspace]);

  return null;
}

function statusTitle(state: WorkspaceReadResult["state"]) {
  if (state === "error") {
    return "Workspace read failed";
  }

  return "Workspace not configured";
}
