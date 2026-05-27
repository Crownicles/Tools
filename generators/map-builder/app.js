/* eslint-disable no-console */
/*
 * Crownicles - Map Builder
 * Vanilla JS single-file editor for mapCoords + image renderer + auto-PR.
 */

// ============================================================================
// === Config & constants ===
// ============================================================================

const DEFAULTS = {
  cwOwnerRepo: "Crownicles/Crownicles",
  wsOwnerRepo: "Crownicles/Website",
  // Default to master so the tool reflects the production state (mapLocations / mapLinks).
  // Use the UI selector to preview develop or any WIP branch.
  cwBranch: "master",
  wsBranch: "master",
  toolsOwnerRepo: "Crownicles/Tools",
  // mapCoords lives in the Tools repo (source of truth), not in Crownicles.
  mapCoordsOwnerRepo: "Crownicles/Tools",
  mapCoordsBranch: "master"
};

const PATHS = {
  mapCoords: "generators/map-builder/mapCoords",
  mapLocations: "Core/resources/mapLocations",
  mapLinks: "Core/resources/mapLinks",
  models: "Lang/fr/models.json",
  websiteRessources: "public/ressources/Ressources",
  websiteMapsCursed: "public/ressources/mapsCursed",
  toolsRessources: "generators/Ressources"
};

const LS_KEYS = {
  pat: "mapBuilderPat",
  cwBranch: "mapBuilderCwBranch",
  wsBranch: "mapBuilderWsBranch",
  cwRepo: "mapBuilderCwRepo",
  wsRepo: "mapBuilderWsRepo",
  mapCoordsRepo: "mapBuilderMapCoordsRepo",
  mapCoordsBranch: "mapBuilderMapCoordsBranch",
  season: "mapBuilderSeason",
  currentTab: "mapBuilderCurrentTab",
  zoom: "mapBuilderZoom"
};

const GITHUB_BATCH_SIZE = 12;
const GITHUB_BATCH_DELAY_MS = 200;
const SNAP_PX = 1;

// ============================================================================
// === State ===
// ============================================================================

const state = {
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
  view: { scale: 1, offsetX: 0, offsetY: 0 },
  // Selection / interaction
  selected: null,         // { type: 'node'|'edge', key: string }
  dragState: null,        // { key, type, startMouse, startCoord }
  panState: null,         // { startMouse, startOffset }
  spacePressed: false,
  // Markers cache
  markerImagesCache: {},  // { url: HTMLImageElement }
  // Undo per tab
  undoStacks: {}          // { mapPage: { undo: [], redo: [] } }
};

// ============================================================================
// === Utility helpers ===
// ============================================================================

const $ = (id) => document.getElementById(id);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toast(message, kind = "info", durationMs = 3500) {
  const container = $("toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

function focusPatInput() {
  const el = $("pat");
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
  el.classList.add("flash-error");
  setTimeout(() => el.classList.remove("flash-error"), 1500);
}

function setStatus(message) {
  const el = $("status");
  if (el) el.textContent = message;
}

function b64encode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function utf8ToB64(str) {
  return b64encode(new TextEncoder().encode(str));
}

async function blobToB64(blob) {
  const buf = await blob.arrayBuffer();
  return b64encode(new Uint8Array(buf));
}

function stableSortedKeys(obj) {
  return Object.keys(obj).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

function serializeMapPage(page) {
  // Re-emit with stable key order for clean diffs.
  const out = {
    mapPage: page.mapPage,
    displayName: page.displayName,
    includeAttributes: page.includeAttributes || []
  };
  if (page.idRange) out.idRange = page.idRange;
  out.backgrounds = page.backgrounds || {};
  out.marker = page.marker;
  out.coordSpace = page.coordSpace || "fr";
  out.scaling = page.scaling || { fr: 1 };
  // Sort nodes by numeric id.
  const sortedNodes = {};
  stableSortedKeys(page.nodes || {}).forEach((k) => {
    sortedNodes[k] = page.nodes[k];
  });
  out.nodes = sortedNodes;
  // Sort edges by (startMap, endMap).
  const sortedEdges = {};
  Object.keys(page.edges || {})
    .sort((a, b) => {
      const ea = page.edges[a];
      const eb = page.edges[b];
      return (ea.startMap - eb.startMap) || (ea.endMap - eb.endMap);
    })
    .forEach((k) => { sortedEdges[k] = page.edges[k]; });
  out.edges = sortedEdges;
  return `${JSON.stringify(out, null, 2)}\n`;
}

// ============================================================================
// === GitHub API helpers (reused & adapted from visualizer) ===
// ============================================================================

function updateRateLimitFromHeaders(response) {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const limit = response.headers.get("X-RateLimit-Limit");
  if (remaining === null || limit === null) return;
  const reset = response.headers.get("X-RateLimit-Reset");
  let suffix = `API ${remaining}/${limit}`;
  if (reset) {
    const diff = Math.max(0, Math.ceil((parseInt(reset, 10) * 1000 - Date.now()) / 60000));
    if (diff > 0) suffix += ` (reset ${diff}m)`;
  }
  state.rateLimitSuffix = suffix;
  const el = $("rateLimit");
  if (el) el.textContent = suffix;
}

function authHeaders() {
  if (!state.pat) return {};
  return { Authorization: `Bearer ${state.pat}` };
}

async function makeApiRequest(url, opts = {}) {
  const response = await fetch(url, {
    ...opts,
    headers: { Accept: "application/vnd.github+json", ...authHeaders(), ...(opts.headers || {}) }
  });
  updateRateLimitFromHeaders(response);
  return response;
}

async function fetchGithubDirectory(repo, path, branch) {
  const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
  const r = await makeApiRequest(url);
  if (!r.ok) throw new Error(`${path} fetch failed: ${r.status}`);
  const json = await r.json();
  if (!Array.isArray(json)) throw new Error(`${path} unexpected payload`);
  return json.filter((e) => e.type === "file" && e.download_url);
}

async function fetchGithubJson(url, label) {
  const r = await makeApiRequest(url);
  if (!r.ok) throw new Error(`${label} -> ${r.status}`);
  return r.json();
}

async function processGithubFiles(files, label, onPayload) {
  if (!files.length) return;
  let done = 0;
  for (let i = 0; i < files.length; i += GITHUB_BATCH_SIZE) {
    const batch = files.slice(i, i + GITHUB_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (file) => {
      try {
        const p = await fetchGithubJson(file.download_url, `${label} ${file.name}`);
        onPayload(p, file);
        return true;
      } catch (e) {
        console.warn(`${label} ${file.name} ignore: ${e.message}`);
        return false;
      }
    }));
    done += results.filter(Boolean).length;
    setStatus(`${label}: ${done}/${files.length}`);
    if (i + GITHUB_BATCH_SIZE < files.length) await delay(GITHUB_BATCH_DELAY_MS);
  }
}

// ============================================================================
// === Data merging (mapLocations / mapLinks) ===
// ============================================================================

function mergeLocationPayload(target, payload, fallbackName) {
  if (!payload) return;
  if (payload.mapLocations && typeof payload.mapLocations === "object") {
    Object.entries(payload.mapLocations).forEach(([id, data]) => { target[id] = data; });
    return;
  }
  if (Array.isArray(payload)) {
    target[fallbackName.replace(/\.json$/i, "")] = payload;
    return;
  }
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const numericKeys = keys.filter((k) => !Number.isNaN(parseInt(k, 10)));
    if (numericKeys.length === keys.length && keys.length > 0) {
      keys.forEach((k) => { target[k] = payload[k]; });
    } else {
      target[fallbackName.replace(/\.json$/i, "")] = payload;
    }
  }
}

function mergeLinkPayload(target, payload) {
  if (!payload) return;
  if (payload.mapLinks && typeof payload.mapLinks === "object") {
    Object.values(payload.mapLinks).forEach((e) => target.push(e));
    return;
  }
  if (Array.isArray(payload)) { payload.forEach((e) => target.push(e)); return; }
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const numericKeys = keys.filter((k) => !Number.isNaN(parseInt(k, 10)));
    if (numericKeys.length === keys.length && keys.length > 0) {
      Object.values(payload).forEach((e) => target.push(e));
    } else target.push(payload);
  }
}

