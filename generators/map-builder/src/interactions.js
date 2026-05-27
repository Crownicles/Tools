/**
 * Mouse/keyboard interactions on the canvas:
 *  - Pan (middle click or space + drag)
 *  - Drag node/edge in editor mode (snap to integer px unless shift held)
 *  - Drop missing item from sync panel onto canvas
 *  - Zoom on wheel (anchored to mouse position)
 *  - Right click → context menu (delete / center / copy id)
 *  - Cmd/Ctrl+Z undo, +Shift+Z redo
 *  - Background image drop (Editor + Crownicles repo image upload pipeline)
 */
import {state} from "./state.js";
import {$} from "./utils.js";
import {toast} from "./feedback.js";
import {SNAP_PX} from "./constants.js";
import {
	canvasToCoord,
	fitView,
	getCanvas,
	getScalingFactor,
	hitTest,
	render
} from "./canvas.js";
import {refreshInspector, refreshSyncPanel} from "./panels.js";
import {pushUndo, redo, undo} from "./history.js";
import {loadImage} from "./images.js";

export function wireCanvasInteractions() {
	const c = getCanvas();

	c.addEventListener("mousedown", (e) => {
		const rect = c.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		if (e.button === 1 || state.spacePressed) {
			state.panState = {startMouse: {x: mx, y: my}, startOffset: {x: state.view.offsetX, y: state.view.offsetY}};
			c.classList.add("panning");
			e.preventDefault();
			return;
		}
		if (e.button === 0) {
			const hit = hitTest(mx, my);
			if (hit) {
				state.selected = {type: hit.type, key: hit.key};
				refreshInspector();
				render();
				if (state.mode === "editor") {
					pushUndo();
					state.dragState = {
						type: hit.type,
						key: hit.key,
						startMouse: {x: mx, y: my},
						startCoord: {x: hit.data.x, y: hit.data.y},
						noSnap: e.shiftKey
					};
					c.classList.add("dragging");
				}
			}
			else {
				state.selected = null;
				refreshInspector();
				render();
			}
		}
	});

	c.addEventListener("mousemove", (e) => {
		const rect = c.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		if (state.panState) {
			state.view.offsetX = state.panState.startOffset.x + (mx - state.panState.startMouse.x);
			state.view.offsetY = state.panState.startOffset.y + (my - state.panState.startMouse.y);
			render();
			return;
		}
		if (state.dragState) {
			const page = state.mapPages[state.currentTab];
			const langFactor = getScalingFactor(page, state.lang);
			const dxc = (mx - state.dragState.startMouse.x) / state.view.scale / langFactor;
			const dyc = (my - state.dragState.startMouse.y) / state.view.scale / langFactor;
			let nx = state.dragState.startCoord.x + dxc;
			let ny = state.dragState.startCoord.y + dyc;
			const noSnap = state.dragState.noSnap || e.shiftKey;
			if (!noSnap) {
				nx = Math.round(nx / SNAP_PX) * SNAP_PX;
				ny = Math.round(ny / SNAP_PX) * SNAP_PX;
			}
			const {type, key} = state.dragState;
			const target = type === "node" ? page.nodes : page.edges;
			if (target[key]) {
				target[key].x = nx;
				target[key].y = ny;
			}
			render();
		}
	});

	c.addEventListener("mouseup", () => {
		if (state.dragState) {
			refreshInspector();
			refreshSyncPanel();
		}
		state.panState = null;
		state.dragState = null;
		c.classList.remove("panning", "dragging");
	});

	// Drag-and-drop from the missing list onto the canvas to place a coord.
	c.addEventListener("dragover", (e) => {
		if (state.mode !== "editor") {
			return;
		}
		if (!Array.from(e.dataTransfer.types).includes("application/x-crownicles-missing")) {
			return;
		}
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		c.classList.add("drop-target");
	});
	c.addEventListener("dragleave", () => c.classList.remove("drop-target"));
	c.addEventListener("drop", (e) => {
		c.classList.remove("drop-target");
		if (state.mode !== "editor") {
			return;
		}
		const raw = e.dataTransfer.getData("application/x-crownicles-missing");
		if (!raw) {
			return;
		}
		e.preventDefault();
		let payload;
		try {
			payload = JSON.parse(raw);
		}
		catch {
			return;
		}
		const page = state.mapPages[state.currentTab];
		if (!page) {
			return;
		}
		const rect = c.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const coord = canvasToCoord(mx, my);
		const langFactor = getScalingFactor(page, state.lang);
		const x = Math.round(coord.x / langFactor);
		const y = Math.round(coord.y / langFactor);
		pushUndo();
		if (payload.kind === "node") {
			page.nodes = page.nodes || {};
			page.nodes[payload.key] = {x, y};
		}
		else {
			const [lo, hi] = payload.key.split("_").map((n) => parseInt(n, 10));
			page.edges = page.edges || {};
			page.edges[payload.key] = {startMap: lo, endMap: hi, x, y};
		}
		state.selected = {type: payload.kind, key: payload.key};
		render();
		refreshSyncPanel();
		refreshInspector();
		toast(`${payload.kind === "node" ? "Nœud" : "Arête"} ${payload.key} placé(e) à (${x}, ${y})`, "success");
	});

	c.addEventListener("wheel", (e) => {
		e.preventDefault();
		const rect = c.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const before = canvasToCoord(mx, my);
		const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
		state.view.scale *= factor;
		const after = canvasToCoord(mx, my);
		state.view.offsetX += (after.x - before.x) * state.view.scale;
		state.view.offsetY += (after.y - before.y) * state.view.scale;
		render();
	}, {passive: false});

	c.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		const rect = c.getBoundingClientRect();
		const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
		if (!hit || state.mode !== "editor") {
			return;
		}
		state.selected = {type: hit.type, key: hit.key};
		refreshInspector();
		render();
		const m = $("contextMenu");
		m.style.left = `${e.clientX}px`;
		m.style.top = `${e.clientY}px`;
		m.classList.remove("hidden");
	});

	document.addEventListener("click", (e) => {
		const m = $("contextMenu");
		if (!m.contains(e.target)) {
			m.classList.add("hidden");
		}
	});

	$("contextMenu").querySelectorAll("button").forEach((btn) => {
		btn.addEventListener("click", () => {
			const action = btn.dataset.action;
			$("contextMenu").classList.add("hidden");
			if (!state.selected) {
				return;
			}
			const {type, key} = state.selected;
			const page = state.mapPages[state.currentTab];
			if (action === "delete") {
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
			}
			else if (action === "reset") {
				pushUndo();
				const center = canvasToCoord(getCanvas().width / 2, getCanvas().height / 2);
				const lf = getScalingFactor(page, state.lang);
				const target = type === "node" ? page.nodes : page.edges;
				if (target[key]) {
					target[key].x = Math.round(center.x / lf);
					target[key].y = Math.round(center.y / lf);
				}
				render();
				refreshSyncPanel();
				refreshInspector();
			}
			else if (action === "copy") {
				navigator.clipboard.writeText(key).then(() => toast(`Copié: ${key}`, "success"));
			}
		});
	});
}

