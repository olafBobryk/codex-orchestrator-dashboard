import { execFile } from "node:child_process";
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

type SqliteThreadRow = {
  id?: unknown;
  cwd?: unknown;
  title?: unknown;
  agent_nickname?: unknown;
  agent_role?: unknown;
  thread_source?: unknown;
  updated_at_ms?: unknown;
};

const execFileAsync = promisify(execFile);
const CODEX_STATE_DB_PATH = path.join(os.homedir(), ".codex", "state_5.sqlite");

const ACTIVE_THREADS_SQL = `
SELECT
  id,
  cwd,
  title,
  agent_nickname,
  agent_role,
  thread_source,
  updated_at_ms
FROM threads
WHERE archived = 0
ORDER BY updated_at_ms DESC
LIMIT 250;
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
    updatedAt:
      typeof row.updated_at_ms === "number"
        ? new Date(row.updated_at_ms).toISOString()
        : null,
  };
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
