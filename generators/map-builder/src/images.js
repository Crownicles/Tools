/**
 * Image loading: backgrounds and marker icons.
 *
 * Backgrounds are tried in this order: Tools/Ressources (canonical) →
 * Website/public/ressources/maps. Season variants are tried before the base
 * filename (e.g. `foo_halloween.jpg` before `foo.jpg`).
 *
 * Both functions cache the loaded HTMLImageElement on `state.*Cache`.
 */
import {state} from "./state.js";
import {DEFAULTS, PATHS} from "./constants.js";
import {withSeasonSuffix} from "./utils.js";

export function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Image fail: ${url}`));
		img.src = url;
	});
}

export async function fetchBackground(mapPage, lang) {
	state.backgroundsCache[mapPage] ||= {};
	if (state.backgroundsCache[mapPage][lang]) {
		return state.backgroundsCache[mapPage][lang];
	}

	const page = state.mapPages[mapPage];
	const bg = page.backgrounds && page.backgrounds[lang];
	if (!bg || !bg.filename) {
		return null;
	}

	const baseName = bg.filename;
	const filenames = [];
	if (state.season && state.season !== "normal") {
		filenames.push(withSeasonSuffix(baseName, state.season));
	}
	filenames.push(baseName);

	const candidates = [];
	for (const fn of filenames) {
		candidates.push(`https://raw.githubusercontent.com/${DEFAULTS.toolsOwnerRepo}/master/${PATHS.toolsRessources}/${fn}`);
		candidates.push(`https://raw.githubusercontent.com/${state.wsRepo}/${state.wsBranch}/${PATHS.websiteRessources}/${fn}`);
	}
	for (const url of candidates) {
		try {
			const img = await loadImage(url);
			state.backgroundsCache[mapPage][lang] = img;
			return img;
		}
		catch {
			// try next
		}
	}
	return null;
}

export function loadMarkerImage(page) {
	if (!page || !page.marker || !page.marker.image) {
		return Promise.resolve(null);
	}
	const key = page.marker.image;
	if (state.markerImagesCache[key]) {
		return Promise.resolve(state.markerImagesCache[key]);
	}
	const candidates = [
		`https://raw.githubusercontent.com/${DEFAULTS.toolsOwnerRepo}/master/${PATHS.toolsRessources}/${key}`,
		`https://raw.githubusercontent.com/${state.wsRepo}/${state.wsBranch}/${PATHS.websiteRessources}/${key}`
	];
	return (async () => {
		for (const url of candidates) {
			try {
				const img = await loadImage(url);
				state.markerImagesCache[key] = img;
				return img;
			}
			catch {
				// next
			}
		}
		return null;
	})();
}
