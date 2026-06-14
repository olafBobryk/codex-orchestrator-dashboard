import type { Force, ForceLink } from "d3-force";
import { forceCollide, forceManyBody, forceY } from "d3-force";
import type { GraphNodeChronology } from "@/lib/orchestration-graph";
import { GRAPH_VERTICAL_CENTER_Y } from "./constants";
import type { CanvasLink, CanvasNode, CanvasRegion, GraphMethods } from "./types";

const CHRONOLOGY_START_GUIDE_Y = GRAPH_VERTICAL_CENTER_Y - 700;
const COLLISION_PADDING = 32;
const REGION_BODY_PADDING = 72;
const REGION_BODY_BASE_GAP = 112;
const REGION_BODY_DEPTH_GAP = 32;
const REGION_BODY_MIN_SEPARATION_STRENGTH = 0.06;
const REGION_BODY_OVERLAP_SEPARATION_STRENGTH = 0.135;
const REGION_BODY_SIZE_SEPARATION_STRENGTH = 0.028;
const REGION_BODY_MAX_SEPARATION_STRENGTH = 0.21;
const GRAVITY_Y_STRENGTH = 0.24;
const CROSS_REGION_LINK_DISTANCE_MULTIPLIER = 1.9;
const CROSS_REGION_LINK_STRENGTH_MULTIPLIER = 0.38;

