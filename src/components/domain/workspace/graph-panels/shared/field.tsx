import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderGraphPanelIcon } from "../preview/icons";

export function DetailField({
  label,
  value,
  color,
  icon,
  className,
  mono = false,
  selected = false,
  showExternalIcon = false,
  onClick,
}: {
  label: string;
  value: number | string | null;
  color?: string | null;
  icon?: string | null;
  className?: string;
  mono?: boolean;
  selected?: boolean;
  showExternalIcon?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon ? (
          <span className="shrink-0" style={{ color: color ?? undefined }}>
            {renderGraphPanelIcon(icon, "h-3 w-3")}
          </span>
        ) : color ? (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        <span className="truncate">{label}</span>
        {showExternalIcon ? (
          <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
        ) : null}
      </div>
      <div
        className={cn(
          "mt-1 break-words text-lg font-semibold tabular-nums text-foreground",
          mono ? "font-mono" : ""
        )}
      >
        {value ?? "Not recorded"}
      </div>
    </>
  );
  const fieldClassName = cn(
    "min-w-0 rounded-md border border-border px-2.5 py-2",
    onClick
      ? "text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      : "",
    selected ? "bg-muted" : "",
    className
  );
  const fieldStyle = {
    borderColor: color ?? undefined,
    boxShadow: selected && color ? `inset 0 0 0 1px ${color}` : undefined,
  };

  if (onClick) {
    return (
      <button
        type="button"
        className={fieldClassName}
        style={fieldStyle}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={fieldClassName}
      style={{ borderColor: color ?? undefined }}
    >
      {content}
    </div>
  );
}
