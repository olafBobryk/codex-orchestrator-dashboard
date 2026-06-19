import type { CodexProjectReadResult } from "@/lib/codex/projects";
import type { DashboardMode } from "../dashboard-mode";

export type WorkspaceSidebarProps = {
  codexProjects: CodexProjectReadResult;
  dashboardMode?: DashboardMode;
  workspace: string;
  resolvedWorkspace: string | null;
  onOpenCommand?: () => void;
  commandOpen?: boolean;
};
