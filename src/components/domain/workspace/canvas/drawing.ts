import type { NodeObject } from "react-force-graph-2d";
import type { GraphMarker, GraphNode } from "@/lib/graph/orchestration-graph";
import {
  drawRoundedRect,
  getLinkEndpointId,
  getMarkerIslandRect,
} from "./canvas-geometry";
import type {
  CanvasLink,
  CanvasNode,
  CanvasRegion,
  CanvasTheme,
  GraphMethods,
} from "./types";

const METABALL_BRIDGE_PADDING = 58;
const METABALL_THRESHOLD = 1;
const METABALL_GRID_SIZE = 18;
const METABALL_GEOMETRY_CACHE_LIMIT = 180;
const METABALL_GEOMETRY_CACHE_PRECISION = 4;
const NODE_LABEL_FADE_START_SCALE = 0.42;
const NODE_LABEL_FADE_END_SCALE = 0.74;
const NODE_ICON_FADE_START_SCALE = 0.34;
const NODE_ICON_FADE_END_SCALE = 0.66;
const NODE_ICON_DIAMETER_RATIO = 0.5;
const REGION_INTERNALS_FILL_ALPHA = 1;
const REGION_INTERNALS_TINT_ALPHA = 0.04;
const REGION_COVER_START_SCREEN_FILL = 0.1;
const REGION_COVER_FULL_SCREEN_FILL = 0.06;
const REGION_COVER_VISIBLE_ALPHA = 0.02;
const REGION_ABSTRACTION_SKIP_ALPHA = 0.5;
const REGION_NODE_BASE_PADDING = 58;
const REGION_NODE_DEPTH_PADDING = 8;
const REGION_NODE_MAX_PADDING = 82;
const REGION_CHILD_BASE_PADDING = 30;
const REGION_CHILD_DEPTH_PADDING = 8;
const REGION_CHILD_MAX_PADDING = 54;
const REGION_INSIDE_LABEL_FONT_SIZE = 18;
const REGION_INSIDE_LABEL_MIN_FONT_SIZE = 10;
const REGION_INSIDE_LABEL_AREA_FONT_RATIO = 0.055;
const REGION_LABEL_COLLISION_GAP = 14;
const PROMOTED_MARKER_BADGE_SCREEN_SIZE = 34;
const PROMOTED_MARKER_BADGE_MIN_SIZE = 26;
const PROMOTED_MARKER_BADGE_MAX_SIZE = 56;
const PROMOTED_MARKER_BADGE_AREA_GAP_RATIO = 0.014;
const PROMOTED_MARKER_BADGE_MIN_GAP = 3;
const PROMOTED_MARKER_BADGE_MAX_GAP = 12;
const PROMOTED_MARKER_OUTLINE_AREA_GAP_RATIO = 0.006;
const PROMOTED_MARKER_OUTLINE_MIN_GAP = 1.5;
const PROMOTED_MARKER_OUTLINE_MAX_GAP = 7;
const PROMOTED_MARKER_MAX_COLUMNS = 4;
const PROMOTED_MARKER_TRANSITION_MS = 220;
const MARKER_LOADER_ROTATION_MS = 1200;
const MARKER_LOADER_TRANSITION_MS = 620;
const NODE_HIT_PADDING = 12;

type MarkerLoaderAnimationState = {
  loader: boolean;
  changedAt: number;
  lastSeenAt: number;
};

const markerLoaderAnimationState = new Map<string, MarkerLoaderAnimationState>();

type PromotedMarkerRectAnimationState = {
  fromRect: CanvasGraphRect;
  targetRect: CanvasGraphRect;
  changedAt: number;
  lastSeenAt: number;
};

const promotedMarkerRectAnimationState = new Map<
  string,
  PromotedMarkerRectAnimationState
>();

export type CanvasGraphRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type PromotedMarkerHitArea = {
  node: CanvasNode;
  marker: GraphMarker;
  rect: CanvasGraphRect;
  transitioning: boolean;
};

export function getPromotedMarkerIds(hitAreas: PromotedMarkerHitArea[]) {
  return new Set(hitAreas.map((hitArea) => hitArea.marker.id));
}

type MarkerIslandRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PromotedMarkerPlacement = {
  node: NodeObject<CanvasNode>;
  marker: GraphMarker;
  index: number;
  host: RegionField;
  coverAlpha: number;
};

export { readCanvasTheme } from "./canvas-theme";
export {
  getLinkEndpoint,
  getMarkerIslandRect,
  getPointToSegmentDistance,
  type LinkEndpoint,
} from "./canvas-geometry";
export { drawLink, drawLinkPointerArea } from "./link-drawing";

export function drawNode({
  node,
  context,
  selected,
  selectedMarkerId,
  promotedMarkerIds,
  theme,
  globalScale,
}: {
  node: NodeObject<CanvasNode>;
  context: CanvasRenderingContext2D;
  selected: boolean;
  selectedMarkerId: string | null;
  promotedMarkerIds?: Set<string>;
  theme: CanvasTheme;
  globalScale: number;
}) {
  const strokeColor = node.offSource ? "#64748b" : node.color;
  const radius = node.visualRadius;
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const label = node.label;
  const labelAlpha = smoothStep(
    NODE_LABEL_FADE_START_SCALE,
    NODE_LABEL_FADE_END_SCALE,
    globalScale
  );
  const iconAlpha =
    1 -
    smoothStep(
      NODE_ICON_FADE_START_SCALE,
      NODE_ICON_FADE_END_SCALE,
      globalScale
    );

  context.save();
  context.shadowColor = "rgba(15,23,42,0.12)";
  context.shadowBlur = selected ? 16 : 8;
  context.shadowOffsetY = selected ? 5 : 3;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = theme.surface;
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = strokeColor;
  context.lineWidth = 1.5;
  context.stroke();

  drawNodeMarkers({
    node,
    context,
    radius,
    selectedMarkerId,
    promotedMarkerIds,
    theme,
  });

  if (iconAlpha > 0.02) {
    context.globalAlpha = iconAlpha;
    drawCanvasIcon({
      context,
      icon: getCanvasNodeIconName(node),
      x,
      y,
      size: radius * 2 * NODE_ICON_DIAMETER_RATIO,
      color: strokeColor,
    });
  }

  if (labelAlpha > 0.02) {
    context.globalAlpha = labelAlpha;
    context.fillStyle = theme.surfaceForeground;
    context.font = `600 ${node.primary ? 15 : 13}px ui-sans-serif, system-ui`;
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(truncateCanvasText(context, label, radius * 1.65), x, y);
  }
  context.restore();
}

export function drawRegions({
  regions,
  nodes,
  context,
  globalScale,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
}) {
  if (regions.length === 0) {
    return;
  }

  const regionState = getRegionRenderState({
    regions,
    nodes,
    context,
    globalScale,
  });

  for (const regionField of regionState.regionFields) {
    if (
      getRegionCoveredAncestorDepthCount({
        region: regionField.region,
        regions,
        regionState,
      }) >= 2
    ) {
      continue;
    }

    context.save();
    drawMetaballBoundary({
      context,
      field: regionField.field,
      color: regionField.region.color,
      muted: regionField.region.muted,
      globalScale,
    });
    context.restore();
  }
}

export function drawRegionOverlays({
  regions,
  nodes,
  context,
  theme,
  globalScale,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  theme: CanvasTheme;
  globalScale: number;
}): CanvasGraphRect[] {
  if (regions.length === 0) {
    return [];
  }

  const regionState = getRegionRenderState({
    regions,
    nodes,
    context,
    globalScale,
  });

  const labelRects: RegionLabelRect[] = [];

  for (const regionField of [...regionState.regionFields].sort(
    compareRegionCoverOrder
  )) {
    if (
      getRegionCoveredAncestorDepthCount({
        region: regionField.region,
        regions,
        regionState,
      }) >= 2
    ) {
      continue;
    }

    const coverAlpha =
      regionState.coverAlphaByRegionId.get(regionField.region.id) ?? 0;

    if (coverAlpha <= REGION_COVER_VISIBLE_ALPHA) {
      continue;
    }

    if (
      hasVisibleCoveredAncestor({
        region: regionField.region,
        regions,
        regionState,
      })
    ) {
      continue;
    }

    const visualAlpha = regionField.region.muted ? coverAlpha * 0.52 : coverAlpha;

    context.save();
    drawRegionInternalsFill({
      context,
      field: regionField.field,
      region: regionField.region,
      theme,
      globalScale,
      alpha: visualAlpha,
    });
    context.restore();
  }

  for (const regionField of [...regionState.regionFields].sort(
    compareRegionCoverOrder
  )) {
    const coverAlpha =
      regionState.coverAlphaByRegionId.get(regionField.region.id) ?? 0;

    if (coverAlpha <= REGION_COVER_VISIBLE_ALPHA) {
      continue;
    }

    if (
      getRegionCoveredAncestorDepthCount({
        region: regionField.region,
        regions,
        regionState,
      }) >= 2
    ) {
      continue;
    }

    if (
      hasVisibleCoveredAncestor({
        region: regionField.region,
        regions,
        regionState,
      })
    ) {
      continue;
    }

    context.save();
    context.globalAlpha = getRegionLabelAlpha(regionField.region, coverAlpha);
    drawFilledRegionLabel({
      context,
      field: regionField.field,
      region: regionField.region,
      theme,
      globalScale,
      placedRects: labelRects,
    });
    context.restore();
  }

  return labelRects;
}