async function loadPlaceNames(repo, branch) {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${PATHS.models}`;
  try {
    const r = await makeApiRequest(url);
    if (!r.ok) return {};
    const models = await r.json();
    const ml = models && models.map_locations ? models.map_locations : {};
    const out = {};
    Object.entries(ml).forEach(([id, v]) => {
      if (!v) return;
      out[id] = typeof v === "string" ? v : (v.name || "");
    });
    return out;
  } catch (e) {
    console.warn("models.json:", e.message);
    return {};
  }
}

// ============================================================================
// === Data loading orchestration ===
// ============================================================================

async function loadAll() {
  state.cwBranch = $("cwBranch").value.trim() || DEFAULTS.cwBranch;
  state.wsBranch = $("wsBranch").value.trim() || DEFAULTS.wsBranch;
  state.cwRepo = $("cwRepo").value.trim() || DEFAULTS.cwOwnerRepo;
  state.wsRepo = $("wsRepo").value.trim() || DEFAULTS.wsOwnerRepo;
  state.mapCoordsRepo = $("mapCoordsRepo").value.trim() || DEFAULTS.mapCoordsOwnerRepo;
  state.mapCoordsBranch = $("mapCoordsBranch").value.trim() || DEFAULTS.mapCoordsBranch;
  state.season = $("season").value || "normal";
  state.dryRun = $("dryRun").checked;

  localStorage.setItem(LS_KEYS.cwBranch, state.cwBranch);
  localStorage.setItem(LS_KEYS.wsBranch, state.wsBranch);
  localStorage.setItem(LS_KEYS.cwRepo, state.cwRepo);
  localStorage.setItem(LS_KEYS.wsRepo, state.wsRepo);
  localStorage.setItem(LS_KEYS.mapCoordsRepo, state.mapCoordsRepo);
  localStorage.setItem(LS_KEYS.mapCoordsBranch, state.mapCoordsBranch);
  localStorage.setItem(LS_KEYS.season, state.season);

  setStatus("Chargement…");
  try {
    // 1. mapCoords (lives in the Tools repo)
    const coordFiles = await fetchGithubDirectory(state.mapCoordsRepo, PATHS.mapCoords, state.mapCoordsBranch);
    const pages = {};
    await processGithubFiles(coordFiles.filter((f) => f.name.endsWith(".json") && !f.name.startsWith("_")), "mapCoords", (payload, file) => {
      const stem = file.name.replace(/\.json$/i, "");
      pages[stem] = payload;
    });
    state.mapPages = pages;
    state.originalMapPages = JSON.parse(JSON.stringify(pages));

    // 2. mapLocations
    const locFiles = await fetchGithubDirectory(state.cwRepo, PATHS.mapLocations, state.cwBranch);
    const locations = {};
    await processGithubFiles(locFiles, "mapLocations", (p, f) => mergeLocationPayload(locations, p, f.name));
    state.locations = locations;

    // 3. mapLinks
    const linkFiles = await fetchGithubDirectory(state.cwRepo, PATHS.mapLinks, state.cwBranch);
    const links = [];
    await processGithubFiles(linkFiles, "mapLinks", (p) => mergeLinkPayload(links, p));
    state.links = links;

    // 4. Names
    state.placeNames = await loadPlaceNames(state.cwRepo, state.cwBranch);

    setStatus(`OK · ${Object.keys(pages).length} pages, ${Object.keys(locations).length} locations, ${links.length} links`);
    toast("Données chargées", "success");

    buildTabs();
    const saved = localStorage.getItem(LS_KEYS.currentTab);
    const firstTab = saved && pages[saved] ? saved : Object.keys(pages)[0];
    if (firstTab) selectTab(firstTab);
  } catch (e) {
    console.error(e);
    setStatus(`Erreur: ${e.message}`);
    toast(`Erreur: ${e.message}`, "error", 6000);
  }
}

// ============================================================================
// === Sync logic ===
// ============================================================================

// Location types that have no visual marker on any map page (pseudo-locations
// representing logical entities, not geographic points). Aligned with the
// Crownicles MapLocationType enum: `continent` denotes the continent itself,
// not a place a player can be drawn at.
const NON_RENDERABLE_LOCATION_TYPES = new Set(["continent"]);

function locationMatchesPage(id, info, page) {
  if (!info || !page) return false;
  if (NON_RENDERABLE_LOCATION_TYPES.has(info.type)) return false;
  const attrs = page.includeAttributes || [];
  if (attrs.length && !attrs.includes(info.attribute)) return false;
  if (page.idRange) {
    const n = parseInt(id, 10);
    if (Number.isNaN(n)) return false;
    if (n < page.idRange.min || n > page.idRange.max) return false;
  }
  return true;
}

function getPageRegistry(mapPage) {
  const page = state.mapPages[mapPage];
  if (!page) return { nodes: [], edges: [] };
  // Filter locations belonging to this page.
  const includedIds = new Set();
  Object.entries(state.locations).forEach(([id, info]) => {
    if (locationMatchesPage(id, info, page)) includedIds.add(String(id));
  });
  // Edges: both endpoints included.
  // mapLinks defines each connection twice (one entry per direction), but
  // mapCoords stores each edge once with a canonical key `min_max`.
  // We deduplicate here so reverse-direction mapLinks don't appear as missing.
  const seen = new Set();
  const includedEdges = [];
  state.links.forEach((link) => {
    if (!link) return;
    const sm = String(link.startMap);
    const em = String(link.endMap);
    if (!includedIds.has(sm) || !includedIds.has(em)) return;
    const a = Number(link.startMap);
    const b = Number(link.endMap);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const key = `${lo}_${hi}`;
    if (seen.has(key)) return;
    seen.add(key);
    includedEdges.push({ key, startMap: lo, endMap: hi });
  });
  return { nodes: Array.from(includedIds), edges: includedEdges };
}

function categorize(mapPage) {
  const page = state.mapPages[mapPage];
  const reg = getPageRegistry(mapPage);
  const nodes = page.nodes || {};
  const edges = page.edges || {};

  const synced = { nodes: [], edges: [] };
  const missing = { nodes: [], edges: [] };
  const orphan = { nodes: [], edges: [] };

  reg.nodes.forEach((id) => {
    if (nodes[id]) synced.nodes.push(id);
    else missing.nodes.push(id);
  });
  Object.keys(nodes).forEach((id) => {
    if (!reg.nodes.includes(id)) orphan.nodes.push(id);
  });

  const regEdgeKeys = new Set(reg.edges.map((e) => e.key));
  reg.edges.forEach((e) => {
    if (edges[e.key]) synced.edges.push(e.key);
    else missing.edges.push(e.key);
  });
  Object.keys(edges).forEach((key) => {
    if (!regEdgeKeys.has(key)) orphan.edges.push(key);
  });
  return { synced, missing, orphan };
}

// ============================================================================
// === Background loading ===
// ============================================================================

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image fail: ${url}`));
    img.src = url;
  });
}

