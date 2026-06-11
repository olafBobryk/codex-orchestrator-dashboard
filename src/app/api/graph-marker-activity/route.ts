import { readShapeStrategyMarkerActivity } from "@/lib/shape-strategy-adapter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get("workspace")?.trim();

  if (!workspace) {
    return Response.json(
      {
        state: "missing_workspace",
        markers: [],
        refreshedAt: new Date().toISOString(),
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const activity = await readShapeStrategyMarkerActivity(workspace);

  return Response.json(
    {
      ...activity,
      refreshedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
