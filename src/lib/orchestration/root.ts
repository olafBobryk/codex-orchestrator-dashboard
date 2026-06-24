import { stat } from "node:fs/promises";
import path from "node:path";

export const LEGACY_ORCHESTRATION_DIR = ".codex-orchestration";
export const DOCKED_ORCHESTRATION_RELATIVE_DIR = "docs/orchestration";
export const ORCHESTRATION_POINTER_RELATIVE_PATH = "docs/ORCHESTRATION.md";
export const SOURCE_STRATEGY_RELATIVE_DIR = "strategies/shape-strategy";
export const SHAPE_STRATEGY_MAP_FILENAME = "map.md";

export type OrchestrationRootKind =
  | "selected-root"
  | "docked"
  | "legacy"
  | "source-strategy";

export type OrchestrationRootResolution = {
  workspace: string;
  resolvedWorkspace: string;
  rootDir: string;
  relativePathFromWorkspace: string;
  kind: OrchestrationRootKind;
};

export async function resolveOrchestrationRoot(
  workspaceInput: string
): Promise<OrchestrationRootResolution | null> {
  const workspace = workspaceInput.trim();

  if (!workspace) {
    return null;
  }

  const resolvedWorkspace = path.resolve(/*turbopackIgnore: true*/ workspace);
  const candidates: Array<{
    rootDir: string;
    relativePathFromWorkspace: string;
    kind: OrchestrationRootKind;
  }> = [
    {
      rootDir: resolvedWorkspace,
      relativePathFromWorkspace: "",
      kind: "selected-root",
    },
    {
      rootDir: path.join(
        /*turbopackIgnore: true*/ resolvedWorkspace,
        DOCKED_ORCHESTRATION_RELATIVE_DIR
      ),
      relativePathFromWorkspace: DOCKED_ORCHESTRATION_RELATIVE_DIR,
      kind: "docked",
    },
    {
      rootDir: path.join(
        /*turbopackIgnore: true*/ resolvedWorkspace,
        LEGACY_ORCHESTRATION_DIR
      ),
      relativePathFromWorkspace: LEGACY_ORCHESTRATION_DIR,
      kind: "legacy",
    },
    {
      rootDir: path.join(
        /*turbopackIgnore: true*/ resolvedWorkspace,
        LEGACY_ORCHESTRATION_DIR,
        SOURCE_STRATEGY_RELATIVE_DIR
      ),
      relativePathFromWorkspace: `${LEGACY_ORCHESTRATION_DIR}/${SOURCE_STRATEGY_RELATIVE_DIR}`,
      kind: "source-strategy",
    },
  ];

  for (const candidate of candidates) {
    if (await isOrchestrationRoot(candidate.rootDir)) {
      return {
        workspace,
        resolvedWorkspace,
        ...candidate,
      };
    }
  }

  return null;
}

export function createWorkspaceRelativePath(
  resolution: Pick<OrchestrationRootResolution, "relativePathFromWorkspace">,
  relativePath: string
) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (!resolution.relativePathFromWorkspace) {
    return normalized;
  }

  return `${resolution.relativePathFromWorkspace}/${normalized}`;
}

export function stripOrchestrationRootPrefix(
  resolution: Pick<OrchestrationRootResolution, "relativePathFromWorkspace">,
  relativePath: string
) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (!resolution.relativePathFromWorkspace) {
    return normalized;
  }

  return normalized.replace(
    new RegExp(`^${escapeRegExp(resolution.relativePathFromWorkspace)}/`),
    ""
  );
}

async function isOrchestrationRoot(rootDir: string) {
  try {
    const [directory, mapFile] = await Promise.all([
      stat(/*turbopackIgnore: true*/ rootDir),
      stat(
        /*turbopackIgnore: true*/ path.join(rootDir, SHAPE_STRATEGY_MAP_FILENAME)
      ),
    ]);

    return directory.isDirectory() && mapFile.isFile();
  } catch {
    return false;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
