import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { ORCHESTRATION_DIR } from "@/lib/orchestration/workspace";

export type CodexProject = {
  path: string;
  name: string;
  isActive: boolean;
  order: number;
  state: "ready" | "missing_docs" | "missing_directory";
  activity: CodexProjectActivity;
};

export type CodexProjectActivity = {
  activeThreads: number;
  unreadThreads: number;
  workingAgentThreads: number;
  updatedAt: string | null;
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
  "electron-persisted-atom-state"?: unknown;
};

type CodexProjectActivityRow = {
  cwd?: unknown;
  active_threads?: unknown;
  updated_at_ms?: unknown;
};

const execFileAsync = promisify(execFile);
const RECENT_WORKING_ACTIVITY_SECONDS = 30;
const CODEX_GLOBAL_STATE_PATH = path.join(
  os.homedir(),
  ".codex",
  ".codex-global-state.json"
);
const CODEX_STATE_DB_PATH = path.join(os.homedir(), ".codex", "state_5.sqlite");
const CODEX_LOGS_DB_PATH = path.join(os.homedir(), ".codex", "logs_2.sqlite");

const PROJECT_ACTIVITY_SQL = `
SELECT
  cwd,
  SUM(CASE WHEN archived = 0 THEN 1 ELSE 0 END) AS active_threads,
  MAX(updated_at_ms) AS updated_at_ms
FROM threads
GROUP BY cwd;
`;

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
    const activityByProject = await readCodexProjectActivity();
    const projects = await Promise.all(
      orderedRoots.map(async (projectPath, index) => ({
        path: projectPath,
        name: workspaceName(projectPath),
        isActive: activeRoots.has(projectPath),
        order: index,
        state: await readProjectState(projectPath),
        activity: activityByProject.get(projectPath) ?? emptyProjectActivity(),
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

export async function readCodexProjectActivity() {
  try {
    const { stdout } = await execFileAsync("sqlite3", [
      "-json",
      CODEX_STATE_DB_PATH,
      PROJECT_ACTIVITY_SQL,
    ]);
    const rows: unknown = JSON.parse(stdout || "[]");

    if (!Array.isArray(rows)) {
      return new Map<string, CodexProjectActivity>();
    }

    const activity = new Map<string, CodexProjectActivity>();

    for (const row of rows) {
      const parsed = readProjectActivityRow(row);

      if (parsed) {
        activity.set(parsed.cwd, parsed.activity);
      }
    }

    const [unreadThreadIds, workingThreadIds] = await Promise.all([
      readCodexUnreadThreadIds(),
      readRecentWorkingThreadIds(),
    ]);
    const [unreadCounts, workingCounts] = await Promise.all([
      readThreadCountsByProject(unreadThreadIds),
      readThreadCountsByProject(workingThreadIds),
    ]);

    applyProjectCount(activity, unreadCounts, "unreadThreads");
    applyProjectCount(activity, workingCounts, "workingAgentThreads");

    return activity;
  } catch {
    return new Map<string, CodexProjectActivity>();
  }
}

async function readCodexUnreadThreadIds() {
  try {
    const content = await readFile(CODEX_GLOBAL_STATE_PATH, "utf8");
    const parsedValue: unknown = JSON.parse(content);

    if (!isCodexGlobalState(parsedValue)) {
      return [];
    }

    const persistedState = parsedValue["electron-persisted-atom-state"];

    if (!persistedState || typeof persistedState !== "object") {
      return [];
    }

    const unreadByHost = (
      persistedState as Record<string, unknown>
    )["unread-thread-ids-by-host-v1"];

    if (!unreadByHost || typeof unreadByHost !== "object") {
      return [];
    }

    const ids = new Set<string>();

    for (const value of Object.values(unreadByHost)) {
      if (!Array.isArray(value)) {
        continue;
      }

      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          ids.add(item.trim());
        }
      }
    }

    return [...ids];
  } catch {
    return [];
  }
}

async function readRecentWorkingThreadIds() {
  try {
    const sinceSeconds =
      Math.floor(Date.now() / 1000) - RECENT_WORKING_ACTIVITY_SECONDS;
    const { stdout } = await execFileAsync("sqlite3", [
      "-json",
      CODEX_LOGS_DB_PATH,
      `
SELECT thread_id AS id
FROM logs
WHERE thread_id IS NOT NULL
  AND ts >= ${sinceSeconds}
GROUP BY thread_id;
`,
    ]);
    const rows: unknown = JSON.parse(stdout || "[]");

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) =>
        row &&
        typeof row === "object" &&
        "id" in row &&
        typeof row.id === "string"
          ? row.id.trim()
          : ""
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function readThreadCountsByProject(threadIds: string[]) {
  const ids = [...new Set(threadIds.filter(Boolean))];

  if (ids.length === 0) {
    return new Map<string, number>();
  }

  try {
    const { stdout } = await execFileAsync("sqlite3", [
      "-json",
      CODEX_STATE_DB_PATH,
      `
WITH selected_threads(id) AS (
  VALUES ${ids.map((id) => `(${quoteSqlString(id)})`).join(", ")}
)
SELECT threads.cwd, COUNT(*) AS thread_count
FROM selected_threads
JOIN threads ON threads.id = selected_threads.id
WHERE threads.archived = 0
GROUP BY threads.cwd;
`,
    ]);
    const rows: unknown = JSON.parse(stdout || "[]");

    if (!Array.isArray(rows)) {
      return new Map<string, number>();
    }

    const counts = new Map<string, number>();

    for (const row of rows) {
      if (!row || typeof row !== "object") {
        continue;
      }

      const cwd = "cwd" in row ? row.cwd : null;
      const threadCount = "thread_count" in row ? row.thread_count : null;

      if (typeof cwd === "string" && cwd.trim()) {
        counts.set(cwd, readInteger(threadCount));
      }
    }

    return counts;
  } catch {
    return new Map<string, number>();
  }
}

function applyProjectCount(
  activity: Map<string, CodexProjectActivity>,
  counts: Map<string, number>,
  key: "unreadThreads" | "workingAgentThreads"
) {
  for (const [projectPath, count] of counts) {
    const current = activity.get(projectPath) ?? emptyProjectActivity();

    activity.set(projectPath, {
      ...current,
      [key]: count,
    });
  }
}

function readProjectActivityRow(row: CodexProjectActivityRow) {
  if (typeof row.cwd !== "string" || !row.cwd.trim()) {
    return null;
  }

  return {
    cwd: row.cwd,
    activity: {
      activeThreads: readInteger(row.active_threads),
      unreadThreads: 0,
      workingAgentThreads: 0,
      updatedAt: readTimestamp(row.updated_at_ms),
    },
  };
}

function emptyProjectActivity(): CodexProjectActivity {
  return {
    activeThreads: 0,
    unreadThreads: 0,
    workingAgentThreads: 0,
    updatedAt: null,
  };
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function readTimestamp(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return new Date(value).toISOString();
}

function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function workspaceName(workspace: string) {
  return workspace.split(/[\\/]/).filter(Boolean).at(-1) ?? workspace;
}
