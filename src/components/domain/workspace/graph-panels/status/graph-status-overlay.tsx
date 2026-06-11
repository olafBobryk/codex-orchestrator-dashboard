import { PanelRightClose } from "lucide-react";
import { LINK_COLORS } from "../../canvas/constants";
import type { GraphStatusPanelProps } from "../../canvas/types";
import { PanelHeader } from "../detail/detail-panel-layout";
import { MarkerGlyph } from "../preview";
import { DetailField, DetailSection } from "../shared";

export function GraphStatusOverlay({
  graph,
  stats,
  packetColors,
  visiblePackets,
  flowSignalCounts,
  runtimeAnnotationCount,
  sourceStatus,
  primaryNodes,
  onSelectNode,
  onClose,
}: GraphStatusPanelProps) {
  return (
    <aside
      data-graph-status-panel
      style={{ maxHeight: "min(520px, calc(100vh - 1.5rem))" }}
      className="relative flex max-h-[inherit] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl"
    >
      <PanelHeader
        header={{
          title: "Summary",
          subtitle: "Durable graph context and navigation.",
          icon: "layout-dashboard",
          iconTooltip: "Summary of the visible orchestration graph.",
          closeLabel: "Hide graph panel",
        }}
        action={{
          label: "Hide graph panel",
          icon: <PanelRightClose />,
          onClick: onClose,
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <DetailSection title="Legend">
          {visiblePackets.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {visiblePackets.map((packet) => (
                <span
                  key={packet.id}
                  className="flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs text-muted-foreground"
                >
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: packetColors.get(packet.id) }}
                  />
                  <span className="truncate">{packet.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No legend groups are visible.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Flow Signals">
          {flowSignalCounts.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {flowSignalCounts.map((signal) => (
                <div
                  key={signal.type}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border px-2.5 py-2"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: LINK_COLORS[signal.type] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs capitalize text-muted-foreground">
                    {signal.type.replace(/_/g, " ")}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {signal.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No normalized graph edges were found.
            </p>
          )}
        </DetailSection>

        <DetailSection title="Workspace">
          <div className="grid grid-cols-2 gap-2">
            <DetailField label="Markdown docs" value={stats.docs} />
            <DetailField label="Packets" value={stats.packets} />
            <DetailField label="Ledgers" value={stats.ledgers} />
            <DetailField label="Summaries" value={stats.summaries} />
          </div>
        </DetailSection>

        <DetailSection title="Runtime">
          <div className="grid grid-cols-2 gap-2">
            <DetailField label="Agents" value={stats.liveAgents} />
            <DetailField label="Threads" value={stats.activeThreads} />
            <DetailField label="Recorded" value={runtimeAnnotationCount} />
            <DetailField label="Sources" value={graph.packets.length} />
          </div>
        </DetailSection>

        <DetailSection title="Source">
          <div className="rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground">
            {sourceStatus.replace(/_/g, " ")}
          </div>
        </DetailSection>

        <DetailSection title="Nodes">
          {primaryNodes.length > 0 ? (
            <div className="grid gap-1.5">
              {primaryNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex min-h-8 w-full min-w-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <button
                    type="button"
                    className="inline-flex min-w-0 flex-1 items-center gap-1 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectNode(node.id);
                    }}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{node.label}</span>
                  </button>
                  <div className="ml-auto flex shrink-0 gap-1">
                    {node.markers.slice(0, 2).map((marker) => (
                      <button
                        key={marker.id}
                        type="button"
                        className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        aria-label={`Open ${marker.label} marker panel`}
                        title={`Open ${marker.label} marker panel`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectNode(node.id, marker.id);
                        }}
                      >
                        <MarkerGlyph marker={marker} size="sm" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No projected nodes are visible.
            </p>
          )}
        </DetailSection>
      </div>
    </aside>
  );
}
