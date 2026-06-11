import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export type CodexLiveThread = {
  id: string;
  cwd: string;
  title: string;
  agentName: string | null;
  agentRole: string | null;
  threadSource: string | null;
  status: "open" | "archived" | "unknown";
  updatedAt: string | null;
};

export type CodexLiveThreadsResult = {
  state: "ready" | "missing_db" | "sqlite_missing" | "error";
  sourcePath: string;
  message: string;
  threads: CodexLiveThread[];
  counts: {
    active: number;
    agents: number;
  };
};

export type CodexThreadActivity = {
  unread: boolean;
  working: boolean;
  status: CodexLiveThread["status"] | "missing";
  updatedAt: string | null;
};

type SqliteThreadRow = {
  id?: unknown;
  cwd?: unknown;
  title?: unknown;
  agent_nickname?: unknown;
  agent_role?: unknown;
  thread_source?: unknown;
  archived?: unknown;
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

const ACTIVE_THREADS_SQL = `
SELECT
  id,
  cwd,
  title,
  agent_nickname,
  agent_role,
  thread_source,
  archived,
  updated_at_ms
FROM threads
WHERE archived = 0
ORDER BY updated_at_ms DESC
LIMIT 250;
`;

const THREADS_BY_ID_BASE_SQL = `
SELECT
  id,
  cwd,
  title,
  agent_nickname,
  agent_role,
  thread_source,
  archived,
  updated_at_ms
FROM threads
`;

export async function readCodexLiveThreads(
  workspace: string | null | undefined
): Promise<CodexLiveThreadsResult> {
  const selectedWorkspace = (workspace ?? "").trim();

  if (!selectedWorkspace) {
    return liveThreadResult({
      state: "ready",
      message: "Select a workspace to see active Codex threads.",
      threads: [],
    });
  }

  try {
    const { stdout } = await execFileAsync("sqlite3", [
      "-json",
      CODEX_STATE_DB_PATH,
      ACTIVE_THREADS_SQL,
    ]);
    const rows: unknown = JSON.parse(stdout || "[]");

    if (!Array.isArray(rows)) {
      return liveThreadResult({
        state: "error",
        message: "Codex thread state returned an unexpected shape.",
        threads: [],
      });
    }

    const threads = rows
      .map(readThreadRow)
      .filter((thread): thread is CodexLiveThread => Boolean(thread))
      .filter((thread) => thread.cwd === selectedWorkspace);

    return liveThreadResult({
      state: "ready",
      message:
        threads.length > 0
          ? "Active Codex threads for this project."
          : "No active Codex threads found for this project.",
      threads,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return liveThreadResult({
        state: "sqlite_missing",
        message: "The sqlite3 command is not available.",
        threads: [],
      });
    }

    const message = error instanceof Error ? error.message : "";

    if (message.includes("unable to open database file")) {
      return liveThreadResult({
        state: "missing_db",
        message: "No Codex thread database was found.",
        threads: [],
      });
    }

    return liveThreadResult({
      state: "error",
      message: message || "Unable to read Codex active thread state.",
      threads: [],
    });
  }
}

export async function readCodexThreadAnnotations(
  threadIds: string[]
): Promise<CodexLiveThreadsResult> {
  const safeThreadIds = [...new Set(threadIds)]
    .map((threadId) => threadId.trim())
    .filter((threadId) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        threadId
      )
    );

  if (safeThreadIds.length === 0) {
    return liveThreadResult({
      state: "ready",
      message: "No recorded Codex thread IDs were found in Markdown.",
      threads: [],
    });
  }

  const quotedIds = safeThreadIds.map((threadId) => `'${threadId}'`).join(",");

  try {
    const { stdout } = await execFileAsync("sqlite3", [
      "-json",
      CODEX_STATE_DB_PATH,
      `${THREADS_BY_ID_BASE_SQL} WHERE id IN (${quotedIds});`,
    ]);
    const rows: unknown = JSON.parse(stdout || "[]");

    if (!Array.isArray(rows)) {
      return liveThreadResult({
        state: "error",
        message: "Codex thread annotation state returned an unexpected shape.",
        threads: [],
      });
    }

    const threads = rows
      .map(readThreadRow)
      .filter((thread): thread is CodexLiveThread => Boolean(thread));

    return liveThreadResult({
      state: "ready",
      message:
        threads.length > 0
          ? "Recorded Codex thread annotations loaded."
          : "No recorded Codex thread IDs matched local runtime state.",
      threads,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return liveThreadResult({
        state: "sqlite_missing",
        message: "The sqlite3 command is not available.",
        threads: [],
      });
    }

    const message = error instanceof Error ? error.message : "";

    if (message.includes("unable to open database file")) {
      return liveThreadResult({
        state: "missing_db",
        message: "No Codex thread database was found.",
        threads: [],
      });
    }

    return liveThreadResult({
      state: "error",
      message: message || "Unable to read recorded Codex thread annotations.",
      threads: [],
    });
  }
}

export async function readCodexThreadActivity(threadIds: string[]) {
  const safeThreadIds = normalizeThreadIds(threadIds);
  const activity = new Map<string, CodexThreadActivity>(
    safeThreadIds.map((threadId) => [
      threadId,
      {
        unread: false,
        working: false,
        status: "missing",
        updatedAt: null,
      },
    ])
  );

  if (safeThreadIds.length === 0) {
    return activity;
  }

  const [annotations, unreadThreadIds, workingThreadIds] = await Promise.all([
    readCodexThreadAnnotations(safeThreadIds),
    readCodexUnreadThreadIds(),
    readRecentWorkingThreadIds(),
  ]);
  const unread = new Set(unreadThreadIds);
  const working = new Set(workingThreadIds);

  for (const thread of annotations.threads) {
    activity.set(thread.id, {
      unread: unread.has(thread.id),
      working: thread.status === "open" && working.has(thread.id),
      status: thread.status,
      updatedAt: thread.updatedAt,
    });
  }

  return activity;
}

function liveThreadResult({
  state,
  message,
  threads,
}: {
  state: CodexLiveThreadsResult["state"];
  message: string;
  threads: CodexLiveThread[];
}): CodexLiveThreadsResult {
  return {
    state,
    sourcePath: CODEX_STATE_DB_PATH,
    message,
    threads,
    counts: {
      active: threads.length,
      agents: threads.filter(isAgentThread).length,
    },
  };
}

function readThreadRow(row: SqliteThreadRow): CodexLiveThread | null {
  if (
    typeof row.id !== "string" ||
    typeof row.cwd !== "string" ||
    typeof row.title !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    cwd: row.cwd,
    title: cleanThreadTitle(row.title),
    agentName:
      typeof row.agent_nickname === "string" && row.agent_nickname.trim()
        ? row.agent_nickname.trim()
        : null,
    agentRole:
      typeof row.agent_role === "string" && row.agent_role.trim()
        ? row.agent_role.trim()
        : null,
    threadSource:
      typeof row.thread_source === "string" && row.thread_source.trim()
        ? row.thread_source.trim()
        : null,
    status:
      typeof row.archived === "number"
        ? row.archived === 1
          ? "archived"
          : "open"
        : "unknown",
    updatedAt:
      typeof row.updated_at_ms === "number"
        ? new Date(row.updated_at_ms).toISOString()
        : null,
  };
}

function normalizeThreadIds(threadIds: string[]) {
  return [...new Set(threadIds)]
    .map((threadId) => threadId.trim())
    .filter(isCodexThreadId);
}

function isCodexThreadId(threadId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    threadId
  );
}

async function readCodexUnreadThreadIds() {
  try {
    const content = await readFile(CODEX_GLOBAL_STATE_PATH, "utf8");
    const parsedValue: unknown = JSON.parse(content);

    if (!parsedValue || typeof parsedValue !== "object") {
      return [];
    }

    const persistedState = (
      parsedValue as Record<string, unknown>
    )["electron-persisted-atom-state"];

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
        if (typeof item === "string" && isCodexThreadId(item.trim())) {
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
      .filter(isCodexThreadId);
  } catch {
    return [];
  }
}

function isAgentThread(thread: CodexLiveThread) {
  return Boolean(thread.agentName) || thread.threadSource === "subagent";
}

function cleanThreadTitle(title: string) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const packetMatch = normalizedTitle.match(
    /for\s+(Packet\s+\d+:[^.<]+)/i
  );

  if (packetMatch?.[1]) {
    return truncate(packetMatch[1], 96);
  }

  const withoutTags = normalizedTitle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const cleaned = withoutTags.trim() || "Untitled active thread";

  return truncate(cleaned, 96);
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}