function compareRegionCoverOrder(left: RegionField, right: RegionField) {
  return left.depth - right.depth || left.order - right.order;
}

function getRegionCoverAlphaFromScreenFill(screenFill: number) {
  return (
    1 -
    smoothStep(
      REGION_COVER_FULL_SCREEN_FILL,
      REGION_COVER_START_SCREEN_FILL,
      screenFill
    )
  );
}

function getRegionLabelAlpha(region: CanvasRegion, alpha: number) {
  return region.muted ? alpha * 0.42 : alpha;
}

export function drawPromotedMarkerIslands({
  regions,
  nodes,
  context,
  globalScale,
  selectedMarkerId,
  avoidanceRects,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
  selectedMarkerId: string | null;
  avoidanceRects: CanvasGraphRect[];
}): PromotedMarkerHitArea[] {
  if (regions.length === 0) {
    return [];
  }

  const regionState = getRegionRenderState({
    regions,
    nodes,
    context,
    globalScale,
  });
  const promotedMarkers = collectPromotedMarkers({
    regions,
    nodes,
    regionState,
  });
  prunePromotedMarkerRectAnimations(promotedMarkers);

  const placedRects = [...avoidanceRects];
  const hitAreas: PromotedMarkerHitArea[] = [];
  const hostCounts = countPromotedMarkersByHost(promotedMarkers);
  const hostIndexes = new Map<string, number>();

  for (const promoted of promotedMarkers) {
    const hostId = promoted.host.region.id;
    const hostIndex = hostIndexes.get(hostId) ?? 0;
    const hostCount = hostCounts.get(hostId) ?? 1;
    const gap = getPromotedMarkerBadgeGap(promoted.host.field);
    const targetRect = resolveCompactPromotedMarkerRect({
      promoted,
      placedRects,
      globalScale,
      gap,
      hostIndex,
      hostCount,
    });
    const selected = selectedMarkerId === promoted.marker.id;
    const renderRect = resolvePromotedMarkerRenderRect(
      promoted.marker.id,
      targetRect
    );
    const transitioning = isPromotedMarkerRectTransitioning(promoted.marker.id);

    context.save();
    context.globalAlpha = promoted.marker.muted ? 0.48 : 1;
    drawPromotedMarkerRegionRing({
      context,
      promoted,
      globalScale,
      hostIndex,
      alpha: 1,
    });
    drawCompactPromotedMarkerBadge({
      context,
      marker: promoted.marker,
      rect: renderRect,
      selected,
    });
    drawPromotedMarkerLoader({
      context,
      marker: promoted.marker,
      rect: renderRect,
      selected,
    });
    context.restore();

    placedRects.push(expandCanvasRect(targetRect, gap / 2));
    hostIndexes.set(hostId, hostIndex + 1);
    hitAreas.push({
      node: promoted.node,
      marker: promoted.marker,
      rect: renderRect,
      transitioning,
    });
  }

  return hitAreas;
}

function drawRegionInternalsFill({
  context,
  field,
  region,
  theme,
  globalScale,
  alpha,
}: {
  context: CanvasRenderingContext2D;
  field: MetaballField;
  region: CanvasRegion;
  theme: CanvasTheme;
  globalScale: number;
  alpha: number;
}) {
  drawMetaballFill({
    context,
    field,
    color: theme.surface,
    alpha: REGION_INTERNALS_FILL_ALPHA,
    globalScale,
  });
  drawMetaballFill({
    context,
    field,
    color: region.color,
    alpha: alpha * REGION_INTERNALS_TINT_ALPHA,
    globalScale,
  });
  drawMetaballBoundary({
    context,
    field,
    color: region.color,
    muted: region.muted,
    alpha,
    globalScale,
  });
}

