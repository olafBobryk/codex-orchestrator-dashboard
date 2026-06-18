import { readCodexProjectActivity } from "@/lib/codex-projects";
import {
  createPublicDemoDisabledResponse,
  isPublicDemoMode,
} from "@/lib/public-demo-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (isPublicDemoMode()) {
    return createPublicDemoDisabledResponse();
  }

  const activity = await readCodexProjectActivity();

  return Response.json(
    {
      refreshedAt: new Date().toISOString(),
      activityByPath: Object.fromEntries(activity),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
