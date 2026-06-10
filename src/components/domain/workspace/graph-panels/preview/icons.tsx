import {
  Archive,
  CircleDot,
  Eye,
  FileJson,
  Layers,
  Lock,
  Route,
  Split,
} from "lucide-react";

export function renderGraphPanelIcon(icon: string | null, className: string) {
  switch (icon) {
    case "archive":
      return <Archive className={className} />;
    case "eye":
      return <Eye className={className} />;
    case "file-json":
      return <FileJson className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "lock":
      return <Lock className={className} />;
    case "route":
      return <Route className={className} />;
    case "split":
      return <Split className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}
