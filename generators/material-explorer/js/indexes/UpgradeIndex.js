// ==========================================================================
// Reproduces Core/src/data/MainItem.ts `getUpgradeMaterials` to build the
// reverse mapping materialId -> [{ itemId, category, level, quantity }].
//
// The selection algorithm is pseudo-random: it uses a seed computed from
// the item id and level, combined with the material rarity and a multiplier
// (Knuth's 2654435761). The result is deterministic — identical inputs
// always pick the same material(s).
//
// JS operator precedence: `<<` is lower than `+`, so `seed + i + matRarity << 6`
// is parsed as `(seed + i + matRarity) << 6`. We intentionally keep that to
// match the game logic exactly.
// ==========================================================================

function buildUpgradeIndex() {
    upgradeIndex = {};
    for (const id of Object.keys(materials)) {
        upgradeIndex[id] = [];
    }

    // Group materials by type, sorted by id (matches server DataController ordering)
    const materialsByType = {};
    for (const [id, mat] of Object.entries(materials)) {
        if (!materialsByType[mat.type]) materialsByType[mat.type] = [];
        materialsByType[mat.type].push({ id: parseInt(id, 10), rarity: mat.rarity });
    }
    for (const type in materialsByType) {
        materialsByType[type].sort((a, b) => a.id - b.id);
    }

    const allItems = [
        ...weapons.map(w => ({ ...w, category: 'weapon' })),
        ...armors.map(a => ({ ...a, category: 'armor' }))
    ];

    for (const item of allItems) {
        const upgradeTableForRarity = UPGRADE_TABLE[item.rarity];
        if (!upgradeTableForRarity) continue;

        const typeMaterials = materialsByType[item.type];
        if (!typeMaterials || typeMaterials.length === 0) continue;

        for (let level = 1; level <= 5; level++) {
            const counts = upgradeTableForRarity[level];
            if (!counts) continue;

            const seed = (item.id << 4) | level;

            for (const matRarityStr of Object.keys(counts)) {
                const matRarity = parseInt(matRarityStr, 10);
                const count = counts[matRarity];
                if (count <= 0) continue;

                const filtered = typeMaterials.filter(m => m.rarity === matRarity);
                if (filtered.length === 0) continue;

                for (let i = 0; i < count; i++) {
                    const index = Math.abs(((seed + i + matRarity << 6) * 2654435761) % filtered.length);
                    const selectedMat = filtered[index];
                    if (!upgradeIndex[selectedMat.id]) continue;

                    const existing = upgradeIndex[selectedMat.id].find(
                        e => e.itemId === item.id && e.category === item.category && e.level === level
                    );
                    if (existing) {
                        existing.quantity++;
                    }
                    else {
                        upgradeIndex[selectedMat.id].push({
                            itemId: item.id,
                            category: item.category,
                            level,
                            quantity: 1
                        });
                    }
                }
            }
        }
    }
}
