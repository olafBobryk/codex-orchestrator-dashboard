import type { GraphMarker } from "@/lib/graph/orchestration-graph";
import { renderGraphPanelIcon } from "./icons";
import { GraphPanelPreviewContent } from "./preview-card";

export function MarkerGlyph({
  marker,
  size = "md",
}: {
  marker: GraphMarker;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "size-5"
      : size === "lg"
        ? "size-11"
        : "size-8";
  const iconClass =
    size === "sm"
      ? "h-3 w-3"
      : size === "lg"
        ? "h-6 w-6"
        : "h-4 w-4";

  return (
    <span
      className={`grid ${sizeClass} shrink-0 place-items-center rounded-md border text-white shadow-sm`}
      style={{
        borderColor: marker.color,
        backgroundColor: marker.color,
        opacity: marker.muted ? 0.52 : 1,
      }}
      title={marker.icon ?? marker.label}
    >
      {renderGraphPanelIcon(marker.icon, iconClass)}
    </span>
  );
}

export function MarkerIsland({
  marker,
  selected,
  onSelect,
}: {
  marker: GraphMarker;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full min-w-0 rounded-md border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      style={{
        borderColor: marker.color,
        boxShadow: selected ? `inset 0 0 0 1px ${marker.color}` : undefined,
        opacity: marker.muted ? 0.72 : 1,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <GraphPanelPreviewContent
        icon={marker.icon}
        color={marker.color}
        primary={marker.label}
        description={marker.description}
        muted={marker.muted}
      />
    </button>
  );
}
