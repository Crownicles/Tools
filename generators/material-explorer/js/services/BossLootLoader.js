// ==========================================================================
// Parses PVEConstants.ts BOSS_LOOT_TABLES and joins each map entry with
// the list of bosses that spawn there (read from Core/resources/monsters/).
// ==========================================================================

/**
 * Extracts the `BOSS_LOOT_TABLES` block from PVEConstants.ts and returns
 * a flat map { mapId: number[] }.
 *
 * The block uses TS-style object literals nested in a constants namespace,
 * so we locate the opening brace and walk the source while counting braces
 * to find the matching closer, then run a regex over the captured body.
 */
function parseBossLootTablesFromSource(source) {
    const startMarker = 'BOSS_LOOT_TABLES';
    const idx = source.indexOf(startMarker);
    if (idx === -1) return {};

    const openBraceIdx = source.indexOf('{', idx);
    if (openBraceIdx === -1) return {};

    let depth = 0;
    let endIdx = -1;
    for (let i = openBraceIdx; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
        }
    }
    if (endIdx === -1) return {};

    const body = source.slice(openBraceIdx + 1, endIdx);
    const result = {};
    const entryRegex = /(\d{3,5})\s*:\s*\[([\s\S]*?)\]/g;
    let match;
    while ((match = entryRegex.exec(body)) !== null) {
        const mapId = parseInt(match[1], 10);
        const idList = match[2]
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => parseInt(s, 10))
            .filter(n => !Number.isNaN(n));
        result[mapId] = idList;
    }
    return result;
}

/**
 * Loads BOSS_LOOT_TABLES from the repo, then enriches each map entry with
 * the list of bosses that live on that map (derived from translations.pveMapsStory).
 *
 * @returns {Promise<Record<number, {name, bosses, island, materials}>>}
 */
async function loadBossLootTables(owner, repo, branch, statusUpdater) {
    statusUpdater?.('Chargement de PVEConstants.ts...');
    const pveSource = await fetchText(owner, repo, branch, 'Lib/src/constants/PVEConstants.ts');
    const rawTables = parseBossLootTablesFromSource(pveSource);

    const result = {};
    for (const [mapIdStr, materials] of Object.entries(rawTables)) {
        const mapId = parseInt(mapIdStr, 10);
        const mapName = translations?.map_locations?.[mapId]?.name || `Map #${mapId}`;
        const monsterKeys = translations?.pveMapsStory?.[mapId]
            ? Object.keys(translations.pveMapsStory[mapId])
            : [];
        const bossNames = monsterKeys
            .map(key => translations?.monsters?.[key]?.name || key)
            .join(', ') || '???';
        const island = Math.floor((mapId - 1000) / 100) + 1;
        result[mapId] = {
            name: mapName,
            bosses: bossNames,
            island,
            materials
        };
    }
    return result;
}
