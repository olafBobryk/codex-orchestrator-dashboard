import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  GraphProjectionQualityWarning,
  RawProjection,
} from "@/lib/graph-projection";
import { readCodexThreadActivity } from "./codex-threads.ts";

const ORCHESTRATION_DIR = ".codex-orchestration";
const NESTED_SHAPE_STRATEGY_DIR = "strategies/shape-strategy";
const SHAPE_STRATEGY_FILE = "map.md";
const WORK_COLOR = "#737373";
const CHECKPOINT_COLOR = "#d97706";
const SHAPE_COLORS = ["#2563eb", "#16a34a", "#9333ea", "#dc2626"];

type ShapeStrategyProjectionReadResult =
  | {
      state: "ready";
      projection: RawProjection;
      warnings: GraphProjectionQualityWarning[];
      mapRelativePath: string;
    }
  | {
      state: "missing";
    };

type ShapeStrategySource = {
  rootDir: string;
  baseRelativePath: string;
};

type MarkdownDoc = {
  relativePath: string;
  id: string;
  title: string;
  status: string | null;
  sections: Map<string, string>;
};

type ShapeDoc = MarkdownDoc & {
  workpieceRefs: string[];
};

type EdgeDoc = MarkdownDoc & {
  source: string | null;
  target: string | null;
  relationship: string | null;
  direction: string | null;
  visualWeight: string | null;
};

type AgentDoc = MarkdownDoc & {
  markerId: string;
  targetId: string | null;
  role: string | null;
  threadIds: string[];
};

export type ShapeStrategyMarkerActivity = {
  id: string;
  loader: boolean;
};

