/**
 * Tabs strip at the top of the editor (one per mapPage + "new page" button).
 */
import {state} from "./state.js";
import {$} from "./utils.js";
import {setStatus} from "./feedback.js";
import {fetchBackground, loadMarkerImage} from "./images.js";
import {fitView} from "./canvas.js";
import {refreshInspector, refreshSyncPanel} from "./panels.js";
import {LS_KEYS} from "./constants.js";

export function buildTabs() {
	const wrap = $("tabs");
	wrap.innerHTML = "";
	Object.keys(state.mapPages).forEach((page) => {
		const t = document.createElement("div");
		t.className = "tab";
		t.dataset.page = page;
		t.textContent = state.mapPages[page].displayName || page;
		t.addEventListener("click", () => selectTab(page));
		wrap.appendChild(t);
	});
	const add = document.createElement("div");
	add.className = "tab new-tab";
	add.textContent = "+ Nouvelle page";
	add.addEventListener("click", () => $("newPageModal").classList.remove("hidden"));
	wrap.appendChild(add);
}

export async function selectTab(page) {
	if (!state.mapPages[page]) {
		return;
	}
	state.currentTab = page;
	localStorage.setItem(LS_KEYS.currentTab, page);
	state.selected = null;
	document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.page === page));
	setStatus(`Onglet ${page} — chargement fond…`);
	await Promise.all([
		fetchBackground(page, "fr"),
		fetchBackground(page, "en"),
		loadMarkerImage(state.mapPages[page])
	]);
	fitView();
	refreshSyncPanel();
	refreshInspector();
	setStatus(`Onglet ${page} prêt`);
}
