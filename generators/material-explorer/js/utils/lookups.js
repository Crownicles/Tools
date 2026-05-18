// ==========================================================================
// Pure lookup helpers that read from `translations`, `materials`,
// `usageIndex`, and `upgradeIndex` to resolve display strings and aggregate
// material info into a single object consumed by render code.
// ==========================================================================

function getMaterialName(id) {
    return translations.materials?.[String(id)] || `Matériau #${id}`;
}

function getRecipeName(recipeId) {
    return translations.cooking?.recipes?.[recipeId] || recipeId;
}

function getItemName(itemId, category) {
    const key = category === 'weapon' ? 'weapons' : 'armors';
    const label = category === 'weapon' ? 'Arme' : 'Armure';
    return translations[key]?.[String(itemId)] || `${label} #${itemId}`;
}

function getMapName(mapId) {
    const entry = BOSS_LOOT_TABLES[mapId];
    if (entry) return entry.name;
    return translations.mapLocations?.[String(mapId)] || `Map #${mapId}`;
}

function isUnused(id) {
    const usage = usageIndex[id] || { usedInRecipes: [], producedByRecipes: [], compostFrom: [], bossLootFrom: [], expeditionLootFrom: [] };
    const upgrades = upgradeIndex[id] || [];
    return usage.usedInRecipes.length === 0
        && usage.producedByRecipes.length === 0
        && usage.compostFrom.length === 0
        && usage.bossLootFrom.length === 0
        && usage.expeditionLootFrom.length === 0
        && upgrades.length === 0;
}

function getMaterialInfo(id) {
    const m = materials[id];
    if (!m) return null;
    return {
        id,
        name: getMaterialName(id),
        type: m.type,
        rarity: m.rarity,
        typeEmoji: MATERIAL_TYPE_EMOJI[m.type] || '❓',
        typeLabel: MATERIAL_TYPE_LABEL[m.type] || m.type,
        rarityName: MATERIAL_RARITY_NAMES[m.rarity] || '?',
        rarityCss: MATERIAL_RARITY_CSS[m.rarity] || '',
        usage: usageIndex[id] || { usedInRecipes: [], producedByRecipes: [], compostFrom: [], bossLootFrom: [], expeditionLootFrom: [] },
        upgrades: upgradeIndex[id] || []
    };
}