export async function readShapeStrategyProjection(
  workspace: string
): Promise<ShapeStrategyProjectionReadResult> {
  const source = await resolveShapeStrategySource(workspace);

  if (!source) {
    return { state: "missing" };
  }

  const mapRelativePath = displayRelativePath(source, SHAPE_STRATEGY_FILE);
  const warnings: GraphProjectionQualityWarning[] = [];
  const mapDoc = await readDoc(
    source.rootDir,
    SHAPE_STRATEGY_FILE,
    mapRelativePath
  );

  if (!mapDoc) {
    return { state: "missing" };
  }

  const shapeRefs = readReferencePaths(mapDoc.sections.get("shape references"));
  const checkpointRefs = readReferencePaths(
    mapDoc.sections.get("checkpoint references")
  );
  const agentRefs = readReferencePaths(mapDoc.sections.get("agent references"));
  const edgeRefs = await readEdges(source, mapDoc, warnings);
  const artifactRefs = readReferencePaths(mapDoc.sections.get("evidence"))
    .filter((reference) => reference.startsWith("artifacts/"));

  const shapes = await readShapes(source, shapeRefs, warnings);
  const workpieces = await readWorkpieces(source, shapes, warnings);
  const checkpoints = await readCheckpoints(source, checkpointRefs, warnings);
  const agents = await readAgents(source, agentRefs, warnings);
  const artifacts = await readArtifactLinks(source, artifactRefs, warnings);
  const shapeColors = new Map(
    shapes.map((shape, index) => [
      shape.id,
      SHAPE_COLORS[index % SHAPE_COLORS.length],
    ])
  );
  const nodeRefs = createNodeReferenceResolver(shapes, checkpoints);
  const markerActivity = await readAgentMarkerActivity(agents);
  const markerTargetIds = new Set([
    ...workpieces.map((workpiece) => workpiece.id),
    ...checkpoints.map((checkpoint) => checkpoint.id),
  ]);

  const projection: RawProjection = {
    title: mapDoc.title,
    legend: [
      {
        key: "work",
        label: "Workpieces",
        status: "active",
        color: WORK_COLOR,
      },
      {
        key: "checkpoint",
        label: "Checkpoints",
        status: "active",
        color: CHECKPOINT_COLOR,
      },
      ...shapes.map((shape) => ({
        key: shape.id,
        label: shape.title,
        status: shape.status ?? "active",
        color: shapeColors.get(shape.id),
      })),
    ],
    nodes: [
      ...workpieces.map((workpiece, index) => ({
        id: workpiece.id,
        label: workpiece.title,
        legendKey: "work",
        color: WORK_COLOR,
        status: workpiece.status ?? "planned",
        kind: "workpiece",
        summary: readSectionSummary(workpiece.sections.get("intent")),
        detail: readDocDetailBlocks(
          source,
          workpiece,
          ["acceptance", "tests", "artifacts", "commit evidence", "notes"]
        ),
        relativePath: workpiece.relativePath,
        links: [{ label: "Open source", relativePath: workpiece.relativePath }],
        order: index + 1,
      })),
      ...checkpoints.map((checkpoint, index) => ({
        id: checkpoint.id,
        label: checkpoint.title,
        legendKey: "checkpoint",
        color: CHECKPOINT_COLOR,
        status: checkpoint.status ?? "active",
        kind: "checkpoint",
        chronology: readStartCheckpointId(mapDoc) === checkpoint.id ? "start" : null,
        summary: readSectionSummary(checkpoint.sections.get("transition")),
        detail: readDocDetailBlocks(source, checkpoint, [
          "transition",
          "applies to",
          "direction",
          "evidence",
          "decision",
        ]),
        relativePath: checkpoint.relativePath,
        links: [{ label: "Open source", relativePath: checkpoint.relativePath }],
        order: workpieces.length + index + 1,
      })),
    ],
    edges: [
      ...createShapeWorkpieceEdges(shapes),
      ...edgeRefs.flatMap((edge) => {
        const edgeSource = edge.source
          ? nodeRefs.resolveSource(edge.source)
          : null;
        const edgeTarget = edge.target
          ? nodeRefs.resolveTarget(edge.target)
          : null;

        if (!edgeSource || !edgeTarget) {
          warnings.push(
            createWarning("shape-strategy-missing-edge-endpoint", edge.id, [
              `${edge.relativePath} references ${edge.source ?? "(missing)"} -> ${
                edge.target ?? "(missing)"
              }.`,
            ])
          );
          return [];
        }

        return [
          {
            id: edge.id,
            source: edgeSource,
            target: edgeTarget,
            label: edge.relationship ?? edge.title,
            style: edgeStyleForRelationship(edge.relationship),
            directional: edge.direction !== "undirected",
            status: edge.status ?? "active",
            relativePath: edge.relativePath,
            detail: readDocDetailBlocks(source, edge, [
              "intent",
              "source / target",
              "relationship",
              "direction",
              "visual weight",
              "evidence",
            ]),
          },
        ];
      }),
    ],
    markers: createAgentMarkers(
      source,
      agents,
      markerActivity,
      markerTargetIds,
      warnings
    ),
    regions: shapes.map((shape) => ({
      id: shape.id,
      label: shape.title,
      category: shape.id,
      color: shapeColors.get(shape.id),
      nodeIds: shape.workpieceRefs.map(referenceToId),
      detail: readDocDetailBlocks(source, shape, [
        "intent",
        "fixed decisions",
        "autonomous decisions",
        "escalation triggers",
        "return evidence",
        "run references",
        "commit evidence",
      ]),
      links: [
        { label: "Open shape", relativePath: shape.relativePath },
        ...artifacts,
      ],
    })),
  };

  return {
    state: "ready",
    projection,
    warnings: dedupeWarnings(warnings),
    mapRelativePath,
  };
}

export async function readShapeStrategyMarkerActivity(workspace: string) {
  const source = await resolveShapeStrategySource(workspace);

  if (!source) {
    return {
      state: "missing" as const,
      markers: [] as ShapeStrategyMarkerActivity[],
    };
  }

  const mapRelativePath = displayRelativePath(source, SHAPE_STRATEGY_FILE);
  const warnings: GraphProjectionQualityWarning[] = [];
  const mapDoc = await readDoc(
    source.rootDir,
    SHAPE_STRATEGY_FILE,
    mapRelativePath
  );

  if (!mapDoc) {
    return {
      state: "missing" as const,
      markers: [] as ShapeStrategyMarkerActivity[],
    };
  }

  const agentRefs = readReferencePaths(mapDoc.sections.get("agent references"));
  const agents = await readAgents(source, agentRefs, warnings);
  const markerActivity = await readAgentMarkerActivity(agents);

  return {
    state: "ready" as const,
    markers: agents.map((agent) => ({
      id: agent.markerId,
      loader: markerActivity.get(agent.markerId)?.loader ?? false,
    })),
  };
}

