// ==========================================================================
// Reproduces Core/src/data/MainItem.ts `getUpgradeMaterials` to build the
// reverse mapping materialId -> [{ itemId, category, level, quantity }].
//
// Each item draws its upgrade materials from the pool of its `materialCategory`
// (Core/resources/itemMaterialCategories/<id>.json), split by material rarity.
// For every (item rarity, level, material rarity) bucket we read the total
// quantity (UPGRADE_TABLE) and the number of distinct materials (DISTINCT_TABLE),
// then pick that many distinct ids from the sub-pool with a deterministic
// sliding window (`pickDistinct`) seeded by the item id — matching
// `pickDistinctMaterials` in Lib/src/constants/ItemMaterialCategoryConstants.ts.
// ==========================================================================

// Mirrors RandomUtils.deterministicShuffle (Math.imul-based hash + Fisher-Yates).
function upgradeHash32(seed) {
    let x = seed | 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x = x ^ (x >>> 16);
    return x >>> 0;
}

function permutePool(pool, seed) {
    const out = pool.slice();
    let st = upgradeHash32(seed) || 1;
    for (let i = out.length - 1; i > 0; i--) {
        st = upgradeHash32(st + i);
        const j = st % (i + 1);
        const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
}

// Mirrors pickDistinctMaterials: shuffle seeded by itemId*31 + matRarity, then
// a 1-slot sliding window over the levels.
function pickDistinct(subPool, itemId, matRarity, level, distinctCount) {
    if (distinctCount <= 0 || subPool.length === 0) return [];
    const k = Math.min(distinctCount, subPool.length);
    const perm = permutePool(subPool, itemId * 31 + matRarity);
    const start = (level - 1) % perm.length;
    const out = [];
    for (let i = 0; i < k; i++) out.push(perm[(start + i) % perm.length]);
    return out;
}

function buildUpgradeIndex() {
    upgradeIndex = {};
    for (const id of Object.keys(materials)) {
        upgradeIndex[id] = [];
    }

    const allItems = [
        ...weapons.map(w => ({ ...w, category: 'weapon' })),
        ...armors.map(a => ({ ...a, category: 'armor' }))
    ];

    for (const item of allItems) {
        const totalsForRarity = UPGRADE_TABLE[item.rarity];
        const distinctsForRarity = DISTINCT_TABLE[item.rarity];
        const pool = pools[item.materialCategory];
        if (!totalsForRarity || !distinctsForRarity || !pool) continue;

        for (let level = 1; level <= 5; level++) {
            const totals = totalsForRarity[level];
            const distincts = distinctsForRarity[level];
            if (!totals || !distincts) continue;

            for (const matRarity of [1, 2, 3]) {
                const totalQty = totals[matRarity] || 0;
                if (totalQty <= 0) continue;

                const subPool = pool[matRarity] || [];
                const distinctCount = Math.min(distincts[matRarity] || 0, subPool.length, totalQty);
                if (distinctCount <= 0) continue;

                const picked = pickDistinct(subPool, item.id, matRarity, level, distinctCount);
                const base = Math.floor(totalQty / picked.length);
                const rem = totalQty % picked.length;

                for (let i = 0; i < picked.length; i++) {
                    const matId = picked[i];
                    const quantity = base + (i < rem ? 1 : 0);
                    if (!upgradeIndex[matId]) continue;

                    const existing = upgradeIndex[matId].find(
                        e => e.itemId === item.id && e.category === item.category && e.level === level
                    );
                    if (existing) {
                        existing.quantity += quantity;
                    }
                    else {
                        upgradeIndex[matId].push({
                            itemId: item.id,
                            category: item.category,
                            level,
                            quantity
                        });
                    }
                }
            }
        }
    }
}
