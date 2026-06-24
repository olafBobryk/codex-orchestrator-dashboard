import type { CodexProjectReadResult } from "@/lib/codex/projects";
import type {
  GraphEdge,
  GraphDetailLink,
  GraphMarker,
  GraphNode,
  GraphRegion,
  OrchestrationGraph,
} from "@/lib/graph/orchestration-graph";
import type { GraphMarkdownReference } from "./canvas/types";
import {
  isPublicDemoDashboard,
  type DashboardMode,
} from "./dashboard-mode";

export type DashboardSurfaceAction =
  | {
      type: "navigate";
      href: string;
    }
  | {
      type: "show-status-panel";
    }
  | {
      type: "select-node";
      nodeId: string;
      markerId?: string | null;
    }
  | {
      type: "select-region";
      regionId: string;
    }
  | {
      type: "select-edge";
      edgeId: string;
    }
  | {
      type: "open-markdown-reference";
      reference: GraphMarkdownReference;
    }
  | {
      type: "open-external-link";
      href: string;
    };

export type DashboardSurfaceNode = {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  icon: DashboardSurfaceIcon;
  order?: number;
  action?: DashboardSurfaceAction;
  children?: DashboardSurfaceNode[];
};

export type DashboardSurfaceResult = {
  action: DashboardSurfaceAction;
  ancestors: DashboardSurfaceNode[];
  groupId: string;
  groupLabel: string;
  id: string;
  node: DashboardSurfaceNode;
  priority: number;
  searchText: string;
};

export type DashboardSurfaceGroup = {
  id: string;
  label: string;
  results: DashboardSurfaceResult[];
};

export type DashboardSurfaceIcon =
  | "artifact"
  | "file"
  | "home"
  | "link"
  | "marker"
  | "node"
  | "project"
  | "region"
  | "summary";

export function buildDashboardSurfaceMap({
  codexProjects,
  currentWorkspace,
  dashboardMode = "local",
  graph,
  workspace,
}: {
  codexProjects: CodexProjectReadResult;
  currentWorkspace: string;
  dashboardMode?: DashboardMode;
  graph?: OrchestrationGraph | null;
  workspace?: string | null;
}): DashboardSurfaceNode[] {
  const publicDemo = isPublicDemoDashboard(dashboardMode);
  const currentProject = findCurrentProject(codexProjects, currentWorkspace);
  const currentProjectLabel =
    currentProject?.name ?? workspaceName(currentWorkspace || workspace || "");
  const currentProjectPath =
    currentProject?.path || currentWorkspace || workspace || "";
  const otherProjects = codexProjects.projects.filter(
    (project) => project.path !== currentProjectPath
  );
  const currentProjectChildren: DashboardSurfaceNode[] = [
    {
      id: "home",
      label: "Home",
      description: "Open the dashboard home",
      keywords: ["dashboard", "start", "projects"],
      icon: "home",
      order: 100,
      action: { type: "navigate", href: "/" },
    },
    ...(graph
      ? [
          {
            id: "graph.summary",
            label: "Graph summary",
            description: "Open the current graph overview panel",
            keywords: ["overview", "status", "legend", "signals"],
            icon: "summary" as const,
            order: 110,
            action: { type: "show-status-panel" as const },
          },
          {
            id: "artifacts",
            label: "Artifacts",
            description: "Markdown and external references in the current graph",
            icon: "artifact" as const,
            order: 200,
            children: publicDemo
              ? []
              : createArtifactSurfaces({ graph, workspace }),
          },
          {
            id: "current-graph",
            label: "Current graph",
            description: "Nodes, regions, and markers in this project",
            icon: "node" as const,
            order: 300,
            children: [
              ...graph.nodes.map((node) => createNodeSurface(node)),
              ...graph.regions.map((region) => createRegionSurface(region)),
              ...graph.edges.map((edge) => createEdgeSurface(edge)),
              ...graph.markers.map((marker) => createMarkerSurface(marker)),
            ],
          },
        ]
      : []),
  ];

  return [
    {
      id: `current-project:${currentProjectPath || currentProjectLabel}`,
      label: currentProjectLabel || "Current project",
      description: currentProjectPath || "Current selected project",
      keywords: [
        currentProjectPath,
        currentProject?.state.replace(/_/g, " ") ?? "",
        currentProject?.isActive ? "active" : "",
        "current selected project workspace",
      ],
      icon: "project",
      order: 100,
      children: currentProjectChildren,
    },
    ...(!publicDemo && otherProjects.length > 0
      ? [
          {
            id: "switch-project",
            label: "Switch project",
            description: "Open another saved Codex workspace",
            icon: "project" as const,
            order: 900,
            children: otherProjects.map((project) => ({
              id: `project:${project.path}`,
              label: project.name,
              description: project.path,
              keywords: [
                project.path,
                project.state.replace(/_/g, " "),
                project.isActive ? "active" : "inactive",
                project.activity.unreadThreads > 0 ? "unread" : "",
                project.activity.workingAgentThreads > 0 ? "working agent" : "",
              ],
              icon: "project" as const,
              order: project.order,
              action: {
                type: "navigate" as const,
                href: `/?workspace=${encodeURIComponent(project.path)}`,
              },
            })),
          },
        ]
      : []),
  ];
}

