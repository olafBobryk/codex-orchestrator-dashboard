import type { CodexProjectReadResult } from "@/lib/codex/projects";
import type { DashboardMode } from "../dashboard-mode";
import type { CanvasLayoutMode } from "../canvas/layout-mode";

export type WorkspaceSidebarProps = {
  codexProjects: CodexProjectReadResult;
  dashboardMode?: DashboardMode;
  layoutMode?: CanvasLayoutMode;
  workspace: string;
  resolvedWorkspace: string | null;
  onOpenCommand?: () => void;
  commandOpen?: boolean;
};
