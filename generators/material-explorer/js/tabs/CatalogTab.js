// ==========================================================================
// Catalog tab — searchable, filterable grid of material cards.
// ==========================================================================

function filterMaterials() {
    const search = document.getElementById('materialSearch').value.toLowerCase();
    const grid = document.getElementById('materialsGrid');
    grid.innerHTML = '';

    const sortedIds = Object.keys(materials).map(Number).sort((a, b) => a - b);
    for (const id of sortedIds) {
        const info = getMaterialInfo(id);
        if (!info) continue;

        if (activeTypeFilter && info.type !== activeTypeFilter) continue;
        if (activeRarityFilter && info.rarity !== activeRarityFilter) continue;
        if (showUnusedOnly && !isUnused(id)) continue;
        if (search && !info.name.toLowerCase().includes(search) && !String(id).includes(search)) continue;

        grid.innerHTML += buildMaterialCard(info);
    }
}

function renderMaterialsGrid() {
    filterMaterials();
}

function buildMaterialCard(info) {
    const usage = info.usage;
    const upgrades = info.upgrades;
    const unused = isUnused(info.id);
    let usageHtml = '';

    if (usage.compostFrom.length > 0) {
        usageHtml += `<div class="usage-section">
            <div class="usage-title">🌿 Obtenu par compostage :</div>
            <ul class="usage-list">${usage.compostFrom.map(c =>
                `<li>🪴 ${c.plantName}</li>`
            ).join('')}</ul></div>`;
    }

    if (usage.bossLootFrom.length > 0) {
        usageHtml += `<div class="usage-section">
            <div class="usage-title">🐉 Droppé par boss PVE :</div>
            <ul class="usage-list">${usage.bossLootFrom.map(b =>
                `<li>⚔️ ${b.bosses} <span style="color:var(--text-secondary);font-size:0.85rem">(${b.mapName})</span></li>`
            ).join('')}</ul></div>`;
    }

    if (usage.expeditionLootFrom.length > 0) {
        usageHtml += `<div class="usage-section">
            <div class="usage-title">🗺️ Trouvé en expédition :</div>
            <ul class="usage-list">${usage.expeditionLootFrom.map(e =>
                `<li>${e.locationEmoji} ${e.locationName}</li>`
            ).join('')}</ul></div>`;
    }

    if (usage.producedByRecipes.length > 0) {
        usageHtml += `<div class="usage-section">
            <div class="usage-title">🍳 Produit par recette :</div>
            <ul class="usage-list">${usage.producedByRecipes.map(r =>
                `<li>📖 ${getRecipeName(r.recipeId)} (×${r.quantity})</li>`
            ).join('')}</ul></div>`;
    }

    if (usage.usedInRecipes.length > 0) {
        usageHtml += `<div class="usage-section">
            <div class="usage-title">📋 Utilisé dans ${usage.usedInRecipes.length} recette(s) :</div>
            <ul class="usage-list">${usage.usedInRecipes.map(r =>
                `<li>${r.outputType === 'potion' ? '🧪' : r.outputType === 'petFood' ? '🍖' : '⚒️'} ${getRecipeName(r.recipeId)} (×${r.quantity})</li>`
            ).join('')}</ul></div>`;
    }

    if (upgrades.length > 0) {
        const weaponUpgrades = upgrades.filter(u => u.category === 'weapon');
        const armorUpgrades = upgrades.filter(u => u.category === 'armor');

        const formatUpgradeList = (list, emoji, maxShow) => {
            const sorted = [...list].sort((a, b) => a.level - b.level || a.itemId - b.itemId);
            const shown = sorted.slice(0, maxShow);
            const remaining = sorted.length - maxShow;
            let html = shown.map(u =>
                `<li>${emoji} ${getItemName(u.itemId, u.category)} <span style="color:var(--text-secondary)">(niv.${u.level}, ×${u.quantity})</span></li>`
            ).join('');
            if (remaining > 0) {
                html += `<li style="color:var(--text-secondary);font-style:italic">... et ${remaining} autre(s)</li>`;
            }
            return html;
        };

        usageHtml += `<div class="usage-section">
            <div class="usage-title">🔨 Upgrade de ${upgrades.length} item(s) :</div>
            <ul class="usage-list">`;
        if (weaponUpgrades.length > 0) usageHtml += formatUpgradeList(weaponUpgrades, '🗡️', 5);
        if (armorUpgrades.length > 0) usageHtml += formatUpgradeList(armorUpgrades, '🛡️', 5);
        usageHtml += `</ul></div>`;
    }

    if (!usageHtml) {
        usageHtml = `<p class="usage-empty" style="color:#ef4444;font-weight:600">⚠️ Aucune utilisation connue</p>`;
    }

    const unusedBorder = unused ? 'border-color: #ef4444; border-width: 2px;' : '';
    const unusedBadge = unused ? '<span class="badge" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca">⚠️ Inutilisé</span>' : '';

    return `
        <div class="material-card" style="${unusedBorder}">
            <div class="material-card-header">
                <div>
                    <span class="type-emoji">${info.typeEmoji}</span>
                    <span class="material-name">${info.name}</span>
                    <span class="material-id">#${info.id}</span>
                </div>
            </div>
            <div class="material-card-body">
                <div class="material-badges">
                    <span class="badge ${info.rarityCss}">${info.rarityName}</span>
                    <span class="badge" style="background:#e0e7ff;color:#4338ca">${info.typeLabel}</span>
                    ${unusedBadge}
                </div>
                ${usageHtml}
            </div>
        </div>
    `;
}
