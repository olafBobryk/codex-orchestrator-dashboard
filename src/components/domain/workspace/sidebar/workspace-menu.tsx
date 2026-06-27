"use client";

import Link from "next/link";
import { FolderOpen, MoreHorizontal } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { CanvasLayoutMode } from "../canvas/layout-mode";
import { ServiceIndicator } from "./service-indicator";

export function WorkspacePathMenu({
  layoutMode = "lanes",
  workspace,
}: {
  layoutMode?: CanvasLayoutMode;
  workspace: string;
}) {
  return (
    <Dropdown
      align="end"
      offset={8}
      menuMinWidth={320}
      portalTargetId="workspace-sidebar-overlay-root"
      positionStrategy="fixed"
      pinOnClick={false}
      renderTrigger={({
        ref,
        isOpen,
        onRootMouseEnter,
        onRootMouseLeave,
        onRightClick,
      }) => (
        <button
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          aria-label="More"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onMouseEnter={onRootMouseEnter}
          onMouseLeave={onRootMouseLeave}
          onClick={onRightClick}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
      renderMenu={({ close }) => (
        <form
          role="menu"
          className="grid w-80 gap-3 p-3"
          action="/"
          onSubmit={() => close({ restoreFocus: false })}
        >
          <ServiceIndicator className="px-0.5" />
          <Separator />
          <div className="grid gap-2">
            <Label>Layout</Label>
            <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/30 p-1">
              {(["lanes", "physics"] as CanvasLayoutMode[]).map((mode) => (
                <Link
                  key={mode}
                  href={createLayoutHref({ layoutMode: mode, workspace })}
                  prefetch={false}
                  aria-current={layoutMode === mode ? "page" : undefined}
                  className={cn(
                    "inline-flex h-7 items-center justify-center rounded-sm px-2 text-xs font-medium capitalize transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    layoutMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  )}
                  onClick={() => close({ restoreFocus: false })}
                >
                  {mode}
                </Link>
              ))}
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="workspace">Workspace path</Label>
            <div className="flex gap-2">
              {layoutMode === "physics" ? (
                <input type="hidden" name="layout" value="physics" />
              ) : null}
              <Input
                id="workspace"
                name="workspace"
                defaultValue={workspace}
                placeholder="/absolute/path/to/project"
                className="font-mono text-xs"
              />
              <Button type="submit">
                <FolderOpen />
                Load
              </Button>
            </div>
          </div>
        </form>
      )}
    />
  );
}

function createLayoutHref({
  layoutMode,
  workspace,
}: {
  layoutMode: CanvasLayoutMode;
  workspace: string;
}) {
  const params = new URLSearchParams();

  if (workspace.trim()) {
    params.set("workspace", workspace);
  }

  if (layoutMode === "physics") {
    params.set("layout", "physics");
  }

  const query = params.toString();

  return query ? `/?${query}` : "/";
}
