import { NextResponse } from "next/server";
import {
  createPublicDemoDisabledResponse,
  isPublicDemoMode,
} from "@/lib/public-demo-mode";
import { readDashboardServiceStatus } from "@/lib/service-status";

export async function GET() {
  if (isPublicDemoMode()) {
    return createPublicDemoDisabledResponse();
  }

  return NextResponse.json(await readDashboardServiceStatus());
}
