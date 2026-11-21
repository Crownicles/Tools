(() => {
    const DATA = window.EVENT_REWRITES;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const content = $("content");

    if (!DATA || !Array.isArray(DATA.events)) {
        content.innerHTML = "<div class=\"page\"><h1>Données manquantes</h1><p>Lancez <code>python3 build.py</code> pour générer <code>data.js</code>.</p></div>";
        return;
    }

    const PETS = DATA.pets || {};
    const CLASSES = DATA.classes || {};
    const NAMES = DATA.names || {};
    const EVENTS = DATA.events;
    const byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

    const EFFECTS = {
        occupied: ["🕑", "occupé"], sleeping: ["😴", "endormi", 180], drunk: ["🥴", "ivre", 240], freezing: ["🥶", "gelé", 60],
        feetHurt: ["🦶", "pieds endoloris", 110], hurt: ["🤕", "blessé", 300], sick: ["🤢", "malade", 330], jailed: ["🔒", "emprisonné", 1440],
        injured: ["🚑", "gravement blessé", 660], starving: ["🍽️", "affamé", 50], confounded: ["😵‍💫", "confus", 40], scared: ["😱", "effrayé", 15],
        lost: ["🌫️", "perdu", 270], fished: ["🎣", "pêché", 5], working: ["⚒️", "au travail", 75], burning: ["🔥", "brûlé", 25],
    };
    const RANGES = { level: "niveau", karma: "karma", health: "PV", attack: "attaque", defense: "défense", speed: "vitesse", petRarity: "rareté du familier" };
    const ITEM_CATEGORIES = { 0: "arme", 1: "armure", 2: "potion", 3: "objet" };
    const STATS = ["level", "karma", "health", "attack", "defense", "speed"];
    const TARGETS = { intro: [200, 300], choice: [8, 90], outcome: [150, 280] };

    const nf = new Intl.NumberFormat("fr-FR");
    const num = (n) => nf.format(n).replace("-", "−");
    const signed = (n) => (n > 0 ? "+" : "") + num(n);
    const fmtMin = (m) => {
        if (m < 60) return `${m} min`;
        const h = Math.floor(m / 60), r = m % 60;
        return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
    };
    const plural = (n, word, many = `${word}s`) => `${n} ${n > 1 ? many : word}`;
    const mapType = (t) => (NAMES.mapTypes || {})[t] || t;
    const petName = (id) => PETS[id]?.name || `familier ${id}`;
    const className = (id) => CLASSES[id] || `classe ${id}`;
    const byNumKey = (obj) => Object.keys(obj || {}).sort((a, b) => (+a - +b) || a.localeCompare(b));
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

    const formatText = (text) => esc(text)
        .replace(/(\{\{[^}]+\}\}|\{emote:[^}]+\}|\$t\([^)]+\))/g, "<span class=\"ph\">$1</span>")
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/\n/g, "<br>");

    const inline = (s) => esc(s)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");

    function markdown(md) {
        const out = [];
        const stack = [];
        const closeTo = (depth) => {
            while (stack.length > depth) out.push("</li></ul>"), stack.pop();
        };
        for (const line of String(md || "").split("\n")) {
            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            const item = line.match(/^(\s*)[-*]\s+(.*)$/);
            if (heading) {
                closeTo(0);
                out.push(`<h4>${inline(heading[2])}</h4>`);
            } else if (item) {
                const depth = Math.floor(item[1].length / 2) + 1;
                if (stack.length >= depth) {
                    closeTo(depth);
                    out.push("</li><li>");
                } else {
                    while (stack.length < depth) out.push("<ul><li>"), stack.push(1);
                }
                out.push(inline(item[2]));
            } else if (line.trim()) {
                closeTo(0);
                out.push(`<p>${inline(line)}</p>`);
            }
        }
        closeTo(0);
        return out.join("");
    }

    const fold = (title, sub, body, { open = false, cls = "" } = {}) =>
        `<details class="fold ${cls}"${open ? " open" : ""}><summary><span class="fold-title">${title}</span>${sub ? ` <span class="fold-sub">${sub}</span>` : ""}</summary><div class="fold-body">${body}</div></details>`;

    // --- conditions & consequences -------------------------------------------------

    function rangeText(label, r) {
        if (!r || typeof r !== "object") return `${label} ?`;
        const hasMin = r.min != null, hasMax = r.max != null;
        if (hasMin && hasMax) return `${label} ${num(r.min)} à ${num(r.max)}`;
        if (hasMin) return `${label} ≥ ${num(r.min)}`;
        if (hasMax) return `${label} ≤ ${num(r.max)}`;
        return label;
    }

    const shortList = (names, max = 2) => (names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max}`);

    // One short line per outcome; the full list goes in the tooltip.
    function conditionParts(outcome) {
        const req = outcome?.requirements || {};
        const parts = [];
        for (const [key, label] of Object.entries(RANGES)) {
            if (req[key] !== undefined) parts.push({ short: rangeText(label, req[key]) });
        }
        if (req.validClassIds) {
            const names = req.validClassIds.map(className);
            parts.push({ short: `classe : ${shortList(names)}`, full: `classe : ${names.join(", ")}` });
        }
        if (req.validPetTypeIds) {
            const names = req.validPetTypeIds.map(petName);
            parts.push({ short: `familier : ${shortList(names)}`, full: `familier : ${names.join(", ")}` });
        }
        if (req.campaignCurrentMissionId !== undefined) parts.push({ short: `mission de campagne ${req.campaignCurrentMissionId}` });
        for (const key of Object.keys(req)) {
            if (!(key in RANGES) && !["validClassIds", "validPetTypeIds", "campaignCurrentMissionId"].includes(key)) {
                parts.push({ short: `${key} : ${JSON.stringify(req[key])}` });
            }
        }
        if (outcome?.condition) {
            parts.push({ short: outcome.condition.canAcceptPet ? "peut accueillir un familier" : `condition : ${JSON.stringify(outcome.condition)}` });
        }
        return parts;
    }

    const isConditional = (o) => conditionParts(o).length > 0;

    function consequences(o) {
        if (!o) return [{ text: "mécanique manquante", cls: "bad" }];
        const items = [];
        const pn = (n) => (n > 0 ? "pos" : n < 0 ? "neg" : "");
        if (o.oneshot) items.push({ text: "💀 mort (PV à 0)", cls: "neg" });
        if (o.health) items.push({ text: `❤️ ${signed(o.health)} PV`, cls: pn(o.health) });
        if (o.money) items.push({ text: `💰 ${signed(o.money)}`, cls: pn(o.money) });
        if (o.lostTime) items.push({ text: `⏳ ${fmtMin(o.lostTime)}` });
        if (o.effect && !(o.effect === "occupied" && o.lostTime)) {
            const [emoji, label, duration] = EFFECTS[o.effect] || ["❓", o.effect];
            items.push({ text: `${emoji} ${label}${duration ? ` ${fmtMin(duration)}` : ""}`, title: `altération : ${o.effect}`, cls: EFFECTS[o.effect] ? "" : "bad" });
        } else if (o.effect) {
            items[items.length - 1].title = "altération : occupé";
        }
        if (o.karma) items.push({ text: `⚖️ karma ${signed(o.karma)}`, cls: pn(o.karma) });
        if (o.randomItem) {
            const details = [];
            if (o.randomItem.rarity) details.push(rangeText("rareté", o.randomItem.rarity));
            if (o.randomItem.category !== undefined) details.push(ITEM_CATEGORIES[o.randomItem.category] || `catégorie ${o.randomItem.category}`);
            items.push({ text: `🎁 objet${details.length ? ` (${details.join(", ")})` : ""}`, cls: "pos" });
        }
        if (o.energy) items.push({ text: `⚡ ${signed(o.energy)} énergie`, cls: pn(o.energy) });
        if (o.gems) items.push({ text: `💎 ${signed(o.gems)} gemmes`, cls: pn(o.gems) });
        if (o.tokens) items.push({ text: `🪙 ${signed(o.tokens)} jetons`, cls: pn(o.tokens) });
        if (o.bonusExperience) items.push({ text: `⭐ ${signed(o.bonusExperience)} XP`, cls: pn(o.bonusExperience) });
        if (o.bonusPoints) items.push({ text: `🏆 ${signed(o.bonusPoints)} points`, cls: pn(o.bonusPoints) });
        if (o.randomPet) items.push({ text: `🐾 familier au hasard${o.randomPet.rarity ? ` (${rangeText("rareté", o.randomPet.rarity)})` : ""}`, cls: "pos" });
        if (o.givePet) {
            const id = o.givePet.typeId ?? o.givePet.petTypeId ?? o.givePet.id ?? o.givePet;
            items.push({ text: `🐾 familier : ${typeof id === "object" ? "?" : petName(id)}`, cls: "pos", title: JSON.stringify(o.givePet) });
        }
        if (o.nextEvent !== undefined) items.push({ text: `➡️ event ${o.nextEvent}` });
        if (o.mapTypesDestination) items.push({ text: `🧭 vers : ${o.mapTypesDestination.map(mapType).join(", ")}` });
        if (o.mapTypesExcludeDestination) items.push({ text: `🚫 pas vers : ${o.mapTypesExcludeDestination.map(mapType).join(", ")}` });
        if (o.mapLink) items.push({ text: "🗺️ trajet imposé", title: JSON.stringify(o.mapLink) });
        if (o.forceStayInCity) items.push({ text: "🏙️ reste en ville" });
        if (o.forceLeaveCity) items.push({ text: "🚪 quitte la ville" });
        const known = new Set(["requirements", "condition", "oneshot", "health", "money", "lostTime", "effect", "karma", "randomItem", "energy", "gems", "tokens",
            "bonusExperience", "bonusPoints", "randomPet", "givePet", "nextEvent", "mapTypesDestination", "mapTypesExcludeDestination", "mapLink",
            "forceStayInCity", "forceLeaveCity", "tags"]);
        for (const key of Object.keys(o)) {
            if (!known.has(key)) items.push({ text: `${key} : ${JSON.stringify(o[key])}`, cls: "bad", title: "champ inconnu" });
        }
        if (!items.length) items.push({ text: "aucun effet", cls: "none" });
        for (const tag of o.tags || []) items.push({ text: `🏷️ ${tag}`, cls: "tag", title: "tag de mission" });
        return items;
    }

    const renderConsequences = (o) => `<div class="csq">${consequences(o)
        .map((c) => `<span class="c ${c.cls || ""}"${c.title ? ` title="${esc(c.title)}"` : ""}>${esc(c.text)}</span>`).join("")}</div>`;

    // --- player profile -------------------------------------------------------------

    const PROFILE_KEY = "eventRewrites.profile";
    const profileInputs = { level: "pLevel", karma: "pKarma", attack: "pAttack", defense: "pDefense", speed: "pSpeed", health: "pHealth" };
    const profile = { on: false, level: 50, karma: 0, attack: 200, defense: 200, speed: 200, health: 500, classId: "0", petId: "" };
    try {
        Object.assign(profile, JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"));
    } catch {
        // ignore a corrupted saved profile
    }

    function failedConditions(outcome) {
        const req = outcome?.requirements || {};
        const fails = [];
        for (const key of STATS) {
            const r = req[key];
            if (!r) continue;
            const v = profile[key];
            if ((r.min != null && v < r.min) || (r.max != null && v > r.max)) fails.push(rangeText(RANGES[key], r));
        }
        if (req.validClassIds && !req.validClassIds.map(String).includes(String(profile.classId))) fails.push("classe");
        const pet = profile.petId !== "" ? PETS[profile.petId] : null;
        if (req.validPetTypeIds && (!pet || !req.validPetTypeIds.map(String).includes(String(profile.petId)))) fails.push("familier");
        if (req.petRarity) {
            const r = req.petRarity;
            if (!pet || (r.min != null && pet.rarity < r.min) || (r.max != null && pet.rarity > r.max)) fails.push(rangeText(RANGES.petRarity, r));
        }
        if (req.campaignCurrentMissionId !== undefined) fails.push("mission de campagne");
        return fails;
    }

    function profileSummary() {
        if (!profile.on) return "désactivé";
        const pet = profile.petId !== "" ? petName(profile.petId) : "sans familier";
        return `niv. ${profile.level} · karma ${num(profile.karma)} · ${className(profile.classId)} · ${pet}`;
    }

    function setupProfile() {
        $("pClass").innerHTML = Object.keys(CLASSES).sort((a, b) => +a - +b).map((id) => `<option value="${esc(id)}">${esc(CLASSES[id])}</option>`).join("");
        $("pPet").innerHTML = "<option value=\"\">Aucun familier</option>" + Object.keys(PETS)
            .sort((a, b) => PETS[a].name.localeCompare(PETS[b].name, "fr"))
            .map((id) => `<option value="${esc(id)}">${esc(PETS[id].name)} (rareté ${PETS[id].rarity})</option>`).join("");
        $("profileOn").checked = profile.on;
        for (const [key, id] of Object.entries(profileInputs)) $(id).value = profile[key];
        $("pClass").value = profile.classId;
        $("pPet").value = profile.petId;
        const sync = () => {
            $("profileFields").classList.toggle("disabled", !profile.on);
            $("profileSummary").textContent = profileSummary();
        };
        sync();

        const update = () => {
            profile.on = $("profileOn").checked;
            for (const [key, id] of Object.entries(profileInputs)) profile[key] = Number($(id).value) || 0;
            profile.classId = $("pClass").value;
            profile.petId = $("pPet").value;
            sync();
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
            const scroll = content.scrollTop;
            render();
            content.scrollTop = scroll;
        };
        $("profile").addEventListener("input", update);
        $("profile").addEventListener("change", update);
    }

    // --- stats & list ---------------------------------------------------------------

    function stats(e) {
        const orig = Object.values(e.original?.possibilities || {}).reduce((n, p) => n + Object.keys(p.outcomes || {}).length, 0);
        const rw = e.rewrite?.data?.possibilities;
        if (!rw) return { orig, after: null, conditional: 0 };
        let after = 0, conditional = 0;
        for (const p of Object.values(rw)) {
            for (const o of Object.values(p.outcomes || {})) {
                after++;
                if (isConditional(o)) conditional++;
            }
        }
        return { orig, after, conditional };
    }

    function status(e) {
        if (e.rewriteError) return { cls: "err", text: "JSON invalide" };
        if (!e.rewrite) return { cls: "pending", text: "en cours" };
        const v = e.validation || { errors: [], warnings: [] };
        if (v.errors.length) return { cls: "err", text: plural(v.errors.length, "erreur") };
        if (v.warnings.length) return { cls: "warn", text: `réécrit · ${plural(v.warnings.length, "avertissement")}` };
        return { cls: "ok", text: "réécrit" };
    }

    function figures(s) {
        return s.after === null ? plural(s.orig, "issue") : `${s.orig} → ${s.after} issues · ${pct(s.conditional, s.after)} % cond.`;
    }

    function renderList(current) {
        $("eventList").innerHTML = EVENTS.map((e) => {
            const st = status(e);
            return `<li class="${e.id === current ? "active" : ""}"><a href="#${esc(e.id)}" title="${esc(st.text)}">
                <div class="li-top"><span class="dot ${st.cls}"></span><b>#${esc(e.id)}</b> ${esc(e.place || "?")}</div>
                <div class="li-sub">${esc(st.text)} · ${esc(figures(stats(e)))}</div>
                <div class="li-sub">${esc(e.rewrite?.model || e.model || "")}</div></a></li>`;
        }).join("");
        const done = EVENTS.filter((e) => e.rewrite).length;
        $("subtitle").textContent = `${plural(EVENTS.length, "event")}, ${plural(done, "réécrit")}${done < EVENTS.length ? `, ${EVENTS.length - done} en cours` : ""}.`;
        $("generated").textContent = `data.js généré le ${new Date(DATA.generatedAt).toLocaleString("fr-FR")}`;
    }

    // --- event sheet ----------------------------------------------------------------

    function lengthWarning(text, kind) {
        const [lo, hi] = TARGETS[kind];
        const n = (text || "").length;
        return n && (n < lo || n > hi) ? `<span class="len-warn" title="cible ${lo} à ${hi} caractères">${n} car.</span>` : "";
    }

    function renderContext(e) {
        const n = (group, id) => (NAMES[group] || {})[id] || id;
        const neighbours = (e.neighbours || []).map((x) =>
            `<li><b>${esc(x.name)}</b> <span class="muted">${esc(mapType(x.type))} · ${fmtMin(x.minutes)}</span></li>`).join("");
        const placeName = (mapId) => (mapId === e.mapId ? e.place : (e.neighbours || []).find((x) => x.mapId === mapId)?.name);
        const triggerText = (t) => Object.entries(t).map(([k, v]) => k === "mapId" ? `carte ${v}${placeName(v) ? ` (${placeName(v)})` : ""}` : `${k} : ${JSON.stringify(v)}`).join(" · ");
        const triggers = (e.triggers || []).map(triggerText);

        let city = "";
        if (e.isCity && e.city) {
            const c = e.city;
            const inns = (c.inns || []).map((inn) => `
                <h4>🍺 ${esc(n("inns", inn.id))}</h4>
                <table><thead><tr><th>Repas</th><th>Prix</th><th>Énergie</th></tr></thead><tbody>
                ${(inn.meals || []).map((m) => `<tr><td>${esc(n("meals", m.id))}</td><td>${num(m.price)}</td><td>${num(m.energy)}</td></tr>`).join("")}
                </tbody></table>
                <table><thead><tr><th>Chambre</th><th>Prix</th><th>Vie</th></tr></thead><tbody>
                ${(inn.rooms || []).map((r) => `<tr><td>${esc(n("rooms", r.id))}</td><td>${num(r.price)}</td><td>+${num(r.health)}</td></tr>`).join("")}
                </tbody></table>`).join("");
            const body = `${inns}
                <p><b>Services :</b> ${(c.services || []).map((s) => esc(n("services", s))).join(", ") || "aucun"}</p>
                <p><b>Boutiques :</b> ${(c.shops || []).map((s) => esc(n("shops", s))).join(", ") || "aucune"}</p>
                <p class="muted">Logis : ${num(c.apartmentPrice || 0)} pièces · prix des maisons × ${num(c.homePriceMultiplier || 1)}</p>`;
            const sub = [plural((c.inns || []).length, "auberge"), plural((c.services || []).length, "service"), plural((c.shops || []).length, "boutique")].join(" · ");
            city = fold("🏙️ Menu de la ville", esc(sub), body);
        }

        const body = `
            <blockquote>${esc(e.placeDescription)}</blockquote>
            <div class="ctx-grid">
                <div><h4>Voisins</h4><ul class="plain">${neighbours || "<li class=\"muted\">aucun</li>"}</ul></div>
                <div><h4>Déclencheurs</h4><ul class="plain">${triggers.map((t) => `<li>${esc(t)}</li>`).join("") || "<li class=\"muted\">aucun</li>"}</ul>
                     <h4>Modèle d'IA</h4><p>${esc(e.rewrite?.model || e.model || "?")}</p></div>
            </div>
            ${city}
            ${fold("📖 Canon du lieu", "tout ce que le jeu en dit", `<div class="md">${markdown(e.canonBlock)}</div>`)}`;
        const sub = [mapType(e.placeType).toLowerCase(), e.isCity && e.placeType !== "ci" ? "ville du jeu" : "", plural((e.neighbours || []).length, "voisin"),
            triggers.length === 1 ? `déclenché sur ${triggers[0]}` : plural(triggers.length, "déclencheur")].filter(Boolean).join(" · ");
        return fold(`📍 ${esc(e.place)}`, esc(sub), body, { cls: "context" });
    }

    function renderIntro(e) {
        const before = e.original?.text || "";
        const after = e.rewrite?.text;
        const single = !e.rewrite;
        return `<section class="block">
            <h2>Introduction</h2>
            <div class="pair ${single ? "single" : ""}">
                <div class="side-head">Avant <span class="muted small">${before.length} car.</span></div>
                ${single ? "" : `<div class="side-head after">Après <span class="muted small">${(after || "").length} car.</span> ${lengthWarning(after, "intro")}</div>`}
                <div class="cell" data-side="Avant"><p class="prose">${formatText(before)}</p></div>
                ${single ? "" : `<div class="cell" data-side="Après"><p class="prose">${after ? formatText(after) : "<span class=\"bad\">introduction manquante</span>"}</p></div>`}
            </div></section>`;
    }

    function outcomeCell(side, id, text, mech, opts = {}) {
        if (text === undefined && mech === undefined) return `<div class="cell empty" data-side="${side}"></div>`;
        const parts = conditionParts(mech);
        const fails = opts.profile ? failedConditions(mech) : [];
        const impossible = fails.length > 0;
        const meta = [`<span class="oid">#${esc(id)}</span>`];
        if (opts.icon) meta.push(`<span class="o-icon">${esc(opts.icon)}</span>`);
        if (opts.added) meta.push("<span class=\"badge\">nouvelle</span>");
        if (parts.length) {
            const full = parts.map((p) => p.full || p.short).join(" · ");
            meta.push(`<span class="cond" title="${esc(`Condition : ${full}`)}">si ${esc(parts.map((p) => p.short).join(" · "))}</span>`);
        } else if (opts.showAlways) {
            meta.push("<span class=\"always\">toujours possible</span>");
        }
        if (impossible) meta.push("<span class=\"impossible-tag\">impossible pour ce profil</span>");
        else if (opts.profile && opts.possibleCount) meta.push(`<span class="chance" title="tirage uniforme parmi les issues possibles">🎲 1 sur ${opts.possibleCount}</span>`);
        if (opts.checkLength) meta.push(lengthWarning(text, "outcome"));
        return `<div class="cell outcome ${impossible ? "impossible" : ""}" data-side="${side}"${impossible ? ` title="${esc(`Impossible pour ce profil : ${fails.join(", ")}`)}"` : ""}>
            <div class="o-meta">${meta.join("")}</div>
            <p class="prose" title="${(text || "").length} caractères">${text ? formatText(text) : "<span class=\"bad\">texte manquant</span>"}</p>
            ${renderConsequences(mech)}
        </div>`;
    }

    function renderPossibility(e, name, index) {
        const orig = e.original?.possibilities?.[name];
        const rw = e.rewrite?.possibilities?.[name];
        const rwData = e.rewrite?.data?.possibilities?.[name]?.outcomes || {};
        const icons = e.rewrite?.icons || {};
        const single = !e.rewrite;
        const isEnd = name === "end";
        const isNew = !orig && !!(rw || e.rewrite?.data?.possibilities?.[name]);
        const removed = orig && e.rewrite && !rw;
        const icon = isNew && !isEnd && typeof icons[name] === "string" ? icons[name] : "";
        const title = isEnd ? "Sans réponse du joueur" : `Choix ${index + 1}`;

        const origIds = byNumKey(orig?.outcomes);
        const rwIds = byNumKey({ ...(rw?.outcomes || {}), ...rwData });
        const possibleCount = rwIds.filter((id) => failedConditions(rwData[id]).length === 0).length;
        const conditional = rwIds.filter((id) => isConditional(rwData[id])).length;
        const endIcons = isEnd && icons.end && typeof icons.end === "object" ? icons.end : {};

        const cells = [];
        cells.push(`<div class="side-head">Avant <span class="muted small">${plural(origIds.length, "issue")}</span></div>`);
        if (!single) {
            cells.push(`<div class="side-head after">Après <span class="muted small">${plural(rwIds.length, "issue")} · ${conditional} cond.${profile.on
                ? ` · <span class="${possibleCount ? "" : "bad"}">${possibleCount} possible${possibleCount > 1 ? "s" : ""} pour ce profil</span>` : ""}</span></div>`);
        }
        if (!isEnd) {
            cells.push(`<div class="cell label" data-side="Avant">${orig ? `<span class="choice">${formatText(orig.text)}</span>` : "<span class=\"muted\">n'existait pas</span>"}</div>`);
            if (!single) {
                cells.push(`<div class="cell label" data-side="Après">${rw ? `<span class="choice">${rw.text ? formatText(rw.text) : "<span class=\"bad\">libellé manquant</span>"}</span> ${lengthWarning(rw.text, "choice")}` : "<span class=\"bad\">possibilité supprimée</span>"}</div>`);
            }
        }
        const ids = single ? origIds : byNumKey(Object.fromEntries([...origIds, ...rwIds].map((id) => [id, 1])));
        for (const id of ids) {
            cells.push(outcomeCell("Avant", id, orig?.outcomes?.[id], orig?.outcomes?.[id] !== undefined ? (e.outcomeData?.[name]?.[id] || {}) : undefined));
            if (!single) {
                const exists = rw?.outcomes?.[id] !== undefined || rwData[id] !== undefined;
                cells.push(exists
                    ? outcomeCell("Après", id, rw?.outcomes?.[id], rwData[id], {
                        profile: profile.on, possibleCount, showAlways: true, checkLength: true,
                        icon: endIcons[id], added: !isNew && !origIds.includes(id),
                    })
                    : outcomeCell("Après", id));
            }
        }

        return `<section class="block possibility" id="p-${esc(name)}">
            <h3 class="p-title">${icon ? `<span class="o-icon">${esc(icon)}</span> ` : ""}${esc(title)}
                <code class="pname">${esc(name)}</code>${isNew ? " <span class=\"badge\">nouvelle possibilité</span>" : ""}${removed ? " <span class=\"badge bad\">supprimée</span>" : ""}</h3>
            <div class="pair ${single ? "single" : ""}">${cells.join("")}</div>
        </section>`;
    }

    function renderReview(e) {
        if (!e.rewrite && !e.rewriteError) return "";
        const notes = e.rewrite?.notes;
        const noteList = Array.isArray(notes) ? notes : notes ? [notes] : [];
        const notesFold = fold("📝 Notes de l'agent", plural(noteList.length, "puce"),
            noteList.length ? `<ul class="notes">${noteList.map((x) => `<li>${formatText(x)}</li>`).join("")}</ul>` : "<p class=\"muted\">Aucune note.</p>");

        const v = e.validation;
        const list = (items, cls) => `<ul class="${cls}">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
        let sub, body = "";
        if (e.rewriteError) {
            sub = `<span class="bad">${esc(e.rewriteError)}</span>`;
        } else {
            const subParts = [v.errors.length ? `<span class="bad">${plural(v.errors.length, "erreur")}</span>` : "<span class=\"ok\">aucune erreur</span>"];
            subParts.push(v.warnings.length ? `<span class="warn">${plural(v.warnings.length, "avertissement")}</span>` : "aucun avertissement");
            sub = subParts.join(" · ");
            if (v.errors.length) body += `<h4 class="bad">Erreurs</h4>${list(v.errors, "errors")}`;
            if (v.warnings.length) body += `<h4 class="warn">Avertissements</h4>${list(v.warnings, "warnings")}`;
            if (!v.errors.length && !v.warnings.length) body += "<p>Le validateur ne signale rien.</p>";
            if (v.summary) body += `<p class="muted">${esc(v.summary)}</p>`;
            if (v.raw) body += `<pre>${esc(v.raw)}</pre>`;
        }
        return `<section class="block review">${e.rewrite ? notesFold : ""}${fold("🔎 Validation", sub, body || "<p class=\"muted\">Pas de sortie.</p>")}</section>`;
    }

    function possibilityOrder(e) {
        const names = [];
        const add = (n) => { if (n !== "end" && !names.includes(n)) names.push(n); };
        Object.keys(e.original?.possibilities || {}).forEach(add);
        Object.keys(e.rewrite?.possibilities || {}).forEach(add);
        Object.keys(e.rewrite?.data?.possibilities || {}).forEach(add);
        const hasEnd = [e.original?.possibilities, e.rewrite?.possibilities, e.rewrite?.data?.possibilities].some((p) => p && "end" in p);
        return hasEnd ? [...names, "end"] : names;
    }

    function renderEvent(e) {
        const s = stats(e), st = status(e);
        const order = possibilityOrder(e);
        const nav = order.map((n) => `<a href="#${esc(e.id)}" data-scroll="p-${esc(n)}">${esc(n === "end" ? "sans réponse" : n)}</a>`).join("");
        const banner = e.rewrite ? "" : e.rewriteError
            ? `<p class="banner">La réécriture existe mais n'est pas lisible : <span class="bad">${esc(e.rewriteError)}</span>. Seule la version d'origine est affichée.</p>`
            : `<p class="banner">⏳ Réécriture en cours : seule la version d'origine est affichée. Relancez <code>python3 build.py</code> quand <code>out/${esc(e.id)}.json</code> sera prêt.</p>`;
        const head = s.after === null
            ? plural(s.orig, "issue")
            : `${s.orig} → ${s.after} issues · ${s.conditional} conditionnelles (${pct(s.conditional, s.after)} %)`;
        return `<div class="page">
            <div class="event-head">
                <h1>#${esc(e.id)} · ${esc(e.place)}</h1>
                <p class="muted"><span class="dot ${st.cls}"></span>${esc(st.text)} · ${esc(head)} · ${esc(e.rewrite?.model || e.model || "?")}</p>
            </div>
            ${banner}
            ${renderContext(e)}
            ${renderIntro(e)}
            <nav class="jump">Possibilités : ${nav}</nav>
            ${order.map((n, i) => renderPossibility(e, n, i)).join("")}
            ${renderReview(e)}
        </div>`;
    }

    function currentId() {
        const id = decodeURIComponent(location.hash.slice(1));
        if (byId[id]) return id;
        return (EVENTS.find((e) => e.rewrite) || EVENTS[0])?.id;
    }

    // Keep the user's open/closed choice for each fold across re-renders.
    const openFolds = new Set();
    content.addEventListener("toggle", (ev) => {
        const key = ev.target.querySelector(":scope > summary .fold-title")?.textContent;
        if (key) ev.target.open ? openFolds.add(key) : openFolds.delete(key);
    }, true);

    function render() {
        const id = currentId();
        renderList(id);
        content.innerHTML = id ? renderEvent(byId[id]) : "<div class=\"page\"><p>Aucun event dans data.js.</p></div>";
        content.querySelectorAll("details.fold").forEach((d) => {
            const key = d.querySelector(":scope > summary .fold-title")?.textContent;
            if (openFolds.has(key)) d.open = true;
        });
        document.title = id ? `Crownicles — Réécriture #${id} ${byId[id].place}` : "Crownicles — Réécriture des big events";
    }

    content.addEventListener("click", (ev) => {
        const link = ev.target.closest("[data-scroll]");
        if (!link) return;
        ev.preventDefault();
        document.getElementById(link.dataset.scroll)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    window.addEventListener("hashchange", () => {
        openFolds.clear();
        render();
        content.scrollTop = 0;
    });

    setupProfile();
    render();
})();