export function flattenDashboardSurfaces(
  nodes: DashboardSurfaceNode[],
  ancestors: DashboardSurfaceNode[] = []
): DashboardSurfaceResult[] {
  return sortSurfaceNodes(nodes).flatMap((node) => {
    const result =
      node.action && ancestors[0]
        ? [
            {
              action: node.action,
              ancestors,
              groupId: ancestors[0].id,
              groupLabel: ancestors[0].label,
              id: node.id,
              node,
              priority: ancestors[0].id.startsWith("current-project:") ? 0 : 1,
              searchText: buildSearchText(node, ancestors),
            },
          ]
        : [];
    const childResults = node.children
      ? flattenDashboardSurfaces(node.children, [...ancestors, node])
      : [];

    return [...result, ...childResults];
  });
}

export function filterDashboardSurfaceResults(
  query: string,
  nodes: DashboardSurfaceNode[]
) {
  const normalizedTokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const results = flattenDashboardSurfaces(nodes);

  if (normalizedTokens.length === 0) {
    return results;
  }

  return results.filter((result) =>
    normalizedTokens.every((token) => result.searchText.includes(token))
  );
}

export function groupDashboardSurfaceResults(
  results: DashboardSurfaceResult[]
): DashboardSurfaceGroup[] {
  const groups = new Map<string, DashboardSurfaceGroup>();

  for (const result of results) {
    const group = groups.get(result.groupId);

    if (group) {
      group.results.push(result);
    } else {
      groups.set(result.groupId, {
        id: result.groupId,
        label: result.groupLabel,
        results: [result],
      });
    }
  }

  return [...groups.values()];
}

export function getDashboardSurfaceAncestryLabel(
  result: DashboardSurfaceResult
) {
  return [...result.ancestors.map((ancestor) => ancestor.label), result.node.label]
    .filter(Boolean)
    .join(" / ");
}

function createNodeSurface(node: GraphNode): DashboardSurfaceNode {
  return {
    id: `node:${node.id}`,
    label: node.label,
    description: node.detail.summary ?? node.relativePath ?? node.kind,
    keywords: [
      node.id,
      node.kind,
      node.status,
      node.rawStatus ?? "",
      node.sourceLayer,
      node.relativePath ?? "",
      node.chunkId ?? "",
      node.detail.title,
      ...node.detail.files,
      ...node.sources.flatMap((source) => [
        source.label,
        source.section ?? "",
        source.rawValue ?? "",
        source.relativePath ?? "",
      ]),
    ],
    icon: "node",
    order: node.order,
    action: { type: "select-node", nodeId: node.id },
  };
}

function createRegionSurface(region: GraphRegion): DashboardSurfaceNode {
  return {
    id: `region:${region.id}`,
    label: region.label,
    description: region.category ?? `${region.nodeIds.length} graph node(s)`,
    keywords: [
      region.id,
      region.category ?? "",
      ...region.nodeIds,
      ...region.regionIds,
      ...region.detail.flatMap((block) => [
        block.name,
        block.summary ?? "",
        block.body ?? "",
      ]),
    ],
    icon: "region",
    action: { type: "select-region", regionId: region.id },
  };
}

