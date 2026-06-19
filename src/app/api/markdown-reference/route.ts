import { NextRequest } from "next/server";
import { readMarkdownReference } from "@/lib/orchestration/markdown-reference";
import {
  createPublicDemoDisabledResponse,
  isPublicDemoMode,
} from "@/lib/demo/public-demo-mode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (isPublicDemoMode()) {
    return createPublicDemoDisabledResponse();
  }

  const workspace = request.nextUrl.searchParams.get("workspace") ?? "";
  const relativePath = request.nextUrl.searchParams.get("path") ?? "";

  if (!workspace.trim() || !relativePath.trim()) {
    return Response.json(
      {
        state: "unavailable",
        relativePath,
        message: "A workspace and Markdown path are required.",
      },
      { status: 400 }
    );
  }

  const result = await readMarkdownReference({ workspace, relativePath });

  return Response.json(result, {
    status: result.state === "ready" ? 200 : 404,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