function drawFilledRegionLabel({
  context,
  field,
  region,
  theme,
  globalScale,
  placedRects,
}: {
  context: CanvasRenderingContext2D;
  field: MetaballField;
  region: CanvasRegion;
  theme: CanvasTheme;
  globalScale: number;
  placedRects: RegionLabelRect[];
}) {
  const anchor = getRegionLabelCenter(field);
  const fieldWidth = field.bounds.right - field.bounds.left;
  const fieldHeight = field.bounds.bottom - field.bounds.top;
  const screenArea = Math.max(
    1,
    fieldWidth * fieldHeight * globalScale * globalScale
  );
  const screenFontSize = clamp(
    Math.sqrt(screenArea) * REGION_INSIDE_LABEL_AREA_FONT_RATIO,
    REGION_INSIDE_LABEL_MIN_FONT_SIZE,
    REGION_INSIDE_LABEL_FONT_SIZE
  );
  const maxWidth = Math.max(120, (field.bounds.right - field.bounds.left) * 0.84);
  const fontSize = screenFontSize / Math.max(0.16, globalScale);

  context.fillStyle = theme.surfaceForeground;
  context.font = `700 ${fontSize}px ui-sans-serif, system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const lines = wrapCanvasText(context, region.label, maxWidth, 3);
  const lineHeight = fontSize * 1.2;
  const labelWidth = Math.max(
    fontSize,
    ...lines.map((line) => context.measureText(line).width)
  );
  const labelHeight = getRegionLabelHeight(fontSize, lineHeight, lines.length);
  const labelAnchor = resolveRegionLabelAnchor({
    anchor,
    bounds: field.bounds,
    labelWidth,
    labelHeight,
    globalScale,
    placedRects,
  });

  lines.forEach((line, index) => {
    context.fillText(
      line,
      labelAnchor.x,
      labelAnchor.y + (index - (lines.length - 1) / 2) * lineHeight
    );
  });
}

export function isNodeCoveredByActiveRegion({
  node,
  regions,
  nodes,
  context,
  globalScale,
}: {
  node: NodeObject<CanvasNode>;
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
}) {
  if (regions.length === 0) {
    return false;
  }

  const regionState = getRegionRenderState({
    regions,
    nodes,
    context,
    globalScale,
  });

  return (
    getNodeCoveredRegionDepthCount({
      nodeId: node.id,
      regions,
      regionState,
    }) >= 2
  );
}

export function isLinkCoveredByActiveRegions({
  link,
  regions,
  nodes,
  context,
  globalScale,
}: {
  link: CanvasLink;
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
}) {
  if (regions.length === 0) {
    return false;
  }

  const sourceId = getLinkEndpointId(link.source as unknown);
  const targetId = getLinkEndpointId(link.target as unknown);

  if (!sourceId || !targetId) {
    return false;
  }

  const regionState = getRegionRenderState({
    regions,
    nodes,
    context,
    globalScale,
  });

  return (
    Math.min(
      getNodeCoveredRegionDepthCount({
        nodeId: sourceId,
        regions,
        regionState,
      }),
      getNodeCoveredRegionDepthCount({
        nodeId: targetId,
        regions,
        regionState,
      })
    ) >= 2
  );
}

function getNodeCoveredRegionDepthCount({
  nodeId,
  regions,
  regionState,
}: {
  nodeId: string;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
}) {
  const regionsById = new Map(regions.map((region) => [region.id, region]));
  const coveredDepths = new Set<number>();

  for (const region of regions) {
    const depth = regionState.regionDepths.get(region.id) ?? 0;

    if (
      (regionState.coverAlphaByRegionId.get(region.id) ?? 0) <
      REGION_ABSTRACTION_SKIP_ALPHA
    ) {
      continue;
    }

    if (regionContainsNode(region, nodeId, regionsById, new Set())) {
      coveredDepths.add(depth);
    }
  }

  return coveredDepths.size;
}

function getRegionCoveredAncestorDepthCount({
  region,
  regions,
  regionState,
}: {
  region: CanvasRegion;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
}) {
  const coveredDepths = new Set<number>();
  const visited = new Set<string>();

  collectCoveredAncestorDepths({
    regionId: region.id,
    regions,
    regionState,
    coveredDepths,
    visited,
  });

  return coveredDepths.size;
}

function hasVisibleCoveredAncestor({
  region,
  regions,
  regionState,
}: {
  region: CanvasRegion;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
}) {
  return hasVisibleCoveredAncestorById({
    regionId: region.id,
    regions,
    regionState,
    visited: new Set(),
  });
}

function hasVisibleCoveredAncestorById({
  regionId,
  regions,
  regionState,
  visited,
}: {
  regionId: string;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
  visited: Set<string>;
}): boolean {
  if (visited.has(regionId)) {
    return false;
  }

  visited.add(regionId);

  for (const candidate of regions) {
    if (!getRegionChildIdsForRendering(candidate, regions).includes(regionId)) {
      continue;
    }

    if (
      (regionState.coverAlphaByRegionId.get(candidate.id) ?? 0) >
      REGION_COVER_VISIBLE_ALPHA
    ) {
      return true;
    }

    if (
      hasVisibleCoveredAncestorById({
        regionId: candidate.id,
        regions,
        regionState,
        visited,
      })
    ) {
      return true;
    }
  }

  return false;
}

function collectCoveredAncestorDepths({
  regionId,
  regions,
  regionState,
  coveredDepths,
  visited,
}: {
  regionId: string;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
  coveredDepths: Set<number>;
  visited: Set<string>;
}) {
  if (visited.has(regionId)) {
    return;
  }

  visited.add(regionId);

  for (const candidate of regions) {
    if (!getRegionChildIdsForRendering(candidate, regions).includes(regionId)) {
      continue;
    }

    const depth = regionState.regionDepths.get(candidate.id) ?? 0;

    if (
      (regionState.coverAlphaByRegionId.get(candidate.id) ?? 0) >=
      REGION_ABSTRACTION_SKIP_ALPHA
    ) {
      coveredDepths.add(depth);
    }

    collectCoveredAncestorDepths({
      regionId: candidate.id,
      regions,
      regionState,
      coveredDepths,
      visited,
    });
  }
}

function regionContainsNode(
  region: CanvasRegion,
  nodeId: string,
  regionsById: Map<string, CanvasRegion>,
  visited: Set<string>
): boolean {
  if (region.nodeIds.includes(nodeId)) {
    return true;
  }

  if (visited.has(region.id)) {
    return false;
  }

  visited.add(region.id);

  return getRegionChildIdsForRendering(region, [...regionsById.values()]).some((regionId) => {
    const child = regionsById.get(regionId);

    if (!child) {
      return false;
    }

    return regionContainsNode(child, nodeId, regionsById, visited);
  });
}

function collectPromotedMarkers({
  regions,
  nodes,
  regionState,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  regionState: RegionRenderState;
}) {
  const promoted: PromotedMarkerPlacement[] = [];

  for (const node of nodes) {
    if (node.markers.length === 0) {
      continue;
    }

    const host = resolvePromotedMarkerHost({
      nodeId: node.id,
      regions,
      regionState,
    });

    if (!host) {
      continue;
    }

    node.markers.slice(0, 4).forEach((marker, index) => {
      promoted.push({
        node,
        marker,
        index,
        host: host.regionField,
        coverAlpha: host.coverAlpha,
      });
    });
  }

  return promoted.sort((left, right) => {
    return (
      left.host.order - right.host.order ||
      left.index - right.index ||
      left.marker.id.localeCompare(right.marker.id)
    );
  });
}

function resolvePromotedMarkerHost({
  nodeId,
  regions,
  regionState,
}: {
  nodeId: string;
  regions: CanvasRegion[];
  regionState: RegionRenderState;
}) {
  const regionsById = new Map(regions.map((region) => [region.id, region]));
  const containingFields = regionState.regionFields
    .map((regionField) => ({
      regionField,
      coverAlpha: regionState.coverAlphaByRegionId.get(regionField.region.id) ?? 0,
    }))
    .filter(({ regionField, coverAlpha }) => {
      return (
        coverAlpha > REGION_COVER_VISIBLE_ALPHA &&
        regionContainsNode(regionField.region, nodeId, regionsById, new Set())
      );
    });

  const visibleHosts = containingFields.filter(({ regionField }) => {
    return (
      getRegionCoveredAncestorDepthCount({
        region: regionField.region,
        regions,
        regionState,
      }) < 2 &&
      !hasVisibleCoveredAncestor({
        region: regionField.region,
        regions,
        regionState,
      })
    );
  });
  const candidates =
    visibleHosts.length > 0
      ? visibleHosts
      : containingFields;

  return (
    candidates.sort((left, right) => {
      return (
        right.regionField.depth - left.regionField.depth ||
        right.coverAlpha - left.coverAlpha ||
        left.regionField.order - right.regionField.order
      );
    })[0] ?? null
  );
}

function prunePromotedMarkerRectAnimations(
  promotedMarkers: PromotedMarkerPlacement[]
) {
  const promotedMarkerIds = new Set(
    promotedMarkers.map((promoted) => promoted.marker.id)
  );

  for (const markerId of promotedMarkerRectAnimationState.keys()) {
    if (!promotedMarkerIds.has(markerId)) {
      promotedMarkerRectAnimationState.delete(markerId);
    }
  }
}

function resolvePromotedMarkerRenderRect(
  markerId: string,
  targetRect: CanvasGraphRect
) {
  const now = readAnimationNow();
  const current = promotedMarkerRectAnimationState.get(markerId);

  if (!current) {
    promotedMarkerRectAnimationState.set(markerId, {
      fromRect: targetRect,
      targetRect,
      changedAt: now,
      lastSeenAt: now,
    });

    return targetRect;
  }

  if (!canvasRectsAlmostEqual(current.targetRect, targetRect)) {
    const fromRect = interpolateCanvasRectPosition(
      current.fromRect,
      current.targetRect,
      getPromotedMarkerRectTransitionProgress(current, now)
    );

    current.fromRect = fromRect;
    current.targetRect = targetRect;
    current.changedAt = now;
  }

  current.lastSeenAt = now;

  return interpolateCanvasRectPosition(
    current.fromRect,
    current.targetRect,
    getPromotedMarkerRectTransitionProgress(current, now)
  );
}

function isPromotedMarkerRectTransitioning(markerId: string) {
  const current = promotedMarkerRectAnimationState.get(markerId);

  if (!current) {
    return false;
  }

  return readAnimationNow() - current.changedAt < PROMOTED_MARKER_TRANSITION_MS;
}

function getPromotedMarkerRectTransitionProgress(
  state: PromotedMarkerRectAnimationState,
  now: number
) {
  return smoothStep(
    0,
    1,
    (now - state.changedAt) / PROMOTED_MARKER_TRANSITION_MS
  );
}

function countPromotedMarkersByHost(promotedMarkers: PromotedMarkerPlacement[]) {
  const counts = new Map<string, number>();

  for (const promoted of promotedMarkers) {
    const hostId = promoted.host.region.id;
    counts.set(hostId, (counts.get(hostId) ?? 0) + 1);
  }

  return counts;
}

function resolveCompactPromotedMarkerRect({
  promoted,
  placedRects,
  globalScale,
  gap,
  hostIndex,
  hostCount,
}: {
  promoted: PromotedMarkerPlacement;
  placedRects: CanvasGraphRect[];
  globalScale: number;
  gap: number;
  hostIndex: number;
  hostCount: number;
}) {
  const size = getPromotedMarkerBadgeSize(globalScale);
  const center = getRegionLabelCenter(promoted.host.field);
  const field = promoted.host.field;
  const baseX = field.bounds.right + gap + size / 2;
  const baseY =
    center.y + (hostIndex - (hostCount - 1) / 2) * (size + gap * 0.7);
  let fallbackRect: CanvasGraphRect | null = null;

  for (let column = 0; column < PROMOTED_MARKER_MAX_COLUMNS; column += 1) {
    for (const yOffset of createPromotedMarkerYOffsetOrder(size, gap)) {
      const candidateCenter = {
        x: baseX + column * (size + gap),
        y: baseY + yOffset,
      };
      const rect = createCanvasRectFromCenter(candidateCenter, size, size);
      const expandedRect = expandCanvasRect(rect, gap);

      fallbackRect = rect;

      if (
        !placedRects.some((placedRect) =>
          regionLabelRectsOverlap(expandedRect, placedRect)
        )
      ) {
        return rect;
      }
    }
  }

  return fallbackRect ?? createCanvasRectFromCenter({ x: baseX, y: baseY }, size, size);
}

function drawNodeMarkers({
  node,
  context,
  radius,
  selectedMarkerId,
  promotedMarkerIds,
  theme,
}: {
  node: NodeObject<CanvasNode>;
  context: CanvasRenderingContext2D;
  radius: number;
  selectedMarkerId: string | null;
  promotedMarkerIds?: Set<string>;
  theme: CanvasTheme;
}) {
  if (node.markers.length === 0) {
    return;
  }

  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const ringGap = 8;

  node.markers.slice(0, 4).forEach((marker, index) => {
    if (promotedMarkerIds?.has(marker.id)) {
      return;
    }

    const ringRadius = radius + ringGap + index * 5;
    const island = getMarkerIslandRect(node, index);
    const selected = selectedMarkerId === marker.id;
    updateMarkerLoaderAnimationState(
      marker.id,
      marker.loader,
      readAnimationNow()
    );

    context.save();
    context.globalAlpha = marker.muted ? 0.48 : 1;

    if (marker.loader || isMarkerLoaderTransitioning(marker.id)) {
      drawMarkerLoaderRing({
        markerId: marker.id,
        context,
        x,
        y,
        radius: ringRadius,
        color: marker.color,
        lineWidth: selected ? 4.4 : 3.2,
        loading: marker.loader,
      });
    } else {
      context.beginPath();
      context.arc(x, y, ringRadius, 0, Math.PI * 2);
      context.strokeStyle = marker.color;
      context.lineWidth = selected ? 4 : 2.8;
      context.stroke();
    }

    drawMarkerIsland({
      context,
      marker,
      island,
      selected,
      theme,
    });
    context.restore();
  });
}

function drawMarkerIsland({
  context,
  marker,
  island,
  selected,
  theme,
}: {
  context: CanvasRenderingContext2D;
  marker: GraphMarker;
  island: MarkerIslandRect;
  selected: boolean;
  theme: CanvasTheme;
}) {
  drawRoundedRect(context, island.x, island.y, island.width, island.height, 12);
  context.fillStyle = theme.surface;
  context.fill();
  context.strokeStyle = marker.color;
  context.lineWidth = selected ? 2.5 : 1.5;
  context.stroke();

  drawRoundedRect(context, island.x + 8, island.y + 8, 34, 34, 9);
  context.fillStyle = marker.color;
  context.fill();
  drawCanvasIcon({
    context,
    icon: marker.icon,
    x: island.x + 25,
    y: island.y + island.height / 2,
    size: 20,
    color: "#ffffff",
  });

  context.fillStyle = theme.surfaceForeground;
  context.font = "600 12px ui-sans-serif, system-ui";
  context.textAlign = "left";
  context.fillText(
    truncateCanvasText(context, marker.label, island.width - 54),
    island.x + 50,
    island.y + 21
  );
  context.fillStyle = "rgba(148, 163, 184, 0.92)";
  context.font = "500 10px ui-sans-serif, system-ui";
  context.fillText(
    truncateCanvasText(
      context,
      marker.description ?? (marker.muted ? "Muted marker" : "Active marker"),
      island.width - 54
    ),
    island.x + 50,
    island.y + 35
  );
}

function drawCompactPromotedMarkerBadge({
  context,
  marker,
  rect,
  selected,
}: {
  context: CanvasRenderingContext2D;
  marker: GraphMarker;
  rect: CanvasGraphRect;
  selected: boolean;
}) {
  const size = Math.min(rect.right - rect.left, rect.bottom - rect.top);
  const radius = Math.max(6, size * 0.26);

  drawRoundedRect(context, rect.left, rect.top, size, size, radius);
  context.fillStyle = marker.color;
  context.fill();
  context.strokeStyle = selected ? "#ffffff" : "rgba(255,255,255,0.72)";
  context.lineWidth = selected ? Math.max(2, size * 0.08) : Math.max(1.2, size * 0.045);
  context.stroke();

  drawCanvasIcon({
    context,
    icon: marker.icon,
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
    size: size * 0.58,
    color: "#ffffff",
  });
}

function drawPromotedMarkerRegionRing({
  context,
  promoted,
  globalScale,
  hostIndex,
  alpha,
}: {
  context: CanvasRenderingContext2D;
  promoted: PromotedMarkerPlacement;
  globalScale: number;
  hostIndex: number;
  alpha: number;
}) {
  const outlineWidth = getMetaballBoundaryLineWidth(globalScale);
  const outlineGap = getPromotedMarkerOutlineGap(promoted.host.field);
  const expansion =
    hostIndex * (outlineWidth + outlineGap);
  const expandedField = expandMetaballField(promoted.host.field, expansion);

  drawMetaballBoundary({
    context,
    field: expandedField,
    color: promoted.marker.color,
    muted: promoted.marker.muted,
    alpha: alpha * 0.78,
    globalScale,
    lineWidth: outlineWidth,
  });
}

function drawPromotedMarkerLoader({
  context,
  marker,
  rect,
  selected,
}: {
  context: CanvasRenderingContext2D;
  marker: GraphMarker;
  rect: CanvasGraphRect;
  selected: boolean;
}) {
  updateMarkerLoaderAnimationState(marker.id, marker.loader, readAnimationNow());

  if (!marker.loader && !isMarkerLoaderTransitioning(marker.id)) {
    return;
  }

  drawMarkerLoaderRing({
    markerId: marker.id,
    context,
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
    radius: Math.max(8, (rect.right - rect.left) * 0.42),
    color: "#ffffff",
    lineWidth: selected ? 3.2 : 2.4,
    loading: marker.loader,
  });
}

function drawMarkerLoaderRing({
  markerId,
  context,
  x,
  y,
  radius,
  color,
  lineWidth,
  loading,
}: {
  markerId: string;
  context: CanvasRenderingContext2D;
  x: number;
  y: number;
  radius: number;
  color: string;
  lineWidth: number;
  loading: boolean;
}) {
  const now = readAnimationNow();
  const animationState = updateMarkerLoaderAnimationState(markerId, loading, now);
  const transitionProgress = Math.min(
    1,
    Math.max(0, (now - animationState.changedAt) / MARKER_LOADER_TRANSITION_MS)
  );
  const openness = loading
    ? smoothStep(0, 1, transitionProgress)
    : 1 - smoothStep(0, 1, transitionProgress);
  const transparentSpan = Math.PI * openness;
  const solidSpan = Math.PI * 2 - transparentSpan;
  const rotation =
    ((now % MARKER_LOADER_ROTATION_MS) / MARKER_LOADER_ROTATION_MS) *
    Math.PI *
    2;

  context.save();
  context.lineWidth = lineWidth;
  context.lineCap = "round";

  const conicContext = context as CanvasRenderingContext2D & {
    createConicGradient?: (
      startAngle: number,
      x: number,
      y: number
    ) => CanvasGradient;
  };

  if (typeof conicContext.createConicGradient === "function") {
    const gradient = conicContext.createConicGradient(rotation, x, y);
    const solidStop = Math.max(0.001, Math.min(0.999, solidSpan / (Math.PI * 2)));

    gradient.addColorStop(0, color);
    gradient.addColorStop(Math.max(0, solidStop - 0.002), color);
    gradient.addColorStop(solidStop, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.strokeStyle = gradient;
    context.stroke();
  } else {
    context.beginPath();
    context.arc(x, y, radius, rotation, rotation + solidSpan);
    context.strokeStyle = color;
    context.stroke();
  }

  context.restore();
}

function updateMarkerLoaderAnimationState(
  markerId: string,
  loading: boolean,
  now: number
) {
  const current = markerLoaderAnimationState.get(markerId);

  if (!current) {
    const next = {
      loader: loading,
      changedAt: loading ? now : now - MARKER_LOADER_TRANSITION_MS,
      lastSeenAt: now,
    };
    markerLoaderAnimationState.set(markerId, next);
    return next;
  }

  if (current.loader !== loading) {
    current.loader = loading;
    current.changedAt = now;
  }

  current.lastSeenAt = now;
  return current;
}

function isMarkerLoaderTransitioning(markerId: string) {
  const current = markerLoaderAnimationState.get(markerId);

  if (!current || current.loader) {
    return false;
  }

  const now = readAnimationNow();
  return now - current.changedAt < MARKER_LOADER_TRANSITION_MS;
}

function readAnimationNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function drawNodePointerArea(
  node: NodeObject<CanvasNode>,
  color: string,
  context: CanvasRenderingContext2D
) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(
    node.x ?? node.guideX ?? 0,
    node.y ?? node.guideY ?? 0,
    node.visualRadius + NODE_HIT_PADDING,
    0,
    Math.PI * 2
  );
  context.fill();

  node.markers.slice(0, 4).forEach((_, index) => {
    const island = getMarkerIslandRect(node, index);

    drawRoundedRect(
      context,
      island.x - 4,
      island.y - 4,
      island.width + 8,
      island.height + 8,
      14
    );
    context.fill();
  });
}

export function getRegionAtScreenPoint({
  regions,
  nodes,
  graph,
  x,
  y,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  graph: GraphMethods | undefined;
  x: number;
  y: number;
}) {
  if (!graph || regions.length === 0) {
    return null;
  }

  const point = graph.screen2GraphCoords(x, y);
  const globalScale = typeof graph.zoom === "function" ? graph.zoom() : 1;

  for (const regionField of getRegionFieldsForHitTesting({
    regions,
    nodes,
    globalScale,
  })) {
    const field = regionField.field;

    if (
      point.x < field.bounds.left ||
      point.x > field.bounds.right ||
      point.y < field.bounds.top ||
      point.y > field.bounds.bottom
    ) {
      continue;
    }

    if (readMetaballValue(field, point.x, point.y) >= METABALL_THRESHOLD) {
      return regionField.region;
    }
  }

  return null;
}

function getCanvasNodeIconName(node: CanvasNode) {
  if (node.icon) {
    return node.icon;
  }

  if (node.detail.blocks[0]?.icon) {
    return node.detail.blocks[0].icon;
  }

  if (node.markers[0]?.icon) {
    return node.markers[0].icon;
  }

  switch (node.kind) {
    case "concern":
      return "lock";
    case "handoff":
      return "split";
    case "thread":
      return "route";
    case "checkpoint":
      return "layers";
    default:
      return null;
  }
}

function drawCanvasIcon({
  context,
  icon,
  x,
  y,
  size,
  color,
}: {
  context: CanvasRenderingContext2D;
  icon: string | null;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const half = size / 2;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(1.8, size * 0.105);
  context.lineCap = "round";
  context.lineJoin = "round";

  switch (icon) {
    case "archive":
      drawIconArchive(context, x, y, size);
      break;
    case "check":
    case "check-circle":
      drawIconCheckCircle(context, x, y, size);
      break;
    case "eye":
      drawIconEye(context, x, y, size);
      break;
    case "file-json":
      drawIconFileJson(context, x, y, size);
      break;
    case "git-branch":
      drawIconGitBranch(context, x, y, size);
      break;
    case "layers":
      drawIconLayers(context, x, y, size);
      break;
    case "link":
      drawIconLink(context, x, y, size);
      break;
    case "lock":
      drawIconLock(context, x, y, size);
      break;
    case "monitor":
      drawIconMonitor(context, x, y, size);
      break;
    case "panel-right":
      drawIconPanelRight(context, x, y, size);
      break;
    case "route":
      drawIconRoute(context, x, y, size);
      break;
    case "split":
      drawIconSplit(context, x, y, size);
      break;
    case "user":
    case "user-cog":
      drawIconUserCog(context, x, y, size, icon === "user-cog");
      break;
    default:
      context.beginPath();
      context.arc(x, y, half * 0.72, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(x, y, half * 0.18, 0, Math.PI * 2);
      context.fill();
      break;
  }

  context.restore();
}

function drawIconArchive(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const width = size * 0.78;
  const height = size * 0.58;
  const left = x - width / 2;
  const top = y - height / 2 + size * 0.06;

  context.strokeRect(left, top, width, height);
  context.beginPath();
  context.moveTo(left - size * 0.04, top - size * 0.16);
  context.lineTo(left + width + size * 0.04, top - size * 0.16);
  context.lineTo(left + width, top);
  context.lineTo(left, top);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.moveTo(x - size * 0.12, top + height * 0.25);
  context.lineTo(x + size * 0.12, top + height * 0.25);
  context.stroke();
}

function drawIconCheckCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  context.beginPath();
  context.arc(x, y, size * 0.38, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(x - size * 0.18, y);
  context.lineTo(x - size * 0.04, y + size * 0.14);
  context.lineTo(x + size * 0.22, y - size * 0.16);
  context.stroke();
}

function drawIconEye(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.ellipse(x, y, size * 0.42, size * 0.25, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(x, y, size * 0.1, 0, Math.PI * 2);
  context.fill();
}

function drawIconFileJson(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const width = size * 0.58;
  const height = size * 0.74;
  const left = x - width / 2;
  const top = y - height / 2;

  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left + width * 0.68, top);
  context.lineTo(left + width, top + height * 0.28);
  context.lineTo(left + width, top + height);
  context.lineTo(left, top + height);
  context.closePath();
  context.stroke();
  context.font = `700 ${size * 0.34}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("{}", x, y + size * 0.08);
}

