const REPOS = {crownicles: "Crownicles/Crownicles", tools: "Crownicles/Tools"};
const PATHS = {
	locations: "Core/resources/mapLocations",
	links: "Core/resources/mapLinks",
	events: "Core/resources/events",
	models: "Lang/fr/models.json",
	expeditions: "Lib/src/constants/ExpeditionConstants.ts",
	mapTypes: "Lib/src/constants/MapLocationConstants.ts",
	coords: "generators/map-builder/mapCoords",
	coordsManifest: "generators/map-builder/mapCoords/_manifest.json"
};
const DEFAULTS = {crowniclesRef: "develop", toolsRef: "master", fallbackBiome: "plains"};
const NON_GEOGRAPHIC_TYPES = new Set(["continent", "pveExit"]);
const TUTORIAL_LOCATION_TYPES = new Set(["castleEntrance", "castleThrone"]);
const COLORS = ["#6fa85f", "#3f91b3", "#2f7d52", "#d19a32", "#8a8f98", "#748c3a", "#ae6250", "#76558e", "#c45d83", "#547a9b", "#a57b45", "#4f8d7b"];
const repositoryIndexCache = new Map();
const state = {
	locations: [], links: [], events: [], pages: [], zones: [], names: {}, typeNames: {}, typeCodes: {}, mapping: {},
	declaredBiomes: [], lootBiomes: new Set(), activeZoneId: null, activePageId: null, selectedId: null,
	mode: "effective", eventFilter: "all", showLabels: false, showDirections: true,
	crowniclesRef: DEFAULTS.crowniclesRef, toolsRef: DEFAULTS.toolsRef
};
const $ = id => document.getElementById(id);

