import type { CodexLiveThread } from "./codex-threads";
import type { OrchestrationDoc } from "./orchestration";

export const GRAPH_CONTRACT_VERSION = "p8-c1";

export type GraphSourceLayer =
  | "graph_projection"
  | "markdown"
  | "codex_runtime_annotation"
  | "git_worktree_annotation"
  | "vscode_action";

export type GraphNodeKind =
  | "chunk"
  | "handoff"
  | "concern"
  | "checkpoint"
  | "thread";

export type GraphEdgeType =
  | "sequence"
  | "spawned"
  | "returned"
  | "detour"
  | "repass"
  | "blocked"
  | "verified"
  | "documents"
  | "annotates";

export type GraphStatus =
  | "queued"
  | "in_progress"
  | "needs_human"
  | "blocked"
  | "fixed"
  | "verified"
  | "signed_off"
  | "complete"
  | "superseded"
  | "resolved"
  | "deferred"
  | "unknown";

export type GraphNodeChronology = "start" | null;

export type GraphMissingState =
  | "missing_packet"
  | "missing_chunk_status"
  | "missing_chunk_ledger"
  | "missing_handoff_summary"
  | "missing_graph_edges"
  | "missing_thread_annotation"
  | "missing_git_annotation"
  | "missing_target_node";

export type GraphEvidence = {
  layer: GraphSourceLayer;
  relativePath: string | null;
  label: string;
  section: string | null;
  rawValue?: string | null;
};

export type GraphDetailLink = {
  label: string;
  href: string;
  relativePath: string | null;
  kind: "artifact" | "meta_template" | "reference";
  searchNames?: string[];
};

export type GraphDetailBlock = {
  id: string;
  name: string;
  icon: string | null;
  summary: string | null;
  color: string | null;
  body: string | null;
  links: GraphDetailLink[];
};

export type GraphMarker = {
  id: string;
  targetId: string;
  label: string;
  description: string | null;
  color: string;
  muted: boolean;
  icon: string | null;
  loader: boolean;
  links: GraphDetailLink[];
};

export type GraphRegion = {
  id: string;
  label: string;
  category: string | null;
  color: string;
  muted: boolean;
  nodeIds: string[];
  regionIds: string[];
  detail: GraphDetailBlock[];
  links: GraphDetailLink[];
};

export type GraphPacketGroup = {
  id: string;
  number: number;
  label: string;
  name: string;
  status: GraphStatus;
  rawStatus: string | null;
  relativePath: string | null;
  sourceLayer: GraphSourceLayer;
  missing: GraphMissingState[];
  color?: string;
  muted?: boolean;
};

export type GraphVerificationEvidence = {
  commandOrCheck: string;
  result: GraphStatus;
  rawResult: string;
  evidence: string;
  relativePath: string;
};

export type RuntimeThreadAnnotation = {
  threadId: string;
  title: string | null;
  status: "open" | "completed" | "archived" | "unknown";
  updatedAt: string | null;
  sourceLayer: "codex_runtime_annotation";
};

export type GitWorktreeAnnotation = {
  kind: "commit" | "worktree";
  status: "source_of_truth" | "off_source_of_truth" | "unknown";
  label: string;
  ref: string | null;
  path: string | null;
  sourceLayer: "git_worktree_annotation";
};

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  primary: boolean;
  label: string;
  color: string | null;
  icon: string | null;
  chronology: GraphNodeChronology;
  packetId: string | null;
  chunkId: string | null;
  status: GraphStatus;
  rawStatus: string | null;
  sourceLayer: GraphSourceLayer;
  relativePath: string | null;
  order: number;
  lane: "main" | "spawned" | "detour" | "returned" | "annotation";
  sources: GraphEvidence[];
  missing: GraphMissingState[];
  links: GraphDetailLink[];
  detail: {
    title: string;
    summary: string | null;
    handoff: GraphHandoffDetail | null;
    concern: GraphConcernDetail | null;
    files: string[];
    verification: GraphVerificationEvidence[];
    threadIds: string[];
    runtimeThreads: RuntimeThreadAnnotation[];
    gitWorktree: GitWorktreeAnnotation[];
    blocks: GraphDetailBlock[];
  };
};

export type GraphHandoffDetail = {
  packet: string | null;
  chunk: string | null;
  sourceThread: string | null;
  worktree: string | null;
  returnedTo: string | null;
  reviewLink: string | null;
};

export type GraphConcernDetail = {
  concern: string;
  whyItMatters: string | null;
  affected: string | null;
  recommendedDefault: string | null;
  needsHuman: string | null;
};

