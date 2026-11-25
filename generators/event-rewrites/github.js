// Builds the viewer data (same shape as build.py) by comparing two branches of Crownicles on GitHub.
// "Avant" is the base branch, "Après" the compared branch. API calls (rate limited to 60/h without a token)
// are only used for branch and folder listings; files are read from raw.githubusercontent.com.
window.EventRewritesGithub = (() => {
    const REPO = "Crownicles/Crownicles";
    const API = `https://api.github.com/repos/${REPO}`;
    const BATCH = 16;
    const BRANCHES_KEY = "eventRewrites.branches";

    const isSha = (ref) => /^[0-9a-f]{40}$/.test(ref);
    const refPath = (ref) => (isSha(ref) ? ref : `refs/heads/${ref.split("/").map(encodeURIComponent).join("/")}`);
    const raw = (ref, path) => `https://raw.githubusercontent.com/${REPO}/${refPath(ref)}/${path}`;
    const stableJson = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));

    function failure(r, label) {
        if ((r.status === 403 || r.status === 429) && r.headers.get("X-RateLimit-Remaining") === "0") {
            const reset = new Date(1000 * Number(r.headers.get("X-RateLimit-Reset")));
            return new Error(`limite de l'API GitHub atteinte (60 requêtes par heure), réessayez après ${reset.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`);
        }
        return new Error(`${label} : ${r.status === 404 ? "introuvable" : `erreur ${r.status}`}`);
    }

    async function request(url, label) {
        const r = await fetch(url, url.startsWith(API) ? { headers: { Accept: "application/vnd.github+json" } } : {});
        if (r.ok) return r;
        throw failure(r, label);
    }

    const getJson = async (url, label) => (await request(url, label)).json();

    async function listDir(ref, path) {
        const r = await fetch(`${API}/contents/${path}?ref=${encodeURIComponent(ref)}`, { headers: { Accept: "application/vnd.github+json" } });
        if (r.status === 404) throw new Error(`branche « ${ref} » introuvable sur ${REPO}`);
        if (!r.ok) throw failure(r, `${path} sur ${ref}`);
        const list = await r.json();
        return Object.fromEntries(list.filter((f) => f.type === "file" && f.name.endsWith(".json")).map((f) => [f.name.slice(0, -5), f.sha]));
    }

    async function pool(items, fn, onStep) {
        const results = [];
        for (let i = 0; i < items.length; i += BATCH) {
            results.push(...await Promise.all(items.slice(i, i + BATCH).map(fn)));
            onStep?.(Math.min(i + BATCH, items.length), items.length);
        }
        return results;
    }

    async function listBranches() {
        try {
            const cached = JSON.parse(sessionStorage.getItem(BRANCHES_KEY) || "null");
            if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.names;
        } catch {
            // ignore a corrupted cache
        }
        const names = [];
        for (let page = 1; page <= 10; page++) {
            const list = await getJson(`${API}/branches?per_page=100&page=${page}`, "liste des branches");
            names.push(...list.map((b) => b.name));
            if (list.length < 100) break;
        }
        names.sort((a, b) => a.localeCompare(b));
        sessionStorage.setItem(BRANCHES_KEY, JSON.stringify({ at: Date.now(), names }));
        return names;
    }

    // Reads the `events: { 1: { name: "🪓", end: { 0: "🕑" } } }` block of CrowniclesIcons.ts without evaluating it.
    function parseEventIcons(ts) {
        let from = 0;
        for (;;) {
            const at = ts.indexOf("events: {", from);
            if (at < 0) return {};
            from = at + 1;
            const start = ts.indexOf("{", at);
            let depth = 0, inString = false, end = -1;
            for (let i = start; i < ts.length; i++) {
                const c = ts[i];
                if (inString) {
                    if (c === "\\") i++;
                    else if (c === "\"") inString = false;
                } else if (c === "\"") inString = true;
                else if (c === "{") depth++;
                else if (c === "}" && --depth === 0) {
                    end = i;
                    break;
                }
            }
            if (end < 0) return {};
            const json = ts.slice(start, end + 1)
                .replace(/^\s*\/\/.*$/gm, "")
                .replace(/([{,]\s*)([A-Za-z_$][\w$]*|\d+)\s*:/g, "$1\"$2\":")
                .replace(/,(\s*[}\]])/g, "$1");
            try {
                const block = JSON.parse(json);
                const keys = Object.keys(block);
                if (keys.length && keys.every((k) => /^\d+$/.test(k))) return block;
            } catch {
                // not the big events block: try the next one
            }
        }
    }

    function langNames(commands, models) {
        const names = { inns: {}, meals: {}, rooms: {}, shops: {}, services: {}, mapTypes: {} };
        const city = commands?.report?.city;
        if (city) {
            names.inns = city.inns?.names || names.inns;
            names.meals = city.inns?.meals || names.meals;
            names.rooms = city.inns?.rooms || names.rooms;
            names.shops = Object.fromEntries(Object.entries(city.shops || {}).map(([k, v]) => [k, v?.label || k]));
            for (const [key, value] of Object.entries(city)) {
                if (value && typeof value === "object" && (value.menuLabel || value.serviceTitle)) names.services[key] = value.menuLabel || value.serviceTitle;
            }
        }
        for (const [k, v] of Object.entries(models?.map_types || {})) {
            if (v?.name) names.mapTypes[k] = v.name;
        }
        if (models?.materials) names.materials = models.materials;
        if (models?.petTags) names.petTags = models.petTags;
        return names;
    }

    const byEventId = (a, b) => (Number(a) - Number(b)) || a.localeCompare(b);

    // Like a pull request, "Avant" is the point where the compared branch left the base branch, so that changes
    // made on the base branch since then don't show up as reverted by the compared branch.
    async function mergeBase(base, head) {
        const r = await fetch(`${API}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=1`,
            { headers: { Accept: "application/vnd.github+json" } });
        if (r.status === 404) throw new Error(`branche « ${base} » ou « ${head} » introuvable sur ${REPO}`);
        if (!r.ok) throw failure(r, "point de divergence");
        const json = await r.json();
        return { sha: json.merge_base_commit?.sha, behind: json.behind_by || 0, ahead: json.ahead_by || 0 };
    }

    /**
     * Loads both branches and returns { mode: "github", base, head, events, names, classes, ... }.
     * Only events whose texts or mechanics differ are kept, unless `all` is set.
     */
    // FNV-1a hash (32 bits) of the texts and mechanics of an event, the same as review.mjs of the write-event-texts skill
    function eventFingerprint(lang, data) {
        const text = stableJson({ lang, data });
        let hash = 0x811c9dc5;
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193) >>> 0;
        }
        return hash.toString(16).padStart(8, "0");
    }

    // The owner's review of an event (reviewed.json): its date, and whether the event changed since
    function reviewOf(mark, lang, data) {
        if (!mark) return null;
        return { date: mark.date, changed: !data || mark.fingerprint !== eventFingerprint(lang ?? null, data) };
    }

    async function loadComparison({ base, head, all = false, onProgress = () => {} }) {
        onProgress("Recherche du point de divergence…");
        const fork = await mergeBase(base, head);
        const baseRef = fork.sha || base;
        onProgress("Lecture des listes d'events…");
        const [baseDir, headDir, cityDir] = await Promise.all([
            listDir(baseRef, "Core/resources/events"),
            listDir(head, "Core/resources/events"),
            listDir(head, "Core/resources/cities"),
        ]);

        onProgress("Lecture des textes…");
        const optional = (p) => p.catch(() => null);
        const [baseLang, headLang, models, commands, iconsTs, reviewed] = await Promise.all([
            getJson(raw(baseRef, "Lang/fr/events.json"), `textes de ${base}`),
            getJson(raw(head, "Lang/fr/events.json"), `textes de ${head}`),
            optional(getJson(raw(head, "Lang/fr/models.json"), "noms des lieux")),
            optional(getJson(raw(head, "Lang/fr/commands.json"), "noms des villes")),
            optional(request(raw(head, "Lib/src/CrowniclesIcons.ts"), "icônes").then((r) => r.text())),
            optional(getJson(raw(head, ".github/skills/write-event-texts/reviewed.json"), "events relus")),
        ]);
        const icons = iconsTs ? parseEventIcons(iconsTs) : {};

        const ids = [...new Set([...Object.keys(baseDir), ...Object.keys(headDir)])].sort(byEventId);
        const diffOf = (id) => {
            if (!baseDir[id]) return "added";
            if (!headDir[id]) return "removed";
            const sameText = JSON.stringify(baseLang[id] ?? null) === JSON.stringify(headLang[id] ?? null);
            return baseDir[id] === headDir[id] && sameText ? "same" : "modified";
        };
        const diffs = Object.fromEntries(ids.map((id) => [id, diffOf(id)]));
        let shown = all ? ids : ids.filter((id) => diffs[id] !== "same");

        // An unchanged file (same git sha) is fetched once and shared by both sides.
        const files = new Map();
        const want = (branch, id, sha) => {
            if (sha && !files.has(sha)) files.set(sha, { branch, id });
        };
        for (const id of shown) {
            want(baseRef, id, baseDir[id]);
            want(head, id, headDir[id]);
        }
        const fileList = [...files.entries()];
        const fetched = await pool(fileList, ([, f]) => getJson(raw(f.branch, `Core/resources/events/${f.id}.json`), `event ${f.id} sur ${f.branch}`),
            (done, total) => onProgress(`Lecture des events : ${done}/${total}`));
        const bySha = new Map(fileList.map(([sha], i) => [sha, fetched[i]]));

        // A file rewritten with the same content (key order, formatting) is not a change.
        for (const id of shown) {
            if (diffs[id] === "modified" && JSON.stringify(baseLang[id] ?? null) === JSON.stringify(headLang[id] ?? null)
                && stableJson(bySha.get(baseDir[id])) === stableJson(bySha.get(headDir[id]))) diffs[id] = "same";
        }
        if (!all) shown = shown.filter((id) => diffs[id] !== "same");

        onProgress("Lecture des lieux…");
        const cityFiles = await pool(Object.keys(cityDir), (name) => optional(getJson(raw(head, `Core/resources/cities/${name}.json`), `ville ${name}`)));
        const cityByMap = {};
        for (const city of cityFiles.filter(Boolean)) {
            for (const mapId of city.maps || []) cityByMap[mapId] = city;
        }

        const events = shown.map((id) => {
            const baseRes = baseDir[id] ? bySha.get(baseDir[id]) : null;
            const headRes = headDir[id] ? bySha.get(headDir[id]) : null;
            const triggers = (headRes || baseRes)?.triggers || [];
            const mapId = triggers.find((t) => t.mapId !== undefined)?.mapId;
            const location = mapId !== undefined ? models?.map_locations?.[mapId] : null;
            const attributes = [...new Set(triggers.flatMap((t) => [].concat(t.mapAttributes || [])))];
            const original = baseLang[id] || {};
            return {
                id,
                diff: diffs[id],
                model: null,
                mapId: mapId ?? null,
                place: location?.name || (mapId !== undefined ? `carte ${mapId}` : attributes.length ? `lieux ${attributes.join(", ")}` : "?"),
                placeType: null,
                placeDescription: location?.description || "",
                neighbours: mapId !== undefined ? null : [],
                isCity: mapId !== undefined && !!cityByMap[mapId],
                city: mapId !== undefined ? cityByMap[mapId] || null : null,
                canonBlock: null,
                triggers,
                original: baseRes ? { text: original.text || "", possibilities: original.possibilities || {} } : { text: "", possibilities: {} },
                outcomeData: Object.fromEntries(Object.entries(baseRes?.possibilities || {}).map(([name, p]) => [name, p.outcomes || {}])),
                rewrite: headRes ? {
                    text: headLang[id]?.text || "",
                    possibilities: headLang[id]?.possibilities || {},
                    data: headRes,
                    icons: icons[id] || {},
                    notes: null,
                } : null,
                rewriteError: null,
                validation: null,
                review: reviewOf(reviewed?.[id], headLang[id], headRes),
            };
        });

        const classes = Object.fromEntries(Object.entries(models?.classes || {}).filter(([k]) => /^\d+$/.test(k)));
        // Pet names come from the male form ("24_male"); their rarity is filled in the background by loadPlaces
        const pets = {};
        for (const [key, name] of Object.entries(models?.pets || {})) {
            const match = key.match(/^(\d+)_male$/);
            if (match && match[1] !== "0") pets[match[1]] = { name };
        }
        return {
            mode: "github",
            base,
            head,
            fork: { sha: fork.sha, behind: fork.behind, ahead: fork.ahead },
            all,
            generatedAt: new Date().toISOString(),
            counts: { total: ids.length, changed: ids.filter((id) => diffs[id] !== "same").length },
            pets,
            classes,
            names: langNames(commands, models),
            locations: models?.map_locations || {},
            events,
        };
    }

    /** Fills place types, neighbours and pet rarities in the background (one listing call, then raw files). */
    async function loadPlaces(data, onProgress = () => {}) {
        const { head } = data;
        const petIds = Object.keys(data.pets);
        await pool(petIds, async (id) => {
            const pet = await getJson(raw(head, `Core/resources/pets/${id}.json`), `familier ${id}`).catch(() => null);
            if (pet) {
                data.pets[id].rarity = pet.rarity;
                data.pets[id].tags = pet.tags || [];
            }
        }, (done, total) => onProgress(`Lecture des familiers : ${done}/${total}`));
        const typeCache = {};
        const typeOf = async (mapId) => {
            if (!(mapId in typeCache)) {
                typeCache[mapId] = getJson(raw(head, `Core/resources/mapLocations/${mapId}.json`), `lieu ${mapId}`).then((l) => l.type).catch(() => null);
            }
            return typeCache[mapId];
        };
        const placed = data.events.filter((e) => e.mapId !== null);
        const maps = new Set(placed.map((e) => e.mapId));
        const linkDir = await listDir(head, "Core/resources/mapLinks");
        const links = (await pool(Object.keys(linkDir), (name) => getJson(raw(head, `Core/resources/mapLinks/${name}.json`), `trajet ${name}`).catch(() => null),
            (done, total) => onProgress(`Lecture des trajets : ${done}/${total}`))).filter((l) => l && maps.has(l.startMap));
        const neighbourIds = [...new Set(links.map((l) => l.endMap))];
        await pool([...maps, ...neighbourIds], typeOf);
        for (const e of placed) {
            e.placeType = await typeOf(e.mapId);
            e.neighbours = await Promise.all(links.filter((l) => l.startMap === e.mapId).map(async (l) => ({
                mapId: l.endMap,
                name: data.locations[l.endMap]?.name || `carte ${l.endMap}`,
                minutes: l.tripDuration,
                type: await typeOf(l.endMap),
            })));
            e.neighbours.sort((a, b) => a.minutes - b.minutes);
        }
    }

    return { listBranches, loadComparison, loadPlaces };
})();