function escapeHtml(value) {
	return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function setStatus(message, tone = "") {
	$("status").textContent = message;
	$("status").className = `status ${tone}`.trim();
}

async function request(url, label) {
	const response = await fetch(url, {cache: "force-cache"});
	if (!response.ok) throw new Error(`${label} : ${response.status} ${response.statusText}`);
	return response;
}

async function fetchJson(url, label) { return (await request(url, label)).json(); }
async function fetchText(url, label) { return (await request(url, label)).text(); }

function cdnUrl(repo, path, ref) {
	return `https://cdn.jsdelivr.net/gh/${repo}@${encodeURIComponent(ref)}/${path}`;
}

async function fetchFile(repo, path, ref, text = false) {
	const url = cdnUrl(repo, path, ref);
	return text ? fetchText(url, path) : fetchJson(url, path);
}

async function fetchRepositoryIndex(repo, ref) {
	const cacheKey = `${repo}@${ref}`;
	if (repositoryIndexCache.has(cacheKey)) return repositoryIndexCache.get(cacheKey);
	const url = `https://data.jsdelivr.com/v1/package/gh/${repo}@${encodeURIComponent(ref)}/flat`;
	const pendingIndex = fetchJson(url, cacheKey).then(payload => {
		if (!Array.isArray(payload.files)) throw new Error(`Index indisponible pour ${cacheKey}`);
		return payload.files.map(file => file.name.replace(/^\//, ""));
	});
	repositoryIndexCache.set(cacheKey, pendingIndex);
	return pendingIndex;
}

function parseConcatenatedJson(source) {
	const values = [];
	let start = -1;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (inString) {
			if (escaped) escaped = false;
			else if (character === "\\") escaped = true;
			else if (character === '"') inString = false;
			continue;
		}
		if (character === '"') {
			inString = true;
			continue;
		}
		if (character === "{" || character === "[") {
			if (depth === 0) start = index;
			depth += 1;
		}
		else if (character === "}" || character === "]") {
			depth -= 1;
			if (depth === 0 && start >= 0) {
				values.push(JSON.parse(source.slice(start, index + 1)));
				start = -1;
			}
		}
	}
	if (depth !== 0 || inString) throw new Error("Réponse JSON groupée incomplète");
	return values;
}

async function fetchCombinedFiles(repo, files, ref, label) {
	const batches = [];
	for (let index = 0; index < files.length; index += 30) batches.push(files.slice(index, index + 30));
	const results = await Promise.all(batches.map(async (batch, index) => {
		const paths = batch.map(path => `gh/${repo}@${encodeURIComponent(ref)}/${path}`).join(",");
		const payload = parseConcatenatedJson(await fetchText(`https://cdn.jsdelivr.net/combine/${paths}`, `${label} ${index + 1}/${batches.length}`));
		if (payload.length !== batch.length) throw new Error(`${label} : ${payload.length}/${batch.length} fichiers reçus`);
		return payload;
	}));
	return results.flat();
}

async function fetchNumberedDirectory(path, label) {
	const prefix = `${path}/`;
	const files = (await fetchRepositoryIndex(REPOS.crownicles, state.crowniclesRef))
		.filter(file => file.startsWith(prefix) && /^\d+\.json$/.test(file.slice(prefix.length)));
	const payloads = await fetchCombinedFiles(REPOS.crownicles, files, state.crowniclesRef, label);
	return files.map((file, index) => ({id: Number.parseInt(file.slice(prefix.length), 10), data: payloads[index]}));
}

async function fetchCoordinateEntries() {
	let filenames;
	try {
		filenames = location.hostname === "localhost" || location.hostname === "127.0.0.1"
			? await fetchJson("../map-builder/mapCoords/_manifest.json", PATHS.coordsManifest)
			: await fetchFile(REPOS.tools, PATHS.coordsManifest, state.toolsRef);
	}
	catch {
		filenames = await fetchJson("../map-builder/mapCoords/_manifest.json", PATHS.coordsManifest);
	}
	if (!Array.isArray(filenames)) throw new Error(`${PATHS.coordsManifest} doit contenir une liste`);
	const paths = filenames.map(name => `${PATHS.coords}/${name}`);
	const payloads = await fetchCombinedFiles(REPOS.tools, paths, state.toolsRef, "Cartes");
	return filenames.map((name, index) => ({name, data: payloads[index]}));
}

function objectBlock(source, marker) {
	const markerIndex = source.indexOf(marker);
	const start = source.indexOf("{", markerIndex);
	if (markerIndex < 0 || start < 0) return "";
	let depth = 0;
	for (let index = start; index < source.length; index += 1) {
		if (source[index] === "{") depth += 1;
		if (source[index] === "}" && --depth === 0) return source.slice(start + 1, index);
	}
	return "";
}

function parseConstants(expeditionSource, mapTypeSource) {
	state.typeCodes = Object.fromEntries([...mapTypeSource.matchAll(/^\s*([A-Z_]+):\s*"([^"]+)"/gm)].map(match => [match[1], match[2]]));
	state.declaredBiomes = [...objectBlock(expeditionSource, "EXPEDITION_LOCATION_TYPES").matchAll(/^\s*[A-Z_]+:\s*"([^"]+)"/gm)].map(match => match[1]);
	state.mapping = {};
	for (const match of objectBlock(expeditionSource, "MAP_TYPE_TO_EXPEDITION_TYPE").matchAll(/\[MapLocationConstants\.TYPES\.([A-Z_]+)\]:\s*"([^"]+)"/g)) {
		if (state.typeCodes[match[1]]) state.mapping[state.typeCodes[match[1]]] = match[2];
	}
	state.lootBiomes = new Set([...objectBlock(expeditionSource, "EXPEDITION_LOOT_TABLES").matchAll(/^\s*([A-Za-z][\w-]*):\s*\[/gm)].map(match => match[1]));
	if (!state.declaredBiomes.length || !Object.keys(state.mapping).length) throw new Error("Les constantes de biomes n'ont pas pu être lues");
}

function normalizeModels(models) {
	state.names = Object.fromEntries(Object.entries(models.map_locations || {}).map(([id, value]) => [id, typeof value === "string" ? value : value.name || `Lieu ${id}`]));
	state.typeNames = Object.fromEntries(Object.entries(models.map_types || {}).map(([type, value]) => [type, typeof value === "string" ? value : value.name || type]));
}

function collectRules(value, path = [], output = []) {
	if (!value || typeof value !== "object") return output;
	if (Array.isArray(value.mapTypesDestination) || Array.isArray(value.mapTypesExcludeDestination)) {
		output.push({path: path.join(" / "), include: value.mapTypesDestination || [], exclude: value.mapTypesExcludeDestination || []});
	}
	Object.entries(value).forEach(([key, nested]) => collectRules(nested, [...path, key], output));
	return output;
}

function normalizeData(locationEntries, linkEntries, eventEntries, coordEntries) {
	state.locations = locationEntries.map(entry => ({id: entry.id, ...entry.data}));
	state.links = linkEntries.map(entry => ({id: entry.id, ...entry.data}));
	state.events = eventEntries.map(entry => ({
		id: entry.id,
		triggers: (entry.data.triggers || []).map(trigger => trigger.mapId).filter(Number.isFinite),
		rules: collectRules(entry.data.possibilities || {})
	})).filter(event => event.triggers.length && event.rules.length);
	state.pages = coordEntries.map(entry => ({...entry.data, sourceName: entry.name})).filter(page => page.mapPage);
	state.zones = buildZones();
}

function buildZones() {
	const grouped = new Map();
	state.pages.forEach(page => {
		const key = page.idRange ? `${page.idRange.min}-${page.idRange.max}` : page.mapPage;
		const pages = grouped.get(key) || [];
		pages.push(page);
		grouped.set(key, pages);
	});
	return [...grouped.entries()].map(([id, pages]) => {
		const baseNames = pages.map(page => (page.displayName || page.mapPage).replace(/\s+-\s+(Extérieur|Intérieur.*)$/i, ""));
		return {
			id, pages, idRange: pages.find(page => page.idRange)?.idRange || null,
			attributes: [...new Set(pages.flatMap(page => page.includeAttributes || []))],
			displayName: baseNames.every(name => name === baseNames[0]) ? baseNames[0] : pages[0].displayName,
			expeditionActive: pages.some(page => page.mapPage === "main_continent")
		};
	}).sort((left, right) => left.expeditionActive ? -1 : right.expeditionActive ? 1 : left.displayName.localeCompare(right.displayName, "fr"));
}

function activeZone() { return state.zones.find(zone => zone.id === state.activeZoneId) || state.zones[0]; }
function activePage() { return activeZone()?.pages.find(page => page.mapPage === state.activePageId) || activeZone()?.pages[0]; }
function locationById(id) { return state.locations.find(location => location.id === id); }
function locationName(value) { const id = typeof value === "object" ? value.id : value; return state.names[String(id)] || `Lieu ${id}`; }
function mapTypeName(type) { return state.typeNames[type] || type || "Inconnu"; }
function derivedBiome(location) { return state.mapping[location.type] || DEFAULTS.fallbackBiome; }
function effectiveBiome(location) { return location.expeditionType || derivedBiome(location); }
function displayedBiome(location) { return state.mode === "derived" ? derivedBiome(location) : effectiveBiome(location); }

function knownBiomes() {
	return [...new Set([...state.declaredBiomes, ...Object.values(state.mapping), ...state.locations.map(location => location.expeditionType).filter(Boolean), ...state.lootBiomes])];
}

function biomeColor(biome) { return COLORS[Math.max(0, knownBiomes().indexOf(biome)) % COLORS.length]; }
function biomeLabel(biome) {
	return {plains: "Plaines", coast: "Côte", forest: "Forêt", desert: "Désert", mountain: "Montagne", swamp: "Marais", ruins: "Ruines", cave: "Grotte"}[biome] || biome;
}

function matchesZone(location, zone = activeZone()) {
	if (zone.idRange && (location.id < zone.idRange.min || location.id > zone.idRange.max)) return false;
	return !zone.attributes.length || zone.attributes.includes(location.attribute);
}
function zoneLocations(zone = activeZone()) {
	return zone ? state.locations.filter(location => matchesZone(location, zone) && !TUTORIAL_LOCATION_TYPES.has(location.type)) : [];
}
function analyzedLocations(zone = activeZone()) {
	const locations = zoneLocations(zone).filter(location => !NON_GEOGRAPHIC_TYPES.has(location.type));
	return zone?.expeditionActive ? locations.filter(location => location.attribute === "continent1") : locations;
}
function pageLocations(page = activePage()) {
	const ids = new Set(Object.keys(page?.nodes || {}).map(Number));
	return zoneLocations().filter(location => ids.has(location.id));
}

function pagePosition(page, id) {
	const coord = page?.nodes?.[String(id)];
	const background = page?.backgrounds?.fr || Object.values(page?.backgrounds || {})[0];
	if (!coord || !background) return null;
	const marker = page.marker || {};
	const size = marker.size || {width: 0, height: 0};
	const offset = marker.anchorOffset || {x: size.width / 2, y: size.height / 2};
	const x = coord.x + (marker.anchor === "top-left" ? size.width / 2 : offset.x || 0);
	const y = coord.y + (marker.anchor === "top-left" ? size.height : offset.y || 0);
	const colocated = Object.entries(page.nodes || {}).filter(([, value]) => value.x === coord.x && value.y === coord.y).map(([key]) => Number(key)).sort((left, right) => left - right);
	const index = colocated.indexOf(Number(id));
	const angle = colocated.length > 1 ? index / colocated.length * Math.PI * 2 : 0;
	const radius = colocated.length > 1 ? Math.min(background.width, background.height) * 0.012 : 0;
	return {left: (x + Math.cos(angle) * radius) / background.width * 100, top: (y + Math.sin(angle) * radius) / background.height * 100};
}

function outgoingLinks(id) { return state.links.filter(link => link.startMap === id); }
function candidates(rule, triggerId) {
	return outgoingLinks(triggerId).filter(link => {
		const destination = locationById(link.endMap);
		if (!destination) return false;
		return rule.include.length ? rule.include.includes(destination.type) : rule.exclude.length ? !rule.exclude.includes(destination.type) : false;
	}).map(link => link.endMap);
}

function directionRecords() {
	const ids = new Set(zoneLocations().map(location => location.id));
	const records = [];
	state.events.forEach(event => {
		if (state.eventFilter !== "all" && String(event.id) !== state.eventFilter) return;
		event.triggers.filter(id => ids.has(id)).forEach(triggerId => event.rules.forEach(rule => records.push({eventId: event.id, triggerId, rule, candidateIds: candidates(rule, triggerId)})));
	});
	const grouped = new Map();
	records.forEach(record => {
		const key = `${record.eventId}:${record.triggerId}:${record.rule.include.join(",")}:${record.rule.exclude.join(",")}`;
		const existing = grouped.get(key);
		if (existing) {
			existing.candidateIds = [...new Set([...existing.candidateIds, ...record.candidateIds])];
		}
		else {
			grouped.set(key, {...record, candidateIds: [...new Set(record.candidateIds)]});
		}
	});
	return [...grouped.values()];
}

function selectZone(id) {
	state.activeZoneId = id;
	state.activePageId = activeZone()?.pages[0]?.mapPage || null;
	state.selectedId = null;
	state.eventFilter = "all";
	renderAll();
}

function renderZoneTabs() {
	$("zoneTabs").innerHTML = state.zones.map(zone => {
		const locations = zoneLocations(zone);
		const analyzed = analyzedLocations(zone);
		const unmapped = locations.filter(location => !state.mapping[location.type]).length;
		return `<button class="zone-tab ${zone.id === state.activeZoneId ? "active" : ""}" data-zone="${escapeHtml(zone.id)}"><span>${escapeHtml(zone.displayName)}</span><small>${locations.length} affichés · ${analyzed.length} analysés${unmapped ? ` · ${unmapped} non mappés` : ""}</small></button>`;
	}).join("");
	$("zoneTabs").querySelectorAll("[data-zone]").forEach(button => button.addEventListener("click", () => selectZone(button.dataset.zone)));
}

function renderPageTabs() {
	const zone = activeZone();
	$("pageTabs").hidden = zone.pages.length <= 1;
	$("pageTabs").innerHTML = zone.pages.map(page => `<button class="page-tab ${page.mapPage === state.activePageId ? "active" : ""}" data-page="${page.mapPage}">${escapeHtml(page.displayName)}</button>`).join("");
	$("pageTabs").querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => {
		state.activePageId = button.dataset.page;
		state.selectedId = null;
		renderPageTabs(); renderMap(); renderInspector();
	}));
}

function renderSummary() {
	const zone = activeZone();
	const locations = zoneLocations();
	const analyzed = analyzedLocations();
	const biomes = new Set(analyzed.map(displayedBiome));
	const unplaced = locations.filter(location => !NON_GEOGRAPHIC_TYPES.has(location.type) && !zone.pages.some(page => page.nodes?.[String(location.id)]));
	$("zoneTitle").textContent = zone.displayName;
	$("zoneScope").textContent = zone.expeditionActive ? "Zone actuellement utilisée pour les expéditions" : "Zone hors sélection actuelle des expéditions · vérification prospective des mappings";
	$("summaryStats").innerHTML = [
		[locations.length, "lieux affichés"], [analyzed.length, "lieux analysés"], [biomes.size, "biomes"],
		[locations.filter(location => !state.mapping[location.type]).length, "map types non mappés"],
		[locations.filter(location => location.expeditionType).length, "overrides"],
		[[...biomes].filter(biome => !state.lootBiomes.has(biome)).length, "biomes sans loot"],
		[unplaced.length, "lieux non placés"]
	].map(([value, label]) => `<article class="summary-stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></article>`).join("");
	$("mapTitle").textContent = activePage()?.displayName || zone.displayName;
}

function renderMap() {
	const page = activePage();
	const image = $("mapImage");
	const empty = $("mapEmpty");
	const overlay = $("mapOverlay");
	overlay.innerHTML = "";
	overlay.classList.toggle("hide-labels", !state.showLabels);
	const background = page?.backgrounds?.fr || Object.values(page?.backgrounds || {})[0];
	if (background) {
		$("mapShell").style.aspectRatio = `${background.width} / ${background.height}`;
		image.src = `https://raw.githubusercontent.com/${REPOS.tools}/${encodeURIComponent(state.toolsRef)}/generators/Ressources/${background.filename}`;
		image.hidden = false; empty.hidden = true;
	} else {
		image.hidden = true; empty.hidden = false; empty.textContent = "Aucun fond de carte configuré.";
	}
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("class", "direction-layer"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("preserveAspectRatio", "none");
	svg.innerHTML = '<defs><marker id="arrowHead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0 0, 7 3.5, 0 7"></polygon></marker></defs>';
	if (state.showDirections) renderDirections(svg, page);
	overlay.appendChild(svg);
	pageLocations(page).forEach(location => {
		const position = pagePosition(page, location.id);
		const biome = displayedBiome(location);
		const marker = document.createElement("button");
		marker.type = "button"; marker.className = `map-marker ${state.selectedId === location.id ? "selected" : ""}`;
		marker.style.left = `${position.left}%`; marker.style.top = `${position.top}%`; marker.style.setProperty("--biome-color", biomeColor(biome));
		marker.title = `${locationName(location)} · ${biomeLabel(biome)}`;
		marker.innerHTML = `${location.id}<span class="marker-name">${escapeHtml(locationName(location))}</span>`;
		marker.addEventListener("click", () => { state.selectedId = location.id; renderMap(); renderInspector(); });
		overlay.appendChild(marker);
	});
	const biomes = [...new Set(zoneLocations().map(displayedBiome))];
	$("mapLegend").innerHTML = biomes.map(biome => `<span class="legend-item" style="--biome-color:${biomeColor(biome)}"><span class="legend-swatch"></span>${escapeHtml(biomeLabel(biome))}</span>`).join("");
}

function renderDirections(svg, page) {
	const drawn = new Set();
	directionRecords().forEach(record => record.candidateIds.forEach(candidateId => {
		const start = pagePosition(page, record.triggerId); const end = pagePosition(page, candidateId); const key = `${record.eventId}-${record.triggerId}-${candidateId}`;
		if (!start || !end || drawn.has(key)) return;
		drawn.add(key);
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", start.left); line.setAttribute("y1", start.top); line.setAttribute("x2", end.left); line.setAttribute("y2", end.top);
		line.setAttribute("class", "direction-line"); line.setAttribute("marker-end", "url(#arrowHead)");
		const title = document.createElementNS("http://www.w3.org/2000/svg", "title"); title.textContent = `Event #${record.eventId} : ${locationName(record.triggerId)} → ${locationName(candidateId)}`;
		line.appendChild(title); svg.appendChild(line);
	}));
}

function renderInspector() {
	const location = locationById(state.selectedId);
	if (!location) {
		$("selectionPanel").innerHTML = '<p class="eyebrow">Inspecteur</p><h2>Sélectionne un lieu</h2><p class="muted">Mapping du biome et redirections forcées sur les lieux adjacents.</p>';
		return;
	}
	const effective = effectiveBiome(location); const outgoing = directionRecords().filter(record => record.triggerId === location.id); const incoming = directionRecords().filter(record => record.candidateIds.includes(location.id));
	$("selectionPanel").innerHTML = `<p class="eyebrow">Inspecteur</p><span class="selection-id">ID ${location.id}</span><h2>${escapeHtml(locationName(location))}</h2><dl>
		<div class="detail-row"><dt>Map type</dt><dd>${escapeHtml(mapTypeName(location.type))} <code>${escapeHtml(location.type)}</code></dd></div>
		<div class="detail-row"><dt>Mapping</dt><dd>${state.mapping[location.type] ? escapeHtml(biomeLabel(derivedBiome(location))) : `Absent → ${escapeHtml(biomeLabel(DEFAULTS.fallbackBiome))}`}</dd></div>
		<div class="detail-row"><dt>Override</dt><dd>${location.expeditionType ? escapeHtml(biomeLabel(location.expeditionType)) : "Aucun"}</dd></div>
		<div class="detail-row"><dt>Biome effectif</dt><dd>${escapeHtml(biomeLabel(effective))}</dd></div>
		<div class="detail-row"><dt>Loot table</dt><dd>${state.lootBiomes.has(effective) ? "Présente" : "Manquante"}</dd></div></dl>
		${directionDetails("Redirections sortantes", outgoing, location.id)}${directionDetails("Redirections entrantes possibles", incoming, location.id)}`;
}

function directionDetails(title, records, currentId) {
	if (!records.length) return `<section class="direction-detail"><h3>${title}</h3><p class="muted">Aucune.</p></section>`;
	return `<section class="direction-detail"><h3>${title}</h3>${records.map(record => {
		const others = record.triggerId === currentId ? record.candidateIds : [record.triggerId];
		const filter = record.rule.include.length ? `types ${record.rule.include.join(", ")}` : `hors ${record.rule.exclude.join(", ")}`;
		return `<p><strong>Event #${record.eventId}</strong> · ${escapeHtml(filter)}<br>${others.length ? others.map(locationName).map(escapeHtml).join(", ") : '<span class="warning-text">Aucune destination adjacente valide</span>'}</p>`;
	}).join("")}</section>`;
}

function countBy(locations, resolver) {
	const counts = new Map(); locations.forEach(location => counts.set(resolver(location), (counts.get(resolver(location)) || 0) + 1)); return counts;
}

function renderCoverage() {
	const locations = analyzedLocations(); const effective = countBy(locations, effectiveBiome); const derived = countBy(locations, derivedBiome);
	const biomes = [...new Set([...effective.keys(), ...derived.keys()])]; const max = Math.max(1, ...effective.values(), ...derived.values());
	$("biomeDistribution").innerHTML = biomes.map(biome => {
		const count = effective.get(biome) || 0; const baseCount = derived.get(biome) || 0; const delta = baseCount - count; const share = locations.length ? count / locations.length * 100 : 0;
		return `<article class="coverage-row" style="--biome-color:${biomeColor(biome)}"><div class="coverage-title"><span class="biome-dot"></span><strong>${escapeHtml(biomeLabel(biome))}</strong><span>${count} · ${share.toLocaleString("fr-FR", {maximumFractionDigits: 1})} %</span></div><div class="bar-track"><div class="bar-fill" style="width:${count / max * 100}%"></div></div><div class="coverage-meta"><span>Sans overrides : ${baseCount}${delta ? ` (${delta > 0 ? "+" : ""}${delta})` : ""}</span><span class="config-pill ${state.lootBiomes.has(biome) ? "ok" : "bad"}">${state.lootBiomes.has(biome) ? "Loot configuré" : "Loot manquant"}</span></div></article>`;
	}).join("") || '<p class="muted">Aucun lieu dans cette zone.</p>';
}

function renderDiagnostics() {
	const locations = zoneLocations(); const unmapped = locations.filter(location => !state.mapping[location.type]); const overrides = locations.filter(location => location.expeditionType && location.expeditionType !== derivedBiome(location));
	const invalid = locations.filter(location => !state.declaredBiomes.includes(effectiveBiome(location))); const noLoot = locations.filter(location => !state.lootBiomes.has(effectiveBiome(location)));
	const unplaced = locations.filter(location => !NON_GEOGRAPHIC_TYPES.has(location.type) && !activeZone().pages.some(page => page.nodes?.[String(location.id)])); const broken = directionRecords().filter(record => !record.candidateIds.length);
	$("diagnostics").innerHTML = [
		diagnostic("Map types sans biome", unmapped.length ? groupIssue(unmapped, location => location.type, (type, values) => `<strong>${escapeHtml(mapTypeName(type))} <code>${escapeHtml(type)}</code></strong> · ${values.length} lieu(x) → plains`) : "Tous les map types sont mappés.", unmapped.length ? "danger" : "ok"),
		diagnostic("Overrides divergents", overrides.length ? overrides.map(location => `${escapeHtml(locationName(location))} : ${escapeHtml(biomeLabel(derivedBiome(location)))} → ${escapeHtml(biomeLabel(effectiveBiome(location)))}`).join("<br>") : "Aucun override divergent.", overrides.length ? "warning" : "ok"),
		diagnostic("Configuration des biomes", invalid.length || noLoot.length ? `${invalid.length} lieu(x) sur biome non déclaré.<br>${noLoot.length} lieu(x) sur biome sans loot table.` : "Biomes déclarés et loot tables présents.", invalid.length || noLoot.length ? "danger" : "ok"),
		diagnostic("Lieux sans coordonnées", unplaced.length ? unplaced.map(location => `${escapeHtml(locationName(location))} (#${location.id})`).join(", ") : "Tous les lieux sont placés.", unplaced.length ? "warning" : "ok"),
		diagnostic("Redirections sans issue", broken.length ? broken.map(record => `Event #${record.eventId} depuis ${escapeHtml(locationName(record.triggerId))}`).join("<br>") : "Toutes les redirections ont une cible adjacente.", broken.length ? "danger" : "ok")
	].join("");
}

