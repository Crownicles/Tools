// ==========================================================================
// Reverse of UpgradeIndex: maps an item (category + id) to the materials
// needed for each upgrade level.
//
// Shape:
//   itemUpgradeIndex[category][itemId] = {
//       1: [{ materialId, quantity }, ...],
//       2: [...],
//       ...
//       5: [...]
//   }
//
// Built from the existing `upgradeIndex` (materialId → [{itemId, category,
// level, quantity}]) after `buildUpgradeIndex` has populated it.
// ==========================================================================

function buildItemUpgradeIndex() {
    itemUpgradeIndex = { weapon: {}, armor: {} };

    for (const [materialIdStr, usages] of Object.entries(upgradeIndex)) {
        const materialId = parseInt(materialIdStr, 10);
        for (const u of usages) {
            const cat = u.category;
            if (!itemUpgradeIndex[cat][u.itemId]) {
                itemUpgradeIndex[cat][u.itemId] = {};
            }
            const byLevel = itemUpgradeIndex[cat][u.itemId];
            if (!byLevel[u.level]) {
                byLevel[u.level] = [];
            }
            byLevel[u.level].push({ materialId, quantity: u.quantity });
        }
    }

    // Sort each level's materials by rarity then id for stable display.
    for (const cat of ['weapon', 'armor']) {
        for (const itemId in itemUpgradeIndex[cat]) {
            const byLevel = itemUpgradeIndex[cat][itemId];
            for (const lvl in byLevel) {
                byLevel[lvl].sort((a, b) => {
                    const ra = materials[a.materialId]?.rarity ?? 0;
                    const rb = materials[b.materialId]?.rarity ?? 0;
                    return ra - rb || a.materialId - b.materialId;
                });
            }
        }
    }
}