async function fetchBackground(mapPage, lang) {
  state.backgroundsCache[mapPage] ||= {};
  if (state.backgroundsCache[mapPage][lang]) return state.backgroundsCache[mapPage][lang];

  const page = state.mapPages[mapPage];
  const bg = page.backgrounds && page.backgrounds[lang];
  if (!bg || !bg.filename) return null;

  // Build the list of filenames to try, season variant first if a season is selected.
  const baseName = bg.filename;
  const filenames = [];
  if (state.season && state.season !== "normal") {
    filenames.push(withSeasonSuffix(baseName, state.season));
  }
  filenames.push(baseName);

  // Try Tools repo first (canonical source for backgrounds), fall back to Website.
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
    } catch (e) {
      // try next
    }
  }
  return null;
}

function withSeasonSuffix(filename, season) {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return `${filename}_${season}`;
  return `${filename.slice(0, idx)}_${season}${filename.slice(idx)}`;
}

function loadMarkerImage(page) {
  if (!page || !page.marker || !page.marker.image) return Promise.resolve(null);
  const key = page.marker.image;
  if (state.markerImagesCache[key]) return Promise.resolve(state.markerImagesCache[key]);
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
      } catch (e) { /* next */ }
    }
    return null;
  })();
}

// ============================================================================
// === Canvas rendering ===
// ============================================================================

