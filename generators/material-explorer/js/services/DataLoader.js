// ==========================================================================
// Orchestrates GitHub data loading: materials, translations, recipes,
// weapons, armors, plant compost names, and boss loot tables.
// ==========================================================================

// Materials map material rarity names to their numeric ids (mirrors MaterialRarity).
const MAT_RARITY = { COMMON: 1, UNCOMMON: 2, RARE: 3 };

// Extract the balanced `{ ... }` block whose opening brace is the first `{`
// found at or after `fromIndex` in `text`. Returns the substring including braces.
function extractBraceBlock(text, fromIndex) {
    const open = text.indexOf('{', fromIndex);
    if (open < 0) {
        return null;
    }
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        if (text[i] === '{') {
            depth++;
        }
        else if (text[i] === '}') {
            depth--;
            if (depth === 0) {
                return text.slice(open, i + 1);
            }
        }
    }
    return null;
}

// Parse UPGRADE_MATERIALS_PER_ITEM_RARITY_AND_LEVEL from ItemConstants.ts into
// { [itemRarity 0..8]: { [level 1..5]: { 1:common, 2:uncommon, 3:rare } } }.
function parseUpgradeTotals(tsText) {
    const anchor = tsText.indexOf('UPGRADE_MATERIALS_PER_ITEM_RARITY_AND_LEVEL');
    if (anchor < 0) {
        throw new Error('UPGRADE_MATERIALS_PER_ITEM_RARITY_AND_LEVEL not found');
    }
    // The type annotation also contains braces, so jump to the value block (`= {`).
    const body = extractBraceBlock(tsText, tsText.indexOf('= {', anchor));
    if (!body) {
        throw new Error('UPGRADE_MATERIALS table body not found');
    }
    const out = {};
    for (const [rarityName, rarity] of Object.entries(ITEM_RARITY)) {
        const head = body.match(new RegExp(`ItemRarity\\.${rarityName}\\s*\\]\\s*:\\s*\\{`));
        const levels = {};
        if (head) {
            const inner = extractBraceBlock(body, head.index);
            for (let level = 1; level <= 5; level++) {
                const levelHead = inner.match(new RegExp(`(?:^|[^\\d])${level}\\s*:\\s*\\{`));
                const counts = { 1: 0, 2: 0, 3: 0 };
                if (levelHead) {
                    const levelBody = extractBraceBlock(inner, levelHead.index);
                    for (const [matName, matRarity] of Object.entries(MAT_RARITY)) {
                        const match = levelBody.match(new RegExp(`MaterialRarity\\.${matName}\\s*\\]\\s*:\\s*(\\d+)`));
                        counts[matRarity] = match ? parseInt(match[1], 10) : 0;
                    }
                }
                levels[level] = counts;
            }
        }
        out[rarity] = levels;
    }
    return out;
}

// Parse the `key: [ ...ids ]` arrays of EXPEDITION_LOOT_TABLES from
// ExpeditionConstants.ts into { [locationKey]: number[] }.
function parseExpeditionLoot(tsText) {
    const anchor = tsText.indexOf('EXPEDITION_LOOT_TABLES');
    if (anchor < 0) {
        throw new Error('EXPEDITION_LOOT_TABLES not found');
    }
    const body = extractBraceBlock(tsText, tsText.indexOf('= {', anchor));
    if (!body) {
        throw new Error('EXPEDITION_LOOT_TABLES body not found');
    }
    const out = {};
    const entryRegex = /(\w+)\s*:\s*\[([\s\S]*?)\]/g;
    let entry;
    while ((entry = entryRegex.exec(body)) !== null) {
        const ids = entry[2].replace(/\/\/.*$/gm, '').match(/\d+/g);
        out[entry[1]] = ids ? ids.map(Number) : [];
    }
    return out;
}

// Parse the ordered `compostMaterials: [ ...ids ]` arrays of PLANT_TYPES from
// PlantConstants.ts into { [plantId 1..N]: number[] } (array order = plant id).
function parsePlantCompost(tsText) {
    const anchor = tsText.indexOf('PLANT_TYPES');
    if (anchor < 0) {
        throw new Error('PLANT_TYPES not found');
    }
    const body = tsText.slice(tsText.indexOf('[', anchor));
    const out = {};
    const compostRegex = /compostMaterials\s*:\s*\[([\s\S]*?)\]/g;
    let match;
    let plantId = 1;
    while ((match = compostRegex.exec(body)) !== null) {
        const ids = match[1].replace(/\/\/.*$/gm, '').match(/\d+/g);
        out[plantId] = ids ? ids.map(Number) : [];
        plantId++;
    }
    return out;
}

