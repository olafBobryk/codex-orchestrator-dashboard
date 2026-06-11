import type { ReactNode } from "react";
import { renderGraphPanelIcon } from "./icons";

export function GraphPanelPreviewContent({
  icon,
  color,
  primary,
  secondary,
  description,
  muted = false,
  primaryIsStat = false,
}: {
  icon: string | null;
  color: string;
  primary: ReactNode;
  secondary?: ReactNode;
  description?: ReactNode;
  muted?: boolean;
  primaryIsStat?: boolean;
}) {
  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-md text-white shadow-sm"
          style={{ backgroundColor: color, opacity: muted ? 0.58 : 1 }}
        >
          {renderGraphPanelIcon(icon, "h-4 w-4")}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={
              primaryIsStat
                ? "block truncate text-sm font-semibold leading-5 tabular-nums text-foreground"
                : "block truncate text-sm font-semibold leading-5 text-foreground"
            }
          >
            {primary}
          </span>
          {secondary ? (
            <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
              {secondary}
            </span>
          ) : null}
        </span>
      </span>
      {description ? (
        <span className="mt-2 block border-t border-border/70 pt-2 text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </>
  );
}
