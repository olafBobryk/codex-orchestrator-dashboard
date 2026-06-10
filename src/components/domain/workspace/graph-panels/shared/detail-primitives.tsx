import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import type { GraphDetailBlock } from "@/lib/orchestration-graph";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import type { SignalIcon } from "./types";

export function SignalToken({
  icon: Icon,
  value,
  color,
  tooltip,
}: {
  icon: SignalIcon;
  value: string;
  color: string;
  tooltip: ReactNode;
}) {
  return (
    <Tooltip content={tooltip}>
      <span
        className="inline-flex h-6 max-w-32 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium"
        style={{ borderColor: color, backgroundColor: `${color}24`, color }}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{value}</span>
      </span>
    </Tooltip>
  );
}

export function SignalTile({
  icon: Icon,
  label,
  value,
  color,
  tooltip,
  active,
  onSelect,
}: {
  icon: SignalIcon;
  label: string;
  value: number | string;
  color: string;
  tooltip: ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <Tooltip
      content={tooltip}
      className="h-full w-full text-left"
      onClick={onSelect}
      pressed={active}
    >
      <span
        className="flex h-full w-full min-w-0 items-center gap-2 rounded-md border px-2 py-2 transition-colors"
        style={{
          borderColor: color,
          backgroundColor: active ? `${color}28` : `${color}18`,
          boxShadow: active ? `inset 0 0 0 1px ${color}` : undefined,
        }}
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] text-muted-foreground">
            {label}
          </span>
          <span className="block text-sm font-semibold tabular-nums text-foreground">
            {value}
          </span>
        </span>
      </span>
    </Tooltip>
  );
}

export function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border px-2.5 py-2">
      <div className="text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <p
        className={`mt-1 break-words text-xs text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value || "Not recorded"}
      </p>
    </div>
  );
}

export function DetailBlockCard({
  block,
  workspace,
  domId,
}: {
  block: GraphDetailBlock;
  workspace: string;
  domId?: string;
}) {
  return (
    <div
      id={domId}
      className="scroll-mt-3 min-w-0 rounded-md border border-border px-2.5 py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: block.color ?? "#64748b" }}
        />
        <span className="truncate text-xs font-medium">{block.name}</span>
        {block.icon ? (
          <Badge variant="outline" className="ml-auto shrink-0">
            {block.icon}
          </Badge>
        ) : null}
      </div>
      {block.summary ? (
        <p className="mt-1 text-xs text-muted-foreground">{block.summary}</p>
      ) : null}
      {block.body ? (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">
          {block.body}
        </p>
      ) : null}
      {block.links.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {block.links.map((link) => {
            const href = link.relativePath
              ? createVsCodeDocHref(workspace, link.relativePath)
              : link.href;

            return (
              <a
                key={`${link.label}:${href}`}
                href={href}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h4 className="mb-2 text-sm font-medium text-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}
