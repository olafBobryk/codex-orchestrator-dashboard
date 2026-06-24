import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { GitWorktreeAnnotation } from "@/lib/graph/orchestration-graph";

export type GitWorktreeReadResult = {
  state: "ready" | "not_git" | "git_missing" | "error";
  message: string;
  annotations: Array<GitWorktreeAnnotation & { chunkId?: string }>;
  workspace: {
    root: string | null;
    branch: string | null;
    head: string | null;
    mainWorktree: string | null;
    sourceStatus: "source_of_truth" | "off_source_of_truth" | "unknown";
  };
};

type GitWorktreeEntry = {
  path: string;
  head: string | null;
  branch: string | null;
};

const execFileAsync = promisify(execFile);

export async function readGitWorktreeAnnotations(
  workspace: string | null | undefined,
  chunkIds: string[]
): Promise<GitWorktreeReadResult> {
  const selectedWorkspace = (workspace ?? "").trim();

  if (!selectedWorkspace) {
    return gitResult({
      state: "not_git",
      message: "Select a workspace to read Git worktree annotations.",
      annotations: [],
    });
  }

  try {
    const root = (
      await git(selectedWorkspace, ["rev-parse", "--show-toplevel"])
    ).trim();
    const [branchOutput, headOutput, worktreeOutput] = await Promise.all([
      git(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
      git(root, ["rev-parse", "--short=12", "HEAD"]),
      git(root, ["worktree", "list", "--porcelain"]),
    ]);
    const worktrees = parseWorktreeList(worktreeOutput);
    const mainWorktree = worktrees[0]?.path ?? root;
    const sourceStatus = classifySourceStatus(root, mainWorktree);
    const branch = normalizeBranch(branchOutput);
    const head = headOutput.trim() || null;
    const annotation: GitWorktreeAnnotation = {
      kind: "worktree",
      status: sourceStatus,
      label: `${branch ?? "detached"}${head ? ` @ ${head}` : ""}`,
      ref: head,
      path: root,
      sourceLayer: "git_worktree_annotation",
    };

    return gitResult({
      state: "ready",
      message:
        sourceStatus === "off_source_of_truth"
          ? "Selected workspace is an off-source Git worktree."
          : "Selected workspace Git worktree annotation loaded.",
      annotations: chunkIds.map((chunkId) => ({ ...annotation, chunkId })),
      workspace: {
        root,
        branch,
        head,
        mainWorktree,
        sourceStatus,
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return gitResult({
        state: "git_missing",
        message: "The git command is not available.",
        annotations: [],
      });
    }

    const message = error instanceof Error ? error.message : "";

    if (
      message.includes("not a git repository") ||
      message.includes("Not a git repository")
    ) {
      return gitResult({
        state: "not_git",
        message: "Selected workspace is not a Git worktree.",
        annotations: [],
      });
    }

    return gitResult({
      state: "error",
      message: message || "Unable to read Git worktree annotations.",
      annotations: [],
    });
  }
}

async function git(workspace: string, args: string[]) {
  const { stdout } = await execFileAsync("git", ["-C", workspace, ...args]);
  return stdout;
}

function parseWorktreeList(output: string) {
  const entries: GitWorktreeEntry[] = [];
  let current: GitWorktreeEntry | null = null;

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      if (current) {
        entries.push(current);
        current = null;
      }
      continue;
    }

    const [key, ...valueParts] = line.split(" ");
    const value = valueParts.join(" ").trim();

    if (key === "worktree") {
      if (current) {
        entries.push(current);
      }

      current = {
        path: value,
        head: null,
        branch: null,
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (key === "HEAD") {
      current.head = value.slice(0, 12);
    }

    if (key === "branch") {
      current.branch = value.replace(/^refs\/heads\//, "");
    }
  }

  if (current) {
    entries.push(current);
  }

  return entries;
}

function normalizeBranch(value: string) {
  const branch = value.trim();

  if (!branch || branch === "HEAD") {
    return null;
  }

  return branch;
}

function classifySourceStatus(root: string, mainWorktree: string) {
  const normalizedRoot = path.resolve(root);
  const normalizedMain = path.resolve(mainWorktree);

  if (normalizedRoot === normalizedMain) {
    return "source_of_truth";
  }

  return "off_source_of_truth";
}

function gitResult({
  state,
  message,
  annotations,
  workspace = {
    root: null,
    branch: null,
    head: null,
    mainWorktree: null,
    sourceStatus: "unknown" as const,
  },
}: {
  state: GitWorktreeReadResult["state"];
  message: string;
  annotations: Array<GitWorktreeAnnotation & { chunkId?: string }>;
  workspace?: GitWorktreeReadResult["workspace"];
}): GitWorktreeReadResult {
  return {
    state,
    message,
    annotations,
    workspace,
  };
}
