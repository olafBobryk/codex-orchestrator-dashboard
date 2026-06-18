import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GraphDetailLink } from "@/lib/orchestration-graph";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import type { GraphMarkdownReference } from "../../canvas/types";

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
  const canOpenMarkdown =
    Boolean(link.relativePath) &&
    link.relativePath?.toLowerCase().endsWith(".md") === true &&
    Boolean(onOpenMarkdownReference);
  const href = link.relativePath
    ? canOpenMarkdown
      ? null
      : createVsCodeDocHref(workspace, link.relativePath)
    : link.href;
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

  if (link.relativePath && !onOpenMarkdownReference) {
    return (
      <div className="flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
        {children}
      </div>
    );
  }

  return (
    <a
      href={href ?? undefined}
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
