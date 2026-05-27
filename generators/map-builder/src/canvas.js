/**
 * Canvas rendering of the editor.
 *
 * Coordinate system:
 *  - Map coords (stored in JSON) are expressed in the page's `coordSpace`
 *    (typically "fr"). The other lang multiplies via `scaling`.
 *  - The visible canvas applies `state.view.scale` and `state.view.offset*`
 *    on top of map coords.
 *
 * Missing markers are NOT drawn here: they live in the side sync panel and
 * get placed on the canvas via drag-and-drop (see interactions.js).
 */
import {state} from "./state.js";
import {$, matchesSeason} from "./utils.js";
import {categorize} from "./categorize.js";

export function getCanvas() {
	return $("mapCanvas");
}

export function resizeCanvas() {
	const wrap = $("canvasWrapper");
	const c = getCanvas();
	c.width = wrap.clientWidth;
	c.height = wrap.clientHeight;
	render();
}

export function getScalingFactor(page, lang) {
	const cs = page.coordSpace || "fr";
	const s = page.scaling || {};
	return (s[lang] || 1) / (s[cs] || 1);
}

export function coordToCanvas(x, y) {
	return {
		x: x * state.view.scale + state.view.offsetX,
		y: y * state.view.scale + state.view.offsetY
	};
}

export function canvasToCoord(cx, cy) {
	return {
		x: (cx - state.view.offsetX) / state.view.scale,
		y: (cy - state.view.offsetY) / state.view.scale
	};
}

export function fitView() {
	if (!state.currentTab) {
		return;
	}
	const page = state.mapPages[state.currentTab];
	const bg = state.backgroundsCache[state.currentTab]?.[state.lang];
	const c = getCanvas();
	const w = bg ? bg.width : (page.backgrounds?.[state.lang]?.width || 2000);
	const h = bg ? bg.height : (page.backgrounds?.[state.lang]?.height || 1500);
	const scaleX = c.width / w;
	const scaleY = c.height / h;
	state.view.scale = Math.min(scaleX, scaleY) * 0.95;
	state.view.offsetX = (c.width - w * state.view.scale) / 2;
	state.view.offsetY = (c.height - h * state.view.scale) / 2;
	render();
}

export function render() {
	const c = getCanvas();
	const ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);
	ctx.fillStyle = "#111827";
	ctx.fillRect(0, 0, c.width, c.height);

	if (!state.currentTab) {
		return;
	}
	const page = state.mapPages[state.currentTab];
	if (!page) {
		return;
	}
	const bg = state.backgroundsCache[state.currentTab]?.[state.lang];
	const placeholder = $("canvasPlaceholder");
	if (bg) {
		placeholder.classList.add("hidden");
		ctx.drawImage(bg, state.view.offsetX, state.view.offsetY, bg.width * state.view.scale, bg.height * state.view.scale);
	}
	else {
		placeholder.classList.remove("hidden");
	}

	const cat = categorize(state.currentTab);
	const langFactor = getScalingFactor(page, state.lang);
	const markerImg = state.markerImagesCache[page.marker?.image];

	drawSet(ctx, page, page.nodes || {}, "node", cat, langFactor, markerImg);
	drawSet(ctx, page, page.edges || {}, "edge", cat, langFactor, markerImg);
}

function drawSet(ctx, page, items, kind, cat, langFactor, markerImg) {
	Object.entries(items).forEach(([id, data]) => {
		if (!matchesSeason(data)) {
			return;
		}
		const orphanList = kind === "node" ? cat.orphan.nodes : cat.orphan.edges;
		const status = orphanList.includes(id) ? "orphan" : "synced";
		drawMarker(ctx, page, data.x, data.y, id, kind, status, langFactor, markerImg);
	});
}

function drawMarker(ctx, page, x, y, label, kind, status, langFactor, markerImg) {
	const sx = x * langFactor;
	const sy = y * langFactor;
	const p = coordToCanvas(sx, sy);
	const size = page.marker?.size || {width: 32, height: 32};
	const anchor = page.marker?.anchor || "top-left";
	const w = size.width * state.view.scale * langFactor;
	const h = size.height * state.view.scale * langFactor;
	let dx = p.x;
	let dy = p.y;
	if (anchor === "center") {
		const off = page.marker?.anchorOffset || {x: w / 2, y: h / 2};
		dx -= off.x * state.view.scale * langFactor;
		dy -= off.y * state.view.scale * langFactor;
	}

	ctx.save();
	if (status === "missing") {
		ctx.globalAlpha = 0.6;
	}

	if (markerImg) {
		ctx.drawImage(markerImg, dx, dy, w, h);
	}
	else {
		ctx.fillStyle = kind === "node" ? "#2563eb" : "#10b981";
		ctx.fillRect(dx, dy, Math.max(8, w), Math.max(8, h));
	}

	let outline = null;
	if (status === "orphan") {
		outline = "#ef4444";
	}
	else if (status === "missing") {
		outline = "#f59e0b";
	}
	if (state.selected && state.selected.type === kind && String(state.selected.key) === String(label)) {
		outline = "#2563eb";
	}
	if (outline) {
		ctx.strokeStyle = outline;
		ctx.lineWidth = 3;
		ctx.strokeRect(dx, dy, Math.max(8, w), Math.max(8, h));
	}

	if (state.showLabels) {
		ctx.globalAlpha = 1;
		ctx.fillStyle = "#fff";
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.font = "12px Inter, sans-serif";
		const text = state.placeNames[label] ? `${label} (${state.placeNames[label]})` : String(label);
		ctx.strokeText(text, dx, dy - 4);
		ctx.fillText(text, dx, dy - 4);
	}
	ctx.restore();
}

/**
 * Returns the topmost marker (node or edge) at canvas coords (mouseX, mouseY),
 * or null if none. Edges are checked before nodes because they're drawn on top.
 */
export function hitTest(mouseX, mouseY) {
	const page = state.mapPages[state.currentTab];
	if (!page) {
		return null;
	}
	const langFactor = getScalingFactor(page, state.lang);
	const size = page.marker?.size || {width: 32, height: 32};
	const anchor = page.marker?.anchor || "top-left";
	const candidates = [
		...Object.entries(page.edges || {}).map(([k, d]) => ({type: "edge", key: k, data: d})),
		...Object.entries(page.nodes || {}).map(([k, d]) => ({type: "node", key: k, data: d}))
	].filter((c) => matchesSeason(c.data)).reverse();
	for (const c of candidates) {
		const p = coordToCanvas(c.data.x * langFactor, c.data.y * langFactor);
		const w = size.width * state.view.scale * langFactor;
		const h = size.height * state.view.scale * langFactor;
		let dx = p.x;
		let dy = p.y;
		if (anchor === "center") {
			const off = page.marker?.anchorOffset || {x: w / 2, y: h / 2};
			dx -= off.x * state.view.scale * langFactor;
			dy -= off.y * state.view.scale * langFactor;
		}
		if (mouseX >= dx && mouseX <= dx + Math.max(8, w) && mouseY >= dy && mouseY <= dy + Math.max(8, h)) {
			return c;
		}
	}
	return null;
}
