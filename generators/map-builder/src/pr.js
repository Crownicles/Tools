/**
 * Auto-PR flows + ZIP export of coords.
 *
 *  - openCrowniclesPr: PR mapCoords JSON files to Tools repo (state.mapCoordsRepo)
 *  - pushOutputsToWebsite: PR rendered WebP images to Website repo
 *  - openWebsitePr: PR pending dropped background images to Website repo
 *  - exportCoordsZip: download mapCoords/*.json as a single ZIP
 */
import {state} from "./state.js";
import {$, blobToB64, serializeMapPage, utf8ToB64} from "./utils.js";
import {focusPatInput, toast} from "./feedback.js";
import {GitHubClient} from "./github.js";
import {PATHS} from "./constants.js";

function getChangedMapPages() {
	const changed = [];
	Object.keys(state.mapPages).forEach((k) => {
		const cur = serializeMapPage(state.mapPages[k]);
		const orig = state.originalMapPages[k] ? serializeMapPage(state.originalMapPages[k]) : "";
		if (cur !== orig) {
			changed.push({key: k, content: cur, isNew: !state.originalMapPages[k]});
		}
	});
	return changed;
}

export async function openCrowniclesPr() {
	if (!state.pat && !state.dryRun) {
		focusPatInput();
		toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000);
		return;
	}
	const changed = getChangedMapPages();
	if (!changed.length) {
		toast("Aucun changement à pousser", "info");
		return;
	}
	const client = new GitHubClient(state.mapCoordsRepo, state.mapCoordsBranch);
	try {
		await client.verifyAuth();
		const sha = await client.getBaseSha();
		const branch = `map-update-${new Date().toISOString().replace(/[:.]/g, "-")}`;
		await client.createBranch(branch, sha);
		for (const f of changed) {
			const path = `${PATHS.mapCoords}/${f.key}.json`;
			const existing = await client.getExistingFileSha(path, state.mapCoordsBranch);
			await client.putFile(path, utf8ToB64(f.content), branch, `map-builder: update ${path}`, existing);
		}
		const body = `Mise à jour des coordonnées map.\n\nFichiers modifiés:\n${changed.map((c) => `- \`${PATHS.mapCoords}/${c.key}.json\``).join("\n")}`;
		const prUrl = await client.openPr(branch, state.mapCoordsBranch, "Map update via map-builder", body);
		toast(`PR mapCoords ouverte: ${prUrl}`, "success", 8000);
		if (!state.dryRun) {
			window.open(prUrl, "_blank");
		}
	}
	catch (e) {
		toast(`Erreur PR mapCoords: ${e.message}`, "error", 8000);
		console.error(e);
	}
}

export async function pushOutputsToWebsite(outputs) {
	if (!state.pat && !state.dryRun) {
		focusPatInput();
		toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000);
		return;
	}
	if (!outputs.length) {
		toast("Aucune image à pousser", "info");
		return;
	}
	const client = new GitHubClient(state.wsRepo, state.wsBranch);
	try {
		await client.verifyAuth();
		const sha = await client.getBaseSha();
		const branch = `map-update-${new Date().toISOString().replace(/[:.]/g, "-")}`;
		await client.createBranch(branch, sha);
		let i = 0;
		for (const o of outputs) {
			const path = `${PATHS.websiteMapsCursed}/${o.name}`;
			const existing = await client.getExistingFileSha(path, state.wsBranch);
			const b64 = await blobToB64(o.blob);
			await client.putFile(path, b64, branch, `map-builder: render ${o.name}`, existing);
			i++;
			$("renderProgressLabel").textContent = `Upload ${i}/${outputs.length}`;
		}
		const body = `Mise à jour des images de carte.\n\n${outputs.length} fichier(s) WebP générés.`;
		const prUrl = await client.openPr(branch, state.wsBranch, "Map images via map-builder", body);
		toast(`PR Website ouverte: ${prUrl}`, "success", 8000);
		if (!state.dryRun) {
			window.open(prUrl, "_blank");
		}
	}
	catch (e) {
		toast(`Erreur PR Website: ${e.message}`, "error", 8000);
		console.error(e);
	}
}

export async function openWebsitePr() {
	// Push pending backgrounds (the dropped images), if any.
	const pending = [];
	Object.entries(state.pendingBackgrounds).forEach(([page, langs]) => {
		Object.entries(langs).forEach(([lang, blob]) => {
			const filename = state.mapPages[page]?.backgrounds?.[lang]?.filename;
			if (filename) {
				pending.push({name: filename, blob, subPath: PATHS.websiteRessources});
			}
		});
	});
	if (!pending.length) {
		toast("Aucun fond en attente. Utilise « Rendu images… » pour pousser des rendus.", "info");
		return;
	}
	if (!state.pat && !state.dryRun) {
		focusPatInput();
		toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000);
		return;
	}
	const client = new GitHubClient(state.wsRepo, state.wsBranch);
	try {
		await client.verifyAuth();
		const sha = await client.getBaseSha();
		const branch = `map-bg-${new Date().toISOString().replace(/[:.]/g, "-")}`;
		await client.createBranch(branch, sha);
		for (const f of pending) {
			const path = `${f.subPath}/${f.name}`;
			const existing = await client.getExistingFileSha(path, state.wsBranch);
			await client.putFile(path, await blobToB64(f.blob), branch, `map-builder: bg ${f.name}`, existing);
		}
		const prUrl = await client.openPr(branch, state.wsBranch, "Map backgrounds via map-builder",
			`Fonds mis à jour:\n${pending.map((f) => `- \`${f.subPath}/${f.name}\``).join("\n")}`);
		toast(`PR Website ouverte: ${prUrl}`, "success", 8000);
		if (!state.dryRun) {
			window.open(prUrl, "_blank");
		}
	}
	catch (e) {
		toast(`Erreur PR Website: ${e.message}`, "error", 8000);
	}
}

export async function exportCoordsZip() {
	const zip = new window.JSZip();
	const folder = zip.folder("mapCoords");
	Object.entries(state.mapPages).forEach(([k, p]) => {
		folder.file(`${k}.json`, serializeMapPage(p));
	});
	const blob = await zip.generateAsync({type: "blob"});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = `mapCoords-${Date.now()}.zip`;
	a.click();
	toast("ZIP des coords téléchargé", "success");
}
