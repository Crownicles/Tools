// ==========================================================================
// Builds the per-material usage index: which recipes consume or produce
// each material, and which compost / boss / expedition tables include it.
//
// usageIndex[materialId] = {
//   usedInRecipes:     [{ recipeId, quantity, outputType }],
//   producedByRecipes: [{ recipeId, quantity }],
//   compostFrom:       [{ plantId, plantName }],
//   bossLootFrom:      [{ mapId, mapName, bosses }],
//   expeditionLootFrom:[{ locationType, locationName, locationEmoji }]
// }
// ==========================================================================

function buildUsageIndex() {
    usageIndex = {};
    for (const id of Object.keys(materials)) {
        usageIndex[id] = { usedInRecipes: [], producedByRecipes: [], compostFrom: [], bossLootFrom: [], expeditionLootFrom: [] };
    }

    // Recipes: consumed as ingredient + produced as output
    for (const recipe of recipes) {
        if (recipe.materials) {
            for (const mat of recipe.materials) {
                if (usageIndex[mat.materialId]) {
                    usageIndex[mat.materialId].usedInRecipes.push({
                        recipeId: recipe.id,
                        quantity: mat.quantity,
                        outputType: recipe.outputType
                    });
                }
            }
        }
        if (recipe.outputType === 'material' && recipe.outputMaterialId) {
            if (usageIndex[recipe.outputMaterialId]) {
                usageIndex[recipe.outputMaterialId].producedByRecipes.push({
                    recipeId: recipe.id,
                    quantity: recipe.outputMaterialQuantity || 1
                });
            }
        }
    }

    // Compost
    for (const [plantId, plantInfo] of Object.entries(PLANT_COMPOST)) {
        for (const matId of plantInfo.materials) {
            if (usageIndex[matId]) {
                usageIndex[matId].compostFrom.push({
                    plantId: parseInt(plantId, 10),
                    plantName: plantInfo.name
                });
            }
        }
    }

    // Boss loot
    for (const [mapId, entry] of Object.entries(BOSS_LOOT_TABLES)) {
        for (const matId of entry.materials) {
            if (usageIndex[matId]) {
                usageIndex[matId].bossLootFrom.push({
                    mapId: parseInt(mapId, 10),
                    mapName: entry.name,
                    bosses: entry.bosses
                });
            }
        }
    }

    // Expedition loot
    for (const [locationType, entry] of Object.entries(EXPEDITION_LOOT_TABLES)) {
        for (const matId of entry.materials) {
            if (usageIndex[matId]) {
                usageIndex[matId].expeditionLootFrom.push({
                    locationType,
                    locationName: entry.name,
                    locationEmoji: entry.emoji
                });
            }
        }
    }
}
