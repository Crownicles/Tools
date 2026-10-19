// ==========================================================================
// Loads each monster's material loot and associates it with the PVE maps
// listed by that monster in Core/resources/monsters/<monster>.json.
// ==========================================================================

/**
 * Loads monster loot and groups it by the maps in each monster resource.
 *
 * @returns {Promise<Record<number, {name, island, monsters: Array<{id, name, materials}>}>>}
 */
async function loadBossLootTables(owner, repo, branch, statusUpdater) {
    statusUpdater?.('📡 Chargement des monstres et de leur butin...');
    const monsterFiles = await fetchDirListing(owner, repo, branch, 'Core/resources/monsters');
    const monsters = await Promise.all(monsterFiles.map(async file => {
        try {
            const id = file.name.replace('.json', '');
            const data = await fetchRaw(owner, repo, branch, `Core/resources/monsters/${file.name}`);
            return {
                id,
                maps: Array.isArray(data.maps) ? data.maps : [],
                materials: Array.isArray(data.materialLoot) ? data.materialLoot : [],
                name: translations.monsters?.[id]?.name || id
            };
        }
        catch {
            return null;
        }
    }));
    const result = {};
    for (const monster of monsters) {
        if (!monster || monster.materials.length === 0) {
            continue;
        }
        for (const mapId of monster.maps) {
            const key = String(mapId);
            const map = result[key] || (result[key] = {
                name: translations.map_locations?.[key]?.name || `Map #${key}`,
                island: Math.floor((mapId - 1000) / 100) + 1,
                monsters: []
            });
            map.monsters.push({
                id: monster.id,
                name: monster.name,
                materials: monster.materials
            });
        }
    }
    for (const map of Object.values(result)) {
        map.monsters.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    return result;
}