function groupIssue(values, keyFn, renderFn) {
	const groups = new Map(); values.forEach(value => groups.set(keyFn(value), [...(groups.get(keyFn(value)) || []), value])); return [...groups.entries()].map(([key, group]) => renderFn(key, group)).join("<br>");
}
function diagnostic(title, body, tone) { return `<article class="diagnostic ${tone}"><h3>${escapeHtml(title)}</h3><p>${body}</p></article>`; }

function renderLocations() {
	const query = $("searchInput").value.trim().toLocaleLowerCase("fr"); const issuesOnly = $("issuesOnly").checked;
	const rows = zoneLocations().filter(location => {
		const issue = !state.mapping[location.type] || !state.declaredBiomes.includes(effectiveBiome(location)) || !state.lootBiomes.has(effectiveBiome(location));
		return (!query || `${locationName(location)} ${location.id} ${location.type} ${effectiveBiome(location)}`.toLocaleLowerCase("fr").includes(query)) && (!issuesOnly || issue);
	}).sort((left, right) => locationName(left).localeCompare(locationName(right), "fr"));
	$("locationsBody").innerHTML = rows.map(location => {
		const biome = effectiveBiome(location); const pages = activeZone().pages.filter(page => page.nodes?.[String(location.id)]);
		return `<tr data-location="${location.id}"><td class="location-cell">${escapeHtml(locationName(location))}<small>#${location.id}</small></td><td>${escapeHtml(mapTypeName(location.type))} <code>${escapeHtml(location.type)}</code></td><td><span class="badge biome" style="--biome-color:${biomeColor(biome)}">${escapeHtml(biomeLabel(biome))}</span>${location.expeditionType ? '<small class="override-flag">override</small>' : ""}</td><td class="status-cell ${state.mapping[location.type] ? "ok" : "bad"}">${state.mapping[location.type] ? escapeHtml(biomeLabel(derivedBiome(location))) : "Non mappé → plains"}</td><td class="status-cell ${state.lootBiomes.has(biome) ? "ok" : "bad"}">${state.lootBiomes.has(biome) ? "Oui" : "Non"}</td><td>${pages.length ? pages.map(page => escapeHtml(page.displayName)).join(", ") : '<span class="warning-text">Non placé</span>'}</td></tr>`;
	}).join("") || '<tr><td colspan="6">Aucun lieu.</td></tr>';
	$("locationsBody").querySelectorAll("[data-location]").forEach(row => row.addEventListener("click", () => {
		state.selectedId = Number.parseInt(row.dataset.location, 10); const page = activeZone().pages.find(candidate => candidate.nodes?.[row.dataset.location]); if (page) state.activePageId = page.mapPage;
		renderPageTabs(); renderMap(); renderInspector();
	}));
}

