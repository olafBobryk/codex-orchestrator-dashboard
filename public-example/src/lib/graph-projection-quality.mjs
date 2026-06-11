const SAMPLE_LIMIT = 4;
const INACTIVE_STATUSES = new Set([
  "complete",
  "completed",
  "deferred",
  "done",
  "fixed",
  "muted",
  "resolved",
  "signed_off",
  "superseded",
  "verified",
]);

export function inspectGraphProjectionQuality(projection) {
  const nodes = readNodes(projection.nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  const missingEdges = [];

  for (const edge of readEdges(projection.edges)) {
    const sourceExists = nodeById.has(edge.source);
    const targetExists = nodeById.has(edge.target);

    if (!sourceExists || !targetExists) {
      missingEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        missing: [
          ...(!sourceExists ? [`source:${edge.source}`] : []),
          ...(!targetExists ? [`target:${edge.target}`] : []),
        ],
      });
      continue;
    }

    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const components = findComponents(nodes, adjacency);
  const activeComponents = components.filter(
    (component) => component.activeCount > 0
  );
  const implicitChronologyNodes = nodes.filter(isImplicitChronologyNode);
  const intentional = isIntentionalDisconnectedProjection(projection);
  const isolatedNodes = components
    .filter((component) => component.nodes.length === 1)
    .map((component) => component.nodes[0]);
  const warnings = [];

  if (activeComponents.length > 1 && !intentional) {
    warnings.push({
      id: "active-connected-components",
      title: "Projection map looks patchy",
      message:
        `Projection has ${activeComponents.length} active connected components. ` +
        "If this is intentional, add disconnectedComponents.intentional: true.",
      details: activeComponents.map((component, index) => ({
        label: `Component ${index + 1}`,
        message:
          `${component.nodes.length} node(s), ${component.activeCount} active; ` +
          `samples: ${formatSamples(component.nodes)}`,
      })),
    });
  }

  if (missingEdges.length > 0) {
    warnings.push({
      id: "missing-edge-endpoints",
      title: "Projection has missing edge endpoints",
      message: `${missingEdges.length} edge(s) reference missing source or target nodes.`,
      details: missingEdges.map((edge) => ({
        label: edge.id,
        message: `${edge.source} -> ${edge.target}; missing ${edge.missing.join(", ")}`,
      })),
    });
  }

  if (implicitChronologyNodes.length > 0) {
    warnings.push({
      id: "implicit-chronology-labels",
      title: "Projection has unlabeled chronology anchors",
      message:
        "Start/end-looking checkpoint labels do not affect layout unless nodes set chronology explicitly.",
      details: implicitChronologyNodes.map((node) => ({
        label: node.id,
        message: `${node.label} should declare chronology: "start" or "end" if it is meant to anchor the graph.`,
      })),
    });
  }

  return {
    nodes,
    components,
    activeComponents,
    isolatedNodes,
    missingEdges,
    intentional,
    warnings,
  };
}

export function formatSamples(nodes) {
  return (
    nodes
      .slice(0, SAMPLE_LIMIT)
      .map((node) => `${node.label} (${node.id})`)
      .join("; ") || "(none)"
  );
}

function readNodes(value) {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry, index) => {
    const id = readString(entry.id) ?? `node-${index + 1}`;

    return [
      {
        id,
        label: readString(entry.label) ?? id,
        kind: normalizeKey(readString(entry.kind) ?? "chunk"),
        chronology: normalizeKey(readString(entry.chronology) ?? ""),
        status: normalizeKey(readString(entry.status) ?? "active"),
        muted: entry.muted === true,
      },
    ];
  });
}

function readEdges(value) {
  const entries = Array.isArray(value) ? value : [];

  return entries.filter(isRecord).flatMap((entry, index) => {
    const source = readString(entry.source);
    const target = readString(entry.target);

    if (!source || !target) {
      return [
        {
          id: readString(entry.id) ?? `edge-${index + 1}`,
          source: source ?? "(missing)",
          target: target ?? "(missing)",
        },
      ];
    }

    return [
      {
        id: readString(entry.id) ?? `edge-${index + 1}`,
        source,
        target,
      },
    ];
  });
}

function findComponents(nodes, adjacency) {
  const visited = new Set();
  const components = [];

  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const ids = [];
    const stack = [node.id];
    visited.add(node.id);

    while (stack.length > 0) {
      const current = stack.pop();
      ids.push(current);

      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    const componentNodes = ids
      .map((id) => nodes.find((candidate) => candidate.id === id))
      .filter(Boolean);

    components.push({
      nodes: componentNodes,
      activeCount: componentNodes.filter(isActiveNode).length,
    });
  }

  return components.sort((a, b) => b.nodes.length - a.nodes.length);
}

function isActiveNode(node) {
  return !node.muted && !INACTIVE_STATUSES.has(node.status);
}

function isImplicitChronologyNode(node) {
  if (
    node.kind !== "checkpoint" ||
    node.chronology === "start" ||
    node.chronology === "end"
  ) {
    return false;
  }

  const normalizedId = normalizeKey(node.id);
  const normalizedLabel = normalizeKey(node.label);

  return (
    normalizedId === "start" ||
    normalizedId === "end" ||
    normalizedLabel === "start" ||
    normalizedLabel === "end"
  );
}

function isIntentionalDisconnectedProjection(projection) {
  if (projection.intentionalDisconnectedComponents === true) {
    return true;
  }

  if (
    isRecord(projection.disconnectedComponents) &&
    projection.disconnectedComponents.intentional === true
  ) {
    return true;
  }

  if (
    isRecord(projection.quality) &&
    isRecord(projection.quality.disconnectedComponents) &&
    projection.quality.disconnectedComponents.intentional === true
  ) {
    return true;
  }

  return false;
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