export type GraphEdge = {
  id: string;
  type: GraphEdgeType;
  source: string;
  target: string;
  label: string;
  status: GraphStatus;
  rawType: string | null;
  sourceLayer: GraphSourceLayer;
  relativePath: string | null;
  missing: GraphMissingState[];
  directional?: boolean;
  style?: "solid" | "dashed" | "dotted";
  detailBlocks?: GraphDetailBlock[];
};

export type OrchestrationGraph = {
  contractVersion: typeof GRAPH_CONTRACT_VERSION;
  sourceLayers: Record<GraphSourceLayer, string>;
  statusTaxonomy: Record<GraphStatus, string>;
  extractionRules: string[];
  packets: GraphPacketGroup[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  markers: GraphMarker[];
  regions: GraphRegion[];
  missing: Array<{
    state: GraphMissingState;
    relativePath: string | null;
    message: string;
  }>;
  counts: {
    packets: number;
    primaryChunks: number;
    supportingNodes: number;
    edges: number;
  };
};

export function getRecordedThreadIds(graph: OrchestrationGraph) {
  return [
    ...new Set(graph.nodes.flatMap((node) => node.detail.threadIds)),
  ].sort((a, b) => a.localeCompare(b));
}

export function getPrimaryChunkIds(graph: OrchestrationGraph) {
  return graph.nodes
    .filter((node) => node.primary && node.chunkId)
    .map((node) => node.chunkId as string);
}

type BuildGraphOptions = {
  runtimeThreads?: CodexLiveThread[];
  gitWorktreeAnnotations?: Array<GitWorktreeAnnotation & { chunkId?: string }>;
};

type MarkdownTable = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

const STATUS_TAXONOMY: Record<GraphStatus, string> = {
  queued: "Planned or ready, but not actively being worked.",
  in_progress: "Active packet, chunk, handoff, or live work.",
  needs_human: "Paused at a recorded decision gate.",
  blocked: "Cannot proceed without an external fix or missing dependency.",
  fixed: "Implementation or review pass is complete, but not verified.",
  verified: "Checks passed for the recorded scope.",
  signed_off: "Human accepted the completed scope.",
  complete: "Closed or completed work outside the stricter chunk statuses.",
  superseded: "Replaced by a later accepted direction.",
  resolved: "Concern or return item has been handled.",
  deferred: "Known but intentionally postponed.",
  unknown: "Missing or unrecognized status; render as incomplete.",
};

const SOURCE_LAYERS: Record<GraphSourceLayer, string> = {
  graph_projection:
    "Project-local graph projection artifact read from .codex-orchestration/graph-projection.json.",
  markdown:
    "Durable source of truth from normalized .codex-orchestration Markdown.",
  codex_runtime_annotation:
    "Optional live Codex thread annotation matched only by explicit thread IDs.",
  git_worktree_annotation:
    "Optional Git commit or worktree evidence; never required to render.",
  vscode_action: "Optional action target for opening the Markdown source file.",
};

const EXTRACTION_RULES = [
  "Packets come from packet-map rows and normalized packet Markdown files.",
  "Chunks are the primary graph nodes and are extracted from packet chunk headings and packet-scoped ledger tables.",
  "Packets are group, color, and legend context; they are not peer graph nodes.",
  "Ledger Rolling Chunk Window and later chunk tables define chunk status, order, and sequence edges.",
  "Handoffs use ## Handoff Summary, ## Packet / Chunk, ## Graph Edges, and ## Concerns To Bubble Up when present.",
  "Concern sections may contain one or more repeated - Status records; each record becomes a read-only concern node.",
  "Missing handoff summaries or graph edges are recorded as incomplete, not inferred from transcripts.",
  "Runtime Codex state may annotate only explicit thread IDs already recorded in Markdown.",
  "Git/worktree state may annotate chunks or handoffs but cannot be required for graph construction.",
];

const STATUS_ALIASES: Record<string, GraphStatus> = {
  active: "in_progress",
  complete: "complete",
  completed: "complete",
  done: "complete",
  fixed: "fixed",
  in_progress: "in_progress",
  "in progress": "in_progress",
  needs_human: "needs_human",
  "needs human": "needs_human",
  human_gate: "needs_human",
  "human gate": "needs_human",
  open: "needs_human",
  blocked: "blocked",
  queued: "queued",
  ready: "queued",
  ready_to_spawn: "queued",
  "ready to spawn": "queued",
  resolved: "resolved",
  deferred: "deferred",
  signed_off: "signed_off",
  "signed off": "signed_off",
  superseded: "superseded",
  verified: "verified",
  passed: "verified",
  pass: "verified",
};

const GRAPH_EDGE_TYPES: GraphEdgeType[] = [
  "sequence",
  "spawned",
  "returned",
  "detour",
  "repass",
  "blocked",
  "verified",
  "documents",
  "annotates",
];

export function buildOrchestrationGraph(
  docs: OrchestrationDoc[],
  options: BuildGraphOptions = {}
): OrchestrationGraph {
  const packets = new Map<string, GraphPacketGroup>();
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const missing: OrchestrationGraph["missing"] = [];

  for (const doc of docs) {
    if (doc.relativePath === "packets/packet-map.md") {
      readPacketMap(doc, packets);
    }
  }

  for (const doc of docs.filter((doc) => doc.kind === "packet")) {
    readPacketDoc(doc, packets, nodes);
  }

  for (const doc of docs.filter((doc) => doc.kind === "ledger")) {
    readLedgerDoc(doc, packets, nodes, edges);
  }

  for (const doc of docs.filter((doc) => doc.kind === "handoff")) {
    readHandoffDoc(doc, nodes, edges);
  }

  applyRuntimeAnnotations(nodes, options.runtimeThreads ?? []);
  applyGitWorktreeAnnotations(nodes, options.gitWorktreeAnnotations ?? []);

  for (const node of nodes.values()) {
    if (node.kind === "chunk" && !node.packetId) {
      node.missing.push("missing_packet");
      missing.push({
        state: "missing_packet",
        relativePath: node.relativePath,
        message: `${node.label} does not resolve to a packet group.`,
      });
    }

    if (node.kind === "chunk" && node.status === "unknown") {
      node.missing.push("missing_chunk_status");
      missing.push({
        state: "missing_chunk_status",
        relativePath: node.relativePath,
        message: `${node.label} has no recognized chunk status.`,
      });
    }
  }

  return {
    contractVersion: GRAPH_CONTRACT_VERSION,
    sourceLayers: SOURCE_LAYERS,
    statusTaxonomy: STATUS_TAXONOMY,
    extractionRules: EXTRACTION_RULES,
    packets: [...packets.values()].sort((a, b) => a.number - b.number),
    nodes: [...nodes.values()].sort((a, b) => a.order - b.order),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
    markers: [],
    regions: [],
    missing,
    counts: {
      packets: packets.size,
      primaryChunks: [...nodes.values()].filter((node) => node.primary).length,
      supportingNodes: [...nodes.values()].filter((node) => !node.primary)
        .length,
      edges: edges.size,
    },
  };
}

function readPacketMap(
  doc: OrchestrationDoc,
  packets: Map<string, GraphPacketGroup>
) {
  for (const table of parseMarkdownTables(doc.content)) {
    if (!hasHeaders(table, ["packet", "name", "status"])) {
      continue;
    }

    for (const row of table.rows) {
      const packetNumber = readPacketNumber(row.packet);

      if (!packetNumber) {
        continue;
      }

      const id = packetId(packetNumber);
      const rawStatus = row.status || null;
      packets.set(id, {
        id,
        number: packetNumber,
        label: `Packet ${String(packetNumber).padStart(3, "0")}`,
        name: row.name || `Packet ${String(packetNumber).padStart(3, "0")}`,
        status: normalizeStatus(rawStatus),
        rawStatus,
        relativePath: doc.relativePath,
        sourceLayer: "markdown",
        missing: [],
      });
    }
  }
}

function readPacketDoc(
  doc: OrchestrationDoc,
  packets: Map<string, GraphPacketGroup>,
  nodes: Map<string, GraphNode>
) {
  const packetNumber = readPacketNumber(doc.title) ?? readPacketNumber(doc.name);

  if (!packetNumber) {
    return;
  }

  const id = packetId(packetNumber);
  const existing = packets.get(id);
  const packetName = doc.title.replace(/^Packet\s+\d+:\s*/i, "").trim();

  packets.set(id, {
    id,
    number: packetNumber,
    label: `Packet ${String(packetNumber).padStart(3, "0")}`,
    name: packetName || existing?.name || doc.title,
    status: existing?.status ?? normalizeStatus(doc.status),
    rawStatus: existing?.rawStatus ?? doc.status,
    relativePath: doc.relativePath,
    sourceLayer: "markdown",
    missing: [],
  });

  for (const chunk of readChunkHeadings(doc.content)) {
    upsertChunkNode(nodes, {
      chunkId: chunk.chunkId,
      packetId: id,
      label: chunk.title,
      status: "unknown",
      rawStatus: null,
      relativePath: doc.relativePath,
      order: chunkOrder(chunk.chunkId),
      summary: null,
      source: {
        layer: "markdown",
        relativePath: doc.relativePath,
        label: "Packet chunk heading",
        section: chunk.heading,
      },
    });
  }
}

function readLedgerDoc(
  doc: OrchestrationDoc,
  packets: Map<string, GraphPacketGroup>,
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>
) {
  const sequence: string[] = [];

  for (const table of parseMarkdownTables(doc.content)) {
    if (hasHeaders(table, ["order", "chunk", "status"])) {
      for (const row of table.rows) {
        const chunkRef = readChunkRef(row.chunk);

        if (!chunkRef) {
          continue;
        }

        sequence.push(chunkRef.chunkId);
        ensurePacketFromChunk(packets, chunkRef.chunkId, doc);
        upsertChunkNode(nodes, {
          chunkId: chunkRef.chunkId,
          packetId: packetId(chunkRef.packetNumber),
          label: chunkRef.title,
          status: normalizeStatus(row.status),
          rawStatus: row.status || null,
          relativePath: doc.relativePath,
          order: sequence.length,
          summary: row.scope || row["product spine fit"] || null,
          source: {
            layer: "markdown",
            relativePath: doc.relativePath,
            label: "Ledger rolling chunk row",
            section: "Rolling Chunk Window",
            rawValue: row.status || null,
          },
        });
      }
    }

    if (hasHeaders(table, ["chunk", "status", "notes"])) {
      for (const row of table.rows) {
        const chunkRef = readChunkRef(row.chunk);

        if (!chunkRef) {
          continue;
        }

        sequence.push(chunkRef.chunkId);
        ensurePacketFromChunk(packets, chunkRef.chunkId, doc);
        upsertChunkNode(nodes, {
          chunkId: chunkRef.chunkId,
          packetId: packetId(chunkRef.packetNumber),
          label: chunkRef.title,
          status: normalizeStatus(row.status),
          rawStatus: row.status || null,
          relativePath: doc.relativePath,
          order: sequence.length + 1000,
          summary: row.notes || null,
          source: {
            layer: "markdown",
            relativePath: doc.relativePath,
            label: "Ledger later chunk row",
            section: "Later Chunk",
            rawValue: row.status || null,
          },
        });
      }
    }

    if (hasHeaders(table, ["chunk", "command/check", "result"])) {
      for (const row of table.rows) {
        const chunkRef = readChunkRef(row.chunk);

        if (!chunkRef) {
          continue;
        }

        const node = nodes.get(chunkNodeId(chunkRef.chunkId));

        if (!node) {
          continue;
        }

        node.detail.verification.push({
          commandOrCheck: row["command/check"] || "Unspecified check",
          result: normalizeStatus(row.result),
          rawResult: row.result || "",
          evidence: row.evidence || "",
          relativePath: doc.relativePath,
        });
      }
    }
  }

  for (let index = 1; index < sequence.length; index += 1) {
    const source = chunkNodeId(sequence[index - 1]);
    const target = chunkNodeId(sequence[index]);
    addEdge(edges, {
      id: `edge:sequence:${sequence[index - 1]}:${sequence[index]}`,
      type: "sequence",
      source,
      target,
      label: "next chunk",
      status: "unknown",
      rawType: null,
      sourceLayer: "markdown",
      relativePath: doc.relativePath,
      missing: [],
    });
  }
}

function readHandoffDoc(
  doc: OrchestrationDoc,
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>
) {
  const summaryBody = readSection(doc.content, "Handoff Summary");
  const graphEdgesBody = readSection(doc.content, "Graph Edges");
  const summary = readBulletFields(summaryBody);
  const packetChunk = readBulletFields(readSection(doc.content, "Packet / Chunk"));
  const chunkRef = readChunkRef(summary.chunk ?? packetChunk.chunk ?? doc.name);
  const packetNumber =
    readPacketNumber(summary.packet ?? packetChunk.packet ?? "") ??
    chunkRef?.packetNumber ??
    null;
  const handoffNodeId = `handoff:${doc.relativePath}`;
  const rawStatus = doc.status ?? summary.status ?? null;
  const threadIds = extractThreadIds(doc.content);
  const missing: GraphMissingState[] = [];

  if (!summary.status) {
    missing.push("missing_handoff_summary");
  }

  if (!graphEdgesBody) {
    missing.push("missing_graph_edges");
  }

  nodes.set(handoffNodeId, {
    id: handoffNodeId,
    kind: "handoff",
    primary: false,
    label: doc.title,
    color: null,
    icon: null,
    chronology: null,
    packetId: packetNumber ? packetId(packetNumber) : null,
    chunkId: chunkRef?.chunkId ?? null,
    status: normalizeStatus(rawStatus),
    rawStatus,
    sourceLayer: "markdown",
    relativePath: doc.relativePath,
    order: chunkRef ? chunkOrder(chunkRef.chunkId) + 0.2 : 10_000,
    lane: "annotation",
    sources: [
      {
        layer: "markdown",
        relativePath: doc.relativePath,
        label: summary.status ? "Handoff Summary" : "Handoff document",
        section: summary.status ? "Handoff Summary" : null,
        rawValue: rawStatus,
      },
    ],
    missing,
    links: [],
    detail: {
      title: doc.title,
      summary: createHandoffSummary(summary, doc.excerpt),
      handoff: {
        packet: summary.packet ?? packetChunk.packet ?? null,
        chunk: summary.chunk ?? packetChunk.chunk ?? null,
        sourceThread: summary["source thread"] ?? null,
        worktree: summary.worktree ?? null,
        returnedTo: summary["returned to"] ?? null,
        reviewLink: summary["review link"] ?? null,
      },
      concern: null,
      files: [doc.relativePath],
      verification: readHandoffVerification(doc),
      threadIds,
      runtimeThreads: [],
      gitWorktree: [],
      blocks: [],
    },
  });

  if (chunkRef) {
    addEdge(edges, {
      id: `edge:documents:${chunkRef.chunkId}:${doc.relativePath}`,
      type: "documents",
      source: chunkNodeId(chunkRef.chunkId),
      target: handoffNodeId,
      label: "handoff doc",
      status: normalizeStatus(rawStatus),
      rawType: null,
      sourceLayer: "markdown",
      relativePath: doc.relativePath,
      missing: [],
    });
  }

  for (const edge of readGraphEdgeRecords(doc, handoffNodeId, chunkRef?.chunkId)) {
    addEdge(edges, edge);
  }

  for (const concern of readConcernRecords(
    doc,
    packetNumber,
    chunkRef?.chunkId
  )) {
    nodes.set(concern.id, concern);

    addEdge(edges, {
      id: `edge:documents:${handoffNodeId}:${concern.id}`,
      type: "documents",
      source: handoffNodeId,
      target: concern.id,
      label: "concern section",
      status: concern.status,
      rawType: null,
      sourceLayer: "markdown",
      relativePath: doc.relativePath,
      missing: [],
    });

    if (concern.chunkId) {
      addEdge(edges, {
        id: `edge:annotates:${concern.id}:${concern.chunkId}`,
        type:
          concern.status === "blocked" || concern.status === "needs_human"
            ? "blocked"
            : "annotates",
        source: concern.id,
        target: chunkNodeId(concern.chunkId),
        label: "concern",
        status: concern.status,
        rawType: null,
        sourceLayer: "markdown",
        relativePath: doc.relativePath,
        missing: [],
      });
    }
  }
}

function readGraphEdgeRecords(
  doc: OrchestrationDoc,
  handoffNodeId: string,
  fallbackChunkId: string | null | undefined
): GraphEdge[] {
  const body = readSection(doc.content, "Graph Edges");

  if (!body) {
    return [];
  }

  const records: Array<Record<string, string>> = [];
  let current: Record<string, string> = {};

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    const key = normalizeHeader(match[1]);

    if (key === "from" && current.from) {
      records.push(current);
      current = {};
    }

    current[key] = match[2].trim();
  }

  if (Object.keys(current).length > 0) {
    records.push(current);
  }

  return records.flatMap((record, index) => {
    const source = readGraphEndpoint(record.from, handoffNodeId, fallbackChunkId);
    const target = readGraphEndpoint(record.to, handoffNodeId, fallbackChunkId);
    const type = normalizeEdgeType(record.type);

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: `edge:${type}:${source}:${target}:${index}`,
        type,
        source,
        target,
        label: record.label || type,
        status: normalizeStatus(record.status ?? null),
        rawType: record.type ?? null,
        sourceLayer: "markdown",
        relativePath: doc.relativePath,
        missing: [],
      },
    ];
  });
}

