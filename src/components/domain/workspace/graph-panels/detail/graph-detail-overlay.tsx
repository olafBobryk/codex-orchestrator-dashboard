import { MarkdownDetailPanel } from "./markdown-detail-panel";
import { MarkerDetailPanel } from "./marker-detail-card";
import { ProjectionDetailPanel } from "./projection-detail-panel";
import type { GraphDetailOverlayProps } from "../shared";

export function GraphDetailOverlay(props: GraphDetailOverlayProps) {
  if (props.selectedMarker) {
    return <MarkerDetailPanel {...props} marker={props.selectedMarker} />;
  }

  if (props.node.sourceLayer === "graph_projection") {
    return <ProjectionDetailPanel {...props} />;
  }

  return <MarkdownDetailPanel {...props} />;
}