function getCanvas() { return $("mapCanvas"); }
function getCtx() { return getCanvas().getContext("2d"); }

function resizeCanvas() {
  const wrap = $("canvasWrapper");
  const c = getCanvas();
  c.width = wrap.clientWidth;
  c.height = wrap.clientHeight;
  render();
}

function getScalingFactor(page, lang) {
  const cs = page.coordSpace || "fr";
  const s = page.scaling || {};
  return (s[lang] || 1) / (s[cs] || 1);
}

function coordToCanvas(x, y) {
  return {
    x: x * state.view.scale + state.view.offsetX,
    y: y * state.view.scale + state.view.offsetY
  };
}

function canvasToCoord(cx, cy) {
  return {
    x: (cx - state.view.offsetX) / state.view.scale,
    y: (cy - state.view.offsetY) / state.view.scale
  };
}

function fitView() {
  if (!state.currentTab) return;
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

function render() {
  const c = getCanvas();
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, c.width, c.height);

  if (!state.currentTab) return;
  const page = state.mapPages[state.currentTab];
  if (!page) return;
  const bg = state.backgroundsCache[state.currentTab]?.[state.lang];
  const placeholder = $("canvasPlaceholder");
  if (bg) {
    placeholder.classList.add("hidden");
    ctx.drawImage(bg, state.view.offsetX, state.view.offsetY, bg.width * state.view.scale, bg.height * state.view.scale);
  } else {
    placeholder.classList.remove("hidden");
  }

  const cat = categorize(state.currentTab);
  const langFactor = getScalingFactor(page, state.lang);
  const markerImg = state.markerImagesCache[page.marker?.image];

  // Draw nodes
  drawSet(ctx, page, page.nodes || {}, "node", cat, langFactor, markerImg);
  // Draw edges
  drawSet(ctx, page, page.edges || {}, "edge", cat, langFactor, markerImg);

  // Missing markers are intentionally not drawn on the canvas: they would pile
  // up at arbitrary positions and confuse the user. They live in the right-side
  // sync panel and can be dragged from there onto the canvas to be placed.
}

function drawSet(ctx, page, items, kind, cat, langFactor, markerImg) {
  Object.entries(items).forEach(([id, data]) => {
    if (!matchesSeason(data)) return;
    const status = (kind === "node" ? cat.orphan.nodes : cat.orphan.edges).includes(id) ? "orphan" : "synced";
    drawMarker(ctx, page, data.x, data.y, id, kind, status, langFactor, markerImg);
  });
}

/**
 * A node/edge with `seasons: ["halloween"]` is only shown when the matching
 * season is selected. Missing or empty `seasons` means "always shown".
 */
function matchesSeason(data) {
  const seasons = data?.seasons;
  if (!Array.isArray(seasons) || seasons.length === 0) return true;
  return seasons.includes(state.season || "normal");
}

function drawMarker(ctx, page, x, y, label, kind, status, langFactor, markerImg) {
  const sx = x * langFactor;
  const sy = y * langFactor;
  const p = coordToCanvas(sx, sy);
  const size = page.marker?.size || { width: 32, height: 32 };
  const anchor = page.marker?.anchor || "top-left";
  const w = size.width * state.view.scale * langFactor;
  const h = size.height * state.view.scale * langFactor;
  let dx = p.x;
  let dy = p.y;
  if (anchor === "center") {
    const off = page.marker?.anchorOffset || { x: w / 2, y: h / 2 };
    dx -= off.x * state.view.scale * langFactor;
    dy -= off.y * state.view.scale * langFactor;
  }

  // Status outline / opacity
  ctx.save();
  if (status === "missing") ctx.globalAlpha = 0.6;

  if (markerImg) {
    ctx.drawImage(markerImg, dx, dy, w, h);
  } else {
    ctx.fillStyle = kind === "node" ? "#2563eb" : "#10b981";
    ctx.fillRect(dx, dy, Math.max(8, w), Math.max(8, h));
  }

  // Outline based on status / selection
  let outline = null;
  if (status === "orphan") outline = "#ef4444";
  else if (status === "missing") outline = "#f59e0b";
  if (state.selected && state.selected.type === kind && String(state.selected.key) === String(label)) {
    outline = "#2563eb";
  }
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.strokeRect(dx, dy, Math.max(8, w), Math.max(8, h));
  }

  // Label
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

function hitTest(mouseX, mouseY) {
  // Returns { type, key, data } of the topmost marker hit.
  const page = state.mapPages[state.currentTab];
  if (!page) return null;
  const langFactor = getScalingFactor(page, state.lang);
  const size = page.marker?.size || { width: 32, height: 32 };
  const anchor = page.marker?.anchor || "top-left";
  const candidates = [
    ...Object.entries(page.edges || {}).map(([k, d]) => ({ type: "edge", key: k, data: d })),
    ...Object.entries(page.nodes || {}).map(([k, d]) => ({ type: "node", key: k, data: d }))
  ].filter((c) => matchesSeason(c.data)).reverse();
  for (const c of candidates) {
    const p = coordToCanvas(c.data.x * langFactor, c.data.y * langFactor);
    const w = size.width * state.view.scale * langFactor;
    const h = size.height * state.view.scale * langFactor;
    let dx = p.x;
    let dy = p.y;
    if (anchor === "center") {
      const off = page.marker?.anchorOffset || { x: w / 2, y: h / 2 };
      dx -= off.x * state.view.scale * langFactor;
      dy -= off.y * state.view.scale * langFactor;
    }
    if (mouseX >= dx && mouseX <= dx + Math.max(8, w) && mouseY >= dy && mouseY <= dy + Math.max(8, h)) {
      return c;
    }
  }
  return null;
}

