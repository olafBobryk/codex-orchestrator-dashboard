import { existsSync, watch, type FSWatcher } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  createPublicDemoDisabledResponse,
  isPublicDemoMode,
} from "@/lib/demo/public-demo-mode";
import { resolveOrchestrationRoot } from "@/lib/orchestration/root";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REFRESH_DEBOUNCE_MS = 500;
const REFRESH_FILE_EXTENSIONS = new Set([".json", ".md"]);
const IGNORED_REFRESH_PATH_PREFIXES = [
  "service/",
];

export async function GET(request: NextRequest) {
  if (isPublicDemoMode()) {
    return createPublicDemoDisabledResponse();
  }

  const workspace = request.nextUrl.searchParams.get("workspace") ?? "";
  const workspacePath = path.resolve(/*turbopackIgnore: true*/ workspace);
  const orchestrationRoot = await resolveOrchestrationRoot(workspacePath);
  const orchestrationPath = orchestrationRoot?.rootDir;

  if (!workspace.trim() || !orchestrationPath || !existsSync(orchestrationPath)) {
    return Response.json(
      {
        state: "unavailable",
        message: "No orchestration root could be watched.",
      },
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();
  let watcher: FSWatcher | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: Record<string, string>) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };
      const scheduleRefresh = (filename: string | null) => {
        if (shouldIgnoreRefreshPath(filename)) {
          return;
        }

        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }

        refreshTimer = setTimeout(() => {
          send("changed", {
            path: filename ?? orchestrationRoot.relativePathFromWorkspace,
          });
        }, REFRESH_DEBOUNCE_MS);
      };

      send("ready", { path: orchestrationRoot.relativePathFromWorkspace });

      try {
        watcher = watch(
          /*turbopackIgnore: true*/ orchestrationPath,
          { recursive: true },
          (_eventType, filename) => {
            scheduleRefresh(filename?.toString() ?? null);
          }
        );
      } catch {
        watcher = watch(
          /*turbopackIgnore: true*/ orchestrationPath,
          (_eventType, filename) => {
            scheduleRefresh(filename?.toString() ?? null);
          }
        );
      }

      request.signal.addEventListener("abort", () => {
        if (refreshTimer) {
          clearTimeout(refreshTimer);
        }

        watcher?.close();
        controller.close();
      });
    },
    cancel() {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      watcher?.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}

function shouldIgnoreRefreshPath(filename: string | null) {
  if (!filename) {
    return true;
  }

  const normalized = filename.replaceAll(path.sep, "/");

  if (
    IGNORED_REFRESH_PATH_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix)
    )
  ) {
    return true;
  }

  const extension = path.extname(normalized).toLowerCase();

  return !REFRESH_FILE_EXTENSIONS.has(extension);
}
