import { Badge } from "@/components/ui/badge";
import type { GraphEdge, GraphNode } from "@/lib/graph/orchestration-graph";
import { LINK_COLORS } from "../../canvas/constants";

export function ProjectionRelationshipList({
  node,
  edges,
  relatedNodes,
}: {
  node: GraphNode;
  edges: GraphEdge[];
  relatedNodes: GraphNode[];
}) {
  return (
    <div className="grid gap-2">
      {edges.map((edge) => {
        const outbound = edge.source === node.id;
        const relatedId = outbound ? edge.target : edge.source;
        const relatedNode = relatedNodes.find(
          (candidate) => candidate.id === relatedId
        );
        const style = edge.style ?? "solid";
        const directionLabel =
          edge.directional === false ? "Related" : outbound ? "To" : "From";

        return (
          <div
            key={edge.id}
            className="min-w-0 rounded-md border border-border px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: LINK_COLORS[edge.type] }}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {edge.label}
              </span>
              <Badge variant="outline" className="shrink-0">
                {style}
              </Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {directionLabel} {relatedNode?.label ?? relatedId}
              {edge.directional ? " · directional" : " · non-directional"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
