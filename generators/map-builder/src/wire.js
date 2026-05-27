/**
 * Initial UI wiring: reads localStorage into form inputs, attaches every
 * addEventListener for control buttons, mode/lang toggles, sync/PR buttons,
 * help modal, new-page modal.
 *
 * Called once at boot from main.js.
 */
import {state} from "./state.js";
import {$} from "./utils.js";
import {toast} from "./feedback.js";
import {DEFAULTS, LS_KEYS} from "./constants.js";
import {loadAll} from "./data.js";
import {fetchBackground} from "./images.js";
import {fitView, render} from "./canvas.js";
import {refreshInspector} from "./panels.js";
import {redo, undo} from "./history.js";
import {buildTabs, selectTab} from "./tabs.js";
import {renderImages, setRenderCancel} from "./render-pipeline.js";
import {exportCoordsZip, openCrowniclesPr, openWebsitePr} from "./pr.js";
import {confirmSync, openSyncModal} from "./sync.js";

export function wireUI() {
	// Mode toggle (viewer / editor)
	document.querySelectorAll("input[name=\"mode\"]").forEach((r) => r.addEventListener("change", (e) => {
		state.mode = e.target.value;
		document.body.classList.toggle("viewer", state.mode === "viewer");
		$("viewerBanner").classList.toggle("hidden", state.mode !== "viewer");
		refreshInspector();
	}));

	// Lang toggle (fr / en) — refetch bg in new lang on the current tab.
	document.querySelectorAll("input[name=\"lang\"]").forEach((r) => r.addEventListener("change", async (e) => {
		state.lang = e.target.value;
		if (state.currentTab) {
			await fetchBackground(state.currentTab, state.lang);
			render();
		}
	}));

	$("showLabels").addEventListener("change", (e) => {
		state.showLabels = e.target.checked;
		render();
	});

	// PAT input
	const patInput = $("pat");
	patInput.value = localStorage.getItem(LS_KEYS.pat) || "";
	state.pat = patInput.value;
	// Reactive: keep state.pat in sync without forcing localStorage persistence.
	patInput.addEventListener("input", () => {
		state.pat = patInput.value;
	});
	$("savePat").addEventListener("click", () => {
		state.pat = patInput.value;
		localStorage.setItem(LS_KEYS.pat, state.pat);
		toast("Token sauvegardé localement", "success");
	});
	$("clearPat").addEventListener("click", () => {
		state.pat = "";
		patInput.value = "";
		localStorage.removeItem(LS_KEYS.pat);
		toast("Token effacé", "info");
	});

	// Reactive: keep state.dryRun in sync so the checkbox is honored without reload.
	$("dryRun").addEventListener("change", (e) => {
		state.dryRun = e.target.checked;
	});

	// Branches & repos: restore from localStorage.
	$("cwBranch").value = localStorage.getItem(LS_KEYS.cwBranch) || DEFAULTS.cwBranch;
	$("wsBranch").value = localStorage.getItem(LS_KEYS.wsBranch) || DEFAULTS.wsBranch;
	$("cwRepo").value = localStorage.getItem(LS_KEYS.cwRepo) || DEFAULTS.cwOwnerRepo;
	$("wsRepo").value = localStorage.getItem(LS_KEYS.wsRepo) || DEFAULTS.wsOwnerRepo;
	$("mapCoordsRepo").value = localStorage.getItem(LS_KEYS.mapCoordsRepo) || DEFAULTS.mapCoordsOwnerRepo;
	$("mapCoordsBranch").value = localStorage.getItem(LS_KEYS.mapCoordsBranch) || DEFAULTS.mapCoordsBranch;
	$("season").value = localStorage.getItem(LS_KEYS.season) || "normal";
	state.mapCoordsRepo = $("mapCoordsRepo").value;
	state.mapCoordsBranch = $("mapCoordsBranch").value;
	state.season = $("season").value;

	// Live persistence + state sync for advanced repo/branch/season fields.
	const fallbacks = {
		cwBranch: DEFAULTS.cwBranch,
		wsBranch: DEFAULTS.wsBranch,
		cwRepo: DEFAULTS.cwOwnerRepo,
		wsRepo: DEFAULTS.wsOwnerRepo,
		mapCoordsRepo: DEFAULTS.mapCoordsOwnerRepo,
		mapCoordsBranch: DEFAULTS.mapCoordsBranch,
		season: "normal"
	};
	const persistAndSync = (inputId, lsKey, stateKey, onChange) => {
		const el = $(inputId);
		const evt = el.tagName === "SELECT" ? "change" : "input";
		el.addEventListener(evt, () => {
			const v = (el.value ?? "").trim();
			state[stateKey] = v || fallbacks[stateKey];
			localStorage.setItem(lsKey, state[stateKey]);
			if (onChange) {
				onChange();
			}
		});
	};
	persistAndSync("cwBranch", LS_KEYS.cwBranch, "cwBranch");
	persistAndSync("wsBranch", LS_KEYS.wsBranch, "wsBranch");
	persistAndSync("cwRepo", LS_KEYS.cwRepo, "cwRepo");
	persistAndSync("wsRepo", LS_KEYS.wsRepo, "wsRepo");
	persistAndSync("mapCoordsRepo", LS_KEYS.mapCoordsRepo, "mapCoordsRepo");
	persistAndSync("mapCoordsBranch", LS_KEYS.mapCoordsBranch, "mapCoordsBranch");
	persistAndSync("season", LS_KEYS.season, "season", async () => {
		// Season changed: invalidate background cache & re-render current tab.
		state.backgroundsCache = {};
		if (state.currentTab) {
			await fetchBackground(state.currentTab, state.lang);
			render();
		}
	});

	$("loadAll").addEventListener("click", loadAll);

	// Zoom buttons
	$("zoomIn").addEventListener("click", () => {
		state.view.scale *= 1.2;
		render();
	});
	$("zoomOut").addEventListener("click", () => {
		state.view.scale /= 1.2;
		render();
	});
	$("zoomFit").addEventListener("click", fitView);
	$("zoom100").addEventListener("click", () => {
		state.view.scale = 1;
		render();
	});

	// Undo / redo buttons
	$("undoBtn").addEventListener("click", undo);
	$("redoBtn").addEventListener("click", redo);

	// Render / export / PR
	$("renderBtn").addEventListener("click", () => {
		$("renderModal").classList.remove("hidden");
		$("renderProgress").firstElementChild.style.width = "0%";
		$("renderProgressLabel").textContent = "";
	});
	$("renderQuality").addEventListener("input", (e) => {
		$("qualityLabel").textContent = parseFloat(e.target.value).toFixed(2);
	});
	$("renderCancel").addEventListener("click", () => {
		setRenderCancel(true);
		$("renderModal").classList.add("hidden");
	});
	$("renderStart").addEventListener("click", renderImages);

	$("exportBtn").addEventListener("click", exportCoordsZip);
	$("prCwBtn").addEventListener("click", openCrowniclesPr);
	$("prWsBtn").addEventListener("click", openWebsitePr);
	$("syncBtn").addEventListener("click", openSyncModal);
	$("syncCancel").addEventListener("click", () => $("syncModal").classList.add("hidden"));
	$("syncApply").addEventListener("click", () => confirmSync(false));
	$("syncApplyPr").addEventListener("click", () => confirmSync(true));

	// Help modal
	$("helpBtn").addEventListener("click", () => $("helpModal").classList.remove("hidden"));
	$("helpClose").addEventListener("click", () => $("helpModal").classList.add("hidden"));

	// Dry-run side panel
	$("dryRunClose").addEventListener("click", () => $("dryRunPanel").classList.add("hidden"));

	// "Nouvelle page" modal
	$("npCancel").addEventListener("click", () => $("newPageModal").classList.add("hidden"));
	$("npCreate").addEventListener("click", () => {
		const filename = $("npFilename").value.trim();
		if (!filename) {
			toast("Filename requis", "error");
			return;
		}
		const min = parseInt($("npMin").value, 10);
		const max = parseInt($("npMax").value, 10);
		const page = {
			mapPage: filename,
			displayName: $("npDisplay").value.trim() || filename,
			includeAttributes: $("npAttrs").value.split(",").map((s) => s.trim()).filter(Boolean),
			backgrounds: {
				fr: {filename: `${filename}_fr.jpg`, width: 2000, height: 1500},
				en: {filename: `${filename}_en.jpg`, width: 2000, height: 1500}
			},
			marker: {image: "cross.png", anchor: "center", size: {width: 150, height: 150}, anchorOffset: {x: 75, y: 75}},
			coordSpace: "fr",
			scaling: {fr: 1, en: 1},
			nodes: {},
			edges: {}
		};
		if (!Number.isNaN(min) && !Number.isNaN(max)) {
			page.idRange = {min, max};
		}
		state.mapPages[filename] = page;
		$("newPageModal").classList.add("hidden");
		buildTabs();
		selectTab(filename);
		toast(`Page ${filename} créée`, "success");
	});
}
