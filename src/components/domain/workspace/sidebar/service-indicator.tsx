"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ServiceStatusResponse = {
  reachable?: boolean;
};

export function ServiceIndicator({ className }: { className?: string }) {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const label = reachable === false ? "Service not reachable" : "Service";

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch("/api/service-status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ServiceStatusResponse;

        if (!cancelled) {
          setReachable(payload.reachable === true);
        }
      } catch {
        if (!cancelled) {
          setReachable(false);
        }
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div
      title={label}
      className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}
    >
      <span
        aria-label={label}
        className={cn(
          "h-2 w-2 rounded-full",
          reachable === true ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      <span>{label}</span>
    </div>
  );
}
