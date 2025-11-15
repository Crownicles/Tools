const GITHUB_OWNER = "Crownicles";
const GITHUB_REPO = "Crownicles";
const DEFAULT_BRANCH = "master";
const MAP_LOCATIONS_DIR = "Core/resources/mapLocations";
const MAP_LINKS_DIR = "Core/resources/mapLinks";
const MODELS_PATH = "Lang/fr/models.json";
const GITHUB_BATCH_SIZE = 12;
const GITHUB_BATCH_DELAY_MS = 200;

let network = null;
let nodes = null;
let edges = null;
const state = { locations: {}, links: [] };
let uploadedFiles = { locations: null, links: null };
let githubRateLimitSuffix = "";
let placeNames = {};

const githubStatusEl = () => document.getElementById("githubStatus");

function getBranchValue() {
  const input = document.getElementById("branchInput");
  const value = (input ? input.value : DEFAULT_BRANCH) || DEFAULT_BRANCH;
  return value.trim() || DEFAULT_BRANCH;
}

function setGithubStatus(message, isError = false) {
  const el = githubStatusEl();
  if (!el) return;
  const suffix = githubRateLimitSuffix ? ` — ${githubRateLimitSuffix}` : "";
  el.textContent = `${message}${suffix}`;
  el.classList.toggle("error", Boolean(isError));
}

function updateRateLimitFromHeaders(response) {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const limit = response.headers.get("X-RateLimit-Limit");
  if (remaining === null || limit === null) return;
  const reset = response.headers.get("X-RateLimit-Reset");
  let suffix = `API ${remaining}/${limit} requetes`;
  if (reset) {
    const resetDate = new Date(parseInt(reset, 10) * 1000);
    const diffMinutes = Math.max(0, Math.ceil((resetDate - Date.now()) / 60000));
    if (diffMinutes > 0) {
      suffix += ` (reset ${diffMinutes}m)`;
    }
  }
  githubRateLimitSuffix = suffix;
}

