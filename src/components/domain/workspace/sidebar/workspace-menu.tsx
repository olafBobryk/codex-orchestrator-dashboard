"use client";

import { FolderOpen, MoreHorizontal } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ServiceIndicator } from "./service-indicator";

export function WorkspacePathMenu({ workspace }: { workspace: string }) {
  return (
    <Dropdown
      align="end"
      offset={8}
      menuMinWidth={320}
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
          title="More"
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
            <Label htmlFor="workspace">Workspace path</Label>
            <div className="flex gap-2">
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
