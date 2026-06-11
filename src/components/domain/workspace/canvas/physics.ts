import type { Force, ForceLink } from "d3-force";
import { forceCollide, forceManyBody, forceY } from "d3-force";
import type { GraphNodeChronology } from "@/lib/orchestration-graph";
import { GRAPH_VERTICAL_CENTER_Y } from "./constants";
import type { CanvasLink, CanvasNode, GraphMethods } from "./types";

const CHRONOLOGY_START_GUIDE_Y = GRAPH_VERTICAL_CENTER_Y - 700;
const COLLISION_PADDING = 32;
const REGION_BODY_PADDING = 72;
const REGION_BODY_SEPARATION_MULTIPLIER = 1.02;
const REGION_BODY_SEPARATION_STRENGTH = 0.055;
const GRAVITY_Y_STRENGTH = 0.24;
const CROSS_REGION_LINK_DISTANCE_MULTIPLIER = 1.9;
const CROSS_REGION_LINK_STRENGTH_MULTIPLIER = 0.38;

export function installGraphForces({
	instance,
}: {
	instance: GraphMethods;
}) {
	instance.d3Force("laneX", null);
	instance.d3Force("chronologyY", null);
	instance.d3Force("timelineSeparation", null);
	instance.d3Force("regionAxis", null);
	instance.d3Force("edgeCrossing", null);
	instance.d3Force("center", null);
	instance.d3Force(
		"collide",
		forceCollide<CanvasNode>((node) => node.visualRadius + COLLISION_PADDING)
			.strength(0.72)
			.iterations(2),
	);
	instance.d3Force(
		"charge",
		forceManyBody<CanvasNode>()
			.strength((node) => (node.primary ? -48 : -34))
			.distanceMax(520),
	);
	configureLinkForce(instance);
	instance.d3Force("regionSeparation", createRegionSeparationForce());
	instance.d3Force("gravityY", createGravityYForce());
	instance.d3ReheatSimulation();
}

function createGravityYForce() {
	return forceY<CanvasNode>((node) => node.guideY).strength((node) => {
		if (node.chronology === "start") {
			return 0;
		}

		return node.primary ? GRAVITY_Y_STRENGTH : GRAVITY_Y_STRENGTH * 0.78;
	});
}

function configureLinkForce(instance: GraphMethods) {
	const linkForce = instance.d3Force("link") as
		| ForceLink<CanvasNode, CanvasLink>
		| undefined;

	linkForce
		?.strength((link) => getLinkForceConfig(link).strength)
		.distance((link) => getLinkForceConfig(link).distance);
}

function getLinkForceConfig(link: CanvasLink) {
	const boundaryMultiplier = link.crossesRegionBoundary
		? {
				distance: CROSS_REGION_LINK_DISTANCE_MULTIPLIER,
				strength: CROSS_REGION_LINK_STRENGTH_MULTIPLIER,
			}
		: { distance: 1, strength: 1 };
	const applyBoundaryMultiplier = (config: {
		distance: number;
		strength: number;
	}) => ({
		distance: config.distance * boundaryMultiplier.distance,
		strength: config.strength * boundaryMultiplier.strength,
	});

	if (link.style === "dotted") {
		return applyBoundaryMultiplier({ strength: 0.018, distance: 430 });
	}

	if (link.style === "dashed") {
		return applyBoundaryMultiplier({ strength: 0.055, distance: 340 });
	}

	return applyBoundaryMultiplier({ strength: 0.2, distance: 220 });
}

export function getChronologyGuideY(chronology: GraphNodeChronology) {
	if (chronology === "start") {
		return CHRONOLOGY_START_GUIDE_Y;
	}

	return null;
}

type RegionBody = {
	id: string;
	nodes: CanvasNode[];
	nodeIds: Set<string>;
	x: number;
	y: number;
	radius: number;
};

function createRegionSeparationForce(): Force<CanvasNode, undefined> {
	let nodes: CanvasNode[] = [];

	const force: Force<CanvasNode, undefined> = (alpha) => {
		const regions = createRegionBodies(nodes);

		for (let leftIndex = 0; leftIndex < regions.length; leftIndex += 1) {
			const left = regions[leftIndex];

			for (
				let rightIndex = leftIndex + 1;
				rightIndex < regions.length;
				rightIndex += 1
			) {
				const right = regions[rightIndex];

				if (regionsShareNode(left, right)) {
					continue;
				}

				const fallback = getStableDirection(left.id, right.id);
				const dx = right.x - left.x || fallback.x;
				const dy = right.y - left.y || fallback.y;
				const distance = Math.hypot(dx, dy);
				const minimumDistance =
					(left.radius + right.radius) * REGION_BODY_SEPARATION_MULTIPLIER;

				if (distance >= minimumDistance) {
					continue;
				}

				const push =
					((minimumDistance - distance) / distance) *
					REGION_BODY_SEPARATION_STRENGTH *
					alpha;
				const pushX = dx * push;
				const pushY = dy * push;
				const totalMass = left.nodes.length + right.nodes.length;
				const leftShare = right.nodes.length / totalMass;
				const rightShare = left.nodes.length / totalMass;

				for (const node of left.nodes) {
					node.vx = (node.vx ?? 0) - pushX * leftShare;
					node.vy = (node.vy ?? 0) - pushY * leftShare;
				}

				for (const node of right.nodes) {
					node.vx = (node.vx ?? 0) + pushX * rightShare;
					node.vy = (node.vy ?? 0) + pushY * rightShare;
				}
			}
		}
	};

	force.initialize = (initializedNodes) => {
		nodes = initializedNodes;
	};

	return force;
}

function createRegionBodies(nodes: CanvasNode[]): RegionBody[] {
	const nodesByRegion = new Map<string, CanvasNode[]>();

	for (const node of nodes) {
		for (const regionId of node.regionIds) {
			const existing = nodesByRegion.get(regionId) ?? [];
			existing.push(node);
			nodesByRegion.set(regionId, existing);
		}
	}

	return [...nodesByRegion.entries()].flatMap(([id, regionNodes]) => {
		if (regionNodes.length === 0) {
			return [];
		}

		const x =
			regionNodes.reduce((sum, node) => sum + (node.x ?? 0), 0) /
			regionNodes.length;
		const y =
			regionNodes.reduce((sum, node) => sum + (node.y ?? 0), 0) /
			regionNodes.length;
		const radius = Math.max(
			...regionNodes.map((node) => {
				const dx = (node.x ?? 0) - x;
				const dy = (node.y ?? 0) - y;

				return Math.hypot(dx, dy) + node.visualRadius + REGION_BODY_PADDING;
			}),
		);

		return [
			{
				id,
				nodes: regionNodes,
				nodeIds: new Set(regionNodes.map((node) => node.id)),
				x,
				y,
				radius,
			},
		];
	});
}

function regionsShareNode(left: RegionBody, right: RegionBody) {
	for (const nodeId of left.nodeIds) {
		if (right.nodeIds.has(nodeId)) {
			return true;
		}
	}

	return false;
}

function getStableDirection(leftId: string, rightId: string) {
	let hash = 2166136261;
	const key = `${leftId}:${rightId}`;

	for (let index = 0; index < key.length; index += 1) {
		hash ^= key.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	const angle = ((hash >>> 0) / 4294967295) * Math.PI * 2;

	return {
		x: Math.cos(angle) || 0.001,
		y: Math.sin(angle) || 0.001,
	};
}