async function readShapes(
  source: ShapeStrategySource,
  refs: string[],
  warnings: GraphProjectionQualityWarning[]
) {
  const shapes: ShapeDoc[] = [];

  for (const ref of refs) {
    const doc = await readReferencedDoc(source, ref, null, warnings);

    if (!doc) {
      continue;
    }

    shapes.push({
      ...doc,
      workpieceRefs: readReferencePaths(doc.sections.get("workpiece references")),
    });
  }

  return shapes;
}

async function readWorkpieces(
  source: ShapeStrategySource,
  shapes: ShapeDoc[],
  warnings: GraphProjectionQualityWarning[]
) {
  const docs = new Map<string, MarkdownDoc>();

  for (const shape of shapes) {
    for (const ref of shape.workpieceRefs) {
      const doc = await readReferencedDoc(
        source,
        ref,
        shape.relativePath,
        warnings
      );

      if (doc) {
        docs.set(doc.id, doc);
      }
    }
  }

  return [...docs.values()];
}

async function readCheckpoints(
  source: ShapeStrategySource,
  refs: string[],
  warnings: GraphProjectionQualityWarning[]
) {
  const docs: MarkdownDoc[] = [];

  for (const ref of refs) {
    const doc = await readReferencedDoc(source, ref, null, warnings);

    if (doc) {
      docs.push(doc);
    }
  }

  return docs;
}

async function readAgents(
  source: ShapeStrategySource,
  refs: string[],
  warnings: GraphProjectionQualityWarning[]
) {
  const docs: AgentDoc[] = [];

  for (const ref of refs) {
    const doc = await readReferencedDoc(source, ref, null, warnings);

    if (!doc) {
      continue;
    }

    docs.push(readAgentDoc(doc));
  }

  return docs;
}

function readAgentDoc(doc: MarkdownDoc): AgentDoc {
  const currentPosition = doc.sections.get("current position");
  const markerId = readNamedReference(currentPosition, "marker") ?? doc.id;
  const targetId = readNamedReference(currentPosition, "node");

  return {
    ...doc,
    markerId: referenceToId(markerId),
    targetId: targetId ? referenceToId(targetId) : null,
    role: readScalarSection(doc.sections.get("role")),
    threadIds: readThreadIds(doc),
  };
}

async function readAgentMarkerActivity(agents: AgentDoc[]) {
  const threadActivity = await readCodexThreadActivity(
    agents.flatMap((agent) => agent.threadIds)
  );
  const markerActivity = new Map<string, ShapeStrategyMarkerActivity>();

  for (const agent of agents) {
    markerActivity.set(agent.markerId, {
      id: agent.markerId,
      loader: agent.threadIds.some(
        (threadId) => threadActivity.get(threadId)?.working
      ),
    });
  }

  return markerActivity;
}

function createAgentMarkers(
  source: ShapeStrategySource,
  agents: AgentDoc[],
  markerActivity: Map<string, ShapeStrategyMarkerActivity>,
  targetNodeIds: Set<string>,
  warnings: GraphProjectionQualityWarning[]
) {
  return agents.flatMap((agent) => {
    if (!agent.targetId || !targetNodeIds.has(agent.targetId)) {
      warnings.push(
        createWarning("shape-strategy-missing-agent-position", agent.id, [
          `${agent.relativePath} does not point to a visible Current Position node.`,
        ])
      );
      return [];
    }

    return [
      {
        id: agent.markerId,
        targetId: agent.targetId,
        label: agent.title,
        description: readAgentDescription(agent),
        color: agentColor(agent.role),
        icon: "user-cog",
        loader: markerActivity.get(agent.markerId)?.loader ?? false,
        links: [
          {
            label: "Open agent",
            relativePath: agent.relativePath,
          },
          ...readDocLinks(source, agent, ["active shape references", "evidence"]),
        ],
      },
    ];
  });
}

