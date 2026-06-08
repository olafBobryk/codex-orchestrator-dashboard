import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ORCHESTRATION_DIR } from "@/lib/orchestration";

export type CodexProject = {
  path: string;
  name: string;
  isActive: boolean;
  order: number;
  state: "ready" | "missing_docs" | "missing_directory";
};

export type CodexProjectReadResult = {
  state: "ready" | "missing_file" | "invalid_file" | "error";
  sourcePath: string;
  message: string;
  projects: CodexProject[];
  counts: {
    projects: number;
    ready: number;
    active: number;
  };
};

type CodexGlobalState = {
  "electron-saved-workspace-roots"?: unknown;
  "active-workspace-roots"?: unknown;
  "project-order"?: unknown;
};

const CODEX_GLOBAL_STATE_PATH = path.join(
  os.homedir(),
  ".codex",
  ".codex-global-state.json"
);

export async function readCodexProjects(): Promise<CodexProjectReadResult> {
  try {
    const content = await readFile(CODEX_GLOBAL_STATE_PATH, "utf8");
    const parsedValue: unknown = JSON.parse(content);

    if (!isCodexGlobalState(parsedValue)) {
      return codexProjectResult({
        state: "invalid_file",
        message: "Codex project state exists but does not match the expected shape.",
        projects: [],
      });
    }

    const savedRoots = normalizePaths(
      parsedValue["electron-saved-workspace-roots"]
    );
    const activeRoots = new Set(
      normalizePaths(parsedValue["active-workspace-roots"])
    );
    const projectOrder = normalizePaths(parsedValue["project-order"]);
    const orderedRoots = mergeOrderedRoots(projectOrder, savedRoots);
    const projects = await Promise.all(
      orderedRoots.map(async (projectPath, index) => ({
        path: projectPath,
        name: workspaceName(projectPath),
        isActive: activeRoots.has(projectPath),
        order: index,
        state: await readProjectState(projectPath),
      }))
    );

    return codexProjectResult({
      state: "ready",
      message:
        projects.length > 0
          ? "Loaded read-only Codex local projects."
          : "Codex project state is present, but no workspace roots were found.",
      projects,
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;

    if (code === "ENOENT") {
      return codexProjectResult({
        state: "missing_file",
        message: "No Codex local project state file was found.",
        projects: [],
      });
    }

    return codexProjectResult({
      state: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to read Codex local project state.",
      projects: [],
    });
  }
}

function codexProjectResult({
  state,
  message,
  projects,
}: {
  state: CodexProjectReadResult["state"];
  message: string;
  projects: CodexProject[];
}): CodexProjectReadResult {
  return {
    state,
    sourcePath: CODEX_GLOBAL_STATE_PATH,
    message,
    projects,
    counts: {
      projects: projects.length,
      ready: projects.filter((project) => project.state === "ready").length,
      active: projects.filter((project) => project.isActive).length,
    },
  };
}

function isCodexGlobalState(value: unknown): value is CodexGlobalState {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePaths(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const paths: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const projectPath = item.trim();

    if (!projectPath || seen.has(projectPath)) {
      continue;
    }

    seen.add(projectPath);
    paths.push(projectPath);
  }

  return paths;
}

function mergeOrderedRoots(projectOrder: string[], savedRoots: string[]) {
  const seen = new Set<string>();
  const orderedRoots: string[] = [];

  for (const projectPath of [...projectOrder, ...savedRoots]) {
    if (seen.has(projectPath)) {
      continue;
    }

    seen.add(projectPath);
    orderedRoots.push(projectPath);
  }

  return orderedRoots;
}

async function readProjectState(
  projectPath: string
): Promise<CodexProject["state"]> {
  try {
    const workspace = await stat(projectPath);

    if (!workspace.isDirectory()) {
      return "missing_directory";
    }
  } catch {
    return "missing_directory";
  }

  try {
    const orchestrationDirectory = await stat(
      path.join(projectPath, ORCHESTRATION_DIR)
    );

    return orchestrationDirectory.isDirectory() ? "ready" : "missing_docs";
  } catch {
    return "missing_docs";
  }
}

function workspaceName(workspace: string) {
  return workspace.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace;
}