// ============================================================================
// === Tabs ===
// ============================================================================

function buildTabs() {
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

async function selectTab(page) {
  if (!state.mapPages[page]) return;
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

// ============================================================================
// === Sync panel ===
// ============================================================================

function refreshSyncPanel() {
  if (!state.currentTab) return;
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
    items.forEach(({ key, kind }) => {
      const li = document.createElement("li");
      li.className = cls;
      const name = state.placeNames[key] ? ` · ${state.placeNames[key]}` : "";
      const dragHint = cls === "missing" && state.mode === "editor" ? ` <span class="drag-hint">↪ glisse sur la carte</span>` : "";
      li.innerHTML = `<span>${kind === "node" ? "N" : "E"} ${key}${name}</span>${dragHint}`;
      li.addEventListener("click", () => { state.selected = { type: kind, key }; refreshInspector(); render(); });
      if (cls === "missing" && state.mode === "editor") {
        li.draggable = true;
        li.classList.add("draggable");
        li.addEventListener("dragstart", (ev) => {
          ev.dataTransfer.setData("application/x-crownicles-missing", JSON.stringify({ kind, key }));
          ev.dataTransfer.effectAllowed = "copy";
          li.classList.add("dragging");
        });
        li.addEventListener("dragend", () => li.classList.remove("dragging"));
      }
      ul.appendChild(li);
    });
  };
  fill("syncedList", [
    ...cat.synced.nodes.map((k) => ({ key: k, kind: "node" })),
    ...cat.synced.edges.map((k) => ({ key: k, kind: "edge" }))
  ], "synced");
  fill("missingList", [
    ...cat.missing.nodes.map((k) => ({ key: k, kind: "node" })),
    ...cat.missing.edges.map((k) => ({ key: k, kind: "edge" }))
  ], "missing");
  fill("orphanList", [
    ...cat.orphan.nodes.map((k) => ({ key: k, kind: "node" })),
    ...cat.orphan.edges.map((k) => ({ key: k, kind: "edge" }))
  ], "orphan");
}

// ============================================================================
// === Inspector ===
// ============================================================================

function refreshInspector() {
  const el = $("inspector");
  if (!state.selected) {
    el.innerHTML = '<p class="hint">Sélectionne un marqueur.</p>';
    return;
  }
  const page = state.mapPages[state.currentTab];
  const { type, key } = state.selected;
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
  if (state.mode === "editor") {
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
      } else {
        target[key] = type === "node"
          ? { x, y }
          : { startMap: parseInt(key.split("_")[0], 10), endMap: parseInt(key.split("_")[1], 10), x, y };
      }
      if (seasons.length > 0) target[key].seasons = seasons;
      else delete target[key].seasons;
      render();
      refreshSyncPanel();
    });
    $("inspDelete").addEventListener("click", () => {
      pushUndo();
      if (type === "node") delete page.nodes[key];
      else delete page.edges[key];
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
      if (target[key]) { target[key].x = x; target[key].y = y; }
      else {
        target[key] = type === "node"
          ? { x, y }
          : { startMap: parseInt(key.split("_")[0], 10), endMap: parseInt(key.split("_")[1], 10), x, y };
      }
      render(); refreshSyncPanel(); refreshInspector();
    });
  }
}

// ============================================================================
// === Undo / redo ===
// ============================================================================

function getStack() {
  state.undoStacks[state.currentTab] ||= { undo: [], redo: [] };
  return state.undoStacks[state.currentTab];
}

function pushUndo() {
  const s = getStack();
  s.undo.push(JSON.stringify(state.mapPages[state.currentTab]));
  if (s.undo.length > 50) s.undo.shift();
  s.redo = [];
}

function undo() {
  const s = getStack();
  if (!s.undo.length) return;
  s.redo.push(JSON.stringify(state.mapPages[state.currentTab]));
  state.mapPages[state.currentTab] = JSON.parse(s.undo.pop());
  render(); refreshSyncPanel(); refreshInspector();
}

function redo() {
  const s = getStack();
  if (!s.redo.length) return;
  s.undo.push(JSON.stringify(state.mapPages[state.currentTab]));
  state.mapPages[state.currentTab] = JSON.parse(s.redo.pop());
  render(); refreshSyncPanel(); refreshInspector();
}

// ============================================================================
// === Mouse interactions ===
// ============================================================================