async function loadFromGithub() {
    const owner = document.getElementById('repoOwner').value.trim();
    const repo = document.getElementById('repoName').value.trim();
    const branch = document.getElementById('branchName').value.trim();

    if (!owner || !repo || !branch) {
        updateStatus('⚠️ Remplissez tous les champs', 'error');
        return;
    }

    const btn = document.getElementById('loadBtn');
    const spinner = document.getElementById('loadingSpinner');
    const btnText = document.getElementById('loadBtnText');
    btn.disabled = true;
    spinner.style.display = 'block';
    btnText.textContent = 'Chargement...';

    const batchSize = 15;
    try {
        // Materials (~90 files)
        updateStatus('📡 Chargement des matériaux...', 'loading');
        const materialFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/materials');
        materials = {};
        for (let i = 0; i < materialFiles.length; i += batchSize) {
            const batch = materialFiles.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(file => {
                const id = parseInt(file.name.replace('.json', ''), 10);
                return fetchRaw(owner, repo, branch, `Core/resources/materials/${file.name}`)
                    .then(data => ({ id, ...data }))
                    .catch(() => null);
            }));
            for (const r of results) {
                if (r) materials[r.id] = { rarity: r.rarity, type: r.type };
            }
            updateStatus(`📡 Matériaux: ${Math.min(i + batchSize, materialFiles.length)}/${materialFiles.length}...`, 'loading');
        }

        // Translations
        updateStatus('📡 Chargement des traductions...', 'loading');
        translations = await fetchRaw(owner, repo, branch, 'Lang/fr/models.json');

        // Category material pools (Core/resources/itemMaterialCategories/<id>.json)
        updateStatus('📡 Chargement des pools de catégories...', 'loading');
        const poolFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/itemMaterialCategories');
        pools = {};
        await Promise.all(poolFiles.map(async file => {
            const cat = parseInt(file.name.replace('.json', ''), 10);
            try {
                const data = await fetchRaw(owner, repo, branch, `Core/resources/itemMaterialCategories/${file.name}`);
                pools[cat] = { 1: data.common || [], 2: data.uncommon || [], 3: data.rare || [] };
            }
            catch { /* category file missing on this branch */ }
        }));

        // Distinct material counts per item rarity
        // (Core/resources/itemUpgradeMaterialCounts/<itemRarity>.json, each holding
        // { levels: [ {common,uncommon,rare} x5 ] }).
        updateStatus('📡 Chargement des comptes de matériaux...', 'loading');
        const distinctFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/itemUpgradeMaterialCounts');
        distinctCounts = {};
        await Promise.all(distinctFiles.map(async file => {
            const rarity = parseInt(file.name.replace('.json', ''), 10);
            try {
                const data = await fetchRaw(owner, repo, branch, `Core/resources/itemUpgradeMaterialCounts/${file.name}`);
                const levels = {};
                (data.levels || []).forEach((lvl, index) => {
                    levels[index + 1] = { 1: lvl.common || 0, 2: lvl.uncommon || 0, 3: lvl.rare || 0 };
                });
                distinctCounts[rarity] = levels;
            }
            catch { /* rarity file missing on this branch */ }
        }));

        // Upgrade totals, expedition loot and plant compost live in TS constants
        // (no JSON export), so fetch + parse them to stay in sync with the source.
        updateStatus('📡 Chargement des tables de constantes...', 'loading');
        try {
            const itemConstTxt = await fetchText(owner, repo, branch, 'Lib/src/constants/ItemConstants.ts');
            UPGRADE_TABLE = parseUpgradeTotals(itemConstTxt);
        }
        catch (err) {
            console.warn('UPGRADE_TABLE not available on this branch:', err);
            UPGRADE_TABLE = {};
        }
        try {
            const expeditionConstTxt = await fetchText(owner, repo, branch, 'Lib/src/constants/ExpeditionConstants.ts');
            const loot = parseExpeditionLoot(expeditionConstTxt);
            for (const [key, ids] of Object.entries(loot)) {
                if (EXPEDITION_LOOT_TABLES[key]) {
                    EXPEDITION_LOOT_TABLES[key].materials = ids;
                }
            }
        }
        catch (err) {
            console.warn('EXPEDITION_LOOT_TABLES not available on this branch:', err);
        }
        try {
            const plantConstTxt = await fetchText(owner, repo, branch, 'Lib/src/constants/PlantConstants.ts');
            const compost = parsePlantCompost(plantConstTxt);
            for (const [id, ids] of Object.entries(compost)) {
                if (PLANT_COMPOST[id]) {
                    PLANT_COMPOST[id].materials = ids;
                }
            }
        }
        catch (err) {
            console.warn('PLANT_COMPOST not available on this branch:', err);
        }

        // Recipes
        updateStatus('📡 Chargement des recettes...', 'loading');
        const recipeFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/cooking/recipes');
        recipes = [];
        for (let i = 0; i < recipeFiles.length; i += batchSize) {
            const batch = recipeFiles.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(file =>
                fetchRaw(owner, repo, branch, `Core/resources/cooking/recipes/${file.name}`)
                    .then(data => ({ id: file.name.replace('.json', ''), ...data }))
                    .catch(() => null)
            ));
            for (const r of results) {
                if (r) recipes.push(r);
            }
            updateStatus(`📡 Recettes: ${Math.min(i + batchSize, recipeFiles.length)}/${recipeFiles.length}...`, 'loading');
        }

        // Weapons / armors (only rarity + type needed for upgrade computation)
        updateStatus('📡 Chargement des armes...', 'loading');
        const weaponFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/weapons');
        weapons = [];
        for (let i = 0; i < weaponFiles.length; i += batchSize) {
            const batch = weaponFiles.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(file =>
                fetchRaw(owner, repo, branch, `Core/resources/weapons/${file.name}`)
                    .then(data => ({ id: parseInt(file.name.replace('.json', ''), 10), rarity: data.rarity, type: data.type, materialCategory: data.materialCategory }))
                    .catch(() => null)
            ));
            for (const r of results) {
                if (r) weapons.push(r);
            }
        }

        updateStatus('📡 Chargement des armures...', 'loading');
        const armorFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/armors');
        armors = [];
        for (let i = 0; i < armorFiles.length; i += batchSize) {
            const batch = armorFiles.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(file =>
                fetchRaw(owner, repo, branch, `Core/resources/armors/${file.name}`)
                    .then(data => ({ id: parseInt(file.name.replace('.json', ''), 10), rarity: data.rarity, type: data.type, materialCategory: data.materialCategory }))
                    .catch(() => null)
            ));
            for (const r of results) {
                if (r) armors.push(r);
            }
        }

        // Aggregate item counts per type (used by Upgrades tab)
        const weaponTypes = {};
        for (const w of weapons) {
            if (w.type) weaponTypes[w.type] = (weaponTypes[w.type] || 0) + 1;
        }
        const armorTypes = {};
        for (const a of armors) {
            if (a.type) armorTypes[a.type] = (armorTypes[a.type] || 0) + 1;
        }
        itemTypeStats = { weapons: weaponTypes, armors: armorTypes };

        // Update plant names from translations
        if (translations.plants) {
            for (const [id, name] of Object.entries(translations.plants)) {
                const plantId = parseInt(id, 10);
                if (PLANT_COMPOST[plantId]) {
                    PLANT_COMPOST[plantId].name = name;
                }
            }
        }

        // Boss loot tables (PVEConstants.ts + monsters dir) — graceful on older branches.
        try {
            BOSS_LOOT_TABLES = await loadBossLootTables(owner, repo, branch, (msg) => updateStatus(msg, 'loading'));
        }
        catch (err) {
            // Older branches (before #3874) don't ship BOSS_LOOT_TABLES.
            console.warn('BOSS_LOOT_TABLES not available on this branch:', err);
            BOSS_LOOT_TABLES = {};
        }

        const totalMats = Object.keys(materials).length;
        const bossCount = Object.keys(BOSS_LOOT_TABLES).length;
        updateStatus(
            `✅ Chargé: ${totalMats} matériaux, ${recipes.length} recettes, ${weapons.length} armes, ${armors.length} armures, ${bossCount} tables de boss`,
            'success'
        );
        buildUsageIndex();
        buildUpgradeIndex();
        buildItemUpgradeIndex();
        renderAll();
    }
    catch (err) {
        updateStatus(`❌ Erreur: ${err.message}`, 'error');
        console.error(err);
    }
    finally {
        btn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = '🚀 Charger depuis GitHub';
    }
}
