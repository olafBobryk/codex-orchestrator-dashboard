import type { Force } from "d3-force";
import { forceCollide, forceManyBody, forceX, forceY } from "d3-force";
import type { CanvasLink, CanvasNode, CanvasRegion, GraphMethods } from "./types";

const LANE_ATTRACTION_X_STRENGTH = 0.086;
const LANE_ATTRACTION_Y_STRENGTH = 0.105;
const LANE_COLLISION_PADDING = 78;
const LANE_CHARGE_DISTANCE_MAX = 620;
const LANE_STRUCTURAL_LINK_STRENGTH = 0.052;
const LANE_STRUCTURAL_LINK_DISTANCE = 360;
const LANE_WEAK_LINK_STRENGTH = 0.006;
const LANE_WEAK_LINK_DISTANCE = 420;
const LANE_AMBIENT_LINK_STRENGTH = 0;
const LANE_AMBIENT_LINK_DISTANCE = 460;
const LANE_REGION_COHESION_STRENGTH = 0.045;
const LANE_REGION_COHESION_MAX_NODES = 10;
const LANE_REGION_COHESION_MIN_NODES = 2;

export function installLaneGraphForces({
	instance,
	links,
	regions,
}: {
	instance: GraphMethods;
	links: CanvasLink[];
	regions: CanvasRegion[];
}) {
	instance.d3Force("laneX", null);
	instance.d3Force("chronologyY", null);
	instance.d3Force("linkTension", null);
	instance.d3Force("timelineSeparation", null);
	instance.d3Force("regionAxis", null);
	instance.d3Force("edgeCrossing", null);
	instance.d3Force("regionCohesion", null);
	instance.d3Force("center", null);
	instance.d3Force("link", null);
	instance.d3Force("regionSeparation", null);
	instance.d3Force("gravityY", null);
	instance.d3Force("linkTension", createLinkTensionForce(links));
	instance.d3Force("regionCohesion", createLaneRegionCohesionForce(regions));
	instance.d3Force(
		"collide",
		forceCollide<CanvasNode>(
			(node) => node.visualRadius + LANE_COLLISION_PADDING,
		)
			.strength(0.9)
			.iterations(3),
	);
	instance.d3Force(
		"charge",
		forceManyBody<CanvasNode>()
			.strength((node) => (node.primary ? -90 : -62))
			.distanceMax(LANE_CHARGE_DISTANCE_MAX),
	);
	instance.d3Force(
		"laneX",
		forceX<CanvasNode>((node) => node.guideX).strength(
			LANE_ATTRACTION_X_STRENGTH,
		),
	);
	instance.d3Force(
		"chronologyY",
		forceY<CanvasNode>((node) => node.guideY).strength(
			LANE_ATTRACTION_Y_STRENGTH,
		),
	);
	instance.d3ReheatSimulation();
}

function createLaneRegionCohesionForce(
	regions: CanvasRegion[],
): Force<CanvasNode, undefined> {
	const regionNodeIds = regions
		.map((region) => [...new Set(region.nodeIds)])
		.filter(
			(nodeIds) =>
				nodeIds.length >= LANE_REGION_COHESION_MIN_NODES &&
				nodeIds.length <= LANE_REGION_COHESION_MAX_NODES,
		);
	let nodesById = new Map<string, CanvasNode>();

	const force: Force<CanvasNode, undefined> = (alpha) => {
		for (const nodeIds of regionNodeIds) {
			const regionNodes = nodeIds
				.map((nodeId) => nodesById.get(nodeId))
				.filter((node): node is CanvasNode => Boolean(node));

			if (regionNodes.length < LANE_REGION_COHESION_MIN_NODES) {
				continue;
			}

			const centroidX =
				regionNodes.reduce((sum, node) => sum + (node.x ?? node.guideX), 0) /
				regionNodes.length;
			const centroidY =
				regionNodes.reduce((sum, node) => sum + (node.y ?? node.guideY), 0) /
				regionNodes.length;
			const strength = LANE_REGION_COHESION_STRENGTH * alpha;

			for (const node of regionNodes) {
				node.vx =
					(node.vx ?? 0) + (centroidX - (node.x ?? node.guideX)) * strength;
				node.vy =
					(node.vy ?? 0) + (centroidY - (node.y ?? node.guideY)) * strength;
			}
		}
	};

	force.initialize = (initializedNodes) => {
		nodesById = new Map(initializedNodes.map((node) => [node.id, node]));
	};

	return force;
}

function createLinkTensionForce(
	links: CanvasLink[],
): Force<CanvasNode, undefined> {
	let nodesById = new Map<string, CanvasNode>();

	const force: Force<CanvasNode, undefined> = (alpha) => {
		for (const link of links) {
			const config = getLaneLinkForceConfig(link);

			if (config.strength <= 0) {
				continue;
			}

			const source = getLinkForceNode(link.source, nodesById);
			const target = getLinkForceNode(link.target, nodesById);

			if (!source || !target || source.id === target.id) {
				continue;
			}

			const dx = (target.x ?? target.guideX) - (source.x ?? source.guideX);
			const dy = (target.y ?? target.guideY) - (source.y ?? source.guideY);
			const distance = Math.hypot(dx, dy) || 1;
			const pull =
				((distance - config.distance) / distance) * config.strength * alpha;
			const pushX = dx * pull;
			const pushY = dy * pull;

			source.vx = (source.vx ?? 0) + pushX;
			source.vy = (source.vy ?? 0) + pushY;
			target.vx = (target.vx ?? 0) - pushX;
			target.vy = (target.vy ?? 0) - pushY;
		}
	};

	force.initialize = (initializedNodes) => {
		nodesById = new Map(initializedNodes.map((node) => [node.id, node]));
	};

	return force;
}

function getLaneLinkForceConfig(link: CanvasLink) {
	if (link.physicsMode === "ambient") {
		return {
			strength: LANE_AMBIENT_LINK_STRENGTH,
			distance: LANE_AMBIENT_LINK_DISTANCE,
		};
	}

	if (link.physicsMode === "weak") {
		return {
			strength: LANE_WEAK_LINK_STRENGTH,
			distance: LANE_WEAK_LINK_DISTANCE,
		};
	}

	return {
		strength: LANE_STRUCTURAL_LINK_STRENGTH,
		distance: LANE_STRUCTURAL_LINK_DISTANCE,
	};
}

function getLinkForceNode(
	value: unknown,
	nodesById: Map<string, CanvasNode>,
) {
	if (typeof value === "string") {
		return nodesById.get(value);
	}

	if (isCanvasNodeReference(value)) {
		return nodesById.get(value.id) ?? value;
	}

	return null;
}

function isCanvasNodeReference(value: unknown): value is CanvasNode {
	return Boolean(
		value &&
			typeof value === "object" &&
			"id" in value &&
			typeof value.id === "string",
	);
}
