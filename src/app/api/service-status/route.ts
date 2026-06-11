import { NextResponse } from "next/server";
import { readDashboardServiceStatus } from "@/lib/service-status";

export async function GET() {
  return NextResponse.json(await readDashboardServiceStatus());
}
