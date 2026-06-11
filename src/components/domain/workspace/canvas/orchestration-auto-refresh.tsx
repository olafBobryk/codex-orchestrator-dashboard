"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type OrchestrationAutoRefreshProps = {
  workspace: string;
};

export function OrchestrationAutoRefresh({
  workspace,
}: OrchestrationAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!workspace.trim()) {
      return;
    }

    const events = new EventSource(
      `/api/orchestration-events?workspace=${encodeURIComponent(workspace)}`
    );
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 100);
    };

    events.addEventListener("changed", refresh);

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      events.removeEventListener("changed", refresh);
      events.close();
    };
  }, [router, workspace]);

  return null;
}
