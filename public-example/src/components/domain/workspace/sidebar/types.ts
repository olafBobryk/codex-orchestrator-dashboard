import type { CodexProjectReadResult } from "@/lib/codex-projects";

export type WorkspaceSidebarProps = {
  codexProjects: CodexProjectReadResult;
  workspace: string;
  resolvedWorkspace: string | null;
  onOpenCommand?: () => void;
  commandOpen?: boolean;
};
