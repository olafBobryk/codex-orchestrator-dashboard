export type DashboardMode = "local" | "public-demo";

export function isPublicDemoDashboard(mode: DashboardMode) {
  return mode === "public-demo";
}
