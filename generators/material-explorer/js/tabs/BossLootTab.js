// ==========================================================================
// Boss Loot tab — for each map ID in BOSS_LOOT_TABLES, shows the bosses
// living there and their drop table weighted by material rarity.
// ==========================================================================

function renderBossLootTab() {
    const container = document.getElementById('bossLootContent');
    let html = '';

    for (const [mapId, entry] of Object.entries(BOSS_LOOT_TABLES)) {
        const meta = ISLAND_META[entry.island] || { emoji: '🗺️', name: `Île ${entry.island}` };
        const islandEmoji = meta.emoji;
        const islandName = meta.name;

        let materialsHtml = '';
        let totalWeight = 0;
        const matEntries = [];

        for (const matId of entry.materials) {
            const info = getMaterialInfo(matId);
            if (!info) continue;
            const weight = RARITY_WEIGHTS[info.rarity] || 0;
            totalWeight += weight;
            matEntries.push({ info, weight });
        }

        for (const matEntry of matEntries) {
            const pct = totalWeight > 0 ? ((matEntry.weight / totalWeight) * 100).toFixed(1) : '?';
            materialsHtml += `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-tertiary);border-radius:8px;">
                    <span class="type-emoji">${matEntry.info.typeEmoji}</span>
                    <strong>${matEntry.info.name}</strong>
                    <span class="badge ${matEntry.info.rarityCss}" style="font-size:0.75rem">${matEntry.info.rarityName}</span>
                    <span style="color:var(--text-secondary);font-size:0.85rem;margin-left:auto">${pct}%</span>
                </div>`;
        }

        html += `
            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px var(--shadow);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <span style="font-size:1.3rem">${islandEmoji}</span>
                    <div>
                        <strong style="font-size:1.1rem;">⚔️ ${entry.bosses}</strong>
                        <span style="color:var(--text-secondary);font-size:0.85rem;margin-left:8px;">${entry.name} — ${islandName}</span>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:8px;">
                    ${materialsHtml}
                </div>
            </div>`;
    }

    container.innerHTML = html;
}
