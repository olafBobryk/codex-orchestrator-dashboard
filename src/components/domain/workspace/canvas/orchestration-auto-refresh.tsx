"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const CLIENT_SETTLE_DELAY_MS = 1_500;
const REFRESH_DELAY_MS = 700;

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
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let clientSettled = false;
    let pendingRefresh = false;

    const refresh = () => {
      pendingRefresh = true;

      if (!clientSettled) {
        return;
      }

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        pendingRefresh = false;
        router.refresh();
      }, REFRESH_DELAY_MS);
    };

    settleTimer = setTimeout(() => {
      clientSettled = true;

      if (pendingRefresh) {
        refresh();
      }
    }, CLIENT_SETTLE_DELAY_MS);

    events.addEventListener("changed", refresh);

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      if (settleTimer) {
        clearTimeout(settleTimer);
      }

      events.removeEventListener("changed", refresh);
      events.close();
    };
  }, [router, workspace]);

  return null;
}