async function makeApiRequest(url) {
  try {
    const response = await fetch(url);
    updateRateLimitFromHeaders(response);
    return response;
  } catch (error) {
    console.error("Erreur GitHub", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGithubDirectory(path, branch) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${branch}`;
  const response = await makeApiRequest(url);
  if (!response.ok) {
    throw new Error(`${path} fetch failed on branch ${branch}: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  if (!Array.isArray(json)) {
    throw new Error(`${path} unexpected payload.`);
  }
  return json.filter((entry) => entry.type === "file" && entry.download_url);
}

async function fetchGithubJson(url, label) {
  const response = await makeApiRequest(url);
  if (!response.ok) {
    throw new Error(`${label} download failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function processGithubFiles(files = [], label, onPayload) {
  if (!files.length) {
    setGithubStatus(`${label}: aucun fichier`, false);
    return;
  }
  let loaded = 0;
  for (let i = 0; i < files.length; i += GITHUB_BATCH_SIZE) {
    const batch = files.slice(i, i + GITHUB_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const payload = await fetchGithubJson(file.download_url, `${label} ${file.name}`);
          onPayload(payload, file);
          return true;
        } catch (error) {
          console.warn(`${label} ${file.name} ignore: ${error.message}`);
          return false;
        }
      })
    );
    loaded += batchResults.filter(Boolean).length;
    setGithubStatus(`${label}: ${loaded}/${files.length} fichiers charges`, false);
    if (i + GITHUB_BATCH_SIZE < files.length) {
      await delay(GITHUB_BATCH_DELAY_MS);
    }
  }
}

async function loadPlaceNames(branch) {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${branch}/${MODELS_PATH}`;
  try {
    const response = await makeApiRequest(url);
    if (!response.ok) {
      throw new Error(`${MODELS_PATH} (${branch}) -> ${response.status} ${response.statusText}`);
    }
    const models = await response.json();
    const mapLocations = models && models.map_locations ? models.map_locations : {};
    const flattened = {};
    Object.entries(mapLocations).forEach(([id, value]) => {
      if (!value) return;
      if (typeof value === "string") {
        flattened[id] = value;
      } else if (typeof value === "object") {
        flattened[id] = value.name || JSON.stringify(value);
      }
    });
    return flattened;
  } catch (error) {
    console.warn("Impossible de charger models.json:", error.message);
    return {};
  }
}

function mergeLocationPayload(target, payload, fallbackName) {
  if (!payload) return;
  if (payload.mapLocations && typeof payload.mapLocations === "object") {
    Object.entries(payload.mapLocations).forEach(([id, data]) => {
      target[id] = data;
    });
    return;
  }
  if (Array.isArray(payload)) {
    const id = fallbackName.replace(/\.json$/i, "");
    target[id] = payload;
    return;
  }
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const numericKeys = keys.filter((key) => !Number.isNaN(parseInt(key, 10)));
    if (numericKeys.length === keys.length && keys.length > 0) {
      keys.forEach((key) => {
        target[key] = payload[key];
      });
    } else {
      const id = fallbackName.replace(/\.json$/i, "");
      target[id] = payload;
    }
    return;
  }
  const id = fallbackName.replace(/\.json$/i, "");
  target[id] = payload;
}

function mergeLinkPayload(target, payload) {
  if (!payload) return;
  if (payload.mapLinks && typeof payload.mapLinks === "object") {
    Object.values(payload.mapLinks).forEach((entry) => target.push(entry));
    return;
  }
  if (Array.isArray(payload)) {
    payload.forEach((entry) => target.push(entry));
    return;
  }
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    const numericKeys = keys.filter((key) => !Number.isNaN(parseInt(key, 10)));
    if (numericKeys.length === keys.length && keys.length > 0) {
      Object.values(payload).forEach((entry) => target.push(entry));
    } else {
      target.push(payload);
    }
    return;
  }
  target.push(payload);
}

async function loadGithubLocations(branch) {
  const merged = {};
  const files = await fetchGithubDirectory(MAP_LOCATIONS_DIR, branch);
  await processGithubFiles(files, "mapLocations", (payload, file) => {
    mergeLocationPayload(merged, payload, file.name);
  });
  return merged;
}

async function loadGithubLinks(branch) {
  const merged = [];
  const files = await fetchGithubDirectory(MAP_LINKS_DIR, branch);
  await processGithubFiles(files, "mapLinks", (payload) => {
    mergeLinkPayload(merged, payload);
  });
  return merged;
}

async function loadDataFromServer() {
  const branch = getBranchValue();
  setGithubStatus(`Chargement depuis GitHub (${branch})...`, false);
  try {
    setGithubStatus(`Chargement des noms (${branch})...`, false);
    placeNames = await loadPlaceNames(branch);
    const locations = await loadGithubLocations(branch);
    const links = await loadGithubLinks(branch);
    state.locations = locations;
    state.links = links;
    const debug = document.getElementById("debug");
    if (debug) {
      debug.textContent = `Charge depuis GitHub (${branch}): ${Object.keys(locations).length} locations, ${links.length} links`;
    }
    setGithubStatus(`OK: ${Object.keys(locations).length} locations, ${links.length} links`, false);
    return state;
  } catch (error) {
    setGithubStatus(error.message, true);
    throw error;
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (event) => reject(event);
    reader.readAsText(file);
  });
}

async function loadDataFromUpload() {
  if (!uploadedFiles.locations && !uploadedFiles.links) {
    throw new Error("Aucun fichier uploade");
  }
  placeNames = {};
  if (uploadedFiles.locations) {
    const fl = uploadedFiles.locations;
    const files = fl instanceof FileList || Array.isArray(fl) ? Array.from(fl) : [fl];
    const merged = {};
    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        const json = JSON.parse(text);
        mergeLocationPayload(merged, json, file.name || "location");
      } catch (error) {
        throw new Error(`mapLocations JSON invalide pour ${file.name}: ${error.message}`);
      }
    }
    state.locations = merged;
  }
  if (uploadedFiles.links) {
    const fl = uploadedFiles.links;
    const files = fl instanceof FileList || Array.isArray(fl) ? Array.from(fl) : [fl];
    const links = [];
    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        const json = JSON.parse(text);
        mergeLinkPayload(links, json);
      } catch (error) {
        throw new Error(`mapLinks JSON invalide pour ${file.name}: ${error.message}`);
      }
    }
    state.links = links;
  }
  const debug = document.getElementById("debug");
  if (debug) {
    debug.textContent = `Charge uploads: ${Object.keys(state.locations || {}).length} locations, ${state.links.length} links`;
  }
  const fileStatus = document.getElementById("uploadStatus");
  if (fileStatus) {
    fileStatus.textContent = `Locations: ${describeUpload(uploadedFiles.locations)}, Links: ${describeUpload(uploadedFiles.links)}`;
  }
  return state;
}

