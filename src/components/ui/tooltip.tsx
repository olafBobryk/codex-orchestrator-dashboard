"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function TooltipProvider(props: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delay={250} closeDelay={80} {...props} />;
}

function Tooltip({
  children,
  content,
  side = "top",
  className,
  onClick,
  pressed,
}: {
  children: ReactNode;
  content: ReactNode;
  side?: ComponentProps<typeof TooltipPrimitive.Positioner>["side"];
  className?: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger
        type="button"
        aria-pressed={pressed}
        className={cn(
          "inline-flex min-w-0 cursor-help rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          className
        )}
        onClick={onClick}
      >
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 max-w-64 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs leading-5 text-popover-foreground shadow-md",
              "data-[ending-style]:animate-out data-[starting-style]:animate-in data-[ending-style]:fade-out-0 data-[starting-style]:fade-in-0"
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="size-2.5 rotate-45 border border-border bg-popover" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip, TooltipProvider };