function readConcernRecords(
  doc: OrchestrationDoc,
  packetNumber: number | null,
  fallbackChunkId: string | null | undefined
): GraphNode[] {
  const body = readSection(doc.content, "Concerns To Bubble Up");

  if (!body) {
    return [];
  }

  const records = readRepeatedBulletRecords(body, "status");
  const concernRecords =
    records.length > 0 ? records : [readBulletFields(body)];

  return concernRecords.map((fields, index) => {
    const chunkRef = readChunkRef(
      fields.chunk ?? fields["affected packet/docs"] ?? ""
    );
    const rawStatus = fields.status ?? null;
    const concern = fields.concern ?? doc.title;
    const id =
      concernRecords.length === 1
        ? `concern:${doc.relativePath}`
        : `concern:${doc.relativePath}:${index + 1}`;

    return {
      id,
      kind: "concern",
      primary: false,
      label: concern,
      color: null,
      icon: null,
      chronology: null,
      packetId: packetNumber ? packetId(packetNumber) : null,
      chunkId: chunkRef?.chunkId ?? fallbackChunkId ?? null,
      status: normalizeStatus(rawStatus),
      rawStatus,
      sourceLayer: "markdown",
      relativePath: doc.relativePath,
      order: chunkRef ? chunkOrder(chunkRef.chunkId) + 0.3 : 10_001,
      lane: "annotation",
      sources: [
        {
          layer: "markdown",
          relativePath: doc.relativePath,
          label: "Concern bubble-up",
          section: "Concerns To Bubble Up",
          rawValue: rawStatus,
        },
      ],
      missing: [],
      links: [],
      detail: {
        title: concern,
        summary: fields["why it matters"] ?? null,
        handoff: null,
        concern: {
          concern,
          whyItMatters: fields["why it matters"] ?? null,
          affected: fields["affected packet/docs"] ?? null,
          recommendedDefault: fields["recommended default"] ?? null,
          needsHuman: fields["needs human"] ?? null,
        },
        files: [doc.relativePath],
        verification: [],
        threadIds: extractThreadIds(doc.content),
        runtimeThreads: [],
        gitWorktree: [],
        blocks: [],
      },
    };
  });
}

