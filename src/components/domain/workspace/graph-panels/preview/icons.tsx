import {
  Archive,
  CheckCircle,
  CircleDot,
  Eye,
  FileJson,
  GitBranch,
  Layers,
  Link,
  Lock,
  Monitor,
  PanelRight,
  Route,
  Split,
  User,
  UserCog,
} from "lucide-react";

export function renderGraphPanelIcon(icon: string | null, className: string) {
  switch (icon) {
    case "archive":
      return <Archive className={className} />;
    case "check":
    case "check-circle":
      return <CheckCircle className={className} />;
    case "eye":
      return <Eye className={className} />;
    case "file-json":
      return <FileJson className={className} />;
    case "git-branch":
      return <GitBranch className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "link":
      return <Link className={className} />;
    case "lock":
      return <Lock className={className} />;
    case "monitor":
      return <Monitor className={className} />;
    case "panel-right":
      return <PanelRight className={className} />;
    case "route":
      return <Route className={className} />;
    case "split":
      return <Split className={className} />;
    case "user":
      return <User className={className} />;
    case "user-cog":
      return <UserCog className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}