function wireCanvasInteractions() {
  const c = getCanvas();

  c.addEventListener("mousedown", (e) => {
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (e.button === 1 || state.spacePressed) {
      state.panState = { startMouse: { x: mx, y: my }, startOffset: { x: state.view.offsetX, y: state.view.offsetY } };
      c.classList.add("panning");
      e.preventDefault();
      return;
    }
    if (e.button === 0) {
      const hit = hitTest(mx, my);
      if (hit) {
        state.selected = { type: hit.type, key: hit.key };
        refreshInspector();
        render();
        if (state.mode === "editor") {
          pushUndo();
          state.dragState = {
            type: hit.type,
            key: hit.key,
            startMouse: { x: mx, y: my },
            startCoord: { x: hit.data.x, y: hit.data.y },
            noSnap: e.shiftKey
          };
          c.classList.add("dragging");
        }
      } else {
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
      const { type, key } = state.dragState;
      const target = type === "node" ? page.nodes : page.edges;
      if (target[key]) { target[key].x = nx; target[key].y = ny; }
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
    if (state.mode !== "editor") return;
    if (!Array.from(e.dataTransfer.types).includes("application/x-crownicles-missing")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    c.classList.add("drop-target");
  });
  c.addEventListener("dragleave", () => c.classList.remove("drop-target"));
  c.addEventListener("drop", (e) => {
    c.classList.remove("drop-target");
    if (state.mode !== "editor") return;
    const raw = e.dataTransfer.getData("application/x-crownicles-missing");
    if (!raw) return;
    e.preventDefault();
    let payload;
    try { payload = JSON.parse(raw); }
    catch { return; }
    const page = state.mapPages[state.currentTab];
    if (!page) return;
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
      page.nodes[payload.key] = { x, y };
    } else {
      const [lo, hi] = payload.key.split("_").map((n) => parseInt(n, 10));
      page.edges = page.edges || {};
      page.edges[payload.key] = { startMap: lo, endMap: hi, x, y };
    }
    state.selected = { type: payload.kind, key: payload.key };
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
  }, { passive: false });

  c.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const rect = c.getBoundingClientRect();
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit || state.mode !== "editor") return;
    state.selected = { type: hit.type, key: hit.key };
    refreshInspector(); render();
    const m = $("contextMenu");
    m.style.left = `${e.clientX}px`;
    m.style.top = `${e.clientY}px`;
    m.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    const m = $("contextMenu");
    if (!m.contains(e.target)) m.classList.add("hidden");
  });

  $("contextMenu").querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      $("contextMenu").classList.add("hidden");
      if (!state.selected) return;
      const { type, key } = state.selected;
      const page = state.mapPages[state.currentTab];
      if (action === "delete") {
        pushUndo();
        if (type === "node") delete page.nodes[key]; else delete page.edges[key];
        state.selected = null;
        refreshInspector(); refreshSyncPanel(); render();
      } else if (action === "reset") {
        pushUndo();
        const center = canvasToCoord(getCanvas().width / 2, getCanvas().height / 2);
        const lf = getScalingFactor(page, state.lang);
        const target = type === "node" ? page.nodes : page.edges;
        if (target[key]) { target[key].x = Math.round(center.x / lf); target[key].y = Math.round(center.y / lf); }
        render(); refreshSyncPanel(); refreshInspector();
      } else if (action === "copy") {
        navigator.clipboard.writeText(key).then(() => toast(`Copié: ${key}`, "success"));
      }
    });
  });
}

function wireKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") state.spacePressed = true;
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") state.spacePressed = false;
  });
}

// ============================================================================
// === Background drop ===
// ============================================================================