function upsertChunkNode(
  nodes: Map<string, GraphNode>,
  input: {
    chunkId: string;
    packetId: string | null;
    label: string;
    status: GraphStatus;
    rawStatus: string | null;
    relativePath: string;
    order: number;
    summary: string | null;
    source: GraphEvidence;
  }
) {
  const id = chunkNodeId(input.chunkId);
  const existing = nodes.get(id);

  if (!existing) {
    nodes.set(id, {
      id,
      kind: "chunk",
      primary: true,
      label: input.label,
      color: null,
      icon: null,
      chronology: null,
      packetId: input.packetId,
      chunkId: input.chunkId,
      status: input.status,
      rawStatus: input.rawStatus,
      sourceLayer: "markdown",
      relativePath: input.relativePath,
      order: input.order,
      lane: "main",
      sources: [input.source],
      missing: input.status === "unknown" ? ["missing_chunk_status"] : [],
      links: [],
      detail: {
        title: input.label,
        summary: input.summary,
        handoff: null,
        concern: null,
        files: [input.relativePath],
        verification: [],
        threadIds: [],
        runtimeThreads: [],
        gitWorktree: [],
        blocks: [],
      },
    });
    return;
  }

  existing.sources.push(input.source);

  if (!existing.packetId && input.packetId) {
    existing.packetId = input.packetId;
  }

  if (existing.status === "unknown" && input.status !== "unknown") {
    existing.status = input.status;
    existing.rawStatus = input.rawStatus;
    existing.missing = existing.missing.filter(
      (state) => state !== "missing_chunk_status"
    );
  }

  if (!existing.detail.summary && input.summary) {
    existing.detail.summary = input.summary;
  }

  if (!existing.detail.files.includes(input.relativePath)) {
    existing.detail.files.push(input.relativePath);
  }

  existing.order = Math.min(existing.order, input.order);
}

