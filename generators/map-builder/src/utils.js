/**
 * Pure utilities: DOM lookup, async helpers, base64, season helpers,
 * map page serialization (stable JSON for clean diffs).
 *
 * No DOM mutation, no state writes. Safe to import anywhere.
 */
import {state} from "./state.js";

export const $ = (id) => document.getElementById(id);

export function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function b64encode(bytes) {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) {
		bin += String.fromCharCode(bytes[i]);
	}
	return btoa(bin);
}

export function utf8ToB64(str) {
	return b64encode(new TextEncoder().encode(str));
}

export async function blobToB64(blob) {
	const buf = await blob.arrayBuffer();
	return b64encode(new Uint8Array(buf));
}

export function stableSortedKeys(obj) {
	return Object.keys(obj).sort((a, b) => {
		const na = parseInt(a, 10);
		const nb = parseInt(b, 10);
		if (!Number.isNaN(na) && !Number.isNaN(nb)) {
			return na - nb;
		}
		return a.localeCompare(b);
	});
}

/**
 * Re-emit a mapPage JSON with stable key order so diffs stay minimal.
 * Always ends with a trailing newline.
 */
export function serializeMapPage(page) {
	const out = {
		mapPage: page.mapPage,
		displayName: page.displayName,
		includeAttributes: page.includeAttributes || []
	};
	if (page.idRange) {
		out.idRange = page.idRange;
	}
	out.backgrounds = page.backgrounds || {};
	out.marker = page.marker;
	out.coordSpace = page.coordSpace || "fr";
	out.scaling = page.scaling || {fr: 1};
	const sortedNodes = {};
	stableSortedKeys(page.nodes || {}).forEach((k) => {
		sortedNodes[k] = page.nodes[k];
	});
	out.nodes = sortedNodes;
	const sortedEdges = {};
	Object.keys(page.edges || {})
		.sort((a, b) => {
			const ea = page.edges[a];
			const eb = page.edges[b];
			return (ea.startMap - eb.startMap) || (ea.endMap - eb.endMap);
		})
		.forEach((k) => {
			sortedEdges[k] = page.edges[k];
		});
	out.edges = sortedEdges;
	return `${JSON.stringify(out, null, 2)}\n`;
}

/**
 * Insert `_<season>` before the file extension. `foo.jpg` + `halloween` → `foo_halloween.jpg`.
 */
export function withSeasonSuffix(filename, season) {
	const idx = filename.lastIndexOf(".");
	if (idx < 0) {
		return `${filename}_${season}`;
	}
	return `${filename.slice(0, idx)}_${season}${filename.slice(idx)}`;
}

/**
 * A node/edge with `seasons: ["halloween"]` is only shown when the matching
 * season is selected. Missing or empty `seasons` means "always shown".
 */
export function matchesSeason(data) {
	const seasons = data?.seasons;
	if (!Array.isArray(seasons) || seasons.length === 0) {
		return true;
	}
	return seasons.includes(state.season || "normal");
}

/**
 * Title-case an attribute name: "pve_island_entry" → "Pve Island Entry".
 */
export function humanizeAttr(attr) {
	return attr.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
