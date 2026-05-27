/**
 * Categorize a map page's items into 3 buckets:
 *  - synced:  coord exists locally AND POI exists in Crownicles
 *  - missing: POI exists in Crownicles but no coord placed yet
 *  - orphan:  coord exists locally but POI no longer in Crownicles
 *
 * The "registry" of expected POIs for a page is derived from `state.locations`
 * (the live data fetched from Crownicles) filtered by includeAttributes + idRange.
 */
import {state} from "./state.js";
import {NON_RENDERABLE_LOCATION_TYPES} from "./constants.js";

export function locationMatchesPage(id, info, page) {
	if (!info || !page) {
		return false;
	}
	if (NON_RENDERABLE_LOCATION_TYPES.has(info.type)) {
		return false;
	}
	const attrs = page.includeAttributes || [];
	if (attrs.length && !attrs.includes(info.attribute)) {
		return false;
	}
	if (page.idRange) {
		const n = parseInt(id, 10);
		if (Number.isNaN(n)) {
			return false;
		}
		if (n < page.idRange.min || n > page.idRange.max) {
			return false;
		}
	}
	return true;
}

/**
 * Returns the IDs and edges that should appear on this map page based on the
 * Crownicles game data alone (independent of what's already placed locally).
 *
 * Edges are deduplicated using a canonical `min_max` key: mapLinks defines
 * each connection twice (one per direction), but mapCoords stores it once.
 */
export function getPageRegistry(mapPage) {
	const page = state.mapPages[mapPage];
	if (!page) {
		return {nodes: [], edges: []};
	}
	const includedIds = new Set();
	Object.entries(state.locations).forEach(([id, info]) => {
		if (locationMatchesPage(id, info, page)) {
			includedIds.add(String(id));
		}
	});
	const seen = new Set();
	const includedEdges = [];
	state.links.forEach((link) => {
		if (!link) {
			return;
		}
		const sm = String(link.startMap);
		const em = String(link.endMap);
		if (!includedIds.has(sm) || !includedIds.has(em)) {
			return;
		}
		const a = Number(link.startMap);
		const b = Number(link.endMap);
		const [lo, hi] = a < b ? [a, b] : [b, a];
		const key = `${lo}_${hi}`;
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		includedEdges.push({key, startMap: lo, endMap: hi});
	});
	return {nodes: Array.from(includedIds), edges: includedEdges};
}

export function categorize(mapPage) {
	const page = state.mapPages[mapPage];
	const reg = getPageRegistry(mapPage);
	const nodes = page.nodes || {};
	const edges = page.edges || {};

	const synced = {nodes: [], edges: []};
	const missing = {nodes: [], edges: []};
	const orphan = {nodes: [], edges: []};

	reg.nodes.forEach((id) => {
		if (nodes[id]) {
			synced.nodes.push(id);
		}
		else {
			missing.nodes.push(id);
		}
	});
	Object.keys(nodes).forEach((id) => {
		if (!reg.nodes.includes(id)) {
			orphan.nodes.push(id);
		}
	});

	const regEdgeKeys = new Set(reg.edges.map((e) => e.key));
	reg.edges.forEach((e) => {
		if (edges[e.key]) {
			synced.edges.push(e.key);
		}
		else {
			missing.edges.push(e.key);
		}
	});
	Object.keys(edges).forEach((key) => {
		if (!regEdgeKeys.has(key)) {
			orphan.edges.push(key);
		}
	});
	return {synced, missing, orphan};
}
