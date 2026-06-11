import type { GraphDetailBlock } from "@/lib/orchestration-graph";

export function getDetailBlockDomId(block: Pick<GraphDetailBlock, "id">) {
  return `graph-detail-block-${block.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
