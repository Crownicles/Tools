/**
 * Auto-sync flow: compares Crownicles game data with the local mapCoords and
 * proposes 3 categories of changes via a modal:
 *  - newAttrs:    attribute never covered → create a mapPage stub from scratch
 *  - newIslands:  attribute already covered but new POIs in a distinct 100-bucket
 *                 → create a sibling mapPage (e.g. ice_exterior / oceanic_exterior)
 *  - outOfRange:  POIs adjacent (±1) to an existing idRange → extend the range
 *
 * The user picks what to apply via checkboxes, then either keeps the changes
 * in memory (Appliquer) or pushes them as a PR right away (Appliquer + PR).
 */
import {state} from "./state.js";
import {$, humanizeAttr} from "./utils.js";
import {toast} from "./feedback.js";
import {NON_RENDERABLE_LOCATION_TYPES} from "./constants.js";
import {locationMatchesPage} from "./categorize.js";
import {buildTabs} from "./tabs.js";
import {refreshSyncPanel} from "./panels.js";
import {openCrowniclesPr} from "./pr.js";

function computeSyncDiff() {
	const coveredAttrs = new Set();
	Object.values(state.mapPages).forEach((p) => {
		(p.includeAttributes || []).forEach((a) => coveredAttrs.add(a));
	});
	const rangesByAttr = new Map();
	Object.entries(state.mapPages).forEach(([key, p]) => {
		if (!p.idRange) {
			return;
		}
		(p.includeAttributes || []).forEach((a) => {
			if (!rangesByAttr.has(a)) {
				rangesByAttr.set(a, []);
			}
			rangesByAttr.get(a).push({key, min: p.idRange.min, max: p.idRange.max});
		});
	});

	const newAttrs = new Map();
	const newIslands = new Map();
	const outOfRange = new Map();

	Object.entries(state.locations).forEach(([id, info]) => {
		if (!info || NON_RENDERABLE_LOCATION_TYPES.has(info.type)) {
			return;
		}
		const attr = info.attribute;
		if (!attr) {
			return;
		}
		if (!coveredAttrs.has(attr)) {
			if (!newAttrs.has(attr)) {
				newAttrs.set(attr, {ids: [], types: new Set()});
			}
			const slot = newAttrs.get(attr);
			slot.ids.push(String(id));
			slot.types.add(info.type);
			return;
		}
		const accepted = Object.values(state.mapPages).some((p) => locationMatchesPage(id, info, p));
		if (accepted) {
			return;
		}
		const numId = parseInt(id, 10);
		if (Number.isNaN(numId)) {
			return;
		}
		const ranges = rangesByAttr.get(attr) || [];
		const adjacent = ranges.find((r) => numId === r.min - 1 || numId === r.max + 1);
		if (adjacent) {
			if (!outOfRange.has(adjacent.key)) {
				outOfRange.set(adjacent.key, {attr, ids: []});
			}
			outOfRange.get(adjacent.key).ids.push(String(id));
			return;
		}
		const bucket = Math.floor(numId / 100) * 100;
		const key = `${attr}@${bucket}`;
		if (!newIslands.has(key)) {
			newIslands.set(key, {attr, bucket, ids: []});
		}
		newIslands.get(key).ids.push(String(id));
	});
	return {newAttrs, newIslands, outOfRange};
}

function buildStubPage(attr, ids, opts) {
	const numericIds = ids.map((i) => parseInt(i, 10)).filter((n) => !Number.isNaN(n));
	const pageName = opts?.name || attr;
	const stub = {
		mapPage: pageName,
		displayName: humanizeAttr(pageName),
		includeAttributes: [attr],
		backgrounds: {
			fr: {filename: `${pageName}_fr.jpg`, width: 4096, height: 2744},
			en: {filename: `${pageName}_en.jpg`, width: 4096, height: 2744}
		},
		marker: {
			image: "cross.png",
			anchor: "center",
			size: {width: 150, height: 150},
			anchorOffset: {x: 75, y: 75}
		},
		coordSpace: "fr",
		scaling: {fr: 1, en: 1},
		nodes: {},
		edges: {}
	};
	if (opts?.bucket !== undefined) {
		stub.idRange = {min: opts.bucket, max: opts.bucket + 99};
	}
	else if (numericIds.length && numericIds.every((n) => n >= 1000)) {
		const min = Math.min(...numericIds);
		const max = Math.max(...numericIds);
		const rangeStart = Math.floor(min / 100) * 100;
		const rangeEnd = Math.max(rangeStart + 99, max);
		stub.idRange = {min: rangeStart, max: rangeEnd};
	}
	return stub;
}