function createEdgeSurface(edge: GraphEdge): DashboardSurfaceNode {
  return {
    id: `edge:${edge.id}`,
    label: edge.label,
    description: `${edge.source} -> ${edge.target}`,
    keywords: [
      edge.id,
      edge.type,
      edge.rawType ?? "",
      edge.status,
      edge.sourceLayer,
      edge.relativePath ?? "",
      edge.source,
      edge.target,
      ...(edge.detailBlocks ?? []).flatMap((block) => [
        block.name,
        block.summary ?? "",
        block.body ?? "",
      ]),
    ],
    icon: "link",
    action: { type: "select-edge", edgeId: edge.id },
  };
}

function createMarkerSurface(marker: GraphMarker): DashboardSurfaceNode {
  return {
    id: `marker:${marker.id}`,
    label: marker.label,
    description: marker.description ?? "Open marker detail",
    keywords: [
      marker.id,
      marker.targetId,
      marker.icon ?? "",
      marker.loader ? "loader active working" : "loader off",
      marker.muted ? "muted" : "",
      ...marker.links.flatMap(readLinkSearchText),
    ],
    icon: "marker",
    action: {
      type: "select-node",
      nodeId: marker.targetId,
      markerId: marker.id,
    },
  };
}

function createArtifactSurfaces({
  graph,
  workspace,
}: {
  graph: OrchestrationGraph;
  workspace?: string | null;
}) {
  const surfacesByCategory = new Map<string, DashboardSurfaceNode[]>();
  const seen = new Set<string>();
  const addLinks = (
    links: GraphDetailLink[],
    ancestors: string[],
    orderPrefix: string
  ) => {
    links.forEach((link, index) => {
      const action = getLinkAction(link, workspace);

      if (!action) {
        return;
      }

      const key = `${link.kind}:${link.relativePath ?? link.href}:${link.label}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      const category = getArtifactCategory(link);
      const surfaces = surfacesByCategory.get(category.id) ?? [];

      surfaces.push({
        id: `artifact:${orderPrefix}:${index}:${key}`,
        label: link.label,
        description: ancestors.join(" / "),
        keywords: [category.label, ...ancestors, ...readLinkSearchText(link)],
        icon: link.kind === "artifact" ? "artifact" : "file",
        order: surfaces.length,
        action,
      });
      surfacesByCategory.set(category.id, surfaces);
    });
  };

  for (const node of graph.nodes) {
    addLinks(node.links, [node.label], `node:${node.id}:links`);
    for (const block of node.detail.blocks) {
      addLinks(
        block.links,
        [node.label, block.name, block.summary ?? "", block.body ?? ""],
        `node:${node.id}:block:${block.id}`
      );
    }
  }

  for (const marker of graph.markers) {
    addLinks(marker.links, [marker.label], `marker:${marker.id}`);
  }

  for (const region of graph.regions) {
    addLinks(region.links, [region.label], `region:${region.id}:links`);
    for (const block of region.detail) {
      addLinks(
        block.links,
        [region.label, block.name, block.summary ?? "", block.body ?? ""],
        `region:${region.id}:block:${block.id}`
      );
    }
  }

  for (const edge of graph.edges) {
    for (const block of edge.detailBlocks ?? []) {
      addLinks(
        block.links,
        [edge.label, block.name, block.summary ?? "", block.body ?? ""],
        `edge:${edge.id}:block:${block.id}`
      );
    }
  }

  return createArtifactCategorySurfaces(surfacesByCategory);
}

function createArtifactCategorySurfaces(
  surfacesByCategory: Map<string, DashboardSurfaceNode[]>
) {
  const categories = [
    {
      id: "artifacts.guides",
      label: "Guides",
      description: "Strategy guides and orchestration reference docs",
      icon: "artifact" as const,
      order: 100,
    },
    {
      id: "artifacts.templates",
      label: "Meta templates",
      description: "Reusable contract and dashboard templates",
      icon: "file" as const,
      order: 200,
    },
    {
      id: "artifacts.maps",
      label: "Maps",
      description: "Visual maps and graph reference maps",
      icon: "link" as const,
      order: 300,
    },
    {
      id: "artifacts.docs",
      label: "Artifact docs",
      description: "Concrete orchestration artifact documents",
      icon: "artifact" as const,
      order: 350,
    },
    {
      id: "artifacts.tests",
      label: "Tests",
      description: "Fixtures and test references",
      icon: "file" as const,
      order: 400,
    },
    {
      id: "artifacts.references",
      label: "References",
      description: "Supporting references and source links",
      icon: "link" as const,
      order: 500,
    },
    {
      id: "artifacts.other",
      label: "Other artifacts",
      description: "Uncategorized artifact references",
      icon: "artifact" as const,
      order: 900,
    },
  ];

  return categories.flatMap((category) => {
    const children = surfacesByCategory.get(category.id) ?? [];

    if (children.length === 0) {
      return [];
    }

    return [
      {
        ...category,
        children,
      },
    ];
  });
}

function getArtifactCategory(link: GraphDetailLink) {
  const relativePath = (link.relativePath ?? "").toLowerCase();
  const label = link.label.toLowerCase();

  if (
    link.kind === "meta_template" ||
    label.includes("template") ||
    relativePath.includes("/_templates/") ||
    relativePath.includes("/templates/") ||
    relativePath.includes("template") ||
    relativePath.includes("contract-notes")
  ) {
    return { id: "artifacts.templates", label: "Meta templates" };
  }

  if (
    label.includes("map") ||
    relativePath.endsWith("/map.md") ||
    relativePath.includes("/maps/") ||
    relativePath.includes("visual-map")
  ) {
    return { id: "artifacts.maps", label: "Maps" };
  }

  if (
    relativePath.includes("/tests/") ||
    relativePath.startsWith("tests/") ||
    relativePath.includes("fixture")
  ) {
    return { id: "artifacts.tests", label: "Tests" };
  }

  if (
    relativePath.includes("/artifacts/") ||
    relativePath.includes("/shapes/") ||
    relativePath.includes("/edges/")
  ) {
    return { id: "artifacts.docs", label: "Artifact docs" };
  }

  if (
    relativePath.includes("/_guides/") ||
    relativePath.includes("/guides/") ||
    relativePath.includes("strategy")
  ) {
    return { id: "artifacts.guides", label: "Guides" };
  }

  if (link.kind === "reference") {
    return { id: "artifacts.references", label: "References" };
  }

  if (link.kind === "artifact") {
    return { id: "artifacts.docs", label: "Artifact docs" };
  }

  return { id: "artifacts.other", label: "Other artifacts" };
}

function getLinkAction(
  link: GraphDetailLink,
  workspace?: string | null
): DashboardSurfaceAction | null {
  if (
    link.relativePath &&
    link.relativePath.toLowerCase().endsWith(".md")
  ) {
    return {
      type: "open-markdown-reference",
      reference: {
        label: link.label,
        relativePath: link.relativePath,
      },
    };
  }

  if (link.relativePath && workspace) {
    return {
      type: "open-external-link",
      href: createVsCodeDocHref(workspace, link.relativePath),
    };
  }

  if (link.href) {
    return {
      type: "open-external-link",
      href: link.href,
    };
  }

  return null;
}

function readLinkSearchText(link: GraphDetailLink) {
  return [
    link.label,
    link.href,
    link.relativePath ?? "",
    link.kind,
    ...(link.searchNames ?? []),
  ];
}

function buildSearchText(
  node: DashboardSurfaceNode,
  ancestors: DashboardSurfaceNode[]
) {
  return [
    ...ancestors.flatMap((ancestor) => [
      ancestor.label,
      ancestor.description,
      ...(ancestor.keywords ?? []),
    ]),
    node.label,
    node.description,
    ...(node.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function sortSurfaceNodes(nodes: DashboardSurfaceNode[]) {
  return [...nodes].sort((left, right) => {
    const order = (left.order ?? 0) - (right.order ?? 0);

    if (order !== 0) {
      return order;
    }

    return left.label.localeCompare(right.label);
  });
}

function findCurrentProject(
  codexProjects: CodexProjectReadResult,
  currentWorkspace: string
) {
  return codexProjects.projects.find(
    (project) =>
      project.path === currentWorkspace ||
      normalizePath(project.path) === normalizePath(currentWorkspace)
  );
}

function workspaceName(workspace: string) {
  const normalized = workspace.replace(/\/+$/, "");
  const name = normalized.split("/").filter(Boolean).pop();

  return name ?? "Current project";
}

function normalizePath(value: string) {
  return value.replace(/\/+$/, "");
}

function createVsCodeDocHref(workspace: string, relativePath: string) {
  const workspacePath = workspace.replace(/\/+$/, "");
  const docPath = `${workspacePath}/${relativePath}`;

  return `vscode://file${encodeURI(docPath)}`;
}
