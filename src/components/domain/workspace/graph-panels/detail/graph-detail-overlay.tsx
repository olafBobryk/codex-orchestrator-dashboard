import { MarkdownDetailPanel } from "./markdown-detail-panel";
import { ProjectionDetailPanel } from "./projection-detail-panel";
import type { GraphDetailOverlayProps } from "../shared";

export function GraphDetailOverlay(props: GraphDetailOverlayProps) {
  if (props.node.sourceLayer === "graph_projection") {
    return <ProjectionDetailPanel {...props} />;
  }

  return <MarkdownDetailPanel {...props} />;
}