function applyRuntimeAnnotations(
  nodes: Map<string, GraphNode>,
  runtimeThreads: CodexLiveThread[]
) {
  if (runtimeThreads.length === 0) {
    return;
  }

  const threadsById = new Map(runtimeThreads.map((thread) => [thread.id, thread]));

  for (const node of nodes.values()) {
    for (const threadId of node.detail.threadIds) {
      const thread = threadsById.get(threadId);

      if (!thread) {
        node.missing.push("missing_thread_annotation");
        continue;
      }

      node.detail.runtimeThreads.push({
        threadId,
        title: thread.title,
        status: thread.status,
        updatedAt: thread.updatedAt,
        sourceLayer: "codex_runtime_annotation",
      });
    }
  }
}

function applyGitWorktreeAnnotations(
  nodes: Map<string, GraphNode>,
  annotations: Array<GitWorktreeAnnotation & { chunkId?: string }>
) {
  for (const annotation of annotations) {
    if (!annotation.chunkId) {
      continue;
    }

    const node = nodes.get(chunkNodeId(annotation.chunkId));

    if (!node) {
      continue;
    }

    node.detail.gitWorktree.push({
      kind: annotation.kind,
      status: annotation.status,
      label: annotation.label,
      ref: annotation.ref,
      path: annotation.path,
      sourceLayer: annotation.sourceLayer,
    });
  }
}

