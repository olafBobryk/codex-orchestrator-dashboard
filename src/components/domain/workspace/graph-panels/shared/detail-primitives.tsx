import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { GraphDetailBlock, GraphDetailLink } from "@/lib/orchestration-graph";
import { cn } from "@/lib/utils";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import type { GraphMarkdownReference } from "../../canvas/types";
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
      <div
        className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
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

export function getDetailBlockDomId(block: Pick<GraphDetailBlock, "id">) {
  return `graph-detail-block-${block.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function EntityLinks({
  links,
  workspace,
  onOpenMarkdownReference,
  className = "",
}: {
  links: GraphDetailLink[];
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
  className?: string;
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className={`grid gap-1.5 ${className}`}>
      {links.map((link) => (
        <EntityLinkButton
          key={`${link.kind}:${link.label}:${link.relativePath ?? link.href}`}
          link={link}
          workspace={workspace}
          onOpenMarkdownReference={onOpenMarkdownReference}
        />
      ))}
    </div>
  );
}

function EntityLinkButton({
  link,
  workspace,
  onOpenMarkdownReference,
}: {
  link: GraphDetailLink;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
}) {
  const href = link.relativePath
    ? createVsCodeDocHref(workspace, link.relativePath)
    : link.href;
  const canOpenMarkdown =
    Boolean(link.relativePath) &&
    link.relativePath?.toLowerCase().endsWith(".md") === true &&
    Boolean(onOpenMarkdownReference);
  const children = (
    <>
      <ExternalLink className="h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
      <Badge variant="outline" className="ml-auto h-5 shrink-0 px-1.5 text-[10px]">
        {formatEntityLinkKind(link.kind)}
      </Badge>
    </>
  );

  if (canOpenMarkdown && link.relativePath) {
    const markdownPath = link.relativePath;

    return (
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        onClick={() =>
          onOpenMarkdownReference?.({
            label: link.label,
            relativePath: markdownPath,
          })
        }
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
    </a>
  );
}

function formatEntityLinkKind(kind: GraphDetailLink["kind"]) {
  if (kind === "artifact") {
    return "Artifact";
  }

  if (kind === "meta_template") {
    return "Meta";
  }

  return "Ref";
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
