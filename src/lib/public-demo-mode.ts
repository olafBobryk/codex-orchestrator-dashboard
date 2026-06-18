export function isPublicDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO === "true";
}

export function createPublicDemoDisabledResponse() {
  return Response.json(
    {
      state: "disabled",
      message: "This local-only endpoint is disabled in public demo mode.",
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