function drawIconGitBranch(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  const leftX = x - size * 0.22;
  const rightX = x + size * 0.24;
  const topY = y - size * 0.26;
  const bottomY = y + size * 0.26;

  context.beginPath();
  context.moveTo(leftX, topY);
  context.lineTo(leftX, bottomY);
  context.quadraticCurveTo(leftX, y, rightX, y);
  context.lineTo(rightX, topY);
  context.stroke();
  drawIconDot(context, leftX, topY, size);
  drawIconDot(context, leftX, bottomY, size);
  drawIconDot(context, rightX, topY, size);
}

function drawIconLayers(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  drawLayerDiamond(context, x, y - size * 0.14, size);
  drawLayerDiamond(context, x, y + size * 0.05, size);
  drawLayerDiamond(context, x, y + size * 0.24, size);
}

function drawLayerDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  context.beginPath();
  context.moveTo(x, y - size * 0.18);
  context.lineTo(x + size * 0.34, y);
  context.lineTo(x, y + size * 0.18);
  context.lineTo(x - size * 0.34, y);
  context.closePath();
  context.stroke();
}

function drawIconLink(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.ellipse(
    x - size * 0.17,
    y + size * 0.04,
    size * 0.24,
    size * 0.14,
    -0.65,
    0,
    Math.PI * 2
  );
  context.stroke();
  context.beginPath();
  context.ellipse(
    x + size * 0.17,
    y - size * 0.04,
    size * 0.24,
    size * 0.14,
    -0.65,
    0,
    Math.PI * 2
  );
  context.stroke();
}

