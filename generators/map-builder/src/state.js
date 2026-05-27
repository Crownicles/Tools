/**
 * Mutable runtime state shared across modules.
 *
 * In dev, this object is also exposed as `window.state` to ease debugging
 * (e.g. `state.locations` in DevTools console).
 *
 * If you need to write to state, prefer:
 *  - Direct property writes for primitives (state.lang = "en")
 *  - Helper functions for collections (history.pushUndo, etc.)
 */
import {DEFAULTS} from "./constants.js";

export const state = {
	mode: "viewer", // viewer | editor
	lang: "fr",
	showLabels: true,
	pat: "",
	rateLimitSuffix: "",
	cwRepo: DEFAULTS.cwOwnerRepo,
	wsRepo: DEFAULTS.wsOwnerRepo,
	cwBranch: DEFAULTS.cwBranch,
	wsBranch: DEFAULTS.wsBranch,
	mapCoordsRepo: DEFAULTS.mapCoordsOwnerRepo,
	mapCoordsBranch: DEFAULTS.mapCoordsBranch,
	season: "normal",
	dryRun: false,
	// Data
	locations: {},          // { id: { type, attribute, ... } }
	links: [],              // [ { startMap, endMap, ... } ]
	placeNames: {},         // { id: name }
	mapPages: {},           // { mapPage: pageData (parsed JSON, possibly modified) }
	originalMapPages: {},   // pristine copy from GitHub for diff detection
	backgroundsCache: {},   // { mapPage: { fr: HTMLImageElement, en: HTMLImageElement } }
	pendingBackgrounds: {}, // { mapPage: { fr: Blob, en: Blob } } for upload to website
	// UI
	currentTab: null,
	view: {scale: 1, offsetX: 0, offsetY: 0},
	// Selection / interaction
	selected: null,         // { type: 'node'|'edge', key: string }
	dragState: null,        // { key, type, startMouse, startCoord }
	panState: null,         // { startMouse, startOffset }
	spacePressed: false,
	// Markers cache
	markerImagesCache: {},  // { url: HTMLImageElement }
	// Undo per tab
	undoStacks: {},         // { mapPage: { undo: [], redo: [] } }
	// Sync flow ephemeral
	_syncDiff: null
};

// Expose for DevTools debugging.
if (typeof window !== "undefined") {
	window.state = state;
}