function wireBackgroundDrop() {
  const wrap = $("canvasWrapper");
  const overlay = $("dropOverlay");
  ["dragenter", "dragover"].forEach((ev) => {
    wrap.addEventListener(ev, (e) => {
      e.preventDefault();
      if (state.mode !== "editor") return;
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
    if (state.mode !== "editor" || !state.currentTab) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const blob = file;
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    state.backgroundsCache[state.currentTab] ||= {};
    state.backgroundsCache[state.currentTab][state.lang] = img;
    state.pendingBackgrounds[state.currentTab] ||= {};
    state.pendingBackgrounds[state.currentTab][state.lang] = blob;
    const page = state.mapPages[state.currentTab];
    page.backgrounds ||= {};
    page.backgrounds[state.lang] ||= { filename: file.name, width: img.width, height: img.height };
    page.backgrounds[state.lang].width = img.width;
    page.backgrounds[state.lang].height = img.height;
    page.backgrounds[state.lang].filename = page.backgrounds[state.lang].filename || file.name;
    toast(`Fond ${state.lang} mis à jour (${img.width}×${img.height})`, "success");
    fitView();
  });
}

// ============================================================================
// === Image renderer (offscreen, WebP, ZIP) ===
// ============================================================================

let renderCancel = false;

async function renderImages() {
  const scope = $("renderScope").value;
  const maxDim = parseInt($("renderMaxDim").value, 10) || 1920;
  const quality = parseFloat($("renderQuality").value);
  const dest = $("renderDest").value;
  renderCancel = false;

  const pages = (scope === "page" || scope === "pageAllLangs") ? [state.currentTab] : Object.keys(state.mapPages);
  const langs = (scope === "allPagesAllLangs" || scope === "pageAllLangs") ? ["fr", "en"] : [state.lang];

  const outputs = []; // { name, blob }
  let total = 0;
  pages.forEach((p) => {
    const pageData = state.mapPages[p];
    if (!pageData) return;
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
    if (renderCancel) break;
    for (const lang of langs) {
      if (renderCancel) break;
      const bg = await fetchBackground(p, lang);
      if (!bg) {
        toast(`Aucun fond pour ${p}/${lang} — ignoré`, "error");
        continue;
      }
      const markerImg = await loadMarkerImage(state.mapPages[p]);
      const page = state.mapPages[p];
      const langFactor = getScalingFactor(page, lang);
      const allItems = [
        ...Object.entries(page.nodes || {}).map(([k, d]) => ({ kind: "node", key: k, data: d })),
        ...Object.entries(page.edges || {}).map(([k, d]) => ({ kind: "edge", key: k, data: d }))
      ].filter((it) => matchesSeason(it.data));
      for (const it of allItems) {
        if (renderCancel) break;
        const blob = await renderOne(bg, markerImg, page, it, langFactor, maxDim, quality);
        outputs.push({ name: `${lang}_${it.key}_map.webp`, blob });
        done++;
        updateProg();
        if (done % 10 === 0) await delay(0);
      }
    }
  }

  if (renderCancel) {
    toast("Rendu annulé", "info");
    return;
  }

  if (dest === "zip") {
    await downloadOutputsZip(outputs);
  } else {
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
  const size = page.marker?.size || { width: 32, height: 32 };
  const anchor = page.marker?.anchor || "top-left";
  let dx = sx;
  let dy = sy;
  const w = size.width * langFactor;
  const h = size.height * langFactor;
  if (anchor === "center") {
    const offc = page.marker?.anchorOffset || { x: w / 2, y: h / 2 };
    dx -= offc.x * langFactor;
    dy -= offc.y * langFactor;
  }
  if (markerImg) ctx.drawImage(markerImg, dx, dy, w, h);
  else {
    ctx.fillStyle = "red";
    ctx.fillRect(dx, dy, Math.max(8, w), Math.max(8, h));
  }

  // Resize if needed
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
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mapsCursed-${Date.now()}.zip`;
  a.click();
  toast(`ZIP généré (${outputs.length} fichiers)`, "success", 8000);
}

// ============================================================================
// === Auto-PR / GitHub write ===
// ============================================================================

class GitHubClient {
  constructor(repo, baseBranch) {
    this.repo = repo;
    this.baseBranch = baseBranch;
    this.calls = [];
  }

  async req(method, path, body) {
    const url = `https://api.github.com/repos/${this.repo}${path}`;
    const callRecord = { method, url, body: body ? Object.keys(body) : null };
    this.calls.push(callRecord);
    if (state.dryRun) {
      logDryRun(method, url, body);
      return { ok: true, json: async () => ({ object: { sha: "dry-sha" }, html_url: `https://github.com/${this.repo}/pull/0` }) };
    }
    const r = await makeApiRequest(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`);
    }
    return r;
  }

  async verifyAuth() {
    if (state.dryRun) return true;
    const r = await makeApiRequest("https://api.github.com/user");
    if (!r.ok) throw new Error("PAT invalide ou expiré (GET /user a échoué)");
    return true;
  }

  async getBaseSha() {
    const r = await this.req("GET", `/git/refs/heads/${this.baseBranch}`);
    const j = await r.json();
    return j.object.sha;
  }

  async createBranch(name, sha) {
    return this.req("POST", "/git/refs", { ref: `refs/heads/${name}`, sha });
  }

  async putFile(path, contentB64, branch, message, existingSha) {
    const body = { message, content: contentB64, branch };
    if (existingSha) body.sha = existingSha;
    return this.req("PUT", `/contents/${path}`, body);
  }

  async getExistingFileSha(path, ref) {
    if (state.dryRun) return null;
    const r = await makeApiRequest(`https://api.github.com/repos/${this.repo}/contents/${path}?ref=${ref}`);
    if (!r.ok) return null;
    const j = await r.json();
    return j.sha || null;
  }

  async openPr(head, base, title, body) {
    const r = await this.req("POST", "/pulls", { title, head, base, body });
    const j = await r.json();
    return j.html_url;
  }
}

function logDryRun(method, url, body) {
  $("dryRunPanel").classList.remove("hidden");
  const log = $("dryRunLog");
  log.textContent += `\n[${new Date().toISOString()}] ${method} ${url}\n`;
  if (body) {
    const sanitized = { ...body };
    if (sanitized.content && sanitized.content.length > 80) {
      sanitized.content = `<base64 ${sanitized.content.length} chars>`;
    }
    log.textContent += `${JSON.stringify(sanitized, null, 2)}\n`;
  }
  log.scrollTop = log.scrollHeight;
}

function getChangedMapPages() {
  const changed = [];
  Object.keys(state.mapPages).forEach((k) => {
    const cur = serializeMapPage(state.mapPages[k]);
    const orig = state.originalMapPages[k] ? serializeMapPage(state.originalMapPages[k]) : "";
    if (cur !== orig) changed.push({ key: k, content: cur, isNew: !state.originalMapPages[k] });
  });
  return changed;
}

async function openCrowniclesPr() {
  if (!state.pat && !state.dryRun) { focusPatInput(); toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000); return; }
  const changed = getChangedMapPages();
  if (!changed.length) { toast("Aucun changement à pousser", "info"); return; }
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
    if (!state.dryRun) window.open(prUrl, "_blank");
  } catch (e) {
    toast(`Erreur PR mapCoords: ${e.message}`, "error", 8000);
    console.error(e);
  }
}

async function pushOutputsToWebsite(outputs) {
  if (!state.pat && !state.dryRun) { focusPatInput(); toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000); return; }
  if (!outputs.length) { toast("Aucune image à pousser", "info"); return; }
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
    if (!state.dryRun) window.open(prUrl, "_blank");
  } catch (e) {
    toast(`Erreur PR Website: ${e.message}`, "error", 8000);
    console.error(e);
  }
}

async function openWebsitePr() {
  // Push pending backgrounds (the dropped images), if any.
  const pending = [];
  Object.entries(state.pendingBackgrounds).forEach(([page, langs]) => {
    Object.entries(langs).forEach(([lang, blob]) => {
      const filename = state.mapPages[page]?.backgrounds?.[lang]?.filename;
      if (filename) pending.push({ name: filename, blob, subPath: PATHS.websiteRessources });
    });
  });
  if (!pending.length) { toast("Aucun fond en attente. Utilise « Rendu images… » pour pousser des rendus.", "info"); return; }
  if (!state.pat && !state.dryRun) { focusPatInput(); toast("Définis un PAT d'abord (ou coche Dry-run)", "error", 8000); return; }
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
    if (!state.dryRun) window.open(prUrl, "_blank");
  } catch (e) {
    toast(`Erreur PR Website: ${e.message}`, "error", 8000);
  }
}