function drawIconLock(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const width = size * 0.56;
  const height = size * 0.36;
  const left = x - width / 2;
  const top = y - height * 0.04;

  context.strokeRect(left, top, width, height);
  context.beginPath();
  context.arc(x, top, size * 0.22, Math.PI, Math.PI * 2);
  context.stroke();
}

function drawIconMonitor(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.strokeRect(x - size * 0.38, y - size * 0.28, size * 0.76, size * 0.48);
  context.beginPath();
  context.moveTo(x, y + size * 0.2);
  context.lineTo(x, y + size * 0.36);
  context.moveTo(x - size * 0.18, y + size * 0.36);
  context.lineTo(x + size * 0.18, y + size * 0.36);
  context.stroke();
}

function drawIconPanelRight(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  context.strokeRect(x - size * 0.38, y - size * 0.32, size * 0.76, size * 0.64);
  context.beginPath();
  context.moveTo(x + size * 0.12, y - size * 0.32);
  context.lineTo(x + size * 0.12, y + size * 0.32);
  context.stroke();
}

function drawIconRoute(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x - size * 0.25, y - size * 0.24);
  context.bezierCurveTo(
    x + size * 0.22,
    y - size * 0.28,
    x - size * 0.24,
    y + size * 0.22,
    x + size * 0.24,
    y + size * 0.24
  );
  context.stroke();
  drawIconDot(context, x - size * 0.28, y - size * 0.24, size);
  drawIconDot(context, x + size * 0.28, y + size * 0.24, size);
}

function drawIconSplit(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.beginPath();
  context.moveTo(x - size * 0.28, y + size * 0.28);
  context.lineTo(x - size * 0.28, y - size * 0.04);
  context.quadraticCurveTo(x - size * 0.28, y - size * 0.26, x, y - size * 0.26);
  context.lineTo(x + size * 0.28, y - size * 0.26);
  context.moveTo(x - size * 0.28, y - size * 0.04);
  context.quadraticCurveTo(x - size * 0.28, y + size * 0.18, x, y + size * 0.18);
  context.lineTo(x + size * 0.28, y + size * 0.18);
  context.stroke();
}

function drawIconUserCog(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  withCog: boolean
) {
  context.beginPath();
  context.arc(x - size * 0.06, y - size * 0.18, size * 0.17, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.arc(x - size * 0.06, y + size * 0.3, size * 0.32, Math.PI * 1.08, Math.PI * 1.92);
  context.stroke();

  if (!withCog) {
    return;
  }

  const cogX = x + size * 0.25;
  const cogY = y + size * 0.18;
  const inner = size * 0.08;
  const outer = size * 0.16;

  context.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 4;
    const radius = index % 2 === 0 ? outer : outer * 0.78;
    const pointX = cogX + Math.cos(angle) * radius;
    const pointY = cogY + Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(pointX, pointY);
    } else {
      context.lineTo(pointX, pointY);
    }
  }
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(cogX, cogY, inner, 0, Math.PI * 2);
  context.stroke();
}

function drawIconDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  context.beginPath();
  context.arc(x, y, size * 0.08, 0, Math.PI * 2);
  context.fill();
}

type FieldBlob = {
  x: number;
  y: number;
  radius: number;
};

type FieldBridge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
};