export function openSyncModal() {
	if (!Object.keys(state.locations).length) {
		toast("Charge d'abord les données Crownicles (bouton Charger)", "error", 6000);
		return;
	}
	const diff = computeSyncDiff();
	if (diff.newAttrs.size === 0 && diff.newIslands.size === 0 && diff.outOfRange.size === 0) {
		toast("Rien à synchroniser, tout est déjà couvert.", "info", 6000);
		return;
	}
	state._syncDiff = diff;
	$("syncBranchLabel").textContent = state.cwBranch;
	$("syncRepoLabel").textContent = state.cwRepo;
	$("syncTargetLabel").textContent = `${state.mapCoordsRepo}@${state.mapCoordsBranch}`;
	const body = $("syncModalBody");
	body.innerHTML = "";

	const addCheckboxSection = (title, entries, renderRow) => {
		if (!entries.length) {
			return;
		}
		const h = document.createElement("h3");
		h.textContent = `${title} (${entries.length})`;
		body.appendChild(h);
		const ul = document.createElement("ul");
		ul.className = "sync-list";
		entries.forEach((e) => ul.appendChild(renderRow(e)));
		body.appendChild(ul);
	};

	addCheckboxSection(
		"Nouveaux attributs (mapPage à créer)",
		Array.from(diff.newAttrs.entries()).sort(([a], [b]) => a.localeCompare(b)),
		([attr, info]) => {
			const preview = `${info.ids.slice(0, 6).join(", ")}${info.ids.length > 6 ? "…" : ""}`;
			const li = document.createElement("li");
			li.innerHTML = `<label><input type="checkbox" data-sync="newAttr" data-attr="${attr}" checked /> <strong>${attr}</strong> <span class="hint">→ ${attr}.json (${info.ids.length} POIs : ${preview})</span></label>`;
			return li;
		}
	);

	addCheckboxSection(
		"Nouvelles îles (attribut partagé, bloc d'ID distinct)",
		Array.from(diff.newIslands.entries()).sort(([a], [b]) => a.localeCompare(b)),
		([key, info]) => {
			const preview = `${info.ids.slice(0, 6).join(", ")}${info.ids.length > 6 ? "…" : ""}`;
			const suggestedName = `island_${info.bucket}`;
			const li = document.createElement("li");
			li.innerHTML = `<label><input type="checkbox" data-sync="newIsland" data-key="${key}" checked /> <strong>${info.attr}</strong> bloc ${info.bucket}-${info.bucket + 99} → <input type="text" data-sync-name="${key}" value="${suggestedName}" class="sync-name-input" /> <span class="hint">(${info.ids.length} POIs : ${preview})</span></label>`;
			return li;
		}
	);

	addCheckboxSection(
		"idRange à étendre (POIs adjacents)",
		Array.from(diff.outOfRange.entries()).sort(([a], [b]) => a.localeCompare(b)),
		([pageKey, info]) => {
			const preview = `${info.ids.slice(0, 6).join(", ")}${info.ids.length > 6 ? "…" : ""}`;
			const li = document.createElement("li");
			li.innerHTML = `<label><input type="checkbox" data-sync="extendRange" data-page="${pageKey}" checked /> <strong>${pageKey}</strong> <span class="hint">+ ${info.ids.length} POIs (${preview})</span></label>`;
			return li;
		}
	);

	$("syncModal").classList.remove("hidden");
}

function applySyncSelections() {
	const diff = state._syncDiff;
	if (!diff) {
		return {applied: 0};
	}
	let applied = 0;
	document.querySelectorAll("[data-sync=\"newAttr\"]:checked").forEach((cb) => {
		const attr = cb.dataset.attr;
		const info = diff.newAttrs.get(attr);
		if (!info) {
			return;
		}
		state.mapPages[attr] = buildStubPage(attr, info.ids);
		applied++;
	});
	document.querySelectorAll("[data-sync=\"newIsland\"]:checked").forEach((cb) => {
		const key = cb.dataset.key;
		const info = diff.newIslands.get(key);
		if (!info) {
			return;
		}
		const nameInput = document.querySelector(`[data-sync-name="${key}"]`);
		const name = (nameInput?.value || `island_${info.bucket}`).trim().replace(/[^a-z0-9_]/gi, "_");
		if (!name || state.mapPages[name]) {
			return;
		}
		state.mapPages[name] = buildStubPage(info.attr, info.ids, {name, bucket: info.bucket});
		applied++;
	});
	document.querySelectorAll("[data-sync=\"extendRange\"]:checked").forEach((cb) => {
		const pageKey = cb.dataset.page;
		const info = diff.outOfRange.get(pageKey);
		const page = state.mapPages[pageKey];
		if (!info || !page) {
			return;
		}
		const nums = info.ids.map((i) => parseInt(i, 10)).filter((n) => !Number.isNaN(n));
		if (!nums.length) {
			return;
		}
		const curMin = page.idRange?.min ?? Math.min(...nums);
		const curMax = page.idRange?.max ?? Math.max(...nums);
		page.idRange = {min: Math.min(curMin, ...nums), max: Math.max(curMax, ...nums)};
		applied++;
	});
	return {applied};
}

export async function confirmSync(pushPr) {
	const res = applySyncSelections();
	$("syncModal").classList.add("hidden");
	if (res.applied === 0) {
		toast("Rien de coché.", "info");
		return;
	}
	buildTabs();
	refreshSyncPanel();
	toast(`${res.applied} changement(s) appliqué(s) en mémoire.`, "success", 5000);
	if (pushPr) {
		await openCrowniclesPr();
	}
}
