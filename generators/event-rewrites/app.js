(() => {
    const LOCAL = window.EVENT_REWRITES && Array.isArray(window.EVENT_REWRITES.events) ? window.EVENT_REWRITES : null;
    const GH = window.EventRewritesGithub;
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
    const content = $("content");

    // Current data: the workshop bundle (data.js) or a comparison of two GitHub branches (github.js).
    let DATA = null, PETS = {}, CLASSES = {}, NAMES = {}, EVENTS = [], byId = {};
    const isGithub = () => DATA?.mode === "github";

    function setData(data) {
        DATA = data;
        PETS = data?.pets || {};
        CLASSES = data?.classes || {};
        NAMES = data?.names || {};
        EVENTS = data?.events || [];
        byId = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
        fillProfileOptions();
    }

    const EFFECTS = {
        occupied: ["🕑", "occupé"], sleeping: ["😴", "endormi", 180], drunk: ["🥴", "ivre", 240], freezing: ["🥶", "gelé", 60],
        feetHurt: ["🦶", "pieds endoloris", 110], hurt: ["🤕", "blessé", 300], sick: ["🤢", "malade", 330], jailed: ["🔒", "emprisonné", 1440],
        injured: ["🚑", "gravement blessé", 660], starving: ["🍽️", "affamé", 50], confounded: ["😵‍💫", "confus", 40], scared: ["😱", "effrayé", 15],
        lost: ["🌫️", "perdu", 270], fished: ["🎣", "pêché", 5], working: ["⚒️", "au travail", 75], burning: ["🔥", "brûlé", 25],
    };
    const RANGES = { level: "niveau", karma: "karma", health: "PV", attack: "attaque", defense: "défense", speed: "vitesse", petRarity: "rareté du familier",
        cookingLevel: "cuisine", weaponLevel: "arme améliorée", armorLevel: "armure améliorée" };
    const MATERIAL_TYPES = { metal: "métal", alloy: "alliage", nature: "plantes", spiritual: "objets spirituels", magic: "magie", leather: "cuir",
        rope: "cordes et tissus", poison: "poisons", explosive: "explosifs", wood: "bois" };
    const ENCHANT_TYPES = { damage: "attaque", defense: "défense", speed: "vitesse", health: "énergie", magic: "magie", other: "souffle" };
    // [name, type, slot, highest level that exists in the game]
    const ENCHANT_KINDS = { pvpAttack: ["Attaque PvP", "damage", "weapon", 3], pveAttack: ["Attaque PvE", "damage", "weapon", 3], allAttack: ["Attaque", "damage", "weapon", 3],
        defense: ["Défense", "defense", "armor", 3], speed: ["Vitesse", "speed", "armor", 3], maxEnergy: ["Énergie max", "health", "armor", 3],
        baseBreath: ["Souffle de base", "other", "weapon", 2], maxBreath: ["Souffle max", "other", "armor", 1], burnedDamage: ["Aspect de feu", "magic", "weapon", 1],
        frozenDamage: ["Aspect de givre", "magic", "weapon", 1], poisonedDamage: ["Aspect de venin", "magic", "weapon", 1] };
    const ITEM_CATEGORIES = { 0: "arme", 1: "armure", 2: "potion", 3: "objet" };
    const STATS = ["level", "karma", "health", "attack", "defense", "speed", "cookingLevel", "weaponLevel", "armorLevel"];
    const TARGETS = { intro: [180, 420], choice: [8, 90], outcome: [150, 280] };

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
    const stableJson = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));

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
        if (req.materials) parts.push(materialsText(req.materials));
        if (outcome?.consumeMaterials) parts.push(materialsText({ ...outcome.consumeMaterials, quantity: { min: outcome.consumeMaterials.quantity } }));
        if (req.enchantment) parts.push(enchantmentText(req.enchantment));
        for (const key of Object.keys(req)) {
            if (!(key in RANGES) && !["validClassIds", "validPetTypeIds", "campaignCurrentMissionId", "materials", "enchantment"].includes(key)) {
                parts.push({ short: `${key} : ${JSON.stringify(req[key])}` });
            }
        }
        if (outcome?.condition) {
            parts.push({ short: outcome.condition.canAcceptPet ? "peut accueillir un familier" : `condition : ${JSON.stringify(outcome.condition)}` });
        }
        return parts;
    }

    const isConditional = (o) => conditionParts(o).length > 0;

    function materialLabel(m) {
        const label = [...(m.ids || []).map((id) => (NAMES.materials || {})[id] || `matériau ${id}`), ...(m.type ? [MATERIAL_TYPES[m.type] || m.type] : [])];
        if (m.rarity) label.push(rangeText("rareté", m.rarity));
        return label.length ? shortList(label) : "matériau";
    }

    function materialsText(m) {
        const what = [];
        if (m.ids) what.push(m.ids.map((id) => (NAMES.materials || {})[id] || `matériau ${id}`));
        if (m.type) what.push([MATERIAL_TYPES[m.type] || m.type]);
        if (m.rarity) what.push([rangeText("rareté", m.rarity)]);
        const label = what.flat();
        const q = m.quantity || { min: 1 };
        const none = q.max === 0;
        const quantity = none ? "aucun" : q.min > 1 || q.max != null ? rangeText("quantité", q) : "";
        const base = label.length ? label : ["matériaux"];
        return {
            short: `${none ? "sans " : "sac : "}${shortList(base)}${quantity && !none ? ` (${quantity})` : ""}`,
            full: `matériaux : ${base.join(", ")}${quantity ? ` (${quantity})` : ""}`,
        };
    }

    function enchantmentText(e) {
        const where = e.slot === "weapon" ? "arme" : e.slot === "armor" ? "armure" : "arme ou armure";
        const what = [...(e.kinds || []).map((k) => ENCHANT_KINDS[k]?.[0] || k), ...(e.types || []).map((t) => ENCHANT_TYPES[t] || t)];
        const level = e.level ? ` ${rangeText("niv.", e.level)}` : "";
        return { short: `${where} enchantée${what.length ? ` : ${shortList(what)}` : ""}${level}`, full: `${where} enchantée${what.length ? ` : ${what.join(", ")}` : ""}${level}` };
    }

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
        if (o.consumeMaterials) items.push({ text: `🧺 −${o.consumeMaterials.quantity} ${materialLabel(o.consumeMaterials)}`, cls: "neg", title: "matériaux consommés" });
        if (o.giveMaterials) items.push({ text: `🧺 +${o.giveMaterials.quantity} ${materialLabel(o.giveMaterials)}`, cls: "pos", title: "matériau donné (un seul, au hasard parmi ceux qui passent les filtres)" });
        if (o.forceStayInCity) items.push({ text: "🏙️ reste en ville" });
        if (o.forceLeaveCity) items.push({ text: "🚪 quitte la ville" });
        const known = new Set(["requirements", "condition", "oneshot", "health", "money", "lostTime", "effect", "karma", "randomItem", "energy", "gems", "tokens",
            "bonusExperience", "bonusPoints", "randomPet", "givePet", "nextEvent", "mapTypesDestination", "mapTypesExcludeDestination", "mapLink",
            "forceStayInCity", "forceLeaveCity", "tags", "consumeMaterials", "giveMaterials"]);
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
    const profileInputs = { level: "pLevel", karma: "pKarma", attack: "pAttack", defense: "pDefense", speed: "pSpeed", health: "pHealth",
        cookingLevel: "pCooking", weaponLevel: "pWeaponLevel", armorLevel: "pArmorLevel" };
    const profile = { on: false, level: 50, karma: 0, attack: 200, defense: 200, speed: 200, health: 500, classId: "0", petId: "",
        cookingLevel: 0, weaponLevel: 0, armorLevel: 0, hasMaterials: true, weaponEnchant: "", armorEnchant: "" };
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
        for (const m of [req.materials, outcome?.consumeMaterials && { quantity: { min: outcome.consumeMaterials.quantity } }].filter(Boolean)) {
            const q = m.quantity || { min: 1 };
            const owned = profile.hasMaterials ? Infinity : 0;
            if ((q.min != null && owned < q.min) || (q.max != null && owned > q.max)) fails.push("matériaux");
        }
        if (req.enchantment) {
            const e = req.enchantment;
            const equipped = [["weapon", profile.weaponEnchant], ["armor", profile.armorEnchant]].filter(([slot, id]) => id && (!e.slot || e.slot === slot));
            const matches = equipped.some(([, id]) => {
                const kind = id.replace(/\d+$/, ""), level = Number(id.match(/\d+$/)?.[0] || 1);
                return (!e.kinds || e.kinds.includes(kind)) && (!e.types || e.types.includes(ENCHANT_KINDS[kind]?.[1]))
                    && (!e.level || ((e.level.min == null || level >= e.level.min) && (e.level.max == null || level <= e.level.max)));
            });
            if (!matches) fails.push("enchantement");
        }
        return fails;
    }

    function profileSummary() {
        if (!profile.on) return "désactivé";
        const pet = profile.petId !== "" ? petName(profile.petId) : "sans familier";
        return `niv. ${profile.level} · karma ${num(profile.karma)} · ${className(profile.classId)} · ${pet}`;
    }

    function fillProfileOptions() {
        $("pClass").innerHTML = Object.keys(CLASSES).sort((a, b) => +a - +b).map((id) => `<option value="${esc(id)}">${esc(CLASSES[id])}</option>`).join("");
        $("pPet").innerHTML = "<option value=\"\">Aucun familier</option>" + Object.keys(PETS)
            .sort((a, b) => PETS[a].name.localeCompare(PETS[b].name, "fr"))
            .map((id) => `<option value="${esc(id)}">${esc(PETS[id].name)}${PETS[id].rarity !== undefined ? ` (rareté ${PETS[id].rarity})` : ""}</option>`).join("");
        $("pClass").value = profile.classId;
        $("pPet").value = profile.petId;
        const enchantOptions = (slot) => "<option value=\"\">Aucun</option>" + Object.entries(ENCHANT_KINDS).filter(([, k]) => k[2] === slot)
            .flatMap(([id, k]) => Array.from({ length: k[3] }, (_, i) => i + 1)
                .map((l) => `<option value="${id}${l}">${esc(k[0])}${k[3] > 1 ? ` ${"I".repeat(l)}` : ""}</option>`)).join("");
        $("pWeaponEnchant").innerHTML = enchantOptions("weapon");
        $("pArmorEnchant").innerHTML = enchantOptions("armor");
        $("pWeaponEnchant").value = profile.weaponEnchant;
        $("pArmorEnchant").value = profile.armorEnchant;
        $("pMaterials").value = profile.hasMaterials ? "1" : "0";
    }

    function setupProfile() {
        $("profileOn").checked = profile.on;
        for (const [key, id] of Object.entries(profileInputs)) $(id).value = profile[key];
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
            profile.weaponEnchant = $("pWeaponEnchant").value;
            profile.armorEnchant = $("pArmorEnchant").value;
            profile.hasMaterials = $("pMaterials").value === "1";
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

    const DIFFS = {
        modified: { cls: "ok", text: "modifié" },
        added: { cls: "warn", text: "nouveau" },
        removed: { cls: "err", text: "supprimé" },
        same: { cls: "pending", text: "identique" },
    };

    function status(e) {
        if (isGithub()) return DIFFS[e.diff] || DIFFS.same;
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
        if (!DATA) {
            $("eventList").innerHTML = "";
            $("subtitle").textContent = "Comparaison avant / après des big events.";
            $("generated").textContent = "";
            return;
        }
        $("eventList").innerHTML = EVENTS.map((e) => {
            const st = status(e);
            return `<li class="${e.id === current ? "active" : ""}"><a href="#${esc(e.id)}" title="${esc(st.text)}">
                <div class="li-top"><span class="dot ${st.cls}"></span><b>#${esc(e.id)}</b> ${esc(e.place || "?")}</div>
                <div class="li-sub">${esc(st.text)} · ${esc(figures(stats(e)))}</div>
                ${isGithub() ? "" : `<div class="li-sub">${esc(e.rewrite?.model || e.model || "")}</div>`}</a></li>`;
        }).join("") || "<li class=\"muted small\">Aucun event à afficher.</li>";
        if (isGithub()) {
            const { total, changed } = DATA.counts;
            const fork = DATA.fork?.behind ? ` « Avant » est lu au point de divergence (${DATA.fork.sha.slice(0, 7)}) : ${DATA.base} a ${plural(DATA.fork.behind, "commit")} de plus depuis.` : "";
            $("subtitle").textContent = `${DATA.base} → ${DATA.head} : ${plural(changed, "event modifié", "events modifiés")} sur ${total}.${fork}`;
            $("generated").textContent = `Chargé depuis GitHub le ${new Date(DATA.generatedAt).toLocaleString("fr-FR")}`;
            return;
        }
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
        const neighbours = e.neighbours === null ? "<li class=\"muted\">chargement…</li>" : (e.neighbours || []).map((x) =>
            `<li><b>${esc(x.name)}</b> <span class="muted">${esc(x.type ? mapType(x.type) : "?")} · ${fmtMin(x.minutes)}</span></li>`).join("");
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

        const source = isGithub()
            ? `<h4>Branches</h4><p>${esc(DATA.base)} → ${esc(DATA.head)}</p>`
            : `<h4>Modèle d'IA</h4><p>${esc(e.rewrite?.model || e.model || "?")}</p>`;
        const body = `
            ${e.placeDescription ? `<blockquote>${esc(e.placeDescription)}</blockquote>` : ""}
            <div class="ctx-grid">
                <div><h4>Voisins</h4><ul class="plain">${neighbours || "<li class=\"muted\">aucun</li>"}</ul></div>
                <div><h4>Déclencheurs</h4><ul class="plain">${triggers.map((t) => `<li>${esc(t)}</li>`).join("") || "<li class=\"muted\">aucun</li>"}</ul>
                     ${source}</div>
            </div>
            ${city}
            ${e.canonBlock ? fold("📖 Canon du lieu", "tout ce que le jeu en dit", `<div class="md">${markdown(e.canonBlock)}</div>`) : ""}`;
        const sub = [e.placeType ? mapType(e.placeType).toLowerCase() : "", e.isCity && e.placeType !== "ci" ? "ville du jeu" : "",
            e.neighbours === null ? "" : plural((e.neighbours || []).length, "voisin"),
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
                ${single ? "" : `<div class="side-head after">Après <span class="muted small">${(after || "").length} car.</span> ${lengthWarning(after, "intro")}${isGithub() && before && after !== before ? " <span class=\"badge changed\">modifiée</span>" : ""}</div>`}
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
        if (opts.changed) meta.push("<span class=\"badge changed\">modifiée</span>");
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
                const added = !isNew && !origIds.includes(id);
                const changed = isGithub() && !added && !isNew
                    && (rw?.outcomes?.[id] !== orig?.outcomes?.[id] || stableJson(rwData[id] || {}) !== stableJson(e.outcomeData?.[name]?.[id] || {}));
                cells.push(exists
                    ? outcomeCell("Après", id, rw?.outcomes?.[id], rwData[id], {
                        profile: profile.on, possibleCount, showAlways: true, checkLength: true,
                        icon: endIcons[id], added, changed,
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
        if (isGithub() || (!e.rewrite && !e.rewriteError)) return "";
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
        const banner = isGithub()
            ? { added: `<p class="banner">Cet event n'existe pas sur <code>${esc(DATA.base)}</code> : tout est nouveau.</p>`,
                removed: `<p class="banner">Cet event n'existe plus sur <code>${esc(DATA.head)}</code> : seule la version de <code>${esc(DATA.base)}</code> est affichée.</p>`,
                same: "<p class=\"banner\">Cet event est identique sur les deux branches.</p>" }[e.diff] || ""
            : e.rewrite ? "" : e.rewriteError
                ? `<p class="banner">La réécriture existe mais n'est pas lisible : <span class="bad">${esc(e.rewriteError)}</span>. Seule la version d'origine est affichée.</p>`
                : `<p class="banner">⏳ Réécriture en cours : seule la version d'origine est affichée. Relancez <code>python3 build.py</code> quand <code>out/${esc(e.id)}.json</code> sera prêt.</p>`;
        const head = s.after === null
            ? plural(s.orig, "issue")
            : `${s.orig} → ${s.after} issues · ${s.conditional} conditionnelles (${pct(s.conditional, s.after)} %)`;
        const origin = isGithub() ? `${DATA.base} → ${DATA.head}` : e.rewrite?.model || e.model || "?";
        return `<div class="page">
            <div class="event-head">
                <h1>#${esc(e.id)} · ${esc(e.place)}</h1>
                <p class="muted"><span class="dot ${st.cls}"></span>${esc(st.text)} · ${esc(head)} · ${esc(origin)}</p>
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
        if (!DATA) {
            renderList(null);
            return;
        }
        const id = currentId();
        renderList(id);
        content.innerHTML = id ? renderEvent(byId[id]) : `<div class="page"><p>${isGithub()
            ? "Aucune différence entre ces deux branches. Cochez « Inclure les events identiques » pour tout afficher."
            : "Aucun event dans data.js."}</p></div>`;
        content.querySelectorAll("details.fold").forEach((d) => {
            const key = d.querySelector(":scope > summary .fold-title")?.textContent;
            if (openFolds.has(key)) d.open = true;
        });
        document.title = id ? `Crownicles — Réécriture #${id} ${byId[id].place}` : "Crownicles — Réécriture des big events";
    }

    const rerender = () => {
        const scroll = content.scrollTop;
        render();
        content.scrollTop = scroll;
    };

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

    // --- source: the workshop bundle or two GitHub branches ---------------------------

    const SOURCE_KEY = "eventRewrites.github";
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(SOURCE_KEY) || "{}");
    } catch {
        // ignore a corrupted saved source
    }
    let loadToken = 0;
    let branchesLoaded = false;
    const ghStatus = (html) => { $("ghStatus").innerHTML = html; };
    const showMessage = (html) => { content.innerHTML = `<div class="page">${html}</div>`; };

    function showMode(mode) {
        document.querySelectorAll("#sourceMode button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
        $("ghForm").hidden = mode !== "github";
    }

    async function loadBranchList() {
        if (branchesLoaded) return;
        branchesLoaded = true;
        try {
            const names = await GH.listBranches();
            $("ghBranches").innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join("");
        } catch (err) {
            branchesLoaded = false;
            ghStatus(`<span class="bad">${esc(err.message)}</span>`);
        }
    }

    function useLocal() {
        loadToken++;
        showMode("local");
        history.replaceState(null, "", location.pathname + location.hash);
        setData(LOCAL);
        if (LOCAL) render();
        else showMessage("<h1>Pas de données locales</h1><p>Lancez <code>python3 build.py</code> pour générer <code>data.js</code>, ou comparez deux branches GitHub.</p>");
    }

    function useGithub() {
        showMode("github");
        loadBranchList();
        if (!isGithub()) {
            setData(null);
            render();
            showMessage("<h1>Comparer deux branches</h1><p>Choisissez la branche « Avant » et la branche « Après » dans la colonne de gauche, puis cliquez sur <b>Comparer</b>. Seuls les events qui diffèrent sont affichés.</p>");
        }
    }

    async function compareBranches() {
        const base = $("ghBase").value.trim(), head = $("ghHead").value.trim(), all = $("ghAll").checked;
        if (!base || !head) {
            ghStatus("<span class=\"bad\">Choisissez les deux branches.</span>");
            return;
        }
        localStorage.setItem(SOURCE_KEY, JSON.stringify({ base, head, all }));
        const params = new URLSearchParams({ base, head });
        if (all) params.set("all", "1");
        history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);

        const token = ++loadToken;
        const progress = (text) => { if (token === loadToken) ghStatus(esc(text)); };
        $("ghLoad").disabled = true;
        try {
            const data = await GH.loadComparison({ base, head, all, fallback: LOCAL || {}, onProgress: progress });
            if (token !== loadToken) return;
            setData(data);
            openFolds.clear();
            render();
            content.scrollTop = 0;
            const shown = plural(data.events.length, "event affiché", "events affichés");
            progress(`${shown}. Chargement des voisins…`);
            GH.loadPlaces(data, progress)
                .then(() => progress(`${shown}.`))
                .catch((err) => {
                    data.events.forEach((e) => { if (e.neighbours === null) e.neighbours = []; });
                    if (token === loadToken) ghStatus(`${esc(shown)} <span class="warn">Voisins indisponibles : ${esc(err.message)}</span>`);
                })
                .finally(() => { if (token === loadToken) rerender(); });
        } catch (err) {
            if (token === loadToken) ghStatus(`<span class="bad">${esc(err.message)}</span>`);
        } finally {
            if (token === loadToken) $("ghLoad").disabled = false;
        }
    }

    setupProfile();
    const params = new URLSearchParams(location.search);
    $("ghBase").value = params.get("base") || saved.base || "develop";
    $("ghHead").value = params.get("head") || saved.head || "";
    $("ghAll").checked = params.has("base") ? params.get("all") === "1" : !!saved.all;
    $("ghForm").addEventListener("submit", (ev) => {
        ev.preventDefault();
        compareBranches();
    });
    document.querySelectorAll("#sourceMode button").forEach((b) => b.addEventListener("click", () => (b.dataset.mode === "local" ? useLocal() : useGithub())));
    if (!GH) $("source").hidden = true;

    if (GH && params.get("base") && params.get("head")) {
        useGithub();
        compareBranches();
    } else if (LOCAL || !GH) {
        useLocal();
    } else {
        useGithub();
    }
})();