export function wireKeyboard() {
	window.addEventListener("keydown", (e) => {
		if (e.code === "Space") {
			state.spacePressed = true;
		}
		const meta = e.metaKey || e.ctrlKey;
		if (meta && e.key.toLowerCase() === "z") {
			e.preventDefault();
			if (e.shiftKey) {
				redo();
			}
			else {
				undo();
			}
		}
	});
	window.addEventListener("keyup", (e) => {
		if (e.code === "Space") {
			state.spacePressed = false;
		}
	});
}

export function wireBackgroundDrop() {
	const wrap = $("canvasWrapper");
	const overlay = $("dropOverlay");
	["dragenter", "dragover"].forEach((ev) => {
		wrap.addEventListener(ev, (e) => {
			e.preventDefault();
			if (state.mode !== "editor") {
				return;
			}
			overlay.classList.remove("hidden");
		});
	});
	["dragleave", "drop"].forEach((ev) => {
		wrap.addEventListener(ev, (e) => {
			e.preventDefault();
			overlay.classList.add("hidden");
		});
	});
	wrap.addEventListener("drop", async (e) => {
		if (state.mode !== "editor" || !state.currentTab) {
			return;
		}
		const file = e.dataTransfer.files?.[0];
		if (!file || !file.type.startsWith("image/")) {
			return;
		}
		const blob = file;
		const url = URL.createObjectURL(blob);
		const img = await loadImage(url);
		state.backgroundsCache[state.currentTab] ||= {};
		state.backgroundsCache[state.currentTab][state.lang] = img;
		state.pendingBackgrounds[state.currentTab] ||= {};
		state.pendingBackgrounds[state.currentTab][state.lang] = blob;
		const page = state.mapPages[state.currentTab];
		page.backgrounds ||= {};
		page.backgrounds[state.lang] ||= {filename: file.name, width: img.width, height: img.height};
		page.backgrounds[state.lang].width = img.width;
		page.backgrounds[state.lang].height = img.height;
		page.backgrounds[state.lang].filename = page.backgrounds[state.lang].filename || file.name;
		toast(`Fond ${state.lang} mis à jour (${img.width}×${img.height})`, "success");
		fitView();
	});
}
