import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GraphDetailBlock } from "@/lib/graph/orchestration-graph";
import type { GraphMarkdownReference } from "../../canvas/types";
import { DetailSection, EntityLinks } from "../shared";

export function DetailBlockSection({
  block,
  title,
  contentId,
  contentClassName,
  workspace,
  onOpenMarkdownReference,
}: {
  block: GraphDetailBlock;
  title: string;
  contentId?: string;
  contentClassName: string;
  workspace: string;
  onOpenMarkdownReference?: (reference: GraphMarkdownReference) => void;
}) {
  return (
    <DetailSection title={title}>
      <div id={contentId} className={contentClassName}>
        {block.summary ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {block.summary}
          </p>
        ) : null}
        {block.body ? (
          <DetailMarkdownBody content={block.body} />
        ) : null}
        <EntityLinks
          className={block.summary || block.body ? "mt-2" : ""}
          links={block.links}
          workspace={workspace}
          onOpenMarkdownReference={onOpenMarkdownReference}
        />
      </div>
    </DetailSection>
  );
}

function DetailMarkdownBody({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-2 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground first:mt-0 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        input: (props) => (
          <input
            {...props}
            className="mr-2 h-3.5 w-3.5 align-[-2px] accent-primary"
            disabled
          />
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
        code: ({ children, className }) =>
          className ? (
            <code className={`${className} font-mono text-xs leading-5`}>
              {children}
            </code>
          ) : (
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              {children}
            </code>
          ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-md border border-border bg-muted px-2.5 py-2 text-xs leading-5 text-foreground">
            {children}
          </pre>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="text-foreground">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
