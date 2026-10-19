// ==========================================================================
// Boss Loot tab — shows each map's monsters and their individual drop pools.
// ==========================================================================

function renderBossLootTab() {
    const container = document.getElementById('bossLootContent');
    let html = '';

    const maps = Object.entries(BOSS_LOOT_TABLES).sort(([left], [right]) => Number(left) - Number(right));
    for (const [, entry] of maps) {
        const meta = ISLAND_META[entry.island] || { emoji: '🗺️', name: `Île ${entry.island}` };
        const monstersHtml = entry.monsters.map(monster => {
            let totalWeight = 0;
            const matEntries = monster.materials.map(matId => {
                const info = getMaterialInfo(matId);
                if (!info) return null;
                const weight = RARITY_WEIGHTS[info.rarity] || 0;
                totalWeight += weight;
                return { info, weight };
            }).filter(Boolean);
            const materialsHtml = matEntries.map(({ info, weight }) => {
                const pct = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : '?';
                return `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-tertiary);border-radius:8px;">
                        <span class="type-emoji">${info.typeEmoji}</span>
                        <strong>${info.name}</strong>
                        <span class="badge ${info.rarityCss}" style="font-size:0.75rem">${info.rarityName}</span>
                        <span style="color:var(--text-secondary);font-size:0.85rem;margin-left:auto">${pct}%</span>
                    </div>`;
            }).join('');
            return `
                <div style="margin-bottom:12px;">
                    <strong style="display:block;margin-bottom:8px;">${monster.name}</strong>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:8px;">
                        ${materialsHtml || '<span style="color:var(--text-secondary)">Aucun matériau configuré</span>'}
                    </div>
                </div>`;
        }).join('');

        html += `
            <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 2px 8px var(--shadow);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <span style="font-size:1.3rem">${meta.emoji}</span>
                    <div>
                        <strong style="font-size:1.1rem;">${entry.name}</strong>
                        <span style="color:var(--text-secondary);font-size:0.85rem;margin-left:8px;">${meta.name}</span>
                    </div>
                </div>
                ${monstersHtml}
            </div>`;
    }

    container.innerHTML = html;
}
