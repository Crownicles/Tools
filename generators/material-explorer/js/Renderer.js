// ==========================================================================
// Top-level renderer & shared chrome (stats, filters, tab switcher).
// ==========================================================================

function renderAll() {
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('noData').classList.add('hidden');
    renderStats();
    renderFilters();
    renderMaterialsGrid();
    renderCompareSelect();
    renderSourcesTable();
    renderUpgradesTab();
    renderBossLootTab();
    renderExpedLootTab();
    renderItemUpgradeTab();
}

function renderStats() {
    const matCount = Object.keys(materials).length;
    const types = new Set(Object.values(materials).map(m => m.type));
    const recipeCount = recipes.length;
    const craftRecipes = recipes.filter(r => r.outputType === 'material').length;
    const usedInRecipeCount = Object.values(usageIndex).filter(u => u.usedInRecipes.length > 0).length;
    const usedInUpgradeCount = Object.keys(upgradeIndex).filter(id => upgradeIndex[id].length > 0).length;
    const unusedCount = Object.keys(materials).filter(id => isUnused(id)).length;

    document.getElementById('statsBar').innerHTML = `
        <div class="stat-card"><div class="stat-value">${matCount}</div><div class="stat-label">Matériaux</div></div>
        <div class="stat-card"><div class="stat-value">${types.size}</div><div class="stat-label">Types</div></div>
        <div class="stat-card"><div class="stat-value">${recipeCount}</div><div class="stat-label">Recettes</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#047857">⚒️ ${craftRecipes}</div><div class="stat-label">Crafts matériaux</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--info)">${usedInRecipeCount}</div><div class="stat-label">Utilisés en recette</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--accent-secondary)">${usedInUpgradeCount}</div><div class="stat-label">Utilisés en upgrade</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--accent-primary)">${unusedCount}</div><div class="stat-label">Sans utilisation</div></div>
    `;
}

function renderFilters() {
    const typeContainer = document.getElementById('typeFilters');
    typeContainer.innerHTML = '';
    const types = [...new Set(Object.values(materials).map(m => m.type))].sort();
    for (const type of types) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.textContent = `${MATERIAL_TYPE_EMOJI[type] || ''} ${MATERIAL_TYPE_LABEL[type] || type}`;
        chip.onclick = () => {
            if (activeTypeFilter === type) {
                activeTypeFilter = null;
                chip.classList.remove('active');
            }
            else {
                activeTypeFilter = type;
                typeContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
            filterMaterials();
        };
        typeContainer.appendChild(chip);
    }

    const rarityContainer = document.getElementById('rarityFilters');
    rarityContainer.innerHTML = '';
    for (const [rarity, name] of Object.entries(MATERIAL_RARITY_NAMES)) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        chip.textContent = name;
        chip.style.borderColor = MATERIAL_RARITY_COLORS[rarity];
        chip.onclick = () => {
            const r = parseInt(rarity, 10);
            if (activeRarityFilter === r) {
                activeRarityFilter = null;
                chip.classList.remove('active');
            }
            else {
                activeRarityFilter = r;
                rarityContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
            filterMaterials();
        };
        rarityContainer.appendChild(chip);
    }

    const unusedChip = document.createElement('span');
    unusedChip.className = 'filter-chip';
    unusedChip.id = 'unusedFilterChip';
    unusedChip.textContent = '⚠️ Sans utilisation';
    unusedChip.style.borderColor = '#ef4444';
    unusedChip.onclick = () => {
        showUnusedOnly = !showUnusedOnly;
        unusedChip.classList.toggle('active');
        filterMaterials();
    };
    rarityContainer.appendChild(unusedChip);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    const labels = { catalog: 'Catalogue', compare: 'Comparer', sources: 'Sources', upgrades: 'Upgrades', bossloot: 'Boss Loot', expedloot: 'Expedition Loot', itemupgrade: 'Coût Item' };
    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.textContent.toLowerCase().includes(labels[tabName]?.toLowerCase() || tabName)) {
            b.classList.add('active');
        }
    });
}