function renderEventFilter() {
	const ids = new Set(zoneLocations().map(location => location.id)); const events = state.events.filter(event => event.triggers.some(id => ids.has(id)));
	$("eventFilter").innerHTML = '<option value="all">Tous les events</option>' + events.map(event => `<option value="${event.id}">Event #${event.id}</option>`).join("");
	if (!events.some(event => String(event.id) === state.eventFilter)) state.eventFilter = "all"; $("eventFilter").value = state.eventFilter;
}

function renderAll() { renderZoneTabs(); renderPageTabs(); renderEventFilter(); renderSummary(); renderMap(); renderInspector(); renderCoverage(); renderDiagnostics(); renderLocations(); }

async function loadData() {
	state.crowniclesRef = $("branchInput").value.trim() || DEFAULTS.crowniclesRef; state.toolsRef = $("toolsBranchInput").value.trim() || DEFAULTS.toolsRef;
	$("loadButton").disabled = true; setStatus("Chargement GitHub…");
	try {
		const [locations, links, events, models, expeditionSource, mapTypeSource, coords] = await Promise.all([
			fetchNumberedDirectory(PATHS.locations, "Lieux"), fetchNumberedDirectory(PATHS.links, "Liens"), fetchNumberedDirectory(PATHS.events, "Events"),
			fetchFile(REPOS.crownicles, PATHS.models, state.crowniclesRef), fetchFile(REPOS.crownicles, PATHS.expeditions, state.crowniclesRef, true),
			fetchFile(REPOS.crownicles, PATHS.mapTypes, state.crowniclesRef, true), fetchCoordinateEntries()
		]);
		parseConstants(expeditionSource, mapTypeSource); normalizeModels(models); normalizeData(locations, links, events, coords);
		if (!state.zones.some(zone => zone.id === state.activeZoneId)) state.activeZoneId = state.zones[0]?.id; if (!activeZone()?.pages.some(page => page.mapPage === state.activePageId)) state.activePageId = activeZone()?.pages[0]?.mapPage;
		renderAll(); setStatus(`Chargé · ${state.locations.length} lieux · ${state.zones.length} zones · Crownicles/${state.crowniclesRef}`, "success");
		localStorage.setItem("expeditionBiomeCrowniclesRef", state.crowniclesRef); localStorage.setItem("expeditionBiomeToolsRef", state.toolsRef);
	} catch (error) { console.error(error); setStatus(`Échec : ${error.message}`, "error"); } finally { $("loadButton").disabled = false; }
}