function ensurePacketFromChunk(
  packets: Map<string, GraphPacketGroup>,
  chunkIdValue: string,
  doc: OrchestrationDoc
) {
  const packetNumber = readPacketNumber(chunkIdValue);

  if (!packetNumber) {
    return;
  }

  const id = packetId(packetNumber);

  if (packets.has(id)) {
    return;
  }

  packets.set(id, {
    id,
    number: packetNumber,
    label: `Packet ${String(packetNumber).padStart(3, "0")}`,
    name: `Packet ${String(packetNumber).padStart(3, "0")}`,
    status: "unknown",
    rawStatus: null,
    relativePath: doc.relativePath,
    sourceLayer: "markdown",
    missing: ["missing_packet"],
  });
}

function addEdge(edges: Map<string, GraphEdge>, edge: GraphEdge) {
  if (!edges.has(edge.id)) {
    edges.set(edge.id, edge);
  }
}

function readChunkHeadings(content: string) {
  const chunks: Array<{ chunkId: string; title: string; heading: string }> = [];
  const headingPattern = /^#{2,4}\s+((P\d+-[A-Z]+\d+):?\s*(.+))$/gim;
  let match = headingPattern.exec(content);

  while (match) {
    chunks.push({
      chunkId: normalizeChunkId(match[2]),
      title: match[3].trim(),
      heading: match[1].trim(),
    });
    match = headingPattern.exec(content);
  }

  return chunks;
}