type MetaballField = {
  blobs: FieldBlob[];
  bridges: FieldBridge[];
  cacheKey: string;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

type RegionField = {
  region: CanvasRegion;
  field: MetaballField;
  depth: number;
  order: number;
};

type RegionLabelRect = CanvasGraphRect;

type RegionRenderState = {
  regionFields: RegionField[];
  regionDepths: Map<string, number>;
  coverAlphaByRegionId: Map<string, number>;
};

type MetaballGeometry = {
  paths: MetaballPoint[][];
  path: Path2D | null;
};

const metaballGeometryCache = new Map<string, MetaballGeometry>();
let lastRegionRenderState:
  | {
      key: string;
      state: RegionRenderState;
    }
  | null = null;

function getRegionFieldsForDrawing({
  regions,
  nodes,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
}) {
  return createRegionFields({ regions, nodes }).sort(
    (left, right) => right.depth - left.depth || left.order - right.order
  );
}

function getRegionRenderState({
  regions,
  nodes,
  context,
  globalScale,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
}): RegionRenderState {
  const key = getRegionRenderStateKey({ regions, nodes, context, globalScale });

  if (lastRegionRenderState?.key === key) {
    return lastRegionRenderState.state;
  }

  const regionFields = getRegionFieldsForDrawing({ regions, nodes });
  const regionDepths = new Map(
    regionFields.map((regionField) => [
      regionField.region.id,
      regionField.depth,
    ])
  );
  const coverAlphaByRegionId = new Map(
    regionFields.map((regionField) => [
      regionField.region.id,
      getRegionCoverAlphaFromScreenFill(
        getRegionScreenFill(regionField.field, context)
      ),
    ])
  );
  const state = {
    regionFields,
    regionDepths,
    coverAlphaByRegionId,
  };

  lastRegionRenderState = { key, state };

  return state;
}

function getRegionRenderStateKey({
  regions,
  nodes,
  context,
  globalScale,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  context: CanvasRenderingContext2D;
  globalScale: number;
}) {
  const quantize = (value: number) =>
    Math.round(value / METABALL_GEOMETRY_CACHE_PRECISION);
  const nodeKey = nodes
    .map(
      (node) =>
        `${node.id}:${quantize(node.x ?? 0)},${quantize(node.y ?? 0)},${quantize(
          node.visualRadius ?? 0
        )}`
    )
    .join("|");
  const regionKey = regions
    .map(
      (region) =>
        `${region.id}:${region.nodeIds.join(",")}:${region.regionIds.join(",")}`
    )
    .join("|");

  return [
    context.canvas.width,
    context.canvas.height,
    Math.round(globalScale * 1000),
    nodeKey,
    regionKey,
  ].join("::");
}

function getRegionScreenFill(
  field: MetaballField,
  context: CanvasRenderingContext2D
) {
  const transform = context.getTransform();
  const corners = [
    projectCanvasPoint(transform, field.bounds.left, field.bounds.top),
    projectCanvasPoint(transform, field.bounds.right, field.bounds.top),
    projectCanvasPoint(transform, field.bounds.right, field.bounds.bottom),
    projectCanvasPoint(transform, field.bounds.left, field.bounds.bottom),
  ];
  const left = Math.max(0, Math.min(...corners.map((point) => point.x)));
  const right = Math.min(
    context.canvas.width,
    Math.max(...corners.map((point) => point.x))
  );
  const top = Math.max(0, Math.min(...corners.map((point) => point.y)));
  const bottom = Math.min(
    context.canvas.height,
    Math.max(...corners.map((point) => point.y))
  );
  const visibleScreenArea = Math.max(0, right - left) * Math.max(0, bottom - top);
  const viewportScreenArea = Math.max(1, context.canvas.width * context.canvas.height);

  return Math.min(1, visibleScreenArea / viewportScreenArea);
}

function projectCanvasPoint(
  transform: DOMMatrix,
  x: number,
  y: number
) {
  return {
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  };
}

function getRegionFieldsForHitTesting({
  regions,
  nodes,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
  globalScale: number;
}) {
  const fields = createRegionFields({ regions, nodes });

  return fields.sort((left, right) => {
    return left.depth - right.depth || right.order - left.order;
  });
}

function createRegionFields({
  regions,
  nodes,
}: {
  regions: CanvasRegion[];
  nodes: NodeObject<CanvasNode>[];
}) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const regionsById = new Map(regions.map((region) => [region.id, region]));
  const regionOrder = new Map(regions.map((region, index) => [region.id, index]));
  const cache = new Map<string, RegionField | null>();

  const buildRegionField = (
    region: CanvasRegion,
    stack: Set<string>
  ): RegionField | null => {
    if (cache.has(region.id)) {
      return cache.get(region.id) ?? null;
    }

    if (stack.has(region.id)) {
      cache.set(region.id, null);
      return null;
    }

    stack.add(region.id);

    const childFields = getRegionChildIdsForRendering(region, regions)
      .map((regionId) => regionsById.get(regionId))
      .filter((child): child is CanvasRegion => Boolean(child))
      .map((child) => buildRegionField(child, stack))
      .filter((field): field is RegionField => Boolean(field));
    const depth =
      childFields.length === 0
        ? 0
        : Math.max(...childFields.map((field) => field.depth)) + 1;
    const nodePadding = Math.min(
      REGION_NODE_MAX_PADDING,
      REGION_NODE_BASE_PADDING + depth * REGION_NODE_DEPTH_PADDING
    );
    const childPadding = Math.min(
      REGION_CHILD_MAX_PADDING,
      REGION_CHILD_BASE_PADDING + depth * REGION_CHILD_DEPTH_PADDING
    );
    const nodeBlobs = region.nodeIds
      .map((nodeId) => nodesById.get(nodeId))
      .filter((node): node is NodeObject<CanvasNode> => Boolean(node))
      .map((node) => ({
        x: node.x ?? 0,
        y: node.y ?? 0,
        radius: (node.visualRadius ?? 48) + nodePadding,
      }));
    const childBlobs = childFields.map(({ field }) => {
      const bounds = getMetaballBlobBounds(field.blobs);
      const width = bounds.right - bounds.left;
      const height = bounds.bottom - bounds.top;

      return {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2,
        radius: Math.max(width, height) / 2 + childPadding,
      };
    });
    const blobs = [...nodeBlobs, ...childBlobs];

    if (blobs.length === 0) {
      cache.set(region.id, null);
      stack.delete(region.id);
      return null;
    }

    const resolved = {
      region,
      field: createMetaballFieldFromBlobs(blobs),
      depth,
      order: regionOrder.get(region.id) ?? 0,
    };

    cache.set(region.id, resolved);
    stack.delete(region.id);
    return resolved;
  };

  return regions
    .map((region) => buildRegionField(region, new Set()))
    .filter((field): field is RegionField => Boolean(field));
}

function getMetaballBlobBounds(blobs: FieldBlob[]) {
  return {
    left: Math.min(...blobs.map((blob) => blob.x - blob.radius)),
    right: Math.max(...blobs.map((blob) => blob.x + blob.radius)),
    top: Math.min(...blobs.map((blob) => blob.y - blob.radius)),
    bottom: Math.max(...blobs.map((blob) => blob.y + blob.radius)),
  };
}

function getRegionChildIdsForRendering(
  region: CanvasRegion,
  regions: CanvasRegion[]
) {
  const explicitChildIds = new Set(region.regionIds);
  const inferredChildren = inferRegionChildrenFromNodeContainment(
    region,
    regions,
    explicitChildIds
  );

  return [...explicitChildIds, ...inferredChildren.map((child) => child.id)];
}

function inferRegionChildrenFromNodeContainment(
  region: CanvasRegion,
  regions: CanvasRegion[],
  explicitChildIds: Set<string>
) {
  if (region.nodeIds.length === 0) {
    return [];
  }

  const regionNodeIds = new Set(region.nodeIds);
  const containedRegions = regions.filter((candidate) => {
    if (candidate.id === region.id || explicitChildIds.has(candidate.id)) {
      return false;
    }

    return isStrictNodeSubset(candidate.nodeIds, regionNodeIds);
  });

  return containedRegions.filter((candidate) => {
    return !containedRegions.some((other) => {
      if (other.id === candidate.id) {
        return false;
      }

      return isStrictNodeSubset(candidate.nodeIds, new Set(other.nodeIds));
    });
  });
}

function isStrictNodeSubset(nodeIds: string[], parentNodeIds: Set<string>) {
  if (nodeIds.length === 0 || nodeIds.length >= parentNodeIds.size) {
    return false;
  }

  return nodeIds.every((nodeId) => parentNodeIds.has(nodeId));
}

function createMetaballFieldFromBlobs(blobs: FieldBlob[]): MetaballField {
  const bridges = createMetaballBridges(blobs);
  const influencePadding =
    Math.max(...blobs.map((blob) => blob.radius), METABALL_BRIDGE_PADDING) + 36;

  return {
    blobs,
    bridges,
    cacheKey: createMetaballFieldCacheKey(blobs, bridges),
    bounds: {
      left:
        Math.min(...blobs.map((blob) => blob.x - blob.radius)) -
        influencePadding,
      right:
        Math.max(...blobs.map((blob) => blob.x + blob.radius)) +
        influencePadding,
      top:
        Math.min(...blobs.map((blob) => blob.y - blob.radius)) -
        influencePadding,
      bottom:
        Math.max(...blobs.map((blob) => blob.y + blob.radius)) +
        influencePadding,
    },
  };
}

function createMetaballFieldCacheKey(
  blobs: FieldBlob[],
  bridges: FieldBridge[]
) {
  const quantize = (value: number) =>
    Math.round(value / METABALL_GEOMETRY_CACHE_PRECISION);
  const blobKey = blobs
    .map((blob) =>
      `${quantize(blob.x)},${quantize(blob.y)},${quantize(blob.radius)}`
    )
    .join(";");
  const bridgeKey = bridges
    .map(
      (bridge) =>
        `${quantize(bridge.x1)},${quantize(bridge.y1)},${quantize(
          bridge.x2
        )},${quantize(bridge.y2)},${quantize(bridge.radius)}`
    )
    .join(";");

  return `${blobKey}|${bridgeKey}`;
}

