"use client";

import { RefreshCw } from "lucide-react";

export function ReloadButton() {
  return (
    <button
      type="button"
      title="Reload dashboard"
      aria-label="Reload dashboard"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={() => window.location.reload()}
    >
      <RefreshCw className="h-3.5 w-3.5" />
    </button>
  );
}
