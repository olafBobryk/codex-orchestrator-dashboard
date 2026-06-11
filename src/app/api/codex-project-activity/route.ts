import { readCodexProjectActivity } from "@/lib/codex-projects";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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
