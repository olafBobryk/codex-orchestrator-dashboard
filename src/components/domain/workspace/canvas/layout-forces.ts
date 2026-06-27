import { installLaneGraphForces } from "./lane-forces";
import type { CanvasLayoutMode } from "./layout-mode";
import { installGraphForces as installPhysicsGraphForces } from "./physics";
import type { CanvasLink, CanvasRegion, GraphMethods } from "./types";

export function installCanvasLayoutForces({
	instance,
	layoutMode,
	links,
	regions,
}: {
	instance: GraphMethods;
	layoutMode: CanvasLayoutMode;
	links: CanvasLink[];
	regions: CanvasRegion[];
}) {
	if (layoutMode === "lanes") {
		return installLaneGraphForces({ instance, links, regions });
	}

	return installPhysicsGraphForces({ instance, regions });
}
