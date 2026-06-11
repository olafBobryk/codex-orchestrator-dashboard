import { DEFAULT_CANVAS_THEME } from "./constants";
import type { CanvasTheme } from "./types";

export function readCanvasTheme(): CanvasTheme {
  if (typeof window === "undefined") {
    return DEFAULT_CANVAS_THEME;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const cssVar = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    surface: cssVar("--card", DEFAULT_CANVAS_THEME.surface),
    surfaceForeground: cssVar(
      "--card-foreground",
      DEFAULT_CANVAS_THEME.surfaceForeground
    ),
  };
}
