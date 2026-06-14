import { PanelRightClose } from "lucide-react";
import { LINK_COLORS } from "../../canvas/constants";
import type { GraphStatusPanelProps } from "../../canvas/types";
import { PanelHeader } from "../detail/detail-panel-layout";
import { DetailField, DetailSection } from "../shared";

export function GraphStatusOverlay({
  graph,
  projectionQualityWarnings,
  packetColors,
  visiblePackets,
  flowSignalCounts,
  sourceStatus,
  primaryNodes,
  onSelectNode,
  onClose,
}: GraphStatusPanelProps) {
  const summary = buildOverviewSummary({
    graph,
    primaryNodes,
    warningCount: projectionQualityWarnings.length,
  });

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
        <DetailSection title="Overview">
          <div className="grid grid-cols-2 gap-2">
            <DetailField
              label="Active work"
              value={summary.activeWork.count}
              icon="loader-circle"
              color={statColor(summary.activeWork.count, "#2563eb")}
              onClick={createSelectNodeHandler(summary.activeWork.nodeId, onSelectNode)}
            />
            <DetailField
              label="Planning"
              value={summary.planning.count}
              icon="eye-off"
              color="#64748b"
              onClick={createSelectNodeHandler(summary.planning.nodeId, onSelectNode)}
            />
            <DetailField
              label="Live agents"
              value={summary.liveAgents.count}
              icon="user-cog"
              color={statColor(summary.liveAgents.count, "#0a84ff")}
              onClick={
                summary.liveAgents.nodeId
                  ? () =>
                      onSelectNode(
                        summary.liveAgents.nodeId as string,
                        summary.liveAgents.markerId
                      )
                  : undefined
              }
            />
            <DetailField
              label="Warnings"
              value={summary.warnings}
              icon="message-square-text"
              color={summary.warnings > 0 ? "#dc2626" : "#64748b"}
            />
          </div>
        </DetailSection>

        <DetailSection title="Verification">
          <div className="grid grid-cols-2 gap-2">
            <DetailField
              label="Verified"
              value={summary.verification.verified.count}
              icon="check-circle"
              color={statColor(summary.verification.verified.count, "#16a34a")}
              onClick={createSelectNodeHandler(
                summary.verification.verified.nodeId,
                onSelectNode
              )}
            />
            <DetailField
              label="Needs check"
              value={summary.verification.needsCheck.count}
              icon="circle"
              color={
                summary.verification.needsCheck.count > 0 ? "#dc2626" : "#64748b"
              }
              onClick={createSelectNodeHandler(
                summary.verification.needsCheck.nodeId,
                onSelectNode
              )}
            />
          </div>
        </DetailSection>

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

        <DetailSection title="Projection">
          <div className="grid grid-cols-2 gap-2">
            <DetailField
              label="Workpieces"
              value={summary.workpieces.count}
              icon="circle"
              color={statColor(summary.workpieces.count, "#737373")}
              onClick={createSelectNodeHandler(summary.workpieces.nodeId, onSelectNode)}
            />
            <DetailField
              label="Shapes"
              value={graph.regions.length}
              icon="layers"
              color={statColor(graph.regions.length, "#2563eb")}
            />
            <DetailField
              label="Flow edges"
              value={graph.edges.length}
              icon="git-branch"
              color={statColor(graph.edges.length, "#64748b")}
            />
            <DetailField
              label="Live markers"
              value={summary.liveAgents.count}
              icon="user-cog"
              color={statColor(summary.liveAgents.count, "#0a84ff")}
              onClick={
                summary.liveAgents.nodeId
                  ? () =>
                      onSelectNode(
                        summary.liveAgents.nodeId as string,
                        summary.liveAgents.markerId
                      )
                  : undefined
              }
            />
          </div>
        </DetailSection>

        <DetailSection title="Source">
          <div className="rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground">
            {sourceStatus.replace(/_/g, " ")}
          </div>
        </DetailSection>

      </div>
    </aside>
  );
}

type OverviewSummary = {
  activeWork: SummaryTarget;
  planning: SummaryTarget;
  liveAgents: SummaryTarget & { markerId: string | null };
  workpieces: SummaryTarget;
  warnings: number;
  verification: {
    verified: SummaryTarget;
    needsCheck: SummaryTarget;
  };
};

type SummaryTarget = {
  count: number;
  nodeId: string | null;
};

function buildOverviewSummary({
  graph,
  primaryNodes,
  warningCount,
}: Pick<GraphStatusPanelProps, "graph" | "primaryNodes"> & {
  warningCount: number;
}): OverviewSummary {
  const activeNodes = primaryNodes.filter((node) => node.status === "in_progress");
  const planningNodes = primaryNodes.filter((node) => node.status === "deferred");
  const workpieceNodes = primaryNodes.filter((node) => node.kind !== "checkpoint");
  const verifiedNodes = primaryNodes.filter((node) =>
    node.detail.verification.some((item) => item.result === "verified")
  );
  const needsCheckNodes = primaryNodes.filter((node) =>
    node.detail.verification.some((item) =>
      ["blocked", "needs_human", "unknown"].includes(item.result)
    )
  );
  const firstMarker = graph.markers[0] ?? null;

  return {
    activeWork: createSummaryTarget(activeNodes),
    planning: createSummaryTarget(planningNodes),
    liveAgents: {
      count: graph.markers.length,
      nodeId: firstMarker?.targetId ?? null,
      markerId: firstMarker?.id ?? null,
    },
    workpieces: createSummaryTarget(workpieceNodes),
    warnings: warningCount + graph.missing.length,
    verification: {
      verified: createSummaryTarget(verifiedNodes),
      needsCheck: createSummaryTarget(needsCheckNodes),
    },
  };
}

function createSummaryTarget(nodes: Array<{ id: string }>): SummaryTarget {
  return {
    count: nodes.length,
    nodeId: nodes[0]?.id ?? null,
  };
}

function createSelectNodeHandler(
  nodeId: string | null,
  onSelectNode: GraphStatusPanelProps["onSelectNode"]
) {
  return nodeId ? () => onSelectNode(nodeId) : undefined;
}

function statColor(count: number, color: string) {
  return count > 0 ? color : "#64748b";
}
