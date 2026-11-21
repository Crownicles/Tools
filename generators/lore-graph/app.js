(() => {
    const datasetName = new URLSearchParams(location.search).get("dataset") === "proposition" && window.LORE_PROPOSAL ? "proposition" : "actuel";
    const DATA = datasetName === "proposition" ? window.LORE_PROPOSAL : window.LORE_DATA;
    const REPO = "https://github.com/Crownicles/Crownicles/blob";

    const CATEGORIES = {
        royalty: { label: "Royauté / noblesse", color: "#f59e0b", shape: "star" },
        npc: { label: "PNJ", color: "#60a5fa", shape: "dot" },
        merchant: { label: "Marchands / artisans", color: "#34d399", shape: "dot" },
        deity: { label: "Divinités", color: "#fde047", shape: "diamond" },
        spirit: { label: "Esprits / fantômes", color: "#c4b5fd", shape: "dot" },
        legend: { label: "Légendes / figures historiques", color: "#fb923c", shape: "triangle" },
        monster: { label: "Monstres / boss nommés", color: "#ef4444", shape: "triangleDown" },
        pet: { label: "Familiers nommés", color: "#f472b6", shape: "dot" },
        faction: { label: "Factions / groupes", color: "#2dd4bf", shape: "hexagon" },
        reference: { label: "Références (pop culture)", color: "#a3a3a3", shape: "dot" },
        meta: { label: "Méta (staff, joueurs réels)", color: "#78716c", shape: "dot" },
        place: { label: "Lieux", color: "#64748b", shape: "square" },
    };
    const RELATIONS = {
        family: { label: "Famille", color: "#f472b6" },
        love: { label: "Amour", color: "#fb7185" },
        ally: { label: "Alliés", color: "#4ade80" },
        enemy: { label: "Ennemis", color: "#ef4444" },
        rival: { label: "Rivaux", color: "#f97316" },
        serves: { label: "Sert", color: "#facc15" },
        rules: { label: "Règne sur", color: "#f59e0b" },
        employs: { label: "Emploie", color: "#eab308" },
        mentor: { label: "Mentor", color: "#a78bfa" },
        trades: { label: "Commerce", color: "#34d399" },
        created: { label: "A créé", color: "#22d3ee" },
        worships: { label: "Vénère", color: "#fde047" },
        member: { label: "Membre de", color: "#2dd4bf" },
        knows: { label: "Connaît", color: "#94a3b8" },
        located: { label: "Se trouve à", color: "#475569" },
        other: { label: "Autre", color: "#64748b" },
    };

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const normalize = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const entities = new Map();
    for (const c of DATA.characters) {
        entities.set(c.id, { ...c, category: CATEGORIES[c.category] ? c.category : "npc" });
    }
    for (const p of DATA.places) {
        entities.set(p.id, { ...p, category: "place", named: true });
    }
    entities.set("player", {
        id: "player", name: "Le joueur", category: "npc", named: false, role: "L'aventurier incarné par le joueur",
        description: "L'aventurier incarné par le joueur. Ses liens montrent qui il croise, sert, affronte ou fait payer.", aliases: [], sources: [], quotes: [], locations: [],
    });

    const relations = DATA.relations
        .filter((r) => entities.has(r.from) && entities.has(r.to))
        .map((r, i) => ({ ...r, id: `e${i}`, type: RELATIONS[r.type] ? r.type : "other" }));

    const degree = new Map();
    const adjacency = new Map();
    for (const r of relations) {
        for (const [a, b] of [[r.from, r.to], [r.to, r.from]]) {
            degree.set(a, (degree.get(a) || 0) + 1);
            if (!adjacency.has(a)) adjacency.set(a, []);
            adjacency.get(a).push({ other: b, rel: r, outgoing: a === r.from });
        }
    }

    const state = {
        categories: new Set(Object.keys(CATEGORIES).filter((k) => k !== "meta")),
        relationTypes: new Set(Object.keys(RELATIONS)),
        focus: null,
        physics: true,
    };

    const PLAYER_COLOR = "#f8fafc";
    // Links to the player and to places are many and weak: they must not pull the layout together
    const isWeakRelation = (r) => r.type === "located" || r.from === "player" || r.to === "player";
    const playerDegree = degree.get("player") || 0;
    // Nodes whose label is always drawn; the others appear when zooming in or when highlighted
    const labelThreshold = [...degree.entries()].filter(([id]) => id !== "player")
        .map(([, d]) => d).sort((a, b) => b - a)[Math.min(40, degree.size - 1)] || 0;
    const alwaysLabelled = (id) => id === "player" || (degree.get(id) || 0) > labelThreshold;

    function baseNode(e) {
        const cat = CATEGORIES[e.category];
        const isPlayer = e.id === "player";
        const deg = isPlayer ? 12 : degree.get(e.id) || 0;
        const color = isPlayer ? PLAYER_COLOR : cat.color;
        return {
            id: e.id,
            label: e.name,
            shape: isPlayer ? "star" : cat.shape,
            size: isPlayer ? 30 : 8 + Math.sqrt(deg) * 4,
            color: { background: color, border: e.named === false && !isPlayer ? "#e5e7eb" : color, highlight: { background: "#fff", border: color }, hover: { background: color, border: "#fff" } },
            borderWidth: e.named === false && !isPlayer ? 2 : 1,
            shapeProperties: e.named === false && !isPlayer ? { borderDashes: [3, 3] } : {},
            font: { color: "#e5e7eb", size: isPlayer ? 30 : alwaysLabelled(e.id) ? 20 + Math.min(deg, 20) * 0.6 : 15, strokeWidth: 4, strokeColor: "#0f172a" },
            opacity: 1,
            title: `${e.name}${e.role ? " — " + e.role : ""}`,
        };
    }
    function baseEdge(r) {
        const weak = isWeakRelation(r);
        return {
            id: r.id,
            from: r.from,
            to: r.to,
            arrows: ["family", "ally", "enemy", "rival", "love", "knows", "trades"].includes(r.type) ? "" : { to: { scaleFactor: 0.5 } },
            color: { color: RELATIONS[r.type].color, opacity: weak ? 0.25 : 0.6, highlight: "#fff", hover: "#fff" },
            dashes: r.type === "located",
            width: weak ? 0.6 : 1.4,
            length: weak ? 220 : undefined,
            title: `${entities.get(r.from).name} → ${entities.get(r.to).name} : ${r.label || RELATIONS[r.type].label}`,
            font: { color: "#cbd5e1", size: 9, strokeWidth: 2, strokeColor: "#0f172a", align: "middle" },
        };
    }

    const nodes = new vis.DataSet([...entities.values()].map(baseNode));
    const edges = new vis.DataSet(relations.map(baseEdge));

    const network = new vis.Network($("graph"), { nodes, edges }, {
        physics: {
            solver: "forceAtlas2Based",
            forceAtlas2Based: { gravitationalConstant: -140, centralGravity: 0.02, springLength: 140, springConstant: 0.04, avoidOverlap: 1 },
            stabilization: { iterations: 1200, updateInterval: 50 },
            minVelocity: 0.75,
        },
        interaction: { hover: true, tooltipDelay: 150, hideEdgesOnDrag: true, hideEdgesOnZoom: true },
        edges: { smooth: false },
    });

    function neighborhood(id, depth) {
        const seen = new Set([id]);
        let frontier = [id];
        for (let d = 0; d < depth; d++) {
            const next = [];
            for (const n of frontier) {
                for (const { other, rel } of adjacency.get(n) || []) {
                    if (state.relationTypes.has(rel.type) && !seen.has(other)) {
                        seen.add(other);
                        next.push(other);
                    }
                }
            }
            frontier = next;
        }
        return seen;
    }

    function isNodeVisible(e) {
        if (state.focus) {
            return state.focus.has(e.id);
        }
        if (e.id === "player") return $("showPlayer").checked;
        if (!state.categories.has(e.category)) return false;
        if (e.category === "place" && !$("showPlaces").checked) return false;
        if (e.named === false && !$("showUnnamed").checked) return false;
        return $("showIsolated").checked || (adjacency.get(e.id) || []).some(({ other, rel }) =>
            state.relationTypes.has(rel.type) && (other !== "player" || $("showPlayer").checked));
    }

    // Selected node and its direct neighbours; everything else is dimmed
    let highlighted = null;
    let zoomedIn = false;
    let scale = 1;

    function nodeLabel(e) {
        const visibleLabel = highlighted ? highlighted.has(e.id) : zoomedIn || alwaysLabelled(e.id) || Boolean(state.focus);
        return visibleLabel ? e.name : "";
    }

    // Labels keep a readable size on screen whatever the zoom level
    function nodeFont(e) {
        const screenSize = e.id === "player" ? 17 : alwaysLabelled(e.id) || (highlighted && highlighted.center === e.id) ? 13 : 11;
        return { color: "#e5e7eb", size: Math.max(8, Math.min(60, screenSize / scale)), strokeWidth: 4, strokeColor: "#0f172a" };
    }

    function applyHighlight() {
        nodes.update([...entities.values()].map((e) => ({
            id: e.id,
            label: nodeLabel(e),
            font: nodeFont(e),
            opacity: !highlighted || highlighted.has(e.id) ? 1 : 0.12,
        })));
        edges.update(relations.map((r) => {
            const base = baseEdge(r);
            const lit = highlighted && highlighted.has(r.from) && highlighted.has(r.to) && (highlighted.center === r.from || highlighted.center === r.to);
            return {
                id: r.id,
                color: { ...base.color, opacity: !highlighted ? base.color.opacity : lit ? 0.95 : 0.04 },
                width: lit ? 2.2 : base.width,
            };
        }));
    }

    function highlight(id) {
        if (!id) {
            highlighted = null;
        } else {
            highlighted = new Set([id, ...(adjacency.get(id) || []).filter(({ rel }) => state.relationTypes.has(rel.type)).map(({ other }) => other)]);
            highlighted.center = id;
        }
        applyHighlight();
    }

    function refresh() {
        const visible = new Set();
        nodes.update([...entities.values()].map((e) => {
            const shown = isNodeVisible(e);
            if (shown) visible.add(e.id);
            return { id: e.id, hidden: !shown, label: nodeLabel(e), font: nodeFont(e) };
        }));
        const showLabels = $("showEdgeLabels").checked;
        edges.update(relations.map((r) => ({
            id: r.id,
            hidden: !(visible.has(r.from) && visible.has(r.to) && state.relationTypes.has(r.type)),
            label: showLabels ? (r.label || RELATIONS[r.type].label) : undefined,
        })));
        const chars = [...visible].filter((id) => id !== "player" && entities.get(id).category !== "place").length;
        const places = [...visible].filter((id) => entities.get(id).category === "place").length;
        $("stats").innerHTML = `
            <div><b>${chars}</b> / ${DATA.characters.length} personnages affichés</div>
            <div><b>${places}</b> / ${DATA.places.length} lieux</div>
            <div><b>${relations.filter((r) => !edges.get(r.id).hidden).length}</b> / ${relations.length} relations</div>
            <div class="muted">Source : Crownicles <code>${esc(DATA.commit)}</code></div>`;
        $("btnClearFocus").hidden = !state.focus;
    }

    function buildFilters() {
        const catCounts = {};
        entities.forEach((e) => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
        $("categoryFilters").innerHTML = Object.entries(CATEGORIES).filter(([k]) => catCounts[k]).map(([k, v]) => `
            <label class="check"><input type="checkbox" data-cat="${k}" ${state.categories.has(k) ? "checked" : ""}>
            <span class="swatch" style="background:${v.color}"></span>${v.label}<span class="count">${catCounts[k]}</span></label>`).join("");
        const relCounts = {};
        relations.forEach((r) => { relCounts[r.type] = (relCounts[r.type] || 0) + 1; });
        $("relationFilters").innerHTML = Object.entries(RELATIONS).filter(([k]) => relCounts[k]).map(([k, v]) => `
            <label class="check"><input type="checkbox" data-rel="${k}" checked>
            <span class="swatch" style="background:${v.color}"></span>${v.label}<span class="count">${relCounts[k]}</span></label>`).join("");
        document.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("change", () => {
            el.checked ? state.categories.add(el.dataset.cat) : state.categories.delete(el.dataset.cat);
            refresh();
        }));
        document.querySelectorAll("[data-rel]").forEach((el) => el.addEventListener("change", () => {
            el.checked ? state.relationTypes.add(el.dataset.rel) : state.relationTypes.delete(el.dataset.rel);
            refresh();
        }));
        document.querySelectorAll("[data-toggle-all]").forEach((link) => link.addEventListener("click", (ev) => {
            ev.preventDefault();
            const attr = link.dataset.toggleAll === "cat" ? "data-cat" : "data-rel";
            const boxes = [...document.querySelectorAll(`[${attr}]`)];
            const target = !boxes.every((b) => b.checked);
            boxes.forEach((b) => { b.checked = target; b.dispatchEvent(new Event("change")); });
        }));
    }

    function sourceLink(src) {
        const [path, key] = String(src).split(/:(.*)/s);
        if (!key) return esc(src);
        // "branch/file:key" points to another ref than the extracted commit
        const [, ref, file] = path.match(/^(?:(.+)\/)?([^/]+)$/);
        const label = ref ? `${ref} › ${file}` : file;
        return `<a href="${REPO}/${encodeURIComponent(ref || DATA.commit)}/Lang/fr/${encodeURIComponent(file)}.json" target="_blank" rel="noopener">${esc(label)}:${esc(key)}</a>`;
    }

    function showDetails(id) {
        const e = entities.get(id);
        if (!e) return;
        const cat = CATEGORIES[e.category];
        const links = (adjacency.get(id) || []).sort((a, b) => a.rel.type.localeCompare(b.rel.type));
        $("detailsEmpty").hidden = true;
        const box = $("detailsContent");
        box.hidden = false;
        box.innerHTML = `
            <h2 style="font-size:1.2rem;text-transform:none;color:#fff;letter-spacing:0">${esc(e.name)}</h2>
            <span class="badge" style="background:${cat.color}">${cat.label}</span>
            ${e.named === false ? "<span class=\"tag\">rôle non nommé</span>" : ""}
            ${e.stub ? "<span class=\"tag\">fiche incomplète</span>" : ""}
            ${e.role ? `<p><b>${esc(e.role)}</b></p>` : ""}
            ${e.aliases?.length ? `<p class="muted">Alias : ${e.aliases.map(esc).join(", ")}</p>` : ""}
            ${e.description ? `<p>${esc(e.description)}</p>` : ""}
            ${e.quotes?.length ? e.quotes.map((q) => `<blockquote>${esc(q)}</blockquote>`).join("") : ""}
            ${e.locations?.length ? `<h3>Lieux</h3>${e.locations.map((l) => `<span class="tag">${esc(l)}</span>`).join("")}` : ""}
            <h3>Liens (${links.length})</h3>
            <ul class="rel-list">${links.map(({ other, rel, outgoing }) => `
                <li data-goto="${esc(other)}"><span class="swatch" style="background:${RELATIONS[rel.type].color}"></span>
                ${outgoing ? "→" : "←"} <b>${esc(entities.get(other).name)}</b> — ${esc(rel.label || RELATIONS[rel.type].label)}
                <span class="rel-type">${RELATIONS[rel.type].label}</span></li>`).join("") || "<li class=\"muted\">Aucun lien connu</li>"}</ul>
            ${e.sources?.length ? `<h3>Sources</h3><div class="sources">${e.sources.map(sourceLink).join("<br>")}</div>` : ""}
            <button class="wide" id="btnFocusThis">🔍 Focus sur ce nœud</button>`;
        box.querySelectorAll("[data-goto]").forEach((li) => li.addEventListener("click", () => selectNode(li.dataset.goto)));
        $("btnFocusThis").addEventListener("click", () => focusOn(id));
    }

    function selectNode(id) {
        if (nodes.get(id)?.hidden) {
            focusOn(id);
        }
        network.selectNodes([id]);
        network.focus(id, { scale: 1.1, animation: { duration: 500 } });
        showDetails(id);
        highlight(id);
    }

    function focusOn(id) {
        state.focus = neighborhood(id, Number($("focusDepth").value));
        refresh();
        setTimeout(() => network.fit({ nodes: [...state.focus], animation: { duration: 500 } }), 50);
    }

    function renderOrphans() {
        const orphans = DATA.characters
            .filter((c) => c.named !== false && !["meta", "reference"].includes(c.category) && !(adjacency.get(c.id) || []).some(({ other }) => other !== "player" && entities.get(other).category !== "place"))
            .sort((a, b) => a.name.localeCompare(b.name));
        $("orphans").innerHTML = orphans.map((c) => `<li data-goto="${esc(c.id)}"><span class="swatch" style="background:${CATEGORIES[entities.get(c.id).category].color}"></span> ${esc(c.name)} <span class="rel-type">${esc(c.role || "")}</span></li>`).join("");
        $("orphans").querySelectorAll("[data-goto]").forEach((li) => li.addEventListener("click", () => selectNode(li.dataset.goto)));
    }

    $("search").addEventListener("input", () => {
        const q = normalize($("search").value.trim());
        if (q.length < 2) {
            $("searchResults").innerHTML = "";
            return;
        }
        const rank = (e) => {
            const name = normalize(e.name);
            return name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2 : 3;
        };
        const hits = [...entities.values()].filter((e) =>
            normalize([e.name, ...(e.aliases || []), e.role, e.description].join(" ")).includes(q))
            .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
            .slice(0, 30);
        $("searchResults").innerHTML = hits.map((e) => `<li data-goto="${esc(e.id)}"><span class="swatch" style="background:${CATEGORIES[e.category].color}"></span> ${esc(e.name)}</li>`).join("") || "<li class=\"muted\">Aucun résultat</li>";
        $("searchResults").querySelectorAll("[data-goto]").forEach((li) => li.addEventListener("click", () => selectNode(li.dataset.goto)));
    });

    ["showPlaces", "showPlayer", "showIsolated", "showUnnamed", "showEdgeLabels"].forEach((id) => $(id).addEventListener("change", refresh));
    $("btnClearFocus").addEventListener("click", () => {
        state.focus = null;
        refresh();
        network.fit({ animation: { duration: 500 } });
    });
    $("btnFit").addEventListener("click", () => network.fit({ animation: { duration: 500 } }));
    $("btnPhysics").addEventListener("click", () => {
        state.physics = !state.physics;
        network.setOptions({ physics: { enabled: state.physics } });
        $("btnPhysics").textContent = state.physics ? "⏸️ Figer" : "▶️ Animer";
    });
    $("btnPng").addEventListener("click", () => {
        const canvas = $("graph").querySelector("canvas");
        const out = document.createElement("canvas");
        out.width = canvas.width;
        out.height = canvas.height;
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, 0, 0);
        const a = document.createElement("a");
        a.href = out.toDataURL("image/png");
        a.download = "crownicles-lore.png";
        a.click();
    });
    $("btnJson").addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" }));
        a.download = "crownicles-lore.json";
        a.click();
    });

    network.on("click", (params) => {
        if (params.nodes.length) {
            showDetails(params.nodes[0]);
            highlight(params.nodes[0]);
        } else {
            highlight(null);
        }
    });
    network.on("doubleClick", (params) => {
        if (params.nodes.length) focusOn(params.nodes[0]);
    });
    let lastBucket = 0;
    function onScaleChange() {
        scale = network.getScale();
        const bucket = Math.round(Math.log(scale) / Math.log(1.25));
        if (bucket !== lastBucket) {
            lastBucket = bucket;
            zoomedIn = scale > 0.7;
            applyHighlight();
        }
    }
    network.on("zoom", onScaleChange);
    network.on("animationFinished", onScaleChange);
    network.once("stabilizationIterationsDone", () => {
        network.fit();
        onScaleChange();
        // A frozen layout is easier to read; "Animer" restarts the simulation
        state.physics = false;
        network.setOptions({ physics: { enabled: false } });
        $("btnPhysics").textContent = "▶️ Animer";
    });

    $("datasetSelect").value = datasetName;
    // The player is the hub of the proposal; in the current lore its many links would swamp the layout
    $("showPlayer").checked = datasetName === "proposition";
    $("showPlayerLabel").textContent = `Le joueur (${playerDegree} liens)`;
    $("datasetSelect").addEventListener("change", () => {
        location.search = $("datasetSelect").value === "proposition" ? "?dataset=proposition" : "";
    });
    $("subtitle").textContent = datasetName === "proposition"
        ? `Proposition de refonte du lore (sans religion structurée) : ${DATA.characters.length} personnages, ${DATA.places.length} lieux et ${relations.length} relations. Détails : documents/crownicles-lore-proposition.md.`
        : `${DATA.characters.length} personnages, ${DATA.places.length} lieux et ${relations.length} relations extraits des fichiers de langue (fr) de Crownicles @ ${DATA.commit}.`;
    buildFilters();
    renderOrphans();
    refresh();
})();
