import type { MouseEvent as ReactMouseEvent } from "react";

export function readGraphEventPoint(
  event: MouseEvent | ReactMouseEvent<HTMLDivElement>,
  container: HTMLDivElement | null
) {
  if ("nativeEvent" in event) {
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  if (
    typeof event.offsetX === "number" &&
    typeof event.offsetY === "number"
  ) {
    return {
      x: event.offsetX,
      y: event.offsetY,
    };
  }

  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