function bindEvents() {
	$("loadForm").addEventListener("submit", event => { event.preventDefault(); loadData(); });
	document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { state.mode = button.dataset.mode; document.querySelectorAll("[data-mode]").forEach(entry => entry.classList.toggle("active", entry === button)); renderSummary(); renderMap(); renderCoverage(); }));
	$("showLabels").addEventListener("change", () => { state.showLabels = $("showLabels").checked; renderMap(); });
	$("showDirections").addEventListener("change", () => { state.showDirections = $("showDirections").checked; renderMap(); });
	$("eventFilter").addEventListener("change", () => { state.eventFilter = $("eventFilter").value; renderMap(); renderInspector(); renderDiagnostics(); });
	$("searchInput").addEventListener("input", renderLocations); $("issuesOnly").addEventListener("change", renderLocations);
	$("mapImage").addEventListener("load", () => { $("mapEmpty").hidden = true; }); $("mapImage").addEventListener("error", () => { $("mapEmpty").hidden = false; $("mapEmpty").textContent = "Fond introuvable sur la référence Tools."; });
}

function init() {
	bindEvents(); const params = new URLSearchParams(location.search);
	$("branchInput").value = params.get("ref") || localStorage.getItem("expeditionBiomeCrowniclesRef") || DEFAULTS.crowniclesRef;
	$("toolsBranchInput").value = params.get("toolsRef") || localStorage.getItem("expeditionBiomeToolsRef") || DEFAULTS.toolsRef; loadData();
}
document.addEventListener("DOMContentLoaded", init);