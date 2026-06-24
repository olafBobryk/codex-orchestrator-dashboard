import {
  readCodexThreadAnnotations,
  readCodexLiveThreads,
  type CodexLiveThread,
} from "@/lib/codex/threads";
import { readGitWorktreeAnnotations } from "@/lib/git/worktree";
import { readWorkspace } from "@/lib/orchestration/workspace";
import {
  buildOrchestrationGraph,
  getPrimaryChunkIds,
  getRecordedThreadIds,
} from "@/lib/graph/orchestration-graph";

export function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function buildMarkdownGraph(
  docs: Awaited<ReturnType<typeof readWorkspace>>["docs"],
  resolvedWorkspace: string,
  liveThreads: Awaited<ReturnType<typeof readCodexLiveThreads>>
) {
  const baseGraph = buildOrchestrationGraph(docs);
  const [recordedThreads, gitWorktree] = await Promise.all([
    readCodexThreadAnnotations(getRecordedThreadIds(baseGraph)),
    readGitWorktreeAnnotations(resolvedWorkspace, getPrimaryChunkIds(baseGraph)),
  ]);

  return buildOrchestrationGraph(docs, {
    runtimeThreads: mergeThreads(liveThreads.threads, recordedThreads.threads),
    gitWorktreeAnnotations: gitWorktree.annotations,
  });
}

function mergeThreads(
  liveThreads: CodexLiveThread[],
  recordedThreads: CodexLiveThread[]
) {
  const threadsById = new Map<string, CodexLiveThread>();

  for (const thread of [...recordedThreads, ...liveThreads]) {
    threadsById.set(thread.id, thread);
  }

  return [...threadsById.values()];
}
