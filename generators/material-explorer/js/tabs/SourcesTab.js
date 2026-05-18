// ==========================================================================
// Sources tab — flat table of all materials and their acquisition channels.
// ==========================================================================

function renderSourcesTable() {
    const tbody = document.getElementById('sourceTableBody');
    const sortedIds = Object.keys(materials).map(Number).sort((a, b) => a - b);

    tbody.innerHTML = sortedIds.map(id => {
        const info = getMaterialInfo(id);
        if (!info) return '';
        const usage = info.usage;

        const compostHtml = usage.compostFrom.length > 0
            ? usage.compostFrom.map(c => `🪴 ${c.plantName}`).join('<br>')
            : '<span style="color:var(--text-secondary)">—</span>';

        const craftHtml = usage.producedByRecipes.length > 0
            ? usage.producedByRecipes.map(r => `📖 ${getRecipeName(r.recipeId)}`).join('<br>')
            : '<span style="color:var(--text-secondary)">—</span>';

        const bossHtml = usage.bossLootFrom.length > 0
            ? usage.bossLootFrom.map(b => `⚔️ ${b.bosses}`).join('<br>')
            : '<span style="color:var(--text-secondary)">—</span>';

        const expedHtml = usage.expeditionLootFrom.length > 0
            ? usage.expeditionLootFrom.map(e => `${e.locationEmoji} ${e.locationName}`).join('<br>')
            : '<span style="color:var(--text-secondary)">—</span>';

        return `<tr>
            <td><span class="type-emoji">${info.typeEmoji}</span> <strong>${info.name}</strong> <span style="color:var(--text-secondary)">#${id}</span></td>
            <td>${info.typeLabel}</td>
            <td><span class="badge ${info.rarityCss}">${info.rarityName}</span></td>
            <td>${compostHtml}</td>
            <td>${craftHtml}</td>
            <td>${bossHtml}</td>
            <td>${expedHtml}</td>
        </tr>`;
    }).join('');
}