// ============================================================================
// === Export ZIP (coords) ===
// ============================================================================

async function exportCoordsZip() {
  const zip = new window.JSZip();
  const folder = zip.folder("mapCoords");
  Object.entries(state.mapPages).forEach(([k, p]) => {
    folder.file(`${k}.json`, serializeMapPage(p));
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mapCoords-${Date.now()}.zip`;
  a.click();
  toast("ZIP des coords téléchargé", "success");
}

// ============================================================================
// === UI wiring ===
// ============================================================================

function wireUI() {
  // Mode toggle
  document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", (e) => {
    state.mode = e.target.value;
    document.body.classList.toggle("viewer", state.mode === "viewer");
    $("viewerBanner").classList.toggle("hidden", state.mode !== "viewer");
    refreshInspector();
  }));

  // Lang
  document.querySelectorAll('input[name="lang"]').forEach((r) => r.addEventListener("change", async (e) => {
    state.lang = e.target.value;
    if (state.currentTab) {
      await fetchBackground(state.currentTab, state.lang);
      render();
    }
  }));

  $("showLabels").addEventListener("change", (e) => { state.showLabels = e.target.checked; render(); });

  // PAT
  const patInput = $("pat");
  patInput.value = localStorage.getItem(LS_KEYS.pat) || "";
  state.pat = patInput.value;
  // Reactive: keep state.pat in sync without forcing localStorage persistence.
  patInput.addEventListener("input", () => { state.pat = patInput.value; });
  $("savePat").addEventListener("click", () => {
    state.pat = patInput.value;
    localStorage.setItem(LS_KEYS.pat, state.pat);
    toast("Token sauvegardé localement", "success");
  });
  $("clearPat").addEventListener("click", () => {
    state.pat = ""; patInput.value = "";
    localStorage.removeItem(LS_KEYS.pat);
    toast("Token effacé", "info");
  });

  // Reactive: keep state.dryRun in sync so the checkbox is honored without reload.
  $("dryRun").addEventListener("change", (e) => { state.dryRun = e.target.checked; });

  // Branches & repos restore
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
      if (onChange) onChange();
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
  $("zoomIn").addEventListener("click", () => { state.view.scale *= 1.2; render(); });
  $("zoomOut").addEventListener("click", () => { state.view.scale /= 1.2; render(); });
  $("zoomFit").addEventListener("click", fitView);
  $("zoom100").addEventListener("click", () => { state.view.scale = 1; render(); });

  // Undo / redo buttons
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);

  // Render / export / PR
  $("renderBtn").addEventListener("click", () => {
    $("renderModal").classList.remove("hidden");
    $("renderProgress").firstElementChild.style.width = "0%";
    $("renderProgressLabel").textContent = "";
  });
  $("renderQuality").addEventListener("input", (e) => { $("qualityLabel").textContent = parseFloat(e.target.value).toFixed(2); });
  $("renderCancel").addEventListener("click", () => { renderCancel = true; $("renderModal").classList.add("hidden"); });
  $("renderStart").addEventListener("click", renderImages);

  $("exportBtn").addEventListener("click", exportCoordsZip);
  $("prCwBtn").addEventListener("click", openCrowniclesPr);
  $("prWsBtn").addEventListener("click", openWebsitePr);

  // Help
  $("helpBtn").addEventListener("click", () => $("helpModal").classList.remove("hidden"));
  $("helpClose").addEventListener("click", () => $("helpModal").classList.add("hidden"));

  // Dry run panel
  $("dryRunClose").addEventListener("click", () => $("dryRunPanel").classList.add("hidden"));

  // New page modal
  $("npCancel").addEventListener("click", () => $("newPageModal").classList.add("hidden"));
  $("npCreate").addEventListener("click", () => {
    const filename = $("npFilename").value.trim();
    if (!filename) { toast("Filename requis", "error"); return; }
    const min = parseInt($("npMin").value, 10);
    const max = parseInt($("npMax").value, 10);
    const page = {
      mapPage: filename,
      displayName: $("npDisplay").value.trim() || filename,
      includeAttributes: $("npAttrs").value.split(",").map((s) => s.trim()).filter(Boolean),
      backgrounds: {
        fr: { filename: `${filename}_fr.jpg`, width: 2000, height: 1500 },
        en: { filename: `${filename}_en.jpg`, width: 2000, height: 1500 }
      },
      marker: { image: "cross.png", anchor: "center", size: { width: 150, height: 150 }, anchorOffset: { x: 75, y: 75 } },
      coordSpace: "fr",
      scaling: { fr: 1, en: 1 },
      nodes: {},
      edges: {}
    };
    if (!Number.isNaN(min) && !Number.isNaN(max)) page.idRange = { min, max };
    state.mapPages[filename] = page;
    $("newPageModal").classList.add("hidden");
    buildTabs();
    selectTab(filename);
    toast(`Page ${filename} créée`, "success");
  });
}

// ============================================================================
// === Boot ===
// ============================================================================

function boot() {
  wireUI();
  wireCanvasInteractions();
  wireKeyboard();
  wireBackgroundDrop();
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  setStatus("Prêt — clique sur « Charger » pour récupérer les données.");
}

boot();