function describeUpload(entry) {
  if (!entry) return "none";
  if (entry instanceof FileList || Array.isArray(entry)) {
    return `${entry.length} fichier(s)`;
  }
  return entry.name || "1 fichier";
}

function extractUniqueValues(map, key) {
  const set = new Set();
  Object.values(map || {}).forEach((value) => {
    if (!value || !value[key]) return;
    if (Array.isArray(value[key])) {
      value[key].forEach((v) => set.add(v));
    } else {
      set.add(value[key]);
    }
  });
  return Array.from(set).sort();
}

function formatDurationMinutes(mins) {
  const m = Number(mins) || 0;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) {
    return `${h}h${mm > 0 ? mm + 'm' : ''}`;
  }
  return `${mm}m`;
}

function buildFilterOptions() {
  const types = extractUniqueValues(state.locations, "type");
  const attributes = extractUniqueValues(state.locations, "attribute");
  const typeSelect = document.getElementById("filterType");
  const attrSelect = document.getElementById("filterAttribute");
  if (!typeSelect || !attrSelect) return;
  typeSelect.innerHTML = '<option value="all">Tous</option>';
  attrSelect.innerHTML = '<option value="all">Tous</option>';
  types.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    typeSelect.appendChild(option);
  });
  attributes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    attrSelect.appendChild(option);
  });
}

function buildGraph(filter = {}) {
  const visGlobal = window.vis;
  if (!visGlobal) {
    throw new Error("vis-network non charge");
  }
  nodes = new visGlobal.DataSet();
  edges = new visGlobal.DataSet();
  const entries = Object.entries(state.locations || {});
  entries.forEach(([id, info]) => {
    if (!id) return;
    if (filter.type && filter.type !== "all" && info.type !== filter.type) return;
    if (filter.attribute && filter.attribute !== "all" && info.attribute !== filter.attribute) return;
    const rawId = String(id);
    const nodeId = `n${rawId}`;
    const shape = info && info.type === "vi" ? "dot" : "ellipse";
    const color = info && info.attribute && String(info.attribute).includes("continent") ? "#c7f7c7" : "#d1d5db";
    const friendlyName = placeNames[rawId];
    const label = friendlyName ? `${friendlyName}\n(${rawId})` : rawId;
    const titlePayload = {
      id: rawId,
      name: friendlyName || null,
      ...info
    };
    try {
      nodes.add({
        id: nodeId,
        label,
        title: JSON.stringify(titlePayload, null, 2),
        shape,
        color
      });
    } catch (error) {
      console.warn(`Noeud ignore ${id}: ${error.message}`);
    }
  });
  (state.links || []).forEach((link) => {
    if (!link || typeof link.startMap === "undefined" || typeof link.endMap === "undefined") return;
    const fromId = `n${link.startMap}`;
    const toId = `n${link.endMap}`;
    if (!nodes.get(fromId) || !nodes.get(toId)) return;
    try {
      const durationLabel = link.tripDuration ? formatDurationMinutes(link.tripDuration) : "";
      edges.add({
        from: fromId,
        to: toId,
        label: durationLabel
      });
    } catch (error) {
      console.warn(`Arete ignoree ${JSON.stringify(link)}: ${error.message}`);
    }
  });
  const container = document.getElementById("network");
  const data = { nodes, edges };
  const options = {
    autoResize: true,
    interaction: { hover: true, multiselect: true },
    physics: { stabilization: false, barnesHut: { gravitationalConstant: -4000, springLength: 200 } },
    nodes: { shape: "dot", size: 14 },
    edges: { arrows: { to: { enabled: true, scaleFactor: 0.6 } }, font: { align: "top" } }
  };
  if (network) {
    network.destroy();
  }
  network = new visGlobal.Network(container, data, options);
  network.on("selectNode", (params) => {
    const nodeId = params.nodes[0];
    const nodeData = nodes.get(nodeId);
    const infoEl = document.getElementById("nodeInfo");
    if (infoEl) infoEl.textContent = nodeData.title || JSON.stringify(nodeData, null, 2);
  });
  network.on("deselectNode", () => {
    const infoEl = document.getElementById("nodeInfo");
    if (infoEl) infoEl.textContent = "Aucun";
  });
  const debug = document.getElementById("debug");
  if (debug) debug.textContent = `Graph construit: ${nodes.get().length} noeuds, ${edges.get().length} aretes`;
}

