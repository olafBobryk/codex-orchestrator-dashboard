import { LayoutDashboard, PanelRightClose } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LINK_COLORS } from "../../canvas/constants";
import type { GraphStatusPanelProps } from "../../canvas/types";
import { MarkerGlyph } from "../preview";
import { DetailSection } from "../shared";

export function GraphStatusOverlay({
  graph,
  stats,
  packetColors,
  visiblePackets,
  primaryChunkCount,
  supportNodeCount,
  edgeCount,
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
      <div className="border-b border-border px-3 py-3">
        <div className="flex min-w-0 items-center gap-2 pr-8">
          <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="truncate text-sm font-semibold">Summary</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Hide graph panel"
            title="Hide graph panel"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <PanelRightClose />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{primaryChunkCount} nodes</Badge>
          <Badge variant="outline">{supportNodeCount} returns/concerns</Badge>
          <Badge variant="outline">{edgeCount} edges</Badge>
          {graph.markers.length > 0 ? (
            <Badge variant="outline">{graph.markers.length} markers</Badge>
          ) : null}
        </div>
      </div>

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
            <MetricTile label="Markdown docs" value={stats.docs} />
            <MetricTile label="Packets" value={stats.packets} />
            <MetricTile label="Ledgers" value={stats.ledgers} />
            <MetricTile label="Summaries" value={stats.summaries} />
          </div>
        </DetailSection>

        <DetailSection title="Runtime">
          <div className="grid grid-cols-2 gap-2">
            <MetricTile label="Agents" value={stats.liveAgents} />
            <MetricTile label="Threads" value={stats.activeThreads} />
            <MetricTile label="Recorded" value={runtimeAnnotationCount} />
            <MetricTile label="Sources" value={graph.packets.length} />
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
                <button
                  key={node.id}
                  type="button"
                  className="inline-flex h-auto min-h-8 w-full min-w-0 items-center justify-start gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
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
                  <div className="ml-auto flex shrink-0 gap-1">
                    {node.markers.slice(0, 2).map((marker) => (
                      <MarkerGlyph key={marker.id} marker={marker} size="sm" />
                    ))}
                  </div>
                </button>
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

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md border border-border px-2.5 py-2">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
