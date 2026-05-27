/**
 * Data layer:
 *  - merging heterogeneous payload shapes (single object, array, numeric-keyed
 *    object, `{mapLocations: ...}` wrapper) into normalized state.
 *  - load all 4 datasets (mapCoords, mapLocations, mapLinks, names) in order
 *    and select the first/saved tab.
 */
import {state} from "./state.js";
import {$} from "./utils.js";
import {setStatus, toast} from "./feedback.js";
import {fetchGithubDirectory, makeApiRequest, processGithubFiles} from "./github.js";
import {DEFAULTS, LS_KEYS, PATHS} from "./constants.js";
import {buildTabs, selectTab} from "./tabs.js";

export function mergeLocationPayload(target, payload, fallbackName) {
	if (!payload) {
		return;
	}
	if (payload.mapLocations && typeof payload.mapLocations === "object") {
		Object.entries(payload.mapLocations).forEach(([id, data]) => {
			target[id] = data;
		});
		return;
	}
	if (Array.isArray(payload)) {
		target[fallbackName.replace(/\.json$/i, "")] = payload;
		return;
	}
	if (typeof payload === "object") {
		const keys = Object.keys(payload);
		const numericKeys = keys.filter((k) => !Number.isNaN(parseInt(k, 10)));
		if (numericKeys.length === keys.length && keys.length > 0) {
			keys.forEach((k) => {
				target[k] = payload[k];
			});
		}
		else {
			target[fallbackName.replace(/\.json$/i, "")] = payload;
		}
	}
}

export function mergeLinkPayload(target, payload) {
	if (!payload) {
		return;
	}
	if (payload.mapLinks && typeof payload.mapLinks === "object") {
		Object.values(payload.mapLinks).forEach((e) => target.push(e));
		return;
	}
	if (Array.isArray(payload)) {
		payload.forEach((e) => target.push(e));
		return;
	}
	if (typeof payload === "object") {
		const keys = Object.keys(payload);
		const numericKeys = keys.filter((k) => !Number.isNaN(parseInt(k, 10)));
		if (numericKeys.length === keys.length && keys.length > 0) {
			Object.values(payload).forEach((e) => target.push(e));
		}
		else {
			target.push(payload);
		}
	}
}

export async function loadPlaceNames(repo, branch) {
	const url = `https://raw.githubusercontent.com/${repo}/${branch}/${PATHS.models}`;
	try {
		const r = await makeApiRequest(url);
		if (!r.ok) {
			return {};
		}
		const models = await r.json();
		const ml = models && models.map_locations ? models.map_locations : {};
		const out = {};
		Object.entries(ml).forEach(([id, v]) => {
			if (!v) {
				return;
			}
			out[id] = typeof v === "string" ? v : (v.name || "");
		});
		return out;
	}
	catch (e) {
		console.warn("models.json:", e.message);
		return {};
	}
}

export async function loadAll() {
	state.cwBranch = $("cwBranch").value.trim() || DEFAULTS.cwBranch;
	state.wsBranch = $("wsBranch").value.trim() || DEFAULTS.wsBranch;
	state.cwRepo = $("cwRepo").value.trim() || DEFAULTS.cwOwnerRepo;
	state.wsRepo = $("wsRepo").value.trim() || DEFAULTS.wsOwnerRepo;
	state.mapCoordsRepo = $("mapCoordsRepo").value.trim() || DEFAULTS.mapCoordsOwnerRepo;
	state.mapCoordsBranch = $("mapCoordsBranch").value.trim() || DEFAULTS.mapCoordsBranch;
	state.season = $("season").value || "normal";
	state.dryRun = $("dryRun").checked;

	localStorage.setItem(LS_KEYS.cwBranch, state.cwBranch);
	localStorage.setItem(LS_KEYS.wsBranch, state.wsBranch);
	localStorage.setItem(LS_KEYS.cwRepo, state.cwRepo);
	localStorage.setItem(LS_KEYS.wsRepo, state.wsRepo);
	localStorage.setItem(LS_KEYS.mapCoordsRepo, state.mapCoordsRepo);
	localStorage.setItem(LS_KEYS.mapCoordsBranch, state.mapCoordsBranch);
	localStorage.setItem(LS_KEYS.season, state.season);

	setStatus("Chargement…");
	try {
		// 1. mapCoords (lives in the Tools repo)
		const coordFiles = await fetchGithubDirectory(state.mapCoordsRepo, PATHS.mapCoords, state.mapCoordsBranch);
		const pages = {};
		await processGithubFiles(
			coordFiles.filter((f) => f.name.endsWith(".json") && !f.name.startsWith("_")),
			"mapCoords",
			(payload, file) => {
				const stem = file.name.replace(/\.json$/i, "");
				pages[stem] = payload;
			}
		);
		state.mapPages = pages;
		state.originalMapPages = JSON.parse(JSON.stringify(pages));

		// 2. mapLocations
		const locFiles = await fetchGithubDirectory(state.cwRepo, PATHS.mapLocations, state.cwBranch);
		const locations = {};
		await processGithubFiles(locFiles, "mapLocations", (p, f) => mergeLocationPayload(locations, p, f.name));
		state.locations = locations;

		// 3. mapLinks
		const linkFiles = await fetchGithubDirectory(state.cwRepo, PATHS.mapLinks, state.cwBranch);
		const links = [];
		await processGithubFiles(linkFiles, "mapLinks", (p) => mergeLinkPayload(links, p));
		state.links = links;

		// 4. Names
		state.placeNames = await loadPlaceNames(state.cwRepo, state.cwBranch);

		setStatus(`OK · ${Object.keys(pages).length} pages, ${Object.keys(locations).length} locations, ${links.length} links`);
		toast("Données chargées", "success");

		buildTabs();
		const saved = localStorage.getItem(LS_KEYS.currentTab);
		const firstTab = saved && pages[saved] ? saved : Object.keys(pages)[0];
		if (firstTab) {
			selectTab(firstTab);
		}
	}
	catch (e) {
		console.error(e);
		setStatus(`Erreur: ${e.message}`);
		toast(`Erreur: ${e.message}`, "error", 6000);
	}
}
