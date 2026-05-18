// ==========================================================================
// Upgrades tab — groups materials by type and shows which items each one
// upgrades, sourced from the upgradeIndex.
// ==========================================================================

function renderUpgradesTab() {
    const container = document.getElementById('upgradesContent');
    const stats = itemTypeStats || { weapons: {}, armors: {} };

    const materialsByType = {};
    for (const [id, mat] of Object.entries(materials)) {
        if (!materialsByType[mat.type]) materialsByType[mat.type] = [];
        materialsByType[mat.type].push({ id: parseInt(id, 10), ...mat, name: getMaterialName(id) });
    }
    for (const type in materialsByType) {
        materialsByType[type].sort((a, b) => a.rarity - b.rarity || a.id - b.id);
    }

    let html = '';
    const typeOrder = Object.keys(MATERIAL_TYPE_LABEL).sort();

    for (const type of typeOrder) {
        const mats = materialsByType[type];
        if (!mats || mats.length === 0) continue;

        const weaponCount = stats.weapons[type] || 0;
        const armorCount = stats.armors[type] || 0;
        const totalItems = weaponCount + armorCount;

        html += `
        <div style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);padding:18px;margin-bottom:16px;box-shadow:0 2px 8px var(--shadow)">
            <h4 style="margin-bottom:12px">
                ${MATERIAL_TYPE_EMOJI[type] || ''} ${MATERIAL_TYPE_LABEL[type] || type}
                <span style="font-weight:400;color:var(--text-secondary);font-size:0.9rem">
                    — ${mats.length} matériaux | Utilisé par : 🗡️ ${weaponCount} armes, 🛡️ ${armorCount} armures (${totalItems} items)
                </span>
            </h4>
            <table class="source-table" style="margin-top:8px">
                <thead><tr>
                    <th>#</th>
                    <th>Nom</th>
                    <th>Rareté</th>
                    <th>Recettes</th>
                    <th>Sources</th>
                    <th>Items upgradés</th>
                </tr></thead>
                <tbody>
                ${mats.map(mat => {
                    const usage = usageIndex[mat.id] || { usedInRecipes: [], producedByRecipes: [], compostFrom: [], bossLootFrom: [], expeditionLootFrom: [] };
                    const upgrades = upgradeIndex[mat.id] || [];
                    const recipeCount = usage.usedInRecipes.length;
                    const unused = isUnused(mat.id);
                    const sources = [
                        ...usage.compostFrom.map(c => `🪴 ${c.plantName}`),
                        ...usage.bossLootFrom.map(b => `⚔️ ${b.bosses} (${b.mapName})`),
                        ...usage.expeditionLootFrom.map(e => `${e.locationEmoji} ${e.locationName}`),
                        ...usage.producedByRecipes.map(r => `📖 ${getRecipeName(r.recipeId)}`)
                    ];

                    let upgradeHtml = '';
                    if (upgrades.length > 0) {
                        const wCount = upgrades.filter(u => u.category === 'weapon').length;
                        const aCount = upgrades.filter(u => u.category === 'armor').length;
                        const parts = [];
                        if (wCount > 0) parts.push(`🗡️ ${wCount} arme(s)`);
                        if (aCount > 0) parts.push(`🛡️ ${aCount} armure(s)`);
                        upgradeHtml = `<details><summary style="cursor:pointer">${parts.join(', ')}</summary>
                            <ul style="margin:4px 0 0 8px;list-style:none;padding:0;font-size:0.82rem">
                            ${upgrades.slice(0, 20).map(u =>
                                `<li>${u.category === 'weapon' ? '🗡️' : '🛡️'} ${getItemName(u.itemId, u.category)} <span style="color:var(--text-secondary)">(niv.${u.level}, ×${u.quantity})</span></li>`
                            ).join('')}
                            ${upgrades.length > 20 ? `<li style="color:var(--text-secondary);font-style:italic">... et ${upgrades.length - 20} autre(s)</li>` : ''}
                            </ul></details>`;
                    }
                    else {
                        upgradeHtml = '<span style="color:var(--text-secondary)">—</span>';
                    }

                    const rowStyle = unused ? 'background: #fef2f2 !important;' : '';

                    return `<tr style="${rowStyle}">
                        <td>${mat.id} ${unused ? '<span title="Aucune utilisation" style="color:#ef4444">⚠️</span>' : ''}</td>
                        <td><strong>${mat.name}</strong></td>
                        <td><span class="badge ${MATERIAL_RARITY_CSS[mat.rarity]}">${MATERIAL_RARITY_NAMES[mat.rarity]}</span></td>
                        <td>${recipeCount > 0 ? `${recipeCount} recette(s)` : '<span style="color:var(--text-secondary)">—</span>'}</td>
                        <td>${sources.length > 0 ? sources.join(', ') : '<span style="color:var(--text-secondary)">—</span>'}</td>
                        <td>${upgradeHtml}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>`;
    }

    container.innerHTML = html;
}
