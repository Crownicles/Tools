/**
 * Image rendering pipeline (offscreen canvas → WebP blobs).
 *
 * For each (page, lang, marker) combo: draw the bg, draw the marker centered
 * on its coord, downscale to maxDim, encode WebP at quality. Outputs go either
 * to a downloadable ZIP or to the Website repo as a PR (see pr.js).
 */
import {state} from "./state.js";
import {$, delay, matchesSeason} from "./utils.js";
import {toast} from "./feedback.js";
import {fetchBackground, loadMarkerImage} from "./images.js";
import {getScalingFactor} from "./canvas.js";
import {pushOutputsToWebsite} from "./pr.js";

let renderCancel = false;

export function setRenderCancel(v) {
	renderCancel = v;
}

export async function renderImages() {
	const scope = $("renderScope").value;
	const maxDim = parseInt($("renderMaxDim").value, 10) || 1920;
	const quality = parseFloat($("renderQuality").value);
	const dest = $("renderDest").value;
	renderCancel = false;

	const pages = (scope === "page" || scope === "pageAllLangs") ? [state.currentTab] : Object.keys(state.mapPages);
	const langs = (scope === "allPagesAllLangs" || scope === "pageAllLangs") ? ["fr", "en"] : [state.lang];

	const outputs = [];
	let total = 0;
	pages.forEach((p) => {
		const pageData = state.mapPages[p];
		if (!pageData) {
			return;
		}
		langs.forEach(() => {
			total += Object.keys(pageData.nodes || {}).length + Object.keys(pageData.edges || {}).length;
		});
	});

	let done = 0;
	const updateProg = () => {
		const pct = total ? Math.round(done * 100 / total) : 100;
		$("renderProgress").firstElementChild.style.width = `${pct}%`;
		$("renderProgressLabel").textContent = `${done}/${total}`;
	};
	updateProg();

	for (const p of pages) {
		if (renderCancel) {
			break;
		}
		for (const lang of langs) {
			if (renderCancel) {
				break;
			}
			const bg = await fetchBackground(p, lang);
			if (!bg) {
				toast(`Aucun fond pour ${p}/${lang} — ignoré`, "error");
				continue;
			}
			const markerImg = await loadMarkerImage(state.mapPages[p]);
			const page = state.mapPages[p];
			const langFactor = getScalingFactor(page, lang);
			const allItems = [
				...Object.entries(page.nodes || {}).map(([k, d]) => ({kind: "node", key: k, data: d})),
				...Object.entries(page.edges || {}).map(([k, d]) => ({kind: "edge", key: k, data: d}))
			].filter((it) => matchesSeason(it.data));
			for (const it of allItems) {
				if (renderCancel) {
					break;
				}
				const blob = await renderOne(bg, markerImg, page, it, langFactor, maxDim, quality);
				outputs.push({name: `${lang}_${it.key}_map.webp`, blob});
				done++;
				updateProg();
				if (done % 10 === 0) {
					await delay(0);
				}
			}
		}
	}

	if (renderCancel) {
		toast("Rendu annulé", "info");
		return;
	}

	if (dest === "zip") {
		await downloadOutputsZip(outputs);
	}
	else {
		await pushOutputsToWebsite(outputs);
	}
}

async function renderOne(bg, markerImg, page, item, langFactor, maxDim, quality) {
	const off = document.createElement("canvas");
	off.width = bg.width;
	off.height = bg.height;
	const ctx = off.getContext("2d");
	ctx.drawImage(bg, 0, 0);

	const sx = item.data.x * langFactor;
	const sy = item.data.y * langFactor;
	const size = page.marker?.size || {width: 32, height: 32};
	const anchor = page.marker?.anchor || "top-left";
	let dx = sx;
	let dy = sy;
	const w = size.width * langFactor;
	const h = size.height * langFactor;
	if (anchor === "center") {
		const offc = page.marker?.anchorOffset || {x: w / 2, y: h / 2};
		dx -= offc.x * langFactor;
		dy -= offc.y * langFactor;
	}
	if (markerImg) {
		ctx.drawImage(markerImg, dx, dy, w, h);
	}
	else {
		ctx.fillStyle = "red";
		ctx.fillRect(dx, dy, Math.max(8, w), Math.max(8, h));
	}

	const longest = Math.max(off.width, off.height);
	let finalCanvas = off;
	if (longest > maxDim) {
		const scale = maxDim / longest;
		finalCanvas = document.createElement("canvas");
		finalCanvas.width = Math.round(off.width * scale);
		finalCanvas.height = Math.round(off.height * scale);
		finalCanvas.getContext("2d").drawImage(off, 0, 0, finalCanvas.width, finalCanvas.height);
	}
	return new Promise((resolve) => finalCanvas.toBlob((b) => resolve(b), "image/webp", quality));
}

async function downloadOutputsZip(outputs) {
	const zip = new window.JSZip();
	const folder = zip.folder("mapsCursed");
	outputs.forEach((o) => folder.file(o.name, o.blob));
	const blob = await zip.generateAsync({type: "blob"});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = `mapsCursed-${Date.now()}.zip`;
	a.click();
	toast(`ZIP généré (${outputs.length} fichiers)`, "success", 8000);
}
