/**
 * Right-side panels:
 *  - Sync panel: synced / missing / orphan lists. In editor mode, missing
 *    items are draggable onto the canvas (drop handler is in interactions.js).
 *  - Inspector: details + edit form for the currently selected marker.
 */
import {state} from "./state.js";
import {$} from "./utils.js";
import {categorize} from "./categorize.js";
import {canvasToCoord, getCanvas, getScalingFactor, render} from "./canvas.js";
import {pushUndo} from "./history.js";

export function refreshSyncPanel() {
	if (!state.currentTab) {
		return;
	}
	const cat = categorize(state.currentTab);
	const syncedTotal = cat.synced.nodes.length + cat.synced.edges.length;
	const missingTotal = cat.missing.nodes.length + cat.missing.edges.length;
	const orphanTotal = cat.orphan.nodes.length + cat.orphan.edges.length;
	$("syncedHead").textContent = `Synchronisés (${syncedTotal})`;
	$("missingHead").textContent = `Coords manquantes (${missingTotal})`;
	$("orphanHead").textContent = `Orphelins (${orphanTotal})`;

	const fill = (ulId, items, cls) => {
		const ul = $(ulId);
		ul.innerHTML = "";
		items.forEach(({key, kind}) => {
			const li = document.createElement("li");
			li.className = cls;
			const name = state.placeNames[key] ? ` · ${state.placeNames[key]}` : "";
			const dragHint = cls === "missing" && state.mode === "editor" ? " <span class=\"drag-hint\">↪ glisse sur la carte</span>" : "";
			li.innerHTML = `<span>${kind === "node" ? "N" : "E"} ${key}${name}</span>${dragHint}`;
			li.addEventListener("click", () => {
				state.selected = {type: kind, key};
				refreshInspector();
				render();
			});
			if (cls === "missing" && state.mode === "editor") {
				li.draggable = true;
				li.classList.add("draggable");
				li.addEventListener("dragstart", (ev) => {
					ev.dataTransfer.setData("application/x-crownicles-missing", JSON.stringify({kind, key}));
					ev.dataTransfer.effectAllowed = "copy";
					li.classList.add("dragging");
				});
				li.addEventListener("dragend", () => li.classList.remove("dragging"));
			}
			ul.appendChild(li);
		});
	};
	fill("syncedList", [
		...cat.synced.nodes.map((k) => ({key: k, kind: "node"})),
		...cat.synced.edges.map((k) => ({key: k, kind: "edge"}))
	], "synced");
	fill("missingList", [
		...cat.missing.nodes.map((k) => ({key: k, kind: "node"})),
		...cat.missing.edges.map((k) => ({key: k, kind: "edge"}))
	], "missing");
	fill("orphanList", [
		...cat.orphan.nodes.map((k) => ({key: k, kind: "node"})),
		...cat.orphan.edges.map((k) => ({key: k, kind: "edge"}))
	], "orphan");
}

export function refreshInspector() {
	const el = $("inspector");
	if (!state.selected) {
		el.innerHTML = "<p class=\"hint\">Sélectionne un marqueur.</p>";
		return;
	}
	const page = state.mapPages[state.currentTab];
	const {type, key} = state.selected;
	const data = type === "node" ? page.nodes?.[key] : page.edges?.[key];
	const info = type === "node" ? state.locations[key] : null;
	const name = state.placeNames[key] || "";
	const editorDisabled = state.mode !== "editor" ? "disabled" : "";

	el.innerHTML = `
    <dl>
      <dt>Type</dt><dd>${type}</dd>
      <dt>Id</dt><dd>${key}</dd>
      ${name ? `<dt>Nom</dt><dd>${name}</dd>` : ""}
      ${info?.attribute ? `<dt>Attr.</dt><dd>${info.attribute}</dd>` : ""}
      <dt>x</dt><dd><input type="number" id="inspX" value="${data ? data.x : 0}" ${editorDisabled}></dd>
      <dt>y</dt><dd><input type="number" id="inspY" value="${data ? data.y : 0}" ${editorDisabled}></dd>
      <dt title="Liste de saisons séparées par virgule. Vide = toujours visible.">Saisons</dt>
      <dd><input type="text" id="inspSeasons" placeholder="halloween, christmas" value="${data?.seasons ? data.seasons.join(", ") : ""}" ${editorDisabled}></dd>
    </dl>
    <div class="row-actions">
      <button id="inspApply" ${editorDisabled}>Appliquer</button>
      <button id="inspDelete" ${editorDisabled}>Supprimer</button>
      <button id="inspCenter" ${editorDisabled}>Recentrer</button>
    </div>
  `;
	if (state.mode !== "editor") {
		return;
	}
	$("inspApply").addEventListener("click", () => {
		const x = parseFloat($("inspX").value);
		const y = parseFloat($("inspY").value);
		const seasonsRaw = $("inspSeasons").value || "";
		const seasons = seasonsRaw.split(",").map((s) => s.trim()).filter(Boolean);
		pushUndo();
		const target = type === "node" ? page.nodes : page.edges;
		if (target[key]) {
			target[key].x = x;
			target[key].y = y;
		}
		else {
			target[key] = type === "node"
				? {x, y}
				: {startMap: parseInt(key.split("_")[0], 10), endMap: parseInt(key.split("_")[1], 10), x, y};
		}
		if (seasons.length > 0) {
			target[key].seasons = seasons;
		}
		else {
			delete target[key].seasons;
		}
		render();
		refreshSyncPanel();
	});
	$("inspDelete").addEventListener("click", () => {
		pushUndo();
		if (type === "node") {
			delete page.nodes[key];
		}
		else {
			delete page.edges[key];
		}
		state.selected = null;
		refreshInspector();
		refreshSyncPanel();
		render();
	});
	$("inspCenter").addEventListener("click", () => {
		const c = getCanvas();
		const langFactor = getScalingFactor(page, state.lang);
		const center = canvasToCoord(c.width / 2, c.height / 2);
		pushUndo();
		const target = type === "node" ? page.nodes : page.edges;
		const x = Math.round(center.x / langFactor);
		const y = Math.round(center.y / langFactor);
		if (target[key]) {
			target[key].x = x;
			target[key].y = y;
		}
		else {
			target[key] = type === "node"
				? {x, y}
				: {startMap: parseInt(key.split("_")[0], 10), endMap: parseInt(key.split("_")[1], 10), x, y};
		}
		render();
		refreshSyncPanel();
		refreshInspector();
	});
}