export function installGraphForces({
	instance,
	regions,
}: {
	instance: GraphMethods;
	regions: CanvasRegion[];
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
	instance.d3Force("regionSeparation", createRegionSeparationForce(regions));
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
	ancestorIds: Set<string>;
	descendantIds: Set<string>;
	depth: number;
	nodeCount: number;
	x: number;
	y: number;
	radius: number;
};

type RegionTopologyEntry = {
	id: string;
	order: number;
	nodeIds: Set<string>;
	bodyNodeIds: Set<string>;
	childIds: Set<string>;
	ancestorIds: Set<string>;
	descendantIds: Set<string>;
	depth: number;
};

type RegionTopology = {
	entries: RegionTopologyEntry[];
};

function createRegionSeparationForce(
	regions: CanvasRegion[],
): Force<CanvasNode, undefined> {
	const topology = createRegionTopology(regions);
	let nodes: CanvasNode[] = [];

	const force: Force<CanvasNode, undefined> = (alpha) => {
		const regionBodies = createRegionBodies(nodes, topology);

		for (
			let leftIndex = 0;
			leftIndex < regionBodies.length;
			leftIndex += 1
		) {
			const left = regionBodies[leftIndex];

			for (
				let rightIndex = leftIndex + 1;
				rightIndex < regionBodies.length;
				rightIndex += 1
			) {
				const right = regionBodies[rightIndex];

				if (!regionsShouldSeparate(left, right)) {
					continue;
				}

				const fallback = getStableDirection(left.id, right.id);
				const dx = right.x - left.x || fallback.x;
				const dy = right.y - left.y || fallback.y;
				const distance = Math.hypot(dx, dy);
				const minimumDistance =
					left.radius +
					right.radius +
					REGION_BODY_BASE_GAP +
					REGION_BODY_DEPTH_GAP * Math.max(left.depth, right.depth);

				if (distance >= minimumDistance) {
					continue;
				}

				const overlapRatio = (minimumDistance - distance) / minimumDistance;
				const sizeRatio = Math.min(
					2,
					Math.sqrt(left.nodeCount + right.nodeCount) / 4,
				);
				const strength = clamp(
					REGION_BODY_MIN_SEPARATION_STRENGTH +
						overlapRatio * REGION_BODY_OVERLAP_SEPARATION_STRENGTH +
						sizeRatio * REGION_BODY_SIZE_SEPARATION_STRENGTH,
					REGION_BODY_MIN_SEPARATION_STRENGTH,
					REGION_BODY_MAX_SEPARATION_STRENGTH,
				);
				const push =
					((minimumDistance - distance) / distance) * strength * alpha;
				const pushX = dx * push;
				const pushY = dy * push;
				const totalMass = left.nodeCount + right.nodeCount;
				const leftShare = right.nodeCount / totalMass;
				const rightShare = left.nodeCount / totalMass;

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

function createRegionBodies(
	nodes: CanvasNode[],
	topology: RegionTopology,
): RegionBody[] {
	const nodesById = new Map(nodes.map((node) => [node.id, node]));

	return topology.entries.flatMap((entry) => {
		const regionNodes = [...entry.bodyNodeIds]
			.map((nodeId) => nodesById.get(nodeId))
			.filter((node): node is CanvasNode => Boolean(node));

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
				id: entry.id,
				nodes: regionNodes,
				nodeIds: new Set(regionNodes.map((node) => node.id)),
				ancestorIds: entry.ancestorIds,
				descendantIds: entry.descendantIds,
				depth: entry.depth,
				nodeCount: regionNodes.length,
				x,
				y,
				radius,
			},
		];
	});
}

function regionsShouldSeparate(left: RegionBody, right: RegionBody) {
	if (regionsShareNode(left, right)) {
		return false;
	}

	if (
		left.descendantIds.has(right.id) ||
		right.descendantIds.has(left.id) ||
		left.ancestorIds.has(right.id) ||
		right.ancestorIds.has(left.id)
	) {
		return false;
	}

	return true;
}

function regionsShareNode(left: RegionBody, right: RegionBody) {
	for (const nodeId of left.nodeIds) {
		if (right.nodeIds.has(nodeId)) {
			return true;
		}
	}

	return false;
}

function createRegionTopology(regions: CanvasRegion[]): RegionTopology {
	const regionsById = new Map(regions.map((region) => [region.id, region]));
	const entriesById = new Map(
		regions.map((region, order) => [
			region.id,
			{
				id: region.id,
				order,
				nodeIds: new Set(region.nodeIds),
				bodyNodeIds: new Set<string>(),
				childIds: new Set(
					getRegionChildIdsForTopology(region, regions).filter((regionId) =>
						regionsById.has(regionId),
					),
				),
				ancestorIds: new Set<string>(),
				descendantIds: new Set<string>(),
				depth: 0,
			},
		]),
	);

	for (const entry of entriesById.values()) {
		entry.descendantIds = collectRegionDescendantIds(entry.id, entriesById);
		entry.depth = getRegionDepth(entry.id, entriesById);
	}

	for (const entry of entriesById.values()) {
		for (const descendantId of entry.descendantIds) {
			entriesById.get(descendantId)?.ancestorIds.add(entry.id);
		}
	}

	for (const entry of entriesById.values()) {
		entry.bodyNodeIds = new Set(entry.nodeIds);

		for (const descendantId of entry.descendantIds) {
			const descendant = entriesById.get(descendantId);

			if (!descendant) {
				continue;
			}

			for (const nodeId of descendant.nodeIds) {
				entry.bodyNodeIds.add(nodeId);
			}
		}
	}

	return {
		entries: [...entriesById.values()].sort(
			(left, right) => left.order - right.order,
		),
	};
}

function getRegionChildIdsForTopology(
	region: CanvasRegion,
	regions: CanvasRegion[],
) {
	const explicitChildIds = new Set(region.regionIds);
	const inferredChildren = inferRegionChildrenFromNodeContainment(
		region,
		regions,
		explicitChildIds,
	);

	return [...explicitChildIds, ...inferredChildren.map((child) => child.id)];
}

function inferRegionChildrenFromNodeContainment(
	region: CanvasRegion,
	regions: CanvasRegion[],
	explicitChildIds: Set<string>,
) {
	if (region.nodeIds.length === 0) {
		return [];
	}

	const regionNodeIds = new Set(region.nodeIds);
	const containedRegions = regions.filter((candidate) => {
		if (candidate.id === region.id || explicitChildIds.has(candidate.id)) {
			return false;
		}

		return isStrictNodeSubset(candidate.nodeIds, regionNodeIds);
	});

	return containedRegions.filter((candidate) => {
		return !containedRegions.some((other) => {
			if (other.id === candidate.id) {
				return false;
			}

			return isStrictNodeSubset(candidate.nodeIds, new Set(other.nodeIds));
		});
	});
}

function isStrictNodeSubset(nodeIds: string[], parentNodeIds: Set<string>) {
	if (nodeIds.length === 0 || nodeIds.length >= parentNodeIds.size) {
		return false;
	}

	return nodeIds.every((nodeId) => parentNodeIds.has(nodeId));
}

function collectRegionDescendantIds(
	regionId: string,
	entriesById: Map<string, RegionTopologyEntry>,
	visited = new Set<string>(),
): Set<string> {
	const entry = entriesById.get(regionId);
	const descendants = new Set<string>();

	if (!entry || visited.has(regionId)) {
		return descendants;
	}

	visited.add(regionId);

	for (const childId of entry.childIds) {
		if (childId === regionId) {
			continue;
		}

		descendants.add(childId);

		for (const descendantId of collectRegionDescendantIds(
			childId,
			entriesById,
			new Set(visited),
		)) {
			descendants.add(descendantId);
		}
	}

	return descendants;
}

function getRegionDepth(
	regionId: string,
	entriesById: Map<string, RegionTopologyEntry>,
	visited = new Set<string>(),
): number {
	const entry = entriesById.get(regionId);

	if (!entry || visited.has(regionId) || entry.childIds.size === 0) {
		return 0;
	}

	visited.add(regionId);

	return (
		Math.max(
			0,
			...[...entry.childIds].map((childId) =>
				getRegionDepth(childId, entriesById, new Set(visited)),
			),
		) + 1
	);
}

function clamp(value: number, minimum: number, maximum: number) {
	return Math.min(maximum, Math.max(minimum, value));
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
