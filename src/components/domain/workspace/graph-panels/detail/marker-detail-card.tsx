"use client";

import type { GraphMarker } from "@/lib/graph/orchestration-graph";
import { EntityLinks } from "../shared";
import {
  createNodePanelHeader,
  DetailPanelLayout,
} from "./detail-panel-layout";
import type { GraphDetailOverlayProps } from "../shared";

export function MarkerDetailPanel({
  marker,
  node,
  workspace,
  onOpenMarkdownReference,
  onClose,
}: GraphDetailOverlayProps & {
  marker: GraphMarker;
}) {
  return (
    <DetailPanelLayout
      panelKind="marker"
      header={createNodePanelHeader({
        node,
        markers: [],
        closeLabel: "Close marker details",
      })}
      onClose={onClose}
      links={marker.links}
      summaryFields={createMarkerSummaryFields(marker)}
      workspace={workspace}
      onOpenMarkdownReference={onOpenMarkdownReference}
      afterEntityFiles={
        marker.threadIds.length > 0 ? (
          <div className="mb-4">
            <EntityLinks
              links={marker.threadIds.map((threadId) => ({
                label: `Codex thread ${threadId}`,
                href: createCodexThreadHref(threadId),
                relativePath: null,
                kind: "reference",
              }))}
              workspace={workspace}
            />
          </div>
        ) : null
      }
    />
  );
}

function createMarkerSummaryFields(marker: GraphMarker) {
  return [
    {
      id: "label",
      label: "Label",
      value: marker.label,
      color: marker.color,
      icon: marker.icon,
      className: "col-span-2",
    },
  ];
}

function createCodexThreadHref(threadId: string) {
  return `codex://threads/${encodeURIComponent(threadId)}`;
}