function getRegionLabelCenter(field: MetaballField) {
  if (field.blobs.length === 0) {
    return {
      x: (field.bounds.left + field.bounds.right) / 2,
      y: (field.bounds.top + field.bounds.bottom) / 2,
    };
  }

  return {
    x:
      field.blobs.reduce((sum, blob) => sum + blob.x, 0) /
      field.blobs.length,
    y:
      field.blobs.reduce((sum, blob) => sum + blob.y, 0) /
      field.blobs.length,
  };
}

function createMetaballBridges(blobs: FieldBlob[]): FieldBridge[] {
  if (blobs.length < 2) {
    return [];
  }

  const connected = new Set([0]);
  const bridges: FieldBridge[] = [];

  while (connected.size < blobs.length) {
    let best: { from: number; to: number; distance: number } | null = null;

    for (const from of connected) {
      for (let to = 0; to < blobs.length; to += 1) {
        if (connected.has(to)) {
          continue;
        }

        const distance = squaredDistance(blobs[from], blobs[to]);

        if (!best || distance < best.distance) {
          best = { from, to, distance };
        }
      }
    }

    if (!best) {
      break;
    }

    const from = blobs[best.from];
    const to = blobs[best.to];

    bridges.push({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      radius: Math.min(
        from.radius,
        to.radius,
        REGION_NODE_MAX_PADDING + METABALL_BRIDGE_PADDING
      ),
    });
    connected.add(best.to);
  }

  return bridges;
}

function drawMetaballBoundary({
  context,
  field,
  color,
  muted,
  alpha = 1,
  globalScale,
  lineWidth,
}: {
  context: CanvasRenderingContext2D;
  field: MetaballField;
  color: string;
  muted: boolean;
  alpha?: number;
  globalScale: number;
  lineWidth?: number;
}) {
  const geometry = getMetaballGeometry(field, globalScale);

  context.save();
  context.globalAlpha = (muted ? 0.42 : 0.9) * alpha;
  context.strokeStyle = color;
  context.lineWidth = lineWidth ?? getMetaballBoundaryLineWidth(globalScale);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (geometry.path) {
    context.stroke(geometry.path);
  } else {
    drawMetaballGeometryPaths(context, geometry.paths);
    context.stroke();
  }

  context.restore();
}

function drawMetaballFill({
  context,
  field,
  color,
  alpha,
  globalScale,
}: {
  context: CanvasRenderingContext2D;
  field: MetaballField;
  color: string;
  alpha: number;
  globalScale: number;
}) {
  const geometry = getMetaballGeometry(field, globalScale);

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;

  if (geometry.path) {
    context.fill(geometry.path);
  } else {
    drawMetaballGeometryPaths(context, geometry.paths);
    context.fill();
  }

  context.restore();
}

function getMetaballGeometry(
  field: MetaballField,
  globalScale: number
): MetaballGeometry {
  const step = METABALL_GRID_SIZE / Math.max(0.72, Math.min(1.3, globalScale));
  const left = Math.floor(field.bounds.left / step) * step;
  const right = Math.ceil(field.bounds.right / step) * step;
  const top = Math.floor(field.bounds.top / step) * step;
  const bottom = Math.ceil(field.bounds.bottom / step) * step;
  const cacheKey = `${field.cacheKey}|${Math.round(step * 100)}|${Math.round(
    left
  )},${Math.round(right)},${Math.round(top)},${Math.round(bottom)}`;
  const cached = metaballGeometryCache.get(cacheKey);

  if (cached) {
    metaballGeometryCache.delete(cacheKey);
    metaballGeometryCache.set(cacheKey, cached);
    return cached;
  }

  const paths = traceMetaballContourPaths(
    collectMetaballContourSegments(field, left, right, top, bottom, step),
    step * 1.5
  );
  const geometry = {
    paths,
    path: createMetaballPath(paths),
  };

  metaballGeometryCache.set(cacheKey, geometry);

  if (metaballGeometryCache.size > METABALL_GEOMETRY_CACHE_LIMIT) {
    const oldestKey = metaballGeometryCache.keys().next().value;

    if (oldestKey) {
      metaballGeometryCache.delete(oldestKey);
    }
  }

  return geometry;
}

function createMetaballPath(paths: MetaballPoint[][]) {
  if (typeof Path2D === "undefined") {
    return null;
  }

  const path2d = new Path2D();

  drawMetaballGeometryPaths(path2d, paths);

  return path2d;
}

function drawMetaballGeometryPaths(
  target: CanvasRenderingContext2D | Path2D,
  paths: MetaballPoint[][]
) {
  if ("beginPath" in target) {
    target.beginPath();
  }

  for (const path of paths) {
    if (path.length < 2) {
      continue;
    }

    target.moveTo(path[0].x, path[0].y);

    for (const point of path.slice(1)) {
      target.lineTo(point.x, point.y);
    }

    if (pointsShareContourKey(path[0], path[path.length - 1])) {
      target.closePath();
    }
  }
}

type MetaballCorner = {
  x: number;
  y: number;
  value: number;
};

type MetaballEdgeKey = "top" | "right" | "bottom" | "left";

type MetaballPoint = {
  x: number;
  y: number;
};

type MetaballSegment = {
  start: MetaballPoint;
  end: MetaballPoint;
};

function collectMetaballContourSegments(
  field: MetaballField,
  left: number,
  right: number,
  top: number,
  bottom: number,
  step: number
) {
  const segments: MetaballSegment[] = [];

  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < right; x += step) {
      segments.push(...getMetaballCellContourSegments(field, x, y, step));
    }
  }

  return segments;
}

function getMetaballCellContourSegments(
  field: MetaballField,
  x: number,
  y: number,
  step: number
): MetaballSegment[] {
  const corners = readMetaballCellCorners(field, x, y, step);
  const caseIndex = getMetaballCaseIndex(corners);

  if (caseIndex === 0 || caseIndex === 15) {
    return [];
  }

  const edges = getMetaballCellEdgePoints(corners);

  return getMetaballContourEdges(caseIndex).map(([from, to]) => ({
    start: edges[from],
    end: edges[to],
  }));
}

function traceMetaballContourPaths(
  segments: MetaballSegment[],
  closeDistance: number
) {
  const used = new Array(segments.length).fill(false);
  const paths: MetaballPoint[][] = [];

  for (let index = 0; index < segments.length; index += 1) {
    if (used[index]) {
      continue;
    }

    used[index] = true;
    const path = [segments[index].start, segments[index].end];
    let extended = true;

    while (extended) {
      extended =
        extendMetaballContourPath(path, segments, used, "end") ||
        extendMetaballContourPath(path, segments, used, "start");
    }

    if (!pointsShareContourKey(path[0], path[path.length - 1])) {
      const gap = Math.hypot(
        path[0].x - path[path.length - 1].x,
        path[0].y - path[path.length - 1].y
      );

      if (gap <= closeDistance) {
        path.push(path[0]);
      }
    }

    paths.push(path);
  }

  return paths;
}

function extendMetaballContourPath(
  path: MetaballPoint[],
  segments: MetaballSegment[],
  used: boolean[],
  side: "start" | "end"
) {
  const anchor = side === "end" ? path[path.length - 1] : path[0];

  for (let index = 0; index < segments.length; index += 1) {
    if (used[index]) {
      continue;
    }

    const segment = segments[index];

    if (pointsShareContourKey(anchor, segment.start)) {
      used[index] = true;

      if (side === "end") {
        path.push(segment.end);
      } else {
        path.unshift(segment.end);
      }

      return true;
    }

    if (pointsShareContourKey(anchor, segment.end)) {
      used[index] = true;

      if (side === "end") {
        path.push(segment.start);
      } else {
        path.unshift(segment.start);
      }

      return true;
    }
  }

  return false;
}

function pointsShareContourKey(left: MetaballPoint, right: MetaballPoint) {
  return getContourPointKey(left) === getContourPointKey(right);
}

