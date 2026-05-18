// ==========================================================================
// Orchestrates GitHub data loading: materials, translations, recipes,
// weapons, armors, plant compost names, and boss loot tables.
// ==========================================================================

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
                    .then(data => ({ id: parseInt(file.name.replace('.json', ''), 10), rarity: data.rarity, type: data.type }))
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
                    .then(data => ({ id: parseInt(file.name.replace('.json', ''), 10), rarity: data.rarity, type: data.type }))
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
