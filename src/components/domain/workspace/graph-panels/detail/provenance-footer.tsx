import { ExternalLink } from "lucide-react";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";

export function ProjectionProvenanceFooter({
  files,
  workspace,
}: {
  files: string[];
  workspace: string;
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="shrink-0">Source</span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {files.map((relativePath) => (
            <a
              key={relativePath}
              href={createVsCodeDocHref(workspace, relativePath)}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="truncate">{relativePath}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