function getContourPointKey(point: MetaballPoint) {
  return `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;
}

function readMetaballCellCorners(
  field: MetaballField,
  x: number,
  y: number,
  step: number
): MetaballCorner[] {
  return [
    { x, y, value: readMetaballValue(field, x, y) },
    { x: x + step, y, value: readMetaballValue(field, x + step, y) },
    {
      x: x + step,
      y: y + step,
      value: readMetaballValue(field, x + step, y + step),
    },
    { x, y: y + step, value: readMetaballValue(field, x, y + step) },
  ];
}

function getMetaballCaseIndex(corners: MetaballCorner[]) {
  return corners.reduce(
    (value, corner, index) =>
      value | (corner.value >= METABALL_THRESHOLD ? 1 << index : 0),
    0
  );
}

function getMetaballCellEdgePoints(corners: MetaballCorner[]) {
  return {
    top: interpolateContourPoint(corners[0], corners[1]),
    right: interpolateContourPoint(corners[1], corners[2]),
    bottom: interpolateContourPoint(corners[3], corners[2]),
    left: interpolateContourPoint(corners[0], corners[3]),
  };
}

function getMetaballContourEdges(caseIndex: number): Array<
  [MetaballEdgeKey, MetaballEdgeKey]
> {
  switch (caseIndex) {
    case 1:
    case 14:
      return [["left", "top"]];
    case 2:
    case 13:
      return [["top", "right"]];
    case 3:
    case 12:
      return [["left", "right"]];
    case 4:
    case 11:
      return [["right", "bottom"]];
    case 5:
      return [
        ["left", "top"],
        ["right", "bottom"],
      ];
    case 6:
    case 9:
      return [["top", "bottom"]];
    case 7:
    case 8:
      return [["left", "bottom"]];
    case 10:
      return [
        ["top", "right"],
        ["left", "bottom"],
      ];
    default:
      return [];
  }
}

function interpolateContourPoint(
  start: { x: number; y: number; value: number },
  end: { x: number; y: number; value: number }
) {
  const range = end.value - start.value;
  const t =
    Math.abs(range) < 0.0001
      ? 0.5
      : (METABALL_THRESHOLD - start.value) / range;
  const clamped = Math.min(1, Math.max(0, t));

  return {
    x: start.x + (end.x - start.x) * clamped,
    y: start.y + (end.y - start.y) * clamped,
  };
}

function readMetaballValue(field: MetaballField, x: number, y: number) {
  let value = 0;

  for (const blob of field.blobs) {
    const distance = (x - blob.x) ** 2 + (y - blob.y) ** 2 + 1;
    value += (blob.radius * blob.radius) / distance;
  }

  for (const bridge of field.bridges) {
    const distance = distanceToSegmentSquared(x, y, bridge) + 1;
    value += (bridge.radius * bridge.radius) / distance;
  }

  return value;
}

function distanceToSegmentSquared(x: number, y: number, segment: FieldBridge) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return (x - segment.x1) ** 2 + (y - segment.y1) ** 2;
  }

  const t = Math.min(
    1,
    Math.max(0, ((x - segment.x1) * dx + (y - segment.y1) * dy) / lengthSquared)
  );
  const closestX = segment.x1 + t * dx;
  const closestY = segment.y1 + t * dy;

  return (x - closestX) ** 2 + (y - closestY) ** 2;
}

function squaredDistance(left: FieldBlob, right: FieldBlob) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

function smoothStep(edge0: number, edge1: number, value: number) {
  const x = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));

  return x * x * (3 - 2 * x);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createCanvasRectFromCenter(
  center: { x: number; y: number },
  width: number,
  height: number
): CanvasGraphRect {
  return {
    left: center.x - width / 2,
    right: center.x + width / 2,
    top: center.y - height / 2,
    bottom: center.y + height / 2,
  };
}

function expandCanvasRect(rect: CanvasGraphRect, amount: number): CanvasGraphRect {
  return {
    left: rect.left - amount,
    right: rect.right + amount,
    top: rect.top - amount,
    bottom: rect.bottom + amount,
  };
}

function interpolateCanvasRectPosition(
  source: CanvasGraphRect,
  target: CanvasGraphRect,
  progress: number
) {
  const t = clamp(progress, 0, 1);
  const width = target.right - target.left;
  const height = target.bottom - target.top;
  const sourceCenter = getCanvasRectCenter(source);
  const targetCenter = getCanvasRectCenter(target);

  return createCanvasRectFromCenter(
    {
      x: lerp(sourceCenter.x, targetCenter.x, t),
      y: lerp(sourceCenter.y, targetCenter.y, t),
    },
    width,
    height
  );
}

function getCanvasRectCenter(rect: CanvasGraphRect) {
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2,
  };
}

function canvasRectsAlmostEqual(left: CanvasGraphRect, right: CanvasGraphRect) {
  return (
    Math.abs(left.left - right.left) < 0.5 &&
    Math.abs(left.right - right.right) < 0.5 &&
    Math.abs(left.top - right.top) < 0.5 &&
    Math.abs(left.bottom - right.bottom) < 0.5
  );
}

function lerp(source: number, target: number, progress: number) {
  return source + (target - source) * progress;
}

function getPromotedMarkerBadgeSize(globalScale: number) {
  return clamp(
    PROMOTED_MARKER_BADGE_SCREEN_SIZE / Math.max(0.2, globalScale),
    PROMOTED_MARKER_BADGE_MIN_SIZE,
    PROMOTED_MARKER_BADGE_MAX_SIZE
  );
}

function getPromotedMarkerBadgeGap(field: MetaballField) {
  return clamp(
    getRegionAreaLength(field) * PROMOTED_MARKER_BADGE_AREA_GAP_RATIO,
    PROMOTED_MARKER_BADGE_MIN_GAP,
    PROMOTED_MARKER_BADGE_MAX_GAP
  );
}

function getPromotedMarkerOutlineGap(field: MetaballField) {
  return clamp(
    getRegionAreaLength(field) * PROMOTED_MARKER_OUTLINE_AREA_GAP_RATIO,
    PROMOTED_MARKER_OUTLINE_MIN_GAP,
    PROMOTED_MARKER_OUTLINE_MAX_GAP
  );
}

function getRegionAreaLength(field: MetaballField) {
  const width = Math.max(1, field.bounds.right - field.bounds.left);
  const height = Math.max(1, field.bounds.bottom - field.bounds.top);

  return Math.sqrt(width * height);
}

function createPromotedMarkerYOffsetOrder(size: number, gap: number) {
  const offsets = [0];
  const step = size + gap * 0.7;

  for (let index = 1; index <= 4; index += 1) {
    offsets.push(-step * index, step * index);
  }

  return offsets;
}

function expandMetaballField(field: MetaballField, amount: number): MetaballField {
  const blobs = field.blobs.map((blob) => ({
    ...blob,
    radius: blob.radius + amount,
  }));
  const bridges = field.bridges.map((bridge) => ({
    ...bridge,
    radius: bridge.radius + amount,
  }));

  return {
    blobs,
    bridges,
    cacheKey: createMetaballFieldCacheKey(blobs, bridges),
    bounds: {
      left: field.bounds.left - amount,
      right: field.bounds.right + amount,
      top: field.bounds.top - amount,
      bottom: field.bounds.bottom + amount,
    },
  };
}

function getMetaballBoundaryLineWidth(globalScale: number) {
  return 2.1 / Math.max(0.7, globalScale);
}

function resolveRegionLabelAnchor({
  anchor,
  bounds,
  labelWidth,
  labelHeight,
  globalScale,
  placedRects,
}: {
  anchor: { x: number; y: number };
  bounds: MetaballField["bounds"];
  labelWidth: number;
  labelHeight: number;
  globalScale: number;
  placedRects: RegionLabelRect[];
}) {
  const gap = REGION_LABEL_COLLISION_GAP / Math.max(0.16, globalScale);
  const step = labelHeight + gap;
  const candidates = [
    anchor.y,
    anchor.y - step,
    anchor.y + step,
    anchor.y - step * 2,
    anchor.y + step * 2,
    anchor.y - step * 3,
    anchor.y + step * 3,
  ];
  const halfWidth = labelWidth / 2 + gap / 2;
  const halfHeight = labelHeight / 2 + gap / 2;
  const minY = bounds.top + halfHeight;
  const maxY = bounds.bottom - halfHeight;
  const fallbackY = clamp(anchor.y, minY, maxY);
  const y =
    candidates.find((candidateY) => {
      const clampedY = clamp(candidateY, minY, maxY);
      const rect = createRegionLabelRect(anchor.x, clampedY, halfWidth, halfHeight);

      return !placedRects.some((placedRect) =>
        regionLabelRectsOverlap(rect, placedRect)
      );
    }) ?? fallbackY;
  const rect = createRegionLabelRect(anchor.x, y, halfWidth, halfHeight);

  placedRects.push(rect);

  return {
    x: anchor.x,
    y,
  };
}

function createRegionLabelRect(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number
): RegionLabelRect {
  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  };
}

function regionLabelRectsOverlap(left: RegionLabelRect, right: RegionLabelRect) {
  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

function getRegionLabelHeight(
  fontSize: number,
  lineHeight: number,
  lineCount: number
) {
  if (lineCount <= 1) {
    return fontSize;
  }

  return lineHeight * (lineCount - 1) + fontSize;
}

export function getGraphNodeDisplayId(
  node: Pick<GraphNode, "chunkId" | "id" | "kind">
) {
  if (node.chunkId) {
    return node.chunkId;
  }

  if (node.kind === "handoff") {
    return "H";
  }

  if (node.kind === "concern") {
    return "C";
  }

  return node.id.replace(/^[^:]+:/, "");
}

function truncateCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
) {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let truncated = value;

  while (
    truncated.length > 1 &&
    context.measureText(`${truncated}...`).width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated.trimEnd()}...`;
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number
) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(truncateCanvasText(context, word, maxWidth));
      currentLine = "";
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  const usedWordCount = lines.join(" ").split(/\s+/).filter(Boolean).length;

  if (usedWordCount < words.length && lines.length > 0) {
    lines[lines.length - 1] = truncateCanvasText(
      context,
      `${lines[lines.length - 1]}...`,
      maxWidth
    );
  }

  return lines.length > 0 ? lines : [truncateCanvasText(context, value, maxWidth)];
}