function wireControls() {
  document.getElementById("zoomIn").addEventListener("click", () => {
    if (!network) return;
    network.moveTo({ scale: network.getScale() * 1.25 });
  });
  document.getElementById("zoomOut").addEventListener("click", () => {
    if (!network) return;
    network.moveTo({ scale: network.getScale() / 1.25 });
  });
  document.getElementById("fit").addEventListener("click", () => {
    if (network) network.fit({ animation: true });
  });
  document.getElementById("center").addEventListener("click", () => {
    if (network) network.moveTo({ position: { x: 0, y: 0 }, scale: 1, animation: true });
  });
  document.getElementById("reload").addEventListener("click", async () => {
    try {
      await loadDataFromServer();
      buildFilterOptions();
      buildGraph({ type: "all", attribute: "all" });
    } catch (error) {
      console.error(error);
      const container = document.getElementById("network");
      if (container) {
        container.innerHTML = `<div class="error-panel">Erreur GitHub: ${error.message}</div>`;
      }
    }
  });
  document.getElementById("fileLocations").addEventListener("change", (event) => {
    uploadedFiles.locations = event.target.files && event.target.files.length ? event.target.files : null;
    updateUploadStatus();
  });
  document.getElementById("fileLinks").addEventListener("change", (event) => {
    uploadedFiles.links = event.target.files && event.target.files.length ? event.target.files : null;
    updateUploadStatus();
  });
  document.getElementById("loadUploaded").addEventListener("click", async () => {
    try {
      await loadDataFromUpload();
      buildFilterOptions();
      buildGraph({ type: "all", attribute: "all" });
    } catch (error) {
      console.error(error);
      const infoEl = document.getElementById("uploadStatus");
      if (infoEl) infoEl.textContent = `Erreur: ${error.message}`;
    }
  });
  document.getElementById("clearUploaded").addEventListener("click", () => {
    uploadedFiles = { locations: null, links: null };
    document.getElementById("fileLocations").value = "";
    document.getElementById("fileLinks").value = "";
    updateUploadStatus();
  });
  document.getElementById("filterType").addEventListener("change", applyFilters);
  document.getElementById("filterAttribute").addEventListener("change", applyFilters);
}

function applyFilters() {
  const type = document.getElementById("filterType").value;
  const attribute = document.getElementById("filterAttribute").value;
  buildGraph({ type, attribute });
}

function updateUploadStatus() {
  const el = document.getElementById("uploadStatus");
  if (!el) return;
  const locName = describeUpload(uploadedFiles.locations);
  const linkName = describeUpload(uploadedFiles.links);
  el.textContent = `Locations: ${locName}, Links: ${linkName}`;
}

function init() {
  try {
    setGithubStatus("Aucune requete GitHub lancee.");
    updateUploadStatus();
    wireControls();
  } catch (error) {
    console.error(error);
    const container = document.getElementById("network");
    if (container) {
      container.innerHTML = `<div class="error-panel">Erreur init: ${error.message}</div>`;
    }
    const infoEl = document.getElementById("nodeInfo");
    if (infoEl) infoEl.textContent = `Erreur: ${error.message}`;
  }
}

init();