async function readEdges(
  source: ShapeStrategySource,
  mapDoc: MarkdownDoc,
  warnings: GraphProjectionQualityWarning[]
) {
  const refs = readTrunkFlow(mapDoc);
  const docs: EdgeDoc[] = [];

  for (const [index, ref] of refs.entries()) {
    const inferredPath = inferEdgePath(ref.source, ref.target);
    const doc = inferredPath
      ? await readReferencedDoc(source, inferredPath, null, warnings)
      : null;

    if (doc) {
      docs.push({
        ...doc,
        source:
          readNamedReference(doc.sections.get("source / target"), "source") ??
          ref.source,
        target:
          readNamedReference(doc.sections.get("source / target"), "target") ??
          ref.target,
        relationship: readScalarSection(doc.sections.get("relationship")),
        direction: readScalarSection(doc.sections.get("direction")),
        visualWeight: readScalarSection(doc.sections.get("visual weight")),
      });
      continue;
    }

    docs.push({
      ...mapDoc,
      id: `trunk-flow-${index + 1}`,
      title: ref.summary || `${ref.source} to ${ref.target}`,
      source: ref.source,
      target: ref.target,
      relationship: "trunk",
      direction: "directed",
      visualWeight: "primary",
    });
  }

  return docs;
}

async function readArtifactLinks(
  source: ShapeStrategySource,
  refs: string[],
  warnings: GraphProjectionQualityWarning[]
) {
  const links = [];

  for (const ref of refs) {
    const doc = await readReferencedDoc(source, ref, null, warnings);

    links.push({
      label: doc?.title ?? referenceToId(ref),
      relativePath: displayRelativePath(
        source,
        normalizeRelativeReference(source, ref)
      ),
      kind: "artifact",
    });
  }

  return links;
}

async function readReferencedDoc(
  source: ShapeStrategySource,
  reference: string,
  fromRelativePath: string | null,
  warnings: GraphProjectionQualityWarning[]
) {
  const normalized = normalizeRelativeReference(source, reference, fromRelativePath);
  const doc = await readDoc(
    source.rootDir,
    normalized,
    displayRelativePath(source, normalized)
  );

  if (!doc) {
    warnings.push(
      createWarning("shape-strategy-missing-reference", referenceToId(reference), [
        `${displayRelativePath(source, normalized)} could not be read.`,
      ])
    );
  }

  return doc;
}

