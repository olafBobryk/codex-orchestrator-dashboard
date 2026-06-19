"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { GraphProjectionQualityWarning } from "@/lib/graph/projection";
import type { WorkspaceReadResult } from "@/lib/orchestration/workspace";

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

export function GraphProjectionQualityToast({
  workspace,
  warnings,
}: {
  workspace: string;
  warnings: GraphProjectionQualityWarning[];
}) {
  useEffect(() => {
    if (warnings.length === 0) {
      return;
    }

    toast.warning("Projection map quality warning", {
      description: (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div key={warning.id}>
              <p className="font-medium text-foreground">{warning.title}</p>
              <p>{warning.message}</p>
              {warning.details.length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {warning.details.slice(0, 4).map((detail) => (
                    <li key={`${warning.id}:${detail.label}`}>
                      <span className="font-medium">{detail.label}:</span>{" "}
                      {detail.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ),
      id: `graph-projection-quality:${workspace}:${warnings
        .map((warning) => warning.id)
        .join(",")}`,
    });
  }, [warnings, workspace]);

  return null;
}

function statusTitle(state: WorkspaceReadResult["state"]) {
  if (state === "error") {
    return "Workspace read failed";
  }

  return "Workspace not configured";
}
