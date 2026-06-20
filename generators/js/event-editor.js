    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const PATHS = {
        texts: "Lang/fr/events.json",
        icons: "Lib/src/CrowniclesIcons.ts",
        effect: id => `Core/resources/events/${id}.json`
    };

    const state = {
        source: null,               // {owner, repo, branch} when loaded from GitHub
        textsRaw: null,             // raw string of events.json
        textsData: null,            // parsed object
        textsOrder: [],             // original root key order
        iconsRaw: null,             // raw string of CrowniclesIcons.ts
        iconsEvents: {},            // id -> { order:[names], possibilities:{name:entry}, tailWs }
        iconsOrder: [],             // event id order inside the events: {} block
        iconsBlock: null,           // { start, end, tailWs } span of the events: {} block in iconsRaw
        effectRaw: {},              // id -> raw string of N.json
        effectData: {},             // id -> parsed object
        effectOrder: {},            // id -> root key order
        selected: null,             // selected event id
        reviewMode: false,          // distraction-free large-text proofreading mode
        modified: { texts: false, icons: false, effects: new Set() },
        createdEffects: new Set(),  // effect files that are brand new (export as new file)
        deletedEffects: new Set()   // effect files removed via event deletion (export as deleted file)
    };

    // Session-only presentation toggle: side-by-side comparison of outcomes (default = responsive grid).
    let compareMode = false;

    // French labels for effects (from Lib/src/types/Effect.ts)
    const EFFECTS = {
        "": "Aucun (none)",
        none: "Aucun",
        occupied: "Occupé",
        sleeping: "Endormi",
        drunk: "Ivre",
        freezing: "Gelé",
        feetHurt: "Pieds blessés",
        hurt: "Blessé",
        sick: "Malade",
        jailed: "Emprisonné",
        injured: "Gravement blessé",
        starving: "Affamé",
        confounded: "Confus",
        scared: "Effrayé",
        lost: "Perdu",
        fished: "Pêché",
        dead: "Mort"
    };

    // Scalar fields shown as structured inputs
    const SCALAR_FIELDS = [
        { key: "lostTime", label: "⏱️ Temps perdu (min)" },
        { key: "health", label: "❤️ PV" },
        { key: "money", label: "💰 Argent" },
        { key: "energy", label: "⚡ Énergie" },
        { key: "gems", label: "💎 Gemmes" },
        { key: "bonusExperience", label: "✨ XP bonus" },
        { key: "bonusPoints", label: "🏆 Points bonus" },
        { key: "nextEvent", label: "➡️ Event suivant" },
        { key: "mapLink", label: "🗺️ MapLink" }
    ];

    // Fields edited through the advanced JSON textarea
    const ADVANCED_FIELDS = [
        "randomItem", "randomPet", "givePet",
        "mapTypesDestination", "mapTypesExcludeDestination",
        "tags", "condition"
    ];

    // ---------------------------------------------------------------------------
    // Status helpers
    // ---------------------------------------------------------------------------
    function setStatus(msg, type) {
        const el = document.getElementById("status");
        el.textContent = msg;
        el.className = "status " + (type || "");
    }

    // ---------------------------------------------------------------------------
    // Toast system (reusable, no external libs)
    // ---------------------------------------------------------------------------
    function showToast({ message, actionLabel, onAction, duration = 4000, variant } = {}) {
        const container = document.getElementById("toastContainer");
        if (!container) return { dismiss() {} };

        const toast = document.createElement("div");
        toast.className = "toast" + (variant ? " toast-" + variant : "");

        const msg = document.createElement("span");
        msg.className = "toast-msg";
        msg.textContent = message || "";
        toast.appendChild(msg);

        let timer = null;
        let dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            if (timer) { clearTimeout(timer); timer = null; }
            toast.classList.remove("toast-visible");
            const remove = () => { if (toast.parentNode) toast.parentNode.removeChild(toast); };
            toast.addEventListener("transitionend", remove, { once: true });
            setTimeout(remove, 250); // fallback if transitionend doesn't fire
        }

        if (actionLabel && typeof onAction === "function") {
            const actionBtn = document.createElement("button");
            actionBtn.className = "toast-action";
            actionBtn.type = "button";
            actionBtn.textContent = actionLabel;
            actionBtn.addEventListener("click", () => {
                try { onAction(); } finally { dismiss(); }
            });
            toast.appendChild(actionBtn);
        }

        const closeBtn = document.createElement("button");
        closeBtn.className = "toast-close";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Fermer");
        closeBtn.textContent = "✕";
        closeBtn.addEventListener("click", dismiss);
        toast.appendChild(closeBtn);

        container.appendChild(toast);
        // Trigger enter transition on next frame.
        requestAnimationFrame(() => toast.classList.add("toast-visible"));

        if (duration && duration > 0) {
            timer = setTimeout(dismiss, duration);
        }

        return { dismiss };
    }

    // ---------------------------------------------------------------------------
    // GitHub / file loading
    // ---------------------------------------------------------------------------
    async function fetchRawText(owner, repo, branch, path) {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`${path} : ${resp.status} ${resp.statusText}`);
        }
        return resp.text();
    }

    async function loadFromGithub() {
        const owner = document.getElementById("repoOwner").value.trim();
        const repo = document.getElementById("repoName").value.trim();
        const branch = document.getElementById("branchName").value.trim();
        if (!owner || !repo || !branch) {
            setStatus("⚠️ Renseignez le propriétaire, le repository et la branche.", "error");
            return;
        }

        const btn = document.getElementById("loadBtn");
        const spinner = document.getElementById("loadSpinner");
        const btnText = document.getElementById("loadBtnText");
        btn.disabled = true; spinner.style.display = "block"; btnText.textContent = "Chargement...";

        try {
            setStatus("📡 Chargement des textes (events.json)...", "loading");
            const textsRaw = await fetchRawText(owner, repo, branch, PATHS.texts);
            setStatus("😀 Chargement des emojis (CrowniclesIcons.ts)...", "loading");
            const iconsRaw = await fetchRawText(owner, repo, branch, PATHS.icons);

            resetState();
            state.source = { owner, repo, branch };
            ingestTexts(textsRaw);
            ingestIcons(iconsRaw);

            finishLoad(`Chargé depuis ${owner}/${repo}@${branch}`);
        } catch (err) {
            console.error(err);
            setStatus(`❌ Erreur : ${err.message}`, "error");
        } finally {
            btn.disabled = false; spinner.style.display = "none"; btnText.textContent = "🚀 Charger depuis GitHub";
        }
    }

    function onLocalFile(kind, input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                if (kind === "texts") {
                    if (!state.textsRaw && !state.iconsRaw) resetState();
                    ingestTexts(reader.result);
                    document.getElementById("box-texts").classList.add("loaded");
                } else if (kind === "icons") {
                    ingestIcons(reader.result);
                    document.getElementById("box-icons").classList.add("loaded");
                }
                if (state.textsData) finishLoad("Fichiers locaux chargés");
            } catch (err) {
                setStatus(`❌ ${file.name} : ${err.message}`, "error");
            }
        };
        reader.readAsText(file);
    }

    function onLocalEffects(input) {
        const files = [...input.files];
        let loaded = 0;
        files.forEach(file => {
            const id = file.name.replace(/\.json$/, "");
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    ingestEffect(id, reader.result);
                    loaded++;
                    document.getElementById("box-effects").classList.add("loaded");
                    if (loaded === files.length) {
                        setStatus(`✅ ${loaded} fichier(s) d'effets chargé(s).`, "success");
                        if (state.selected) renderEvent(state.selected);
                    }
                } catch (err) {
                    setStatus(`❌ ${file.name} : ${err.message}`, "error");
                }
            };
            reader.readAsText(file);
        });
    }

    function resetState() {
        state.source = null;
        state.textsRaw = state.textsData = state.iconsRaw = null;
        state.textsOrder = [];
        state.iconsEvents = {};
        state.iconsOrder = [];
        state.iconsBlock = null;
        state.effectRaw = {}; state.effectData = {}; state.effectOrder = {};
        state.selected = null;
        state.modified = { texts: false, icons: false, effects: new Set() };
        state.createdEffects = new Set();
        state.deletedEffects = new Set();
    }

    // ---------------------------------------------------------------------------
    // Unique id generator (used to link <label for> to inputs)
    // ---------------------------------------------------------------------------
    let __uidCounter = 0;
    function genId(prefix) {
        return (prefix || "f") + "-" + (++__uidCounter);
    }

    function ingestTexts(raw) {
        state.textsRaw = raw;
        state.textsData = JSON.parse(raw);
        state.textsOrder = captureRootOrder(raw);
        state.modified.texts = false;
    }

    function ingestIcons(raw) {
        state.iconsRaw = raw;
        const parsed = parseIconsEvents(raw);
        state.iconsEvents = parsed.events;
        state.iconsOrder = parsed.order;
        state.iconsBlock = parsed.block;
        state.modified.icons = false;
    }

    function ingestEffect(id, raw) {
        state.effectRaw[id] = raw;
        state.effectData[id] = JSON.parse(raw);
        state.effectOrder[id] = captureRootOrder(raw);
        state.modified.effects.delete(id);
    }

    function finishLoad(message) {
        document.getElementById("selectorPanel").style.display = "block";
        document.getElementById("exportBtn").disabled = false;
        const bar = document.getElementById("actionBar");
        if (bar) bar.style.display = "flex";
        const repoEl = document.getElementById("actionBarRepo");
        if (repoEl) {
            repoEl.textContent = state.source
                ? `${state.source.owner}/${state.source.repo}@${state.source.branch}`
                : "Fichiers locaux";
        }
        updateActionBar();
        populateEventSelect("");
        setStatus(`✅ ${message} — ${Object.keys(state.textsData).length} events disponibles.`, "success");
    }

    // ---------------------------------------------------------------------------
    // Event selector
    // ---------------------------------------------------------------------------
    function populateEventSelect(filter) {
        const select = document.getElementById("eventSelect");
        const ids = state.textsOrder.length ? state.textsOrder : Object.keys(state.textsData);
        const f = (filter || "").toLowerCase().trim();
        const previous = state.selected;
        select.innerHTML = "";
        const placeholder = document.createElement("option");
        placeholder.value = ""; placeholder.textContent = "— choisir un event —";
        select.appendChild(placeholder);
        ids.forEach(id => {
            const ev = state.textsData[id];
            if (!ev) return;
            const text = (ev.text || "").replace(/\{emote:[^}]+\}/g, "").trim();
            const label = `#${id} — ${text.slice(0, 70)}${text.length > 70 ? "…" : ""}`;
            if (f && !label.toLowerCase().includes(f) && id !== f) return;
            const opt = document.createElement("option");
            opt.value = id; opt.textContent = label;
            if (id === previous) opt.selected = true;
            select.appendChild(opt);
        });
    }

    function onSelectEvent(id) {
        if (!id) return;
        state.selected = id;
        renderEvent(id);
    }

    async function renderEvent(id) {
        const panel = document.getElementById("eventPanel");
        // Lazily fetch effect data from GitHub if needed
        if (!state.effectData[id]) {
            if (state.source) {
                panel.innerHTML = `<div class="placeholder"><div class="ico">⏳</div><p>Chargement des effets de l'event #${id}...</p></div>`;
                try {
                    const raw = await fetchRawText(state.source.owner, state.source.repo, state.source.branch, PATHS.effect(id));
                    ingestEffect(id, raw);
                } catch (err) {
                    panel.innerHTML = `<div class="placeholder"><div class="ico">⚠️</div><p>Effets introuvables pour #${id} (${err.message}).<br>Les conséquences ne pourront pas être éditées.</p></div>`;
                }
            }
        }
        drawEvent(id);
    }

    // ---------------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------------
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function drawEvent(id) {
        const panel = document.getElementById("eventPanel");
        const textEv = state.textsData[id] || { possibilities: {} };
        const effEv = state.effectData[id] || { possibilities: {} };
        const icons = state.iconsEvents[id] ? state.iconsEvents[id].possibilities : {};

        const possNames = [...new Set([
            ...Object.keys(textEv.possibilities || {}),
            ...Object.keys(effEv.possibilities || {})
        ])];
        // Show real choices first (those with a text), then default ones (end / no text)
        possNames.sort((a, b) => {
            const ta = textEv.possibilities?.[a]?.text ? 0 : 1;
            const tb = textEv.possibilities?.[b]?.text ? 0 : 1;
            if (ta !== tb) return ta - tb;
            return a.localeCompare(b);
        });

        if (state.reviewMode) {
            drawEventReview(id, textEv, icons, possNames);
            return;
        }

        let html = "";
        html += `<div class="event-meta">
            <span class="badge">🎯 Event #${id}</span>
            <span class="badge">🎲 ${possNames.length} possibilité(s)</span>
            ${renderModifiedBadges()}
        </div>`;

        const triggersStr = ((effEv.triggers || []).map(t => t.mapId)).join(", ");
        html += `<div class="event-toolbar">
            <div class="mini-field" style="flex:1; min-width:220px">
                <label>🧭 Triggers — mapId déclencheurs (séparés par des virgules)</label>
                <input type="text" value="${escapeHtml(triggersStr)}" placeholder="ex : 6, 10"
                    aria-label="Triggers (mapId déclencheurs séparés par des virgules)"
                    onchange="editTriggers('${id}', this.value)">
            </div>
            <button class="btn-mini" onclick="addChoice('${id}')">➕ Ajouter un choix</button>
            <button class="btn-mini" id="compareToggle" aria-pressed="${compareMode ? "true" : "false"}"
                title="Afficher les sorties côte à côte pour les comparer"
                onclick="toggleCompareMode()">↔️ Comparaison</button>
            <button class="btn-mini btn-mini-danger" onclick="deleteEvent('${id}')">🗑️ Supprimer l'event</button>
        </div>`;

        html += `<div class="main-text-box">
            <div class="field-label">Texte principal de l'event</div>
            <textarea rows="3" aria-label="Texte principal de l'event ${id}" oninput="editMainText('${id}', this.value)">${escapeHtml(textEv.text || "")}</textarea>
        </div>`;

        html += `<div class="choices">`;
        possNames.forEach(name => {
            html += renderChoice(id, name, textEv, effEv, icons);
        });
        html += `</div>`;

        panel.innerHTML = html;
        // Re-apply the session comparison mode after every re-render.
        panel.classList.toggle("compare-mode", compareMode);
    }

    // ---------------------------------------------------------------------------
    // Reviewer mode: distraction-free, large texts, auto-growing editable areas
    // ---------------------------------------------------------------------------
    function toggleReviewMode(on) {
        state.reviewMode = on;
        document.body.classList.toggle("review-mode", on);
        if (state.selected) drawEvent(state.selected);
    }

    function autoGrow(el) {
        el.style.height = "auto";
        el.style.height = (el.scrollHeight + 2) + "px";
    }

    function reviewArea(extraClass, oninput) {
        // returns the opening tag string; caller supplies inner text + closing tag
        return `<textarea class="review-text-area ${extraClass}" rows="1" oninput="autoGrow(this);${oninput}">`;
    }

    function drawEventReview(id, textEv, icons, possNames) {
        const panel = document.getElementById("eventPanel");
        let html = `<div class="review-doc">`;
        html += `<div class="review-meta"><span class="badge">🎯 Event #${id}</span> ${renderModifiedBadges()}</div>`;

        html += `<div class="field-label">Texte principal</div>`;
        html += reviewArea("event-main", `editMainText('${id}', this.value)`)
            + escapeHtml(textEv.text || "") + `</textarea>`;
        html += `<div style="height:18px"></div>`;

        possNames.forEach(name => {
            const choiceText = textEv.possibilities?.[name]?.text || "";
            const isDefault = !choiceText;
            const emoji = emojiFor(icons, name);
            const emojiInfo = icons[name];

            html += `<div class="review-choice">`;
            html += `<div class="review-choice-head">
                <span class="review-choice-emoji">${escapeHtml(emoji || "•")}</span>
                <span class="review-choice-text ${isDefault ? "default" : ""}">${isDefault ? "Résultat par défaut" : escapeHtml(choiceText)}</span>
            </div>`;

            if (!isDefault) {
                html += reviewArea("", `editChoiceText('${id}','${escapeHtml(name)}',this.value)`)
                    + escapeHtml(choiceText) + `</textarea>`;
                html += `<div style="height:10px"></div>`;
            }

            const outcomeKeys = Object.keys(textEv.possibilities?.[name]?.outcomes || {})
                .sort((a, b) => Number(a) - Number(b));
            outcomeKeys.forEach(k => {
                const txt = textEv.possibilities?.[name]?.outcomes?.[k];
                const outEmoji = (emojiInfo && emojiInfo.type === "object" && emojiInfo.outcomes[k]) ? emojiInfo.outcomes[k].value : null;
                html += `<div class="review-outcome">
                    <span class="review-outcome-emoji">${escapeHtml(outEmoji || "↳")}</span>
                    ${reviewArea("", `editOutcomeText('${id}','${escapeHtml(name)}','${k}',this.value)`)}${escapeHtml(txt == null ? "" : txt)}</textarea>
                </div>`;
            });
            html += `</div>`;
        });

        html += `</div>`;
        panel.innerHTML = html;
        // size all textareas to their content
        panel.querySelectorAll(".review-text-area").forEach(autoGrow);
    }

    function renderModifiedBadges() {
        const parts = [];
        if (state.modified.texts) parts.push(`<span class="badge modified">✎ events.json</span>`);
        if (state.modified.icons) parts.push(`<span class="badge modified">✎ CrowniclesIcons.ts</span>`);
        state.modified.effects.forEach(id => parts.push(`<span class="badge modified">✎ events/${id}.json</span>`));
        return parts.join("");
    }

    function emojiFor(icons, name) {
        const info = icons[name];
        if (!info) return null;
        if (info.type === "string") return info.value;
        if (info.type === "object") {
            const first = Object.values(info.outcomes)[0];
            return first ? first.value : null;
        }
        return null;
    }

    function renderChoice(id, name, textEv, effEv, icons) {
        const choiceText = textEv.possibilities?.[name]?.text || "";
        const isDefault = !choiceText;
        const emoji = emojiFor(icons, name);
        const emojiInfo = icons[name];

        const outcomeKeys = [...new Set([
            ...Object.keys(textEv.possibilities?.[name]?.outcomes || {}),
            ...Object.keys(effEv.possibilities?.[name]?.outcomes || {})
        ])].sort((a, b) => Number(a) - Number(b));

        let emojiControl;
        if (emojiInfo && emojiInfo.type === "string") {
            emojiControl = `<input class="emoji-input" value="${escapeHtml(emoji || "")}" title="Emoji du choix"
                aria-label="Emoji du choix ${escapeHtml(name)}"
                onchange="editEmoji('${id}','${name}',null,this.value)">`;
        } else {
            emojiControl = `<div class="choice-emoji">${escapeHtml(emoji || "❓")}</div>`;
        }

        let head = `<div class="choice-header" role="button" tabindex="0" aria-expanded="false"
            onclick="toggleChoice(this)" onkeydown="onChoiceHeaderKey(event, this)">
            ${emojiControl}
            <div class="choice-title">${escapeHtml(name)} ${isDefault ? '<span class="default-tag">— résultat par défaut</span>' : ""}</div>
            <button class="btn-mini btn-mini-danger" title="Supprimer le choix"
                onclick="event.stopPropagation(); deleteChoice('${id}','${name}')">🗑️</button>
            <div class="choice-toggle">▶</div>
        </div>`;

        let body = `<div class="choice-body">`;
        if (!isDefault) {
            body += `<div class="choice-text-edit">
                <div class="field-label">Texte du choix (bouton)</div>
                <textarea rows="2" aria-label="Texte du bouton du choix ${escapeHtml(name)}" oninput="editChoiceText('${id}','${name}',this.value)">${escapeHtml(choiceText)}</textarea>
            </div>`;
        }
        body += `<div class="outcomes-scroll"><div class="outcomes">`;
        outcomeKeys.forEach(k => {
            body += renderOutcome(id, name, k, textEv, effEv, emojiInfo);
        });
        body += `</div></div>`;
        body += `<button class="btn-mini add-outcome-btn" onclick="addOutcome('${id}','${name}')">➕ Ajouter une sortie</button>`;
        body += `</div>`;

        return `<div class="choice-card">${head}${body}</div>`;
    }

    function renderOutcome(id, name, key, textEv, effEv, emojiInfo) {
        const text = textEv.possibilities?.[name]?.outcomes?.[key];
        const outcome = effEv.possibilities?.[name]?.outcomes?.[key] || {};
        const outEmoji = (emojiInfo && emojiInfo.type === "object" && emojiInfo.outcomes[key]) ? emojiInfo.outcomes[key].value : null;

        let html = `<div class="outcome-card open">`;
        html += `<div class="outcome-head" role="button" tabindex="0" aria-expanded="true"
            onclick="onOutcomeHeadClick(event, this)" onkeydown="onOutcomeHeadKey(event, this)">
            <span class="outcome-toggle" aria-hidden="true">▼</span>
            <span class="outcome-tag">Sortie ${key}</span>
            <div class="outcome-head-right">
                ${outEmoji !== null ? `<input class="emoji-input" value="${escapeHtml(outEmoji)}" aria-label="Emoji de la sortie ${key}" onchange="editEmoji('${id}','${name}','${key}',this.value)">` : ""}
                <button class="btn-mini btn-mini-danger" title="Supprimer la sortie"
                    onclick="event.stopPropagation(); deleteOutcome('${id}','${name}','${key}')">🗑️</button>
            </div>
        </div>`;

        // Collapsed one-line summary: emoji + text snippet + key-effect pills.
        const snippetRaw = (text == null ? "" : String(text)).replace(/\s+/g, " ").trim();
        const snippet = snippetRaw.length > 40 ? `${snippetRaw.slice(0, 40)}…` : snippetRaw;
        html += `<div class="outcome-summary">
            ${outEmoji ? `<span class="outcome-summary-emoji">${escapeHtml(outEmoji)}</span>` : ""}
            <span class="outcome-summary-text">${escapeHtml(snippet) || "(vide)"}</span>
            <span class="outcome-summary-pills">${summaryPills(outcome)}</span>
        </div>`;

        html += `<div class="outcome-body">`;
        html += `<div>
            <div class="field-label">Texte du résultat</div>
            <textarea rows="4" aria-label="Texte de la sortie ${key}" oninput="editOutcomeText('${id}','${name}','${key}',this.value)">${escapeHtml(text == null ? "" : text)}</textarea>
        </div>`;

        // Summary pills
        html += `<div class="summary-pills">${summaryPills(outcome)}</div>`;

        // Structured scalar editors
        const hasEffect = state.effectData[id] != null;
        if (hasEffect) {
            html += `<div class="conseq"><div class="conseq-grid">`;
            SCALAR_FIELDS.forEach(f => {
                const v = outcome[f.key];
                const fieldId = genId("sf");
                const hint = f.key === "mapLink"
                    ? "Identifiant numérique du MapLink de destination"
                    : f.key === "nextEvent"
                        ? "Identifiant numérique de l'event déclenché ensuite (-1 = aléatoire)"
                        : "";
                html += `<div class="mini-field">
                    <label for="${fieldId}">${f.label}</label>
                    <input type="number" id="${fieldId}" value="${v == null ? "" : v}"${hint ? ` title="${hint}"` : ""}
                        onchange="editScalar('${id}','${name}','${key}','${f.key}',this.value)">
                </div>`;
            });
            // effect select
            const effectId = genId("ef");
            html += `<div class="mini-field">
                <label for="${effectId}">🎭 Effet</label>
                <select id="${effectId}" title="Altération d'état appliquée au joueur après ce résultat" onchange="editScalar('${id}','${name}','${key}','effect',this.value)">
                    ${Object.keys(EFFECTS).filter(e => e !== "").map(e =>
                        `<option value="${e === "none" ? "" : e}" ${(outcome.effect || "") === (e === "none" ? "" : e) ? "selected" : ""}>${EFFECTS[e]}</option>`
                    ).join("")}
                </select>
            </div>`;
            // oneshot
            html += `<div class="mini-field checkbox">
                <input type="checkbox" id="os-${id}-${name}-${key}" ${outcome.oneshot ? "checked" : ""}
                    onchange="editScalar('${id}','${name}','${key}','oneshot',this.checked)">
                <label for="os-${id}-${name}-${key}">💀 One-shot (mort)</label>
            </div>`;
            // forceStayInCity
            html += `<div class="mini-field checkbox">
                <input type="checkbox" id="fsc-${id}-${name}-${key}" ${outcome.forceStayInCity ? "checked" : ""}
                    onchange="editScalar('${id}','${name}','${key}','forceStayInCity',this.checked)">
                <label for="fsc-${id}-${name}-${key}">🏙️ Rester en ville (forcé)</label>
            </div>`;
            html += `</div>`;

            // advanced JSON
            const adv = {};
            ADVANCED_FIELDS.forEach(k => { if (outcome[k] !== undefined) adv[k] = outcome[k]; });
            const advJson = Object.keys(adv).length ? JSON.stringify(adv, null, 2) : "";
            html += `<details class="advanced" ${advJson ? "open" : ""}>
                <summary>Champs avancés (JSON) — randomItem, givePet, condition, tags…</summary>
                <textarea rows="${advJson ? Math.min(12, advJson.split("\n").length + 1) : 3}"
                    aria-label="Champs avancés (JSON) de la sortie ${key}"
                    placeholder='{ "randomItem": { "rarity": { "min": 2 } } }'
                    onchange="editAdvanced('${id}','${name}','${key}',this.value,this)">${escapeHtml(advJson)}</textarea>
                <div class="json-error">JSON invalide — modification ignorée.</div>
            </details>`;
            html += `</div>`;
        } else {
            html += `<div class="hint">Effets non chargés pour cet event.</div>`;
        }

        html += `</div>`; // .outcome-body
        html += `</div>`; // .outcome-card
        return html;
    }

    function fmtSigned(n) { return n > 0 ? `+${n}` : `${n}`; }

    function summaryPills(o) {
        const pills = [];
        const add = (cls, txt) => pills.push(`<span class="pill ${cls}">${txt}</span>`);
        if (o.lostTime) add("neg", `⏱️ ${o.lostTime} min`);
        if (o.health != null && o.health !== 0) add(o.health > 0 ? "pos" : "neg", `❤️ ${fmtSigned(o.health)}`);
        if (o.money != null && o.money !== 0) add(o.money > 0 ? "pos" : "neg", `💰 ${fmtSigned(o.money)}`);
        if (o.energy != null && o.energy !== 0) add(o.energy > 0 ? "pos" : "neg", `⚡ ${fmtSigned(o.energy)}`);
        if (o.gems != null && o.gems !== 0) add(o.gems > 0 ? "pos" : "neg", `💎 ${fmtSigned(o.gems)}`);
        if (o.effect) add("special", `🎭 ${EFFECTS[o.effect] || o.effect}`);
        if (o.randomItem) add("special", "🎁 Objet aléatoire");
        if (o.randomPet) add("special", "🐾 Familier aléatoire");
        if (o.givePet) add("special", `🐾 Familier ${(o.givePet.petIds || []).join(", ")}`);
        if (o.oneshot) add("neg", "💀 Mort");
        if (o.forceStayInCity) add("special", "🏙️ Reste en ville");
        if (o.nextEvent != null) add("special", `➡️ Event ${o.nextEvent}`);
        if (o.bonusExperience) add("pos", `✨ XP ${fmtSigned(o.bonusExperience)}`);
        if (o.bonusPoints) add("pos", `🏆 Pts ${fmtSigned(o.bonusPoints)}`);
        if (o.mapLink != null) add("special", `🗺️ Lien ${o.mapLink}`);
        if (o.tags) add("special", `🏷️ ${o.tags.join(", ")}`);
        if (o.condition) add("special", "🧩 Condition");
        if (!pills.length) add("", "Aucune conséquence");
        return pills.join("");
    }

    function toggleChoice(headerEl) {
        const isOpen = headerEl.parentElement.classList.toggle("open");
        headerEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function onChoiceHeaderKey(e, el) {
        if ((e.key === "Enter" || e.key === " ") && e.target === el) {
            e.preventDefault();
            toggleChoice(el);
        }
    }

    function toggleOutcome(headEl) {
        const card = headEl.closest(".outcome-card");
        if (!card) return;
        const isOpen = card.classList.toggle("open");
        headEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    function onOutcomeHeadClick(e, el) {
        // Clicks on the emoji input or the delete button must edit, not collapse.
        if (e.target.closest("input, button, .emoji-input")) return;
        toggleOutcome(el);
    }

    function onOutcomeHeadKey(e, el) {
        if ((e.key === "Enter" || e.key === " ") && e.target === el) {
            e.preventDefault();
            toggleOutcome(el);
        }
    }

    function toggleCompareMode() {
        compareMode = !compareMode;
        const panel = document.getElementById("eventPanel");
        if (panel) panel.classList.toggle("compare-mode", compareMode);
        const btn = document.getElementById("compareToggle");
        if (btn) btn.setAttribute("aria-pressed", compareMode ? "true" : "false");
    }

    // ---------------------------------------------------------------------------
    // Edit handlers
    // ---------------------------------------------------------------------------
    function ensureTextPossibility(id, name) {
        const ev = state.textsData[id] || (state.textsData[id] = { possibilities: {} });
        if (!ev.possibilities) ev.possibilities = {};
        if (!ev.possibilities[name]) ev.possibilities[name] = { outcomes: {} };
        if (!ev.possibilities[name].outcomes) ev.possibilities[name].outcomes = {};
        return ev.possibilities[name];
    }

    function editMainText(id, value) {
        state.textsData[id].text = value;
        markTexts();
    }
    function editChoiceText(id, name, value) {
        const poss = ensureTextPossibility(id, name);
        // keep "outcomes" before "text" to match file convention
        const outcomes = poss.outcomes;
        delete poss.outcomes; delete poss.text;
        poss.outcomes = outcomes;
        if (value !== "") poss.text = value;
        markTexts();
    }
    function editOutcomeText(id, name, key, value) {
        const poss = ensureTextPossibility(id, name);
        poss.outcomes[key] = value;
        markTexts();
    }
    function markTexts() {
        if (!state.modified.texts) { state.modified.texts = true; refreshBadges(); }
        scheduleSave();
    }

    function editScalar(id, name, key, field, rawValue) {
        const eff = state.effectData[id];
        if (!eff) return;
        if (!eff.possibilities[name]) eff.possibilities[name] = { outcomes: {} };
        if (!eff.possibilities[name].outcomes[key]) eff.possibilities[name].outcomes[key] = {};
        const outcome = eff.possibilities[name].outcomes[key];

        if (field === "oneshot") {
            if (rawValue) outcome.oneshot = true; else delete outcome.oneshot;
        } else if (field === "forceStayInCity") {
            if (rawValue) outcome.forceStayInCity = true; else delete outcome.forceStayInCity;
        } else if (field === "effect") {
            if (rawValue) outcome.effect = rawValue; else delete outcome.effect;
        } else {
            const num = rawValue === "" ? null : Number(rawValue);
            if (num === null || Number.isNaN(num) || num === 0) {
                delete outcome[field];
            } else {
                outcome[field] = num;
            }
        }
        eff.possibilities[name].outcomes[key] = sortKeys(outcome);
        markEffect(id);
        // Re-render to update summary pills
        drawEvent(id);
        reopenChoice(name);
    }

    function editAdvanced(id, name, key, rawValue, ta) {
        const eff = state.effectData[id];
        if (!eff) return;
        const errEl = ta.parentElement.querySelector(".json-error");
        let parsed = {};
        if (rawValue.trim() !== "") {
            try { parsed = JSON.parse(rawValue); }
            catch (e) { errEl.style.display = "block"; return; }
        }
        errEl.style.display = "none";
        if (!eff.possibilities[name]) eff.possibilities[name] = { outcomes: {} };
        if (!eff.possibilities[name].outcomes[key]) eff.possibilities[name].outcomes[key] = {};
        const outcome = eff.possibilities[name].outcomes[key];
        ADVANCED_FIELDS.forEach(k => delete outcome[k]);
        Object.assign(outcome, parsed);
        eff.possibilities[name].outcomes[key] = sortKeys(outcome);
        markEffect(id);
        drawEvent(id);
        reopenChoice(name);
    }

    function editEmoji(id, name, outcomeKey, value) {
        const info = state.iconsEvents[id] && state.iconsEvents[id].possibilities[name];
        if (!info) return;
        if (outcomeKey === null && info.type === "string") {
            info.value = value;
        } else if (outcomeKey !== null && info.type === "object" && info.outcomes[outcomeKey]) {
            info.outcomes[outcomeKey].value = value;
        }
        markIcons();
    }

    // ---------------------------------------------------------------------------
    // Structural editing: add / delete events, choices, outcomes
    // ---------------------------------------------------------------------------
    const PLACEHOLDER_EMOJI = "❓";
    const VALID_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

    function ensureEffectEvent(id) {
        if (!state.effectData[id]) {
            state.effectData[id] = { possibilities: {}, triggers: [] };
            state.effectOrder[id] = ["possibilities", "triggers"];
        }
        if (!state.effectData[id].possibilities) state.effectData[id].possibilities = {};
        return state.effectData[id];
    }

    function ensureTextEvent(id) {
        if (!state.textsData[id]) state.textsData[id] = { text: "", possibilities: {} };
        if (!state.textsData[id].possibilities) state.textsData[id].possibilities = {};
        return state.textsData[id];
    }

    // ---- icons structural helpers ----
    function iconInsertIdOrdered(id) {
        if (state.iconsOrder.includes(id)) return;
        let pos = state.iconsOrder.findIndex(x => x > id); // lexicographic, matches file convention
        if (pos < 0) pos = state.iconsOrder.length;
        state.iconsOrder.splice(pos, 0, id);
    }
    function iconEnsureEvent(id) {
        if (!state.iconsEvents[id]) {
            state.iconsEvents[id] = { order: [], possibilities: {}, tailWs: "\n\t\t" };
            iconInsertIdOrdered(id);
        }
        return state.iconsEvents[id];
    }
    function iconAddPossibility(id, name, isDefault) {
        const ev = iconEnsureEvent(id);
        if (ev.possibilities[name]) return;
        ev.possibilities[name] = isDefault
            ? { type: "object", outcomes: { "0": { value: PLACEHOLDER_EMOJI } }, outcomeOrder: ["0"] }
            : { type: "string", value: PLACEHOLDER_EMOJI };
        ev.order.push(name);
    }
    function iconDeletePossibility(id, name) {
        const ev = state.iconsEvents[id];
        if (!ev || !ev.possibilities[name]) return;
        delete ev.possibilities[name];
        ev.order = ev.order.filter(n => n !== name);
    }
    function iconAddOutcome(id, name, key) {
        const ev = state.iconsEvents[id];
        const e = ev && ev.possibilities[name];
        if (!e || e.type !== "object" || e.outcomes[key]) return;
        e.outcomes[key] = { value: PLACEHOLDER_EMOJI };
        e.outcomeOrder.push(key);
        e.outcomeOrder.sort((a, b) => Number(a) - Number(b));
    }
    function iconDeleteOutcome(id, name, key) {
        const ev = state.iconsEvents[id];
        const e = ev && ev.possibilities[name];
        if (!e || e.type !== "object" || !e.outcomes[key]) return;
        delete e.outcomes[key];
        e.outcomeOrder = e.outcomeOrder.filter(k => k !== key);
        if (e.outcomeOrder.length === 0) iconDeletePossibility(id, name);
    }
    function iconDeleteEvent(id) {
        delete state.iconsEvents[id];
        state.iconsOrder = state.iconsOrder.filter(x => x !== id);
    }

    // ---------------------------------------------------------------------------
    // Reversible deletes: snapshot / restore of the affected state slices
    // ---------------------------------------------------------------------------
    function deepClone(value) {
        if (value === undefined) return undefined;
        if (typeof structuredClone === "function") {
            try { return structuredClone(value); }
            catch (_e) { /* fall through to JSON clone for non-cloneable data */ }
        }
        return JSON.parse(JSON.stringify(value));
    }

    // Capture every state slice keyed by an event id BEFORE any mutation, so the
    // delete can be fully reversed. The clones live only in the toast closure;
    // once the toast is gone the deletion is permanent (no soft-delete ghost).
    function snapshotForDelete(id) {
        return {
            id,
            hadText: id in state.textsData,
            textsData: deepClone(state.textsData[id]),
            textsOrder: [...state.textsOrder],
            hadEffectData: id in state.effectData,
            effectData: deepClone(state.effectData[id]),
            hadEffectOrder: id in state.effectOrder,
            effectOrder: deepClone(state.effectOrder[id]),
            hadEffectRaw: id in state.effectRaw,
            effectRaw: state.effectRaw[id],
            hadIcons: id in state.iconsEvents,
            iconsEvents: deepClone(state.iconsEvents[id]),
            iconsOrder: [...state.iconsOrder],
            inCreatedEffects: state.createdEffects.has(id),
            inDeletedEffects: state.deletedEffects.has(id),
            inModifiedEffects: state.modified.effects.has(id),
            selected: state.selected
        };
    }

    // Write captured slices back into state and re-render. Restoring the whole
    // textsData/effectData/iconsEvents slices wholesale preserves outcome and
    // choice order, and re-aligning the Sets makes the exported patch identical
    // to the pre-delete state.
    function restoreFromSnapshot(snap) {
        const { id } = snap;

        // texts
        if (snap.hadText) state.textsData[id] = snap.textsData;
        else delete state.textsData[id];
        state.textsOrder = [...snap.textsOrder];

        // effects
        if (snap.hadEffectData) state.effectData[id] = snap.effectData;
        else delete state.effectData[id];
        if (snap.hadEffectOrder) state.effectOrder[id] = snap.effectOrder;
        else delete state.effectOrder[id];
        if (snap.hadEffectRaw) state.effectRaw[id] = snap.effectRaw;
        else delete state.effectRaw[id];

        // icons
        if (snap.hadIcons) state.iconsEvents[id] = snap.iconsEvents;
        else delete state.iconsEvents[id];
        state.iconsOrder = [...snap.iconsOrder];

        // membership Sets — restore exactly so the exported patch round-trips
        if (snap.inCreatedEffects) state.createdEffects.add(id); else state.createdEffects.delete(id);
        if (snap.inDeletedEffects) state.deletedEffects.add(id); else state.deletedEffects.delete(id);
        if (snap.inModifiedEffects) state.modified.effects.add(id); else state.modified.effects.delete(id);

        state.selected = snap.selected;

        markTexts();
        markIcons();
        refreshBadges();
        scheduleSave();

        populateEventSelect(document.getElementById("filterText").value);
        if (id in state.textsData) {
            // Re-select and redraw the restored event (works for event, choice
            // and outcome undo since the deleted id is the selected one).
            state.selected = id;
            const sel = document.getElementById("eventSelect");
            if (sel) sel.value = id;
            drawEvent(id);
        }
    }

    // ---- event-level ----
    function promptNewEvent() {
        const id = (prompt("Identifiant du nouvel event (nombre) :") || "").trim();
        if (!id) return;
        if (!/^\d+$/.test(id)) { setStatus("⚠️ L'identifiant doit être un nombre.", "error"); return; }
        if (state.textsData[id]) { setStatus(`⚠️ L'event #${id} existe déjà.`, "error"); return; }

        state.textsData[id] = { text: "", possibilities: {} };
        if (!state.textsOrder.includes(id)) state.textsOrder.push(id);
        markTexts();

        state.effectData[id] = { possibilities: {}, triggers: [] };
        state.effectOrder[id] = ["possibilities", "triggers"];
        state.createdEffects.add(id);
        scheduleSave();
        markEffect(id);

        iconEnsureEvent(id);
        markIcons();

        state.selected = id;
        populateEventSelect(document.getElementById("filterText").value);
        document.getElementById("eventSelect").value = id;
        drawEvent(id);
        setStatus(`✅ Event #${id} créé. Ajoutez des choix et un mapId déclencheur.`, "success");
    }

    function deleteEvent(id) {
        const snap = snapshotForDelete(id);

        delete state.textsData[id];
        state.textsOrder = state.textsOrder.filter(x => x !== id);
        markTexts();

        if (state.createdEffects.has(id)) {
            state.createdEffects.delete(id);
            state.modified.effects.delete(id);
        } else if (state.effectRaw[id] !== undefined) {
            state.deletedEffects.add(id);
            state.modified.effects.delete(id);
        }
        scheduleSave();
        delete state.effectData[id];
        delete state.effectOrder[id];

        iconDeleteEvent(id);
        markIcons();

        state.selected = null;
        populateEventSelect(document.getElementById("filterText").value);
        document.getElementById("eventPanel").innerHTML =
            `<div class="placeholder"><div class="ico">🗑️</div><p>Event #${id} supprimé. Sélectionnez un autre event.</p></div>`;
        setStatus(`✅ Event #${id} supprimé. Exportez le patch pour appliquer la suppression.`, "success");
        showToast({
            message: `Event #${id} supprimé.`,
            actionLabel: "Annuler",
            duration: 7000,
            variant: "danger",
            onAction: () => restoreFromSnapshot(snap)
        });
    }

    function editTriggers(id, rawValue) {
        const eff = ensureEffectEvent(id);
        const ids = rawValue.split(",").map(s => s.trim()).filter(s => s !== "");
        const mapIds = [];
        for (const s of ids) {
            if (!/^\d+$/.test(s)) { setStatus("⚠️ Les mapId doivent être des nombres séparés par des virgules.", "error"); return; }
            mapIds.push(Number(s));
        }
        eff.triggers = mapIds.map(mapId => ({ mapId }));
        if (!state.effectOrder[id]) state.effectOrder[id] = ["possibilities", "triggers"];
        else if (!state.effectOrder[id].includes("triggers")) state.effectOrder[id].push("triggers");
        markEffect(id);
    }

    // ---- choice (possibility) level ----
    function addChoice(id) {
        const name = (prompt("Nom interne du choix (ex : goForge, end) :") || "").trim();
        if (!name) return;
        if (!VALID_NAME.test(name)) { setStatus("⚠️ Nom invalide (lettres/chiffres/_ , commence par une lettre).", "error"); return; }
        const tEv = ensureTextEvent(id);
        const eEv = ensureEffectEvent(id);
        if (tEv.possibilities[name] || eEv.possibilities[name]) { setStatus(`⚠️ Le choix « ${name} » existe déjà.`, "error"); return; }

        const choiceText = (prompt("Texte du bouton (laisser vide pour un résultat par défaut sans bouton) :") || "").trim();
        const isDefault = choiceText === "";

        const tPoss = { outcomes: { "0": "" } };
        if (!isDefault) tPoss.text = choiceText;
        tEv.possibilities[name] = tPoss;
        markTexts();

        eEv.possibilities[name] = { outcomes: { "0": {} } };
        markEffect(id);

        iconAddPossibility(id, name, isDefault);
        markIcons();

        drawEvent(id);
        reopenChoice(name);
    }

    function deleteChoice(id, name) {
        const snap = snapshotForDelete(id);
        if (state.textsData[id] && state.textsData[id].possibilities) delete state.textsData[id].possibilities[name];
        markTexts();
        if (state.effectData[id] && state.effectData[id].possibilities) delete state.effectData[id].possibilities[name];
        markEffect(id);
        iconDeletePossibility(id, name);
        markIcons();
        drawEvent(id);
        showToast({
            message: `Choix « ${name} » supprimé.`,
            actionLabel: "Annuler",
            duration: 7000,
            variant: "danger",
            onAction: () => restoreFromSnapshot(snap)
        });
    }

    // ---- outcome level ----
    function nextOutcomeKey(id, name) {
        const keys = [
            ...Object.keys(state.textsData[id]?.possibilities?.[name]?.outcomes || {}),
            ...Object.keys(state.effectData[id]?.possibilities?.[name]?.outcomes || {})
        ].map(Number).filter(n => !Number.isNaN(n));
        return String(keys.length ? Math.max(...keys) + 1 : 0);
    }

    function addOutcome(id, name) {
        const key = nextOutcomeKey(id, name);
        const tEv = ensureTextEvent(id);
        if (!tEv.possibilities[name]) tEv.possibilities[name] = { outcomes: {} };
        if (!tEv.possibilities[name].outcomes) tEv.possibilities[name].outcomes = {};
        tEv.possibilities[name].outcomes[key] = "";
        markTexts();

        const eEv = ensureEffectEvent(id);
        if (!eEv.possibilities[name]) eEv.possibilities[name] = { outcomes: {} };
        if (!eEv.possibilities[name].outcomes) eEv.possibilities[name].outcomes = {};
        eEv.possibilities[name].outcomes[key] = {};
        markEffect(id);

        const iconEntry = state.iconsEvents[id] && state.iconsEvents[id].possibilities[name];
        if (iconEntry && iconEntry.type === "object") iconAddOutcome(id, name, key);
        markIcons();

        drawEvent(id);
        reopenChoice(name);
    }

    function deleteOutcome(id, name, key) {
        const snap = snapshotForDelete(id);
        if (state.textsData[id]?.possibilities?.[name]?.outcomes) delete state.textsData[id].possibilities[name].outcomes[key];
        markTexts();
        if (state.effectData[id]?.possibilities?.[name]?.outcomes) delete state.effectData[id].possibilities[name].outcomes[key];
        markEffect(id);
        iconDeleteOutcome(id, name, key);
        markIcons();
        drawEvent(id);
        reopenChoice(name);
        showToast({
            message: `Sortie ${key} du choix « ${name} » supprimée.`,
            actionLabel: "Annuler",
            duration: 7000,
            variant: "danger",
            onAction: () => {
                restoreFromSnapshot(snap);
                reopenChoice(name);
            }
        });
    }


    function markEffect(id) {
        if (!state.modified.effects.has(id)) { state.modified.effects.add(id); }
        refreshBadges();
        scheduleSave();
    }

    function refreshBadges() {
        updateActionBar();
        const meta = document.querySelector(".event-meta");
        if (!meta) return;
        // Remove old modified badges then re-add
        meta.querySelectorAll(".badge.modified").forEach(b => b.remove());
        meta.insertAdjacentHTML("beforeend", renderModifiedBadges());
    }

    function reopenChoice(name) {
        // After a re-render, reopen the choice card matching this possibility name
        document.querySelectorAll(".choice-card").forEach(card => {
            const title = card.querySelector(".choice-title");
            if (title && title.textContent.trim().startsWith(name)) {
                card.classList.add("open");
                const header = card.querySelector(".choice-header");
                if (header) header.setAttribute("aria-expanded", "true");
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Key ordering helpers
    // ---------------------------------------------------------------------------
    function sortKeys(obj) {
        const sorted = {};
        Object.keys(obj).sort().forEach(k => { sorted[k] = obj[k]; });
        return sorted;
    }

    function captureRootOrder(raw) {
        return [...raw.matchAll(/^  "([^"]+)"\s*:/gm)].map(m => m[1]);
    }

    // ---------------------------------------------------------------------------
    // Custom JSON serializer that reproduces the repo formatting exactly
    // (2-space indent, no trailing newline, original root key order)
    // ---------------------------------------------------------------------------
    function serializeJson(value, rootOrder) {
        function ser(v, indent, isRoot) {
            if (v === null || typeof v !== "object") return JSON.stringify(v);
            const pad = "  ".repeat(indent);
            const pad2 = "  ".repeat(indent + 1);
            if (Array.isArray(v)) {
                if (v.length === 0) return "[]";
                return "[\n" + v.map(e => pad2 + ser(e, indent + 1, false)).join(",\n") + "\n" + pad + "]";
            }
            let keys = Object.keys(v);
            if (isRoot && rootOrder && rootOrder.length) {
                const known = rootOrder.filter(k => k in v);
                const extra = keys.filter(k => !rootOrder.includes(k));
                keys = [...known, ...extra];
            }
            if (keys.length === 0) return "{}";
            return "{\n" + keys.map(k => pad2 + JSON.stringify(k) + ": " + ser(v[k], indent + 1, false)).join(",\n") + "\n" + pad + "}";
        }
        return ser(value, 0, true);
    }

    // ---------------------------------------------------------------------------
    // CrowniclesIcons.ts parsing + surgical editing
    // ---------------------------------------------------------------------------
    function matchBrace(text, openIdx) {
        let depth = 0, inStr = false, strCh = "";
        for (let i = openIdx; i < text.length; i++) {
            const c = text[i];
            if (inStr) {
                if (c === "\\") { i++; continue; }
                if (c === strCh) inStr = false;
                continue;
            }
            if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; continue; }
            if (c === "{") depth++;
            else if (c === "}") { depth--; if (depth === 0) return i; }
        }
        return -1;
    }

    function iconsTailWs(raw, end) {
        // whitespace run immediately preceding the closing brace at `end`
        let t = end - 1;
        while (t >= 0 && /\s/.test(raw[t])) t--;
        return raw.slice(t + 1, end);
    }

    // Parses the `events: { ... }` block of CrowniclesIcons.ts into an ordered model.
    // Returns { events, order, block } where:
    //   events[id] = { order:[names], possibilities:{ name: entry }, tailWs }
    //   entry = { type:"string", value } | { type:"object", outcomes:{ key:{value} }, outcomeOrder:[keys] }
    //   block = { start, end, tailWs }  (offsets of the `{`...`}` in raw)
    function parseIconsEvents(raw) {
        const events = {};
        const order = [];
        const m = raw.match(/events:\s*\{\s*\d+\s*:/);
        if (!m) return { events, order, block: null };
        const braceStart = raw.indexOf("{", m.index);
        const blockEnd = matchBrace(raw, braceStart);
        if (blockEnd < 0) return { events, order, block: null };

        const evRe = /(\d+)\s*:\s*\{/g;
        evRe.lastIndex = braceStart + 1;
        let mm;
        while ((mm = evRe.exec(raw)) && mm.index < blockEnd) {
            const id = mm[1];
            const evBrace = raw.indexOf("{", mm.index);
            const evEnd = matchBrace(raw, evBrace);
            if (evBrace > blockEnd || evEnd < 0) break;
            events[id] = { ...parsePossibilityEmojis(raw, evBrace, evEnd), tailWs: iconsTailWs(raw, evEnd) };
            order.push(id);
            evRe.lastIndex = evEnd + 1;
        }
        return { events, order, block: { start: braceStart, end: blockEnd, tailWs: iconsTailWs(raw, blockEnd) } };
    }

    function parsePossibilityEmojis(raw, evBrace, evEnd) {
        const possibilities = {};
        const possOrder = [];
        const entryRe = /([A-Za-z0-9_]+)\s*:\s*/g;
        entryRe.lastIndex = evBrace + 1;
        let mm;
        while ((mm = entryRe.exec(raw)) && mm.index < evEnd) {
            const name = mm[1];
            let p = entryRe.lastIndex;
            while (p < evEnd && /\s/.test(raw[p])) p++;
            if (raw[p] === '"' || raw[p] === "'") {
                const q = raw[p];
                let j = p + 1;
                while (j < evEnd && raw[j] !== q) { if (raw[j] === "\\") j++; j++; }
                possibilities[name] = { type: "string", value: raw.slice(p + 1, j) };
                possOrder.push(name);
                entryRe.lastIndex = j + 1;
            } else if (raw[p] === "{") {
                const objStart = p;
                const objEnd = matchBrace(raw, objStart);
                const outcomes = {};
                const outcomeOrder = [];
                const outRe = /(\d+)\s*:\s*("|')/g;
                outRe.lastIndex = objStart + 1;
                let om;
                while ((om = outRe.exec(raw)) && om.index < objEnd) {
                    const okey = om[1];
                    const q = om[2];
                    const valStart = outRe.lastIndex - 1;
                    let j = valStart + 1;
                    while (j < objEnd && raw[j] !== q) { if (raw[j] === "\\") j++; j++; }
                    outcomes[okey] = { value: raw.slice(valStart + 1, j) };
                    outcomeOrder.push(okey);
                    outRe.lastIndex = j + 1;
                }
                possibilities[name] = { type: "object", outcomes, outcomeOrder };
                possOrder.push(name);
                entryRe.lastIndex = objEnd + 1;
            }
        }
        return { possibilities, order: possOrder };
    }

    // Re-emit the `events: { ... }` block from the ordered model, byte-for-byte
    // identical to the original when unchanged (verified via round-trip).
    function serializeIconsBlock() {
        const T = "\t";
        const body = state.iconsOrder.map(id => {
            const ev = state.iconsEvents[id];
            const entries = ev.order.map(name => {
                const e = ev.possibilities[name];
                if (e.type === "string") return T + T + T + name + ": " + JSON.stringify(e.value);
                const ks = e.outcomeOrder;
                if (ks.length === 1) {
                    return T + T + T + name + ": { " + ks[0] + ": " + JSON.stringify(e.outcomes[ks[0]].value) + " }";
                }
                return T + T + T + name + ": {\n"
                    + ks.map(k => T + T + T + T + k + ": " + JSON.stringify(e.outcomes[k].value)).join(",\n")
                    + "\n" + T + T + T + "}";
            }).join(",\n");
            const tail = ev.tailWs || ("\n" + T + T);
            return T + T + id + ": {\n" + entries + tail + "}";
        }).join(",\n");
        const blockTail = (state.iconsBlock && state.iconsBlock.tailWs) || ("\n" + T);
        return "{\n" + body + blockTail + "}";
    }

    function buildIconsNewRaw() {
        if (!state.iconsBlock) return state.iconsRaw;
        const block = serializeIconsBlock();
        return state.iconsRaw.slice(0, state.iconsBlock.start) + block + state.iconsRaw.slice(state.iconsBlock.end + 1);
    }

    function markIcons() {
        if (!state.modified.icons) { state.modified.icons = true; refreshBadges(); }
        scheduleSave();
    }

    // ---------------------------------------------------------------------------
    // Unified diff (git-applicable)
    // ---------------------------------------------------------------------------
    function splitLines(text) {
        const eof = text.endsWith("\n");
        const lines = text.split("\n");
        if (eof) lines.pop();
        return { lines, eof };
    }

    function diffOps(a, b) {
        // common prefix / suffix trim
        let start = 0;
        while (start < a.length && start < b.length && a[start] === b[start]) start++;
        let aEnd = a.length, bEnd = b.length;
        while (aEnd > start && bEnd > start && a[aEnd - 1] === b[bEnd - 1]) { aEnd--; bEnd--; }

        const aMid = a.slice(start, aEnd);
        const bMid = b.slice(start, bEnd);
        const ops = [];
        for (let i = 0; i < start; i++) ops.push({ type: "eq", line: a[i] });

        const n = aMid.length, m = bMid.length;
        if (n * m > 4000000) {
            // Fallback for very large changed regions: delete then insert
            for (let i = 0; i < n; i++) ops.push({ type: "del", line: aMid[i] });
            for (let j = 0; j < m; j++) ops.push({ type: "ins", line: bMid[j] });
        } else {
            const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
            for (let i = n - 1; i >= 0; i--)
                for (let j = m - 1; j >= 0; j--)
                    dp[i][j] = aMid[i] === bMid[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
            let i = 0, j = 0;
            while (i < n && j < m) {
                if (aMid[i] === bMid[j]) { ops.push({ type: "eq", line: aMid[i] }); i++; j++; }
                else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "del", line: aMid[i] }); i++; }
                else { ops.push({ type: "ins", line: bMid[j] }); j++; }
            }
            while (i < n) { ops.push({ type: "del", line: aMid[i] }); i++; }
            while (j < m) { ops.push({ type: "ins", line: bMid[j] }); j++; }
        }

        for (let k = aEnd; k < a.length; k++) ops.push({ type: "eq", line: a[k] });
        return ops;
    }

    function unifiedDiff(oldText, newText, path) {
        if (oldText === newText) return "";
        const A = splitLines(oldText);
        const B = splitLines(newText);
        const ops = diffOps(A.lines, B.lines);

        // tag with 0-based indices
        let ai = 0, bi = 0;
        const tagged = ops.map(op => {
            const t = { type: op.type, line: op.line, a: null, b: null };
            if (op.type === "eq") { t.a = ai++; t.b = bi++; }
            else if (op.type === "del") { t.a = ai++; }
            else { t.b = bi++; }
            return t;
        });

        const context = 3;
        const isChange = tagged.map(t => t.type !== "eq");
        const hunks = [];
        let idx = 0;
        while (idx < tagged.length) {
            if (!isChange[idx]) { idx++; continue; }
            let hEnd = idx;
            let j = idx;
            while (j < tagged.length) {
                if (isChange[j]) { hEnd = j; j++; continue; }
                let k = j;
                while (k < tagged.length && !isChange[k]) k++;
                if (k < tagged.length && (k - j) <= 2 * context) { j = k; continue; }
                break;
            }
            const s = Math.max(0, idx - context);
            const e = Math.min(tagged.length, hEnd + 1 + context);
            hunks.push({ s, e });
            idx = e;
        }

        const out = [];
        out.push(`diff --git a/${path} b/${path}`);
        out.push(`--- a/${path}`);
        out.push(`+++ b/${path}`);

        const lastA = A.lines.length - 1;
        const lastB = B.lines.length - 1;

        hunks.forEach(h => {
            let aStart = null, bStart = null, aCount = 0, bCount = 0;
            for (let k = h.s; k < h.e; k++) {
                const t = tagged[k];
                if (t.type === "del" || t.type === "eq") { if (aStart === null) aStart = t.a; aCount++; }
                if (t.type === "ins" || t.type === "eq") { if (bStart === null) bStart = t.b; bCount++; }
            }
            if (aStart === null) aStart = 0; else aStart += 1;
            if (bStart === null) bStart = 0; else bStart += 1;
            out.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`);

            for (let k = h.s; k < h.e; k++) {
                const t = tagged[k];
                const prefix = t.type === "eq" ? " " : (t.type === "del" ? "-" : "+");
                out.push(prefix + t.line);
                let pushed = false;
                if ((prefix === "-" || prefix === " ") && t.a === lastA && !A.eof) {
                    out.push("\\ No newline at end of file");
                    pushed = true;
                }
                if ((prefix === "+" || prefix === " ") && t.b === lastB && !B.eof && !(prefix === " " && pushed)) {
                    out.push("\\ No newline at end of file");
                }
            }
        });

        return out.join("\n");
    }

    // ---------------------------------------------------------------------------
    // Export
    // ---------------------------------------------------------------------------
    function fileCreateDiff(path, text) {
        const { lines, eof } = splitLines(text);
        const out = [
            `diff --git a/${path} b/${path}`,
            `new file mode 100644`,
            `--- /dev/null`,
            `+++ b/${path}`,
            `@@ -0,0 +1,${lines.length} @@`
        ];
        lines.forEach((l, i) => {
            out.push("+" + l);
            if (i === lines.length - 1 && !eof) out.push("\\ No newline at end of file");
        });
        return out.join("\n");
    }

    function fileDeleteDiff(path, text) {
        const { lines, eof } = splitLines(text);
        const out = [
            `diff --git a/${path} b/${path}`,
            `deleted file mode 100644`,
            `--- a/${path}`,
            `+++ /dev/null`,
            `@@ -1,${lines.length} +0,0 @@`
        ];
        lines.forEach((l, i) => {
            out.push("-" + l);
            if (i === lines.length - 1 && !eof) out.push("\\ No newline at end of file");
        });
        return out.join("\n");
    }

    // Build the array of unified-diff strings that make up the patch, without
    // downloading anything. Pure function over current state — used by both
    // exportPatch() (download) and showDiffPreview() (preview).
    function buildPatchParts() {
        const parts = [];

        if (state.modified.texts) {
            const newText = serializeJson(state.textsData, state.textsOrder);
            const d = unifiedDiff(state.textsRaw, newText, PATHS.texts);
            if (d) parts.push(d);
        }

        [...state.modified.effects]
            .filter(id => !state.deletedEffects.has(id))
            .sort((a, b) => Number(a) - Number(b))
            .forEach(id => {
                const newText = serializeJson(state.effectData[id], state.effectOrder[id]);
                if (state.createdEffects.has(id)) {
                    parts.push(fileCreateDiff(PATHS.effect(id), newText));
                } else {
                    const d = unifiedDiff(state.effectRaw[id], newText, PATHS.effect(id));
                    if (d) parts.push(d);
                }
            });

        [...state.deletedEffects]
            .sort((a, b) => Number(a) - Number(b))
            .forEach(id => {
                if (state.effectRaw[id] !== undefined) {
                    parts.push(fileDeleteDiff(PATHS.effect(id), state.effectRaw[id]));
                }
            });

        if (state.modified.icons) {
            const newIcons = buildIconsNewRaw();
            const d = unifiedDiff(state.iconsRaw, newIcons, PATHS.icons);
            if (d) parts.push(d);
        }

        return parts;
    }

    // Assemble the full patch text. Returns "" when there is nothing to export.
    function buildPatchString() {
        const parts = buildPatchParts();
        return parts.length ? parts.join("\n") + "\n" : "";
    }

    // Number of files that would appear in the exported patch.
    function countModifiedFiles() {
        let n = 0;
        if (state.modified.texts) n++;
        if (state.modified.icons) n++;
        [...state.modified.effects].forEach(id => {
            if (!state.deletedEffects.has(id)) n++;
        });
        [...state.deletedEffects].forEach(id => {
            if (state.effectRaw[id] !== undefined) n++;
        });
        return n;
    }

    // Collect human-readable French validation errors that must block an export.
    // Two categories:
    //  a. Invalid advanced JSON still pending in the DOM (never committed to state).
    //  b. Structural problems in state.textsData (real choice without outcomes,
    //     or an event with no possibility at all).
    function collectValidationErrors() {
        const errors = [];

        // a. Advanced JSON errors currently displayed in the DOM. editAdvanced()
        // toggles the sibling .json-error to display:block on parse failure and
        // back to display:none on success, so an inline display:block flags an
        // uncommitted invalid value living only in the textarea.
        Array.from(document.querySelectorAll(".json-error"))
            .filter(el => el.style.display === "block")
            .forEach(el => {
                const details = el.closest("details");
                const ta = details && details.querySelector("textarea");
                const label = ta && ta.getAttribute("aria-label");
                const ctx = label ? ` (${label})` : "";
                errors.push(`JSON avancé invalide${ctx} — corrigez ou videz le champ avant d'exporter.`);
            });

        // b. Structural checks over the text data.
        if (state.textsData) {
            Object.keys(state.textsData).forEach(id => {
                const ev = state.textsData[id];
                const poss = ev && ev.possibilities;
                if (!poss || Object.keys(poss).length === 0) {
                    errors.push(`Event #${id} : aucune possibilité.`);
                    return;
                }
                Object.keys(poss).forEach(name => {
                    const p = poss[name];
                    // Only real choices (with a button text) require outcomes;
                    // a default possibility has no text and is exempt.
                    if (p && typeof p.text === "string" && p.text !== "") {
                        const outcomes = p.outcomes;
                        if (!outcomes || Object.keys(outcomes).length === 0) {
                            errors.push(`Event #${id} · choix « ${name} » : aucune sortie définie.`);
                        }
                    }
                });
            });
        }

        return errors;
    }

    // Alias used by export paths; returns the blocking validation errors (if any).
    function validateBeforeExport() {
        return collectValidationErrors();
    }

    function exportPatch() {
        // Block export on validation errors (covers both the action-bar Export
        // button and the modal download button, since the latter re-enters here).
        const errors = validateBeforeExport();
        if (errors.length) {
            showDiffPreview();
            setStatus("⚠️ Export bloqué : corrigez les erreurs de validation.", "error");
            return;
        }

        const parts = buildPatchParts();

        if (!parts.length) {
            setStatus("ℹ️ Aucune modification à exporter.", "loading");
            return;
        }

        const patch = parts.join("\n") + "\n";
        const branch = state.source ? state.source.branch : "local";
        const blob = new Blob([patch], { type: "text/x-patch" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `crownicles-events-${branch}.patch`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setStatus(`✅ Patch généré (${parts.length} fichier(s)). Appliquez-le avec : git apply crownicles-events-${branch}.patch`, "success");

        // Exported == saved: drop the autosaved draft and clear the dirty flags so
        // the beforeunload guard no longer fires on this freshly exported session.
        try { localStorage.removeItem(storageKey()); } catch (err) { console.warn("Suppression du brouillon impossible :", err); }
        state.modified = { texts: false, icons: false, effects: new Set() };
        state.createdEffects = new Set();
        state.deletedEffects = new Set();
        refreshBadges();
        updateActionBar();
    }

    // ---------------------------------------------------------------------------
    // Sticky action bar
    // ---------------------------------------------------------------------------
    function updateActionBar() {
        const bar = document.getElementById("actionBar");
        if (!bar) return;

        const count = countModifiedFiles();
        const countEl = document.getElementById("actionBarCount");
        if (countEl) {
            countEl.textContent = count === 0
                ? "Aucune modification"
                : `${count} fichier${count > 1 ? "s" : ""} modifié${count > 1 ? "s" : ""}`;
        }

        const pill = document.getElementById("actionBarStatus");
        if (pill) {
            const dirty = hasUnsavedChanges();
            pill.textContent = dirty ? "● Modifié" : "✓ À jour";
            pill.classList.toggle("modified", dirty);
            pill.classList.toggle("clean", !dirty);
        }

        const noFiles = count === 0;
        const previewBtn = document.getElementById("actionBarPreview");
        const exportBtn = document.getElementById("actionBarExport");
        if (previewBtn) previewBtn.disabled = noFiles;
        if (exportBtn) exportBtn.disabled = noFiles;
    }

    // Parse a single per-file unified-diff part into { path, status, chipClass }.
    // The path comes from the `diff --git a/PATH b/PATH` header; the status is
    // derived from the creation/deletion markers emitted by fileCreateDiff /
    // fileDeleteDiff (otherwise it is a plain modification).
    function diffFileMeta(part) {
        const firstLine = part.split("\n", 1)[0];
        const m = firstLine.match(/^diff --git a\/(.+?) b\/(.+)$/);
        const path = m ? m[2] : firstLine.replace(/^diff --git\s*/, "");
        if (/\nnew file mode/.test(part) || /\n--- \/dev\/null/.test(part)) {
            return { path, status: "créé", chipClass: "diff-chip-new" };
        }
        if (/\ndeleted file mode/.test(part) || /\n\+\+\+ \/dev\/null/.test(part)) {
            return { path, status: "supprimé", chipClass: "diff-chip-del" };
        }
        return { path, status: "modifié", chipClass: "diff-chip-mod" };
    }

    // Escape a diff part and wrap each line in a class span for coloring. The
    // textual content is left untouched (no reformatting), so the concatenation
    // of every body equals buildPatchString() byte-for-byte. The `---`/`+++`
    // header lines are treated as headers, never as del/add.
    function colorizeDiff(part) {
        return part.split("\n").map(line => {
            let cls = "";
            if (line.startsWith("diff --git") || line.startsWith("index ")
                || line.startsWith("new file mode") || line.startsWith("deleted file mode")
                || line.startsWith("--- ") || line.startsWith("+++ ")
                || line.startsWith("\\ ")) {
                cls = "diff-hdr";
            } else if (line.startsWith("@@")) {
                cls = "diff-hunk";
            } else if (line.startsWith("+")) {
                cls = "diff-add";
            } else if (line.startsWith("-")) {
                cls = "diff-del";
            }
            const esc = escapeHtml(line);
            return cls ? `<span class="${cls}">${esc}</span>` : esc;
        }).join("\n");
    }

    // Structured pre-export review modal. The per-file diff bodies reproduce the
    // exact part strings from buildPatchParts(); concatenated they equal
    // buildPatchString() (== the downloaded patch). Validation errors disable the
    // download button so export is blocked from the modal too.
    function showDiffPreview() {
        const parts = buildPatchParts();
        if (!parts.length) {
            setStatus("ℹ️ Aucune modification à prévisualiser.", "loading");
            return;
        }

        const errors = validateBeforeExport();

        const existing = document.querySelector(".diff-modal-overlay");
        if (existing) existing.remove();

        const filesHtml = parts.map(part => {
            const { path, status, chipClass } = diffFileMeta(part);
            return `<details class="diff-file">
                    <summary>
                        <span class="diff-chip ${chipClass}">${status}</span>
                        <span class="diff-file-path">${escapeHtml(path)}</span>
                    </summary>
                    <pre class="diff-body">${colorizeDiff(part)}</pre>
                </details>`;
        }).join("");

        const errorsHtml = errors.length
            ? `<div class="diff-validation-errors" role="alert">
                    <strong>⚠️ ${errors.length} erreur(s) bloquante(s) — export désactivé :</strong>
                    <ul>${errors.map(e => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
                </div>`
            : "";

        const overlay = document.createElement("div");
        overlay.className = "diff-modal-overlay";
        overlay.innerHTML = `
            <div class="diff-modal" role="dialog" aria-modal="true" aria-label="Aperçu du patch">
                <div class="diff-modal-header">
                    <strong>👁️ Aperçu du patch</strong>
                    <button class="btn-mini diff-modal-close" type="button" aria-label="Fermer">✕</button>
                </div>
                ${errorsHtml}
                <div class="diff-file-list">${filesHtml}</div>
                <div class="diff-modal-footer">
                    <button class="btn btn-export diff-modal-download" type="button" ${errors.length ? "disabled" : ""}>💾 Télécharger le .patch</button>
                    <button class="btn btn-ghost diff-modal-close" type="button">Fermer</button>
                </div>
            </div>`;

        function close() {
            overlay.remove();
            document.removeEventListener("keydown", onKey);
        }
        function onKey(e) {
            if (e.key === "Escape") close();
        }
        overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
        overlay.querySelectorAll(".diff-modal-close").forEach(b => b.addEventListener("click", close));
        const downloadBtn = overlay.querySelector(".diff-modal-download");
        if (downloadBtn) {
            downloadBtn.addEventListener("click", () => { close(); exportPatch(); });
        }
        document.addEventListener("keydown", onKey);

        document.body.appendChild(overlay);

        const focusTarget = (downloadBtn && !downloadBtn.disabled)
            ? downloadBtn
            : overlay.querySelector(".diff-modal-close");
        if (focusTarget) focusTarget.focus();
    }


    // ---------------------------------------------------------------------------
    // Autosave / unsaved-changes guard (localStorage drafts)
    // ---------------------------------------------------------------------------
    const DRAFT_PREFIX = "crownicles-event-editor:";

    function hasUnsavedChanges() {
        return state.modified.texts
            || state.modified.icons
            || state.modified.effects.size > 0
            || state.createdEffects.size > 0
            || state.deletedEffects.size > 0;
    }

    function storageKey() {
        const src = state.source;
        return DRAFT_PREFIX + (src ? `${src.owner}/${src.repo}@${src.branch}` : "local");
    }

    function saveDraft() {
        try {
            const snapshot = {
                savedAt: new Date().toISOString(),
                source: state.source,
                textsRaw: state.textsRaw,
                textsData: state.textsData,
                textsOrder: state.textsOrder,
                iconsRaw: state.iconsRaw,
                iconsEvents: state.iconsEvents,
                iconsOrder: state.iconsOrder,
                iconsBlock: state.iconsBlock,
                effectRaw: state.effectRaw,
                effectData: state.effectData,
                effectOrder: state.effectOrder,
                selected: state.selected,
                reviewMode: state.reviewMode,
                modified: {
                    texts: state.modified.texts,
                    icons: state.modified.icons,
                    effects: [...state.modified.effects]
                },
                createdEffects: [...state.createdEffects],
                deletedEffects: [...state.deletedEffects]
            };
            localStorage.setItem(storageKey(), JSON.stringify(snapshot));
        } catch (err) {
            console.warn("Sauvegarde du brouillon impossible :", err);
        }
    }

    let __saveTimer = null;
    function scheduleSave() {
        if (__saveTimer) clearTimeout(__saveTimer);
        __saveTimer = setTimeout(() => {
            __saveTimer = null;
            // Only persist when there is something loaded to restore later.
            if (state.textsData) saveDraft();
        }, 800);
    }

    function restoreDraft(key) {
        let snapshot;
        try {
            snapshot = JSON.parse(localStorage.getItem(key));
        } catch (err) {
            console.warn("Brouillon illisible :", err);
            return;
        }
        if (!snapshot) { hideRestoreBanner(); return; }

        resetState();
        state.source = snapshot.source || null;
        state.textsRaw = snapshot.textsRaw;
        state.textsData = snapshot.textsData;
        state.textsOrder = snapshot.textsOrder || [];
        state.iconsRaw = snapshot.iconsRaw;
        state.iconsEvents = snapshot.iconsEvents || {};
        state.iconsOrder = snapshot.iconsOrder || [];
        state.iconsBlock = snapshot.iconsBlock || null;
        state.effectRaw = snapshot.effectRaw || {};
        state.effectData = snapshot.effectData || {};
        state.effectOrder = snapshot.effectOrder || {};
        state.selected = snapshot.selected || null;
        state.reviewMode = !!snapshot.reviewMode;
        state.modified = {
            texts: !!(snapshot.modified && snapshot.modified.texts),
            icons: !!(snapshot.modified && snapshot.modified.icons),
            effects: new Set((snapshot.modified && snapshot.modified.effects) || [])
        };
        state.createdEffects = new Set(snapshot.createdEffects || []);
        state.deletedEffects = new Set(snapshot.deletedEffects || []);

        // Reflect the source into the load-panel inputs.
        if (state.source) {
            const o = document.getElementById("repoOwner");
            const r = document.getElementById("repoName");
            const b = document.getElementById("branchName");
            if (o) o.value = state.source.owner;
            if (r) r.value = state.source.repo;
            if (b) b.value = state.source.branch;
        }

        const label = state.source
            ? `${state.source.owner}/${state.source.repo}@${state.source.branch}`
            : "fichiers locaux";
        finishLoad(`Brouillon restauré (${label})`);
        if (state.selected) onSelectEvent(state.selected);

        hideRestoreBanner();
    }

    function draftTimeAgo(iso) {
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return "un instant";
        const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
        if (secs < 60) return `${secs} s`;
        const mins = Math.round(secs / 60);
        if (mins < 60) return `${mins} min`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours} h`;
        return `${Math.round(hours / 24)} j`;
    }

    function listDrafts() {
        const drafts = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(DRAFT_PREFIX)) continue;
            try {
                const snap = JSON.parse(localStorage.getItem(key));
                if (snap) drafts.push({ key, snap });
            } catch (err) {
                console.warn("Brouillon corrompu ignoré :", key, err);
            }
        }
        return drafts;
    }

    function hideRestoreBanner() {
        const banner = document.getElementById("restoreBanner");
        if (banner) { banner.style.display = "none"; banner.innerHTML = ""; }
    }

    function maybeShowRestoreBanner() {
        const banner = document.getElementById("restoreBanner");
        if (!banner) return;
        const drafts = listDrafts();
        if (!drafts.length) return;

        // Target the most recently saved draft.
        drafts.sort((a, b) => String(b.snap.savedAt || "").localeCompare(String(a.snap.savedAt || "")));
        const { key, snap } = drafts[0];
        const src = snap.source;
        const label = src ? `${src.owner}/${src.repo}@${src.branch}` : "fichiers locaux";
        const ago = snap.savedAt ? draftTimeAgo(snap.savedAt) : "un instant";

        banner.innerHTML = "";
        const msg = document.createElement("span");
        msg.className = "restore-banner-msg";
        msg.textContent = `💾 Un brouillon non exporté existe (${label}, sauvé il y a ${ago}).`;

        const actions = document.createElement("span");
        actions.className = "restore-banner-actions";

        const restoreBtn = document.createElement("button");
        restoreBtn.className = "btn-mini";
        restoreBtn.textContent = "Restaurer";
        restoreBtn.addEventListener("click", () => restoreDraft(key));

        const ignoreBtn = document.createElement("button");
        ignoreBtn.className = "btn-mini btn-mini-danger";
        ignoreBtn.textContent = "Ignorer";
        ignoreBtn.addEventListener("click", () => {
            try { localStorage.removeItem(key); } catch (err) { console.warn("Suppression du brouillon impossible :", err); }
            hideRestoreBanner();
        });

        actions.appendChild(restoreBtn);
        actions.appendChild(ignoreBtn);
        banner.appendChild(msg);
        banner.appendChild(actions);
        banner.style.display = "flex";
    }

    // Warn before leaving with unsaved edits.
    window.addEventListener("beforeunload", e => {
        if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ""; }
    });

    // Offer to restore a draft on startup.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", maybeShowRestoreBanner);
    } else {
        maybeShowRestoreBanner();
    }
