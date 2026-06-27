export type CanvasLayoutMode = "lanes" | "physics";

export const DEFAULT_CANVAS_LAYOUT_MODE: CanvasLayoutMode = "lanes";

export function readCanvasLayoutMode(value: string | null | undefined) {
  return value === "physics" ? "physics" : DEFAULT_CANVAS_LAYOUT_MODE;
}