function readHandoffVerification(doc: OrchestrationDoc) {
  const body = readSection(doc.content, "Verification");

  if (!body) {
    return [];
  }

  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => {
      const text = line.replace(/^-\s*/, "");
      return {
        commandOrCheck: text,
        result: normalizeStatus(text),
        rawResult: text,
        evidence: text,
        relativePath: doc.relativePath,
      };
    });
}

function createHandoffSummary(
  fields: Record<string, string>,
  fallback: string | null
) {
  const parts = [
    fields.packet ? `Packet: ${fields.packet}` : null,
    fields.chunk ? `Chunk: ${fields.chunk}` : null,
    fields["returned to"] ? `Returned to: ${fields["returned to"]}` : null,
    fields["review link"] ? `Review link: ${fields["review link"]}` : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return fallback;
}

function readSection(content: string, heading: string) {
  const escapedHeading = escapeRegExp(heading);
  const match = content.match(
    new RegExp(
      `^##\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
      "im"
    )
  );

  return match?.[1]?.trim() ?? "";
}

function readRepeatedBulletRecords(body: string, startKey: string) {
  const records: Array<Record<string, string>> = [];
  let current: Record<string, string> = {};
  let currentKey: string | null = null;
  const normalizedStartKey = normalizeHeader(startKey);

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);

    if (match) {
      const key = normalizeHeader(match[1]);

      if (key === normalizedStartKey && current[normalizedStartKey]) {
        records.push(current);
        current = {};
      }

      currentKey = key;
      current[key] = match[2].trim();
      continue;
    }

    if (currentKey && /^\s+\S/.test(line)) {
      current[currentKey] = `${current[currentKey]} ${line.trim()}`.trim();
    }
  }

  if (Object.keys(current).length > 0) {
    records.push(current);
  }

  return records;
}

function readBulletFields(body: string) {
  const fields: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);

    if (match) {
      currentKey = normalizeHeader(match[1]);
      fields[currentKey] = match[2].trim();
      continue;
    }

    if (currentKey && /^\s+\S/.test(line)) {
      fields[currentKey] = `${fields[currentKey]} ${line.trim()}`.trim();
    }
  }

  return fields;
}

function parseMarkdownTables(content: string): MarkdownTable[] {
  const tables: MarkdownTable[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const next = lines[index + 1]?.trim() ?? "";

    if (!isTableLine(line) || !isSeparatorLine(next)) {
      continue;
    }

    const headers = splitTableLine(line).map(normalizeHeader);
    const rows: Array<Record<string, string>> = [];
    index += 2;

    while (index < lines.length && isTableLine(lines[index].trim())) {
      const cells = splitTableLine(lines[index]);
      const row: Record<string, string> = {};

      headers.forEach((header, cellIndex) => {
        row[header] = cells[cellIndex]?.trim() ?? "";
      });

      rows.push(row);
      index += 1;
    }

    tables.push({ headers, rows });
  }

  return tables;
}

function isTableLine(line: string) {
  return line.startsWith("|") && line.endsWith("|");
}

function isSeparatorLine(line: string) {
  return /^\|?[\s|:-]+\|?$/.test(line) && line.includes("-");
}

function splitTableLine(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function hasHeaders(table: MarkdownTable, requiredHeaders: string[]) {
  return requiredHeaders.every((header) =>
    table.headers.includes(normalizeHeader(header))
  );
}

function readChunkRef(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\bP(\d+)-([A-Z]+)(\d+)\b\s*:?\s*(.*)$/i);

  if (!match) {
    return null;
  }

  const chunkIdValue = normalizeChunkId(`${match[1]}-${match[2]}${match[3]}`);
  const title = match[4]?.trim() || chunkIdValue;

  return {
    chunkId: chunkIdValue,
    packetNumber: Number(match[1]),
    title,
  };
}

function readPacketNumber(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  const packetMatch = value.match(/\bPacket\s+0*(\d+)\b/i);

  if (packetMatch) {
    return Number(packetMatch[1]);
  }

  const chunkMatch = value.match(/\bP(\d+)-[A-Z]+\d+\b/i);

  if (chunkMatch) {
    return Number(chunkMatch[1]);
  }

  const barePacketMatch = value.match(/\b0*(\d{1,3})\b/);

  return barePacketMatch ? Number(barePacketMatch[1]) : null;
}

function readGraphEndpoint(
  value: string | undefined,
  handoffNodeId: string,
  fallbackChunkId: string | null | undefined
) {
  const normalized = normalizeHeader(value ?? "");

  if (normalized === "handoff" || normalized === "this_handoff") {
    return handoffNodeId;
  }

  if ((normalized === "chunk" || normalized === "this_chunk") && fallbackChunkId) {
    return chunkNodeId(fallbackChunkId);
  }

  const chunkRef = readChunkRef(value);

  if (chunkRef) {
    return chunkNodeId(chunkRef.chunkId);
  }

  return value?.trim() || null;
}

function normalizeEdgeType(value: string | undefined): GraphEdgeType {
  const normalized = normalizeHeader(value ?? "");

  if (GRAPH_EDGE_TYPES.includes(normalized as GraphEdgeType)) {
    return normalized as GraphEdgeType;
  }

  return "annotates";
}

function normalizeStatus(value: string | null | undefined): GraphStatus {
  if (!value) {
    return "unknown";
  }

  const normalized = normalizeHeader(value.replace(/`/g, ""));

  return STATUS_ALIASES[normalized] ?? "unknown";
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeChunkId(value: string) {
  const match = value.match(/P?(\d+)-([A-Z]+)(\d+)/i);

  if (!match) {
    return value.toUpperCase();
  }

  return `P${Number(match[1])}-${match[2].toUpperCase()}${Number(match[3])}`;
}

function packetId(packetNumber: number) {
  return `P${packetNumber}`;
}

function chunkNodeId(chunkIdValue: string) {
  return `chunk:${chunkIdValue}`;
}

function chunkOrder(chunkIdValue: string) {
  const match = chunkIdValue.match(/^P(\d+)-([A-Z]+)(\d+)$/);

  if (!match) {
    return 9999;
  }

  return Number(match[1]) * 100 + Number(match[3]);
}

function extractThreadIds(content: string) {
  const threadLines = content
    .split(/\r?\n/)
    .filter((line) => /\b(thread|agent id|source)\b/i.test(line));
  const ids = new Set<string>();

  for (const line of threadLines) {
    for (const match of line.matchAll(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
    )) {
      ids.add(match[0]);
    }
  }

  return [...ids];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