async function readDoc(
  rootDir: string,
  relativePath: string,
  displayRelativePath: string
): Promise<MarkdownDoc | null> {
  try {
    const content = await readFile(
      /*turbopackIgnore: true*/ path.join(rootDir, relativePath),
      "utf8"
    );

    return parseMarkdownDoc(displayRelativePath, content);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function parseMarkdownDoc(relativePath: string, content: string): MarkdownDoc {
  const title =
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? referenceToId(relativePath);
  const status = content.match(/^Status:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const sections = new Map<string, string>();
  const sectionPattern = /^##\s+(.+)$/gm;
  const matches = [...content.matchAll(sectionPattern)];

  for (const [index, match] of matches.entries()) {
    const heading = normalizeHeading(match[1] ?? "");
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    sections.set(heading, content.slice(start, end).trim());
  }

  return {
    relativePath,
    id: referenceToId(relativePath),
    title: simplifyTitle(title),
    status,
    sections,
  };
}

function readReferencePaths(section: string | undefined) {
  if (!section) {
    return [];
  }

  return section
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/`([^`]+)`/);
      return match?.[1] ? [match[1]] : [];
    })
    .filter((reference) => reference !== "none");
}

function readTrunkFlow(mapDoc: MarkdownDoc) {
  const section = mapDoc.sections.get("trunk / flow");

  if (!section) {
    return [];
  }

  return section.split("\n").flatMap((line) => {
    const match = line.match(/`([^`]+)`\s*->\s*`([^`]+)`(?::\s*(.+))?/);

    if (!match?.[1] || !match[2]) {
      return [];
    }

    return [
      {
        source: match[1],
        target: match[2],
        summary: match[3]?.trim() ?? null,
      },
    ];
  });
}

function readNamedReference(section: string | undefined, name: string) {
  if (!section) {
    return null;
  }

  const pattern = new RegExp("^-\\s*" + name + ":\\s*`([^`]+)`", "im");
  return section.match(pattern)?.[1]?.trim() ?? null;
}

function readScalarSection(section: string | undefined) {
  if (!section) {
    return null;
  }

  const line = section
    .split("\n")
    .map((entry) => entry.trim())
    .find(Boolean);

  return line ?? null;
}

function readStartCheckpointId(mapDoc: MarkdownDoc) {
  return readNamedReference(mapDoc.sections.get("start"), "start");
}

function createNodeReferenceResolver(
  shapes: ShapeDoc[],
  checkpoints: MarkdownDoc[]
) {
  const shapeWorkpieces = new Map(
    shapes.map((shape) => [shape.id, shape.workpieceRefs.map(referenceToId)])
  );
  const checkpointIds = new Set(checkpoints.map((checkpoint) => checkpoint.id));

  return {
    resolveSource(reference: string) {
      const id = referenceToId(reference);
      const workpieces = shapeWorkpieces.get(id);

      if (workpieces?.length) {
        return workpieces[workpieces.length - 1];
      }

      return checkpointIds.has(id) ? id : id;
    },
    resolveTarget(reference: string) {
      const id = referenceToId(reference);
      const workpieces = shapeWorkpieces.get(id);

      if (workpieces?.length) {
        return workpieces[0];
      }

      return checkpointIds.has(id) ? id : id;
    },
  };
}

function createShapeWorkpieceEdges(shapes: ShapeDoc[]) {
  return shapes.flatMap((shape) => {
    const workpieceIds = shape.workpieceRefs.map(referenceToId);

    return workpieceIds.slice(0, -1).map((source, index) => ({
      id: `${shape.id}-sequence-${index + 1}`,
      source,
      target: workpieceIds[index + 1],
      label: "shape sequence",
      style: "solid",
      directional: true,
      status: shape.status ?? "active",
      relativePath: shape.relativePath,
      detail: [
        {
          id: `${shape.id}-sequence-${index + 1}-source`,
          name: "Source",
          body:
            "Derived from the order of Workpiece References in the shape Markdown.",
          links: [
            {
              label: shape.title,
              relativePath: shape.relativePath,
            },
          ],
        },
      ],
    }));
  });
}

function inferEdgePath(source: string, target: string) {
  const sourceId = referenceToId(source);
  const targetId = referenceToId(target);

  const knownEdges: Record<string, string> = {
    "steward-shape-start->contract-base": "edges/start-to-contract.md",
    "contract-base->panel-inspection": "edges/contract-to-panel.md",
    "panel-inspection->graph-legibility": "edges/panel-to-legibility.md",
    "graph-legibility->review-surface": "edges/legibility-to-review.md",
    "review-surface->review-return": "edges/review-return.md",
  };
  const knownEdge = knownEdges[`${sourceId}->${targetId}`];

  if (knownEdge) {
    return knownEdge;
  }

  return `edges/${sourceId}-to-${targetId}.md`;
}

function edgeStyleForRelationship(relationship: string | null) {
  const normalized = relationship?.toLowerCase() ?? "";

  if (normalized === "branch") {
    return "dashed";
  }

  if (
    normalized === "annotation" ||
    normalized === "comparison" ||
    normalized === "evidence"
  ) {
    return "dotted";
  }

  return "solid";
}

function readDocDetailBlocks(
  source: ShapeStrategySource,
  doc: MarkdownDoc,
  sectionNames: string[]
) {
  return sectionNames.flatMap((sectionName) => {
    const body = doc.sections.get(sectionName);

    if (!body || body === "none") {
      return [];
    }

    return [
      {
        id: `${doc.id}-${sectionName.replace(/\s+/g, "-")}`,
        name: titleCase(sectionName),
        body,
        links: readReferencePaths(body).map((reference) => ({
          label: referenceToId(reference),
          relativePath: normalizeDetailReference(source, reference, doc.relativePath),
        })),
      },
    ];
  });
}

function readDocLinks(
  source: ShapeStrategySource,
  doc: MarkdownDoc,
  sectionNames: string[]
) {
  return sectionNames.flatMap((sectionName) => {
    const body = doc.sections.get(sectionName);

    if (!body || body === "none") {
      return [];
    }

    return readReferencePaths(body).map((reference) => ({
      label: referenceToId(reference),
      relativePath: normalizeDetailReference(source, reference, doc.relativePath),
    }));
  });
}

function readSectionSummary(section: string | undefined) {
  if (!section) {
    return null;
  }

  return section.replace(/\s+/g, " ").trim();
}

function readAgentDescription(agent: AgentDoc) {
  const intent = readSectionSummary(agent.sections.get("intent"));
  const role = agent.role ? titleCase(agent.role) : null;

  return [role, intent].filter(Boolean).join(" - ") || null;
}

function readThreadIds(doc: MarkdownDoc) {
  const content = [...doc.sections.values()].join("\n");
  const matches = content.matchAll(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
  );

  return [...new Set([...matches].map((match) => match[0]))];
}

function agentColor(role: string | null) {
  switch (role?.toLowerCase()) {
    case "steward":
      return "#d97706";
    case "reviewer":
      return "#9333ea";
    case "observer":
      return "#64748b";
    case "worker":
    default:
      return "#2563eb";
  }
}

function normalizeRelativeReference(
  source: ShapeStrategySource,
  reference: string,
  fromRelativePath?: string | null
) {
  const normalizedReference = reference.replace(/\\/g, "/").replace(/^\.\//, "");

  if (!fromRelativePath || !normalizedReference.startsWith("../")) {
    return normalizedReference;
  }

  return path.posix
    .normalize(
      path.posix.join(
        path.posix.dirname(stripSourcePrefix(source, fromRelativePath)),
        normalizedReference
      )
    )
    .replace(/^\.?\//, "");
}

function normalizeDetailReference(
  source: ShapeStrategySource,
  reference: string,
  fromRelativePath: string
) {
  const relative = normalizeRelativeReference(
    source,
    reference,
    fromRelativePath
  );

  return displayRelativePath(source, relative);
}

async function resolveShapeStrategySource(
  workspace: string
): Promise<ShapeStrategySource | null> {
  const orchestrationRoot = path.join(
    /*turbopackIgnore: true*/ workspace,
    ORCHESTRATION_DIR
  );
  const rootSource = {
    rootDir: orchestrationRoot,
    baseRelativePath: "",
  };

  if (await docExists(rootSource, SHAPE_STRATEGY_FILE)) {
    return rootSource;
  }

  const nestedSource = {
    rootDir: path.join(orchestrationRoot, NESTED_SHAPE_STRATEGY_DIR),
    baseRelativePath: NESTED_SHAPE_STRATEGY_DIR,
  };

  if (await docExists(nestedSource, SHAPE_STRATEGY_FILE)) {
    return nestedSource;
  }

  return null;
}

async function docExists(source: ShapeStrategySource, relativePath: string) {
  return Boolean(
    await readDoc(source.rootDir, relativePath, displayRelativePath(source, relativePath))
  );
}

function displayRelativePath(source: ShapeStrategySource, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (!source.baseRelativePath) {
    return normalized;
  }

  return `${source.baseRelativePath}/${normalized}`;
}

function stripSourcePrefix(source: ShapeStrategySource, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (!source.baseRelativePath) {
    return normalized;
  }

  return normalized.replace(
    new RegExp(`^${escapeRegExp(source.baseRelativePath)}/`),
    ""
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function referenceToId(reference: string) {
  return path.basename(reference.replace(/\\/g, "/"), ".md");
}

function simplifyTitle(title: string) {
  return title.replace(
    /^(Agent|Artifact|Checkpoint|Edge|Run|Shape|Workpiece):\s*/i,
    ""
  );
}

function normalizeHeading(value: string) {
  return value.trim().toLowerCase();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createWarning(
  id: string,
  label: string,
  messages: string[]
): GraphProjectionQualityWarning {
  return {
    id,
    title: "Shape strategy adapter warning",
    message: messages.join(" "),
    details: messages.map((message) => ({ label, message })),
  };
}

function dedupeWarnings(warnings: GraphProjectionQualityWarning[]) {
  const seen = new Set<string>();

  return warnings.filter((warning) => {
    const key = `${warning.id}:${warning.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
