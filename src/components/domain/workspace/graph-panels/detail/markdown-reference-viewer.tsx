"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { createVsCodeDocHref } from "../../canvas/graph-adapter";
import type { GraphMarkdownViewerProps } from "../../canvas/types";

type MarkdownReferenceState =
  | {
      state: "idle" | "loading";
    }
  | {
      state: "ready";
      relativePath: string;
      title: string;
      content: string;
      size: number;
    }
  | {
      state: "unavailable";
      relativePath: string;
      message: string;
    };

export function MarkdownReferenceViewer({
  workspace,
  reference,
  onBack,
}: GraphMarkdownViewerProps) {
  const [readState, setReadState] = useState<MarkdownReferenceState>({
    state: "idle",
  });
  const [copied, setCopied] = useState(false);
  const documentPath = createMarkdownDocumentPath(workspace, reference.relativePath);

  useEffect(() => {
    const controller = new AbortController();

    fetch(
      `/api/markdown-reference?workspace=${encodeURIComponent(
        workspace
      )}&path=${encodeURIComponent(reference.relativePath)}`,
      {
        signal: controller.signal,
        cache: "no-store",
      }
    )
      .then(async (response) => {
        const payload = (await response.json()) as MarkdownReferenceState;
        setReadState(payload);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setReadState({
          state: "unavailable",
          relativePath: reference.relativePath,
          message: "This Markdown reference could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [reference.relativePath, workspace]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  const visibleState =
    readState.state === "ready" || readState.state === "unavailable"
      ? readState.relativePath === reference.relativePath
        ? readState
        : { state: "loading" as const }
      : readState;

  return (
    <aside
      data-graph-detail-panel
      data-graph-detail-source="markdown-reference"
      className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
    >
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-3 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 pr-8">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="truncate text-sm font-semibold">
              {visibleState.state === "ready" ? visibleState.title : reference.label}
            </h3>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {reference.relativePath}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close Markdown viewer"
          title="Close Markdown viewer"
          onClick={onBack}
        >
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {visibleState.state === "loading" || visibleState.state === "idle" ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-base text-muted-foreground">
            <Loader aria-label="Loading Markdown" />
            Loading Markdown
          </div>
        ) : visibleState.state === "ready" ? (
          <MarkdownDocument content={visibleState.content} />
        ) : visibleState.state === "unavailable" ? (
          <div className="rounded-md border border-border bg-card px-3 py-3">
            <div className="flex items-center gap-2 text-base font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Reference unavailable
            </div>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              {visibleState.message}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        <a
          href={createVsCodeDocHref(workspace, reference.relativePath)}
          title="Open Markdown file in VS Code"
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Open in VS Code</span>
        </a>
        <button
          type="button"
          title="Copy Markdown file path"
          className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={async () => {
            await navigator.clipboard.writeText(documentPath);
            setCopied(true);
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{copied ? "Copied" : "Copy path"}</span>
        </button>
      </div>
    </aside>
  );
}

function createMarkdownDocumentPath(workspace: string, relativePath: string) {
  const workspacePath = workspace.replace(/\/+$/, "");

  return `${workspacePath}/${relativePath}`;
}

function MarkdownDocument({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <p className="text-base text-muted-foreground">
        This Markdown file is empty.
      </p>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 text-xl font-semibold leading-8 text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-5 text-lg font-semibold leading-7 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-4 text-base font-semibold leading-7 text-foreground">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-2 mt-4 text-base font-medium leading-7 text-foreground">
            {children}
          </h4>
        ),
        p: ({ children }) => (
          <p className="my-3 text-sm leading-6 text-muted-foreground">
            {children}
          </p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            rel="noreferrer"
            target={href?.startsWith("http") ? "_blank" : undefined}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-border bg-muted/40 px-4 py-2 text-sm leading-6 text-muted-foreground">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="my-3 list-disc space-y-1.5 pl-6 text-sm leading-6 text-muted-foreground">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 list-decimal space-y-1.5 pl-6 text-sm leading-6 text-muted-foreground">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        input: (props) => (
          <input
            {...props}
            className="mr-2 h-4 w-4 align-[-2px] accent-primary"
            disabled
          />
        ),
        table: ({ children }) => (
          <div className="my-4 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted text-foreground">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-border px-3 py-2 font-medium">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border px-3 py-2 text-muted-foreground last:border-b-0">
            {children}
          </td>
        ),
        hr: () => <div className="my-5 h-px bg-border" />,
        code: ({ children, className }) => {
          const inline = !className;

          if (inline) {
            return (
              <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {children}
              </code>
            );
          }

          return (
            <code className={`${className} font-mono text-xs leading-5`}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-4 overflow-x-auto rounded-md border border-border bg-muted px-3 py-3 text-xs leading-5 text-foreground">
            {children}
          </pre>
        ),
        img: ({ alt, src }) => (
          // eslint-disable-next-line @next/next/no-img-element -- Markdown images are document-authored references, not app-owned optimized assets.
          <img
            src={src}
            alt={alt ?? ""}
            className="my-4 max-w-full rounded-md border border-border bg-card"
          />
        ),
        sup: ({ children }) => (
          <sup className="text-xs leading-none text-foreground">{children}</sup>
        ),
        section: ({ children }) => (
          <section className="mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {children}
          </section>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="text-foreground">{children}</em>,
        del: ({ children }) => (
          <del className="text-muted-foreground">{children}</del>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
