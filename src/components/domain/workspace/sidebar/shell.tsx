"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export function WorkspaceSidebarShell({
  headerStart,
  headerActions,
  children,
}: {
  headerStart: ReactNode;
  headerActions: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const collapseButton = (
    <button
      type="button"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      onClick={() => setCollapsed((value) => !value)}
    >
      {collapsed ? (
        <PanelLeftOpen className="h-3.5 w-3.5" />
      ) : (
        <PanelLeftClose className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <aside
      data-collapsed={collapsed}
      className="group/sidebar fixed bottom-3 left-3 top-3 z-20 flex w-[min(340px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur transition-[width] duration-200 ease-out data-[collapsed=true]:w-16"
    >
      <div className="flex items-center justify-between gap-2 px-5 pt-4 group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-2">
        {headerStart}
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center gap-1 group-data-[collapsed=true]/sidebar:hidden">
            {headerActions}
          </div>
          {collapseButton}
        </div>
      </div>
      {children}
      <div
        id="workspace-sidebar-overlay-root"
        className="pointer-events-none absolute inset-0 z-[80] group-data-[collapsed=true]/sidebar:hidden [&>*]:pointer-events-auto"
      />
    </aside>
  );
}
