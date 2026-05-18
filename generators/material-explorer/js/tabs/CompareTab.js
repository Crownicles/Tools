// ==========================================================================
// Compare tab — side-by-side comparison of selected materials.
// ==========================================================================

function renderCompareSelect() {
    const select = document.getElementById('compareSelect');
    select.innerHTML = '';
    const sortedIds = Object.keys(materials).map(Number).sort((a, b) => a - b);
    for (const id of sortedIds) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `#${id} - ${getMaterialName(id)}`;
        select.appendChild(option);
    }
}

function renderCompare() {
    const select = document.getElementById('compareSelect');
    const selectedIds = [...select.selectedOptions].map(o => parseInt(o.value, 10));
    const grid = document.getElementById('compareGrid');

    if (selectedIds.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary)">Sélectionnez des matériaux à comparer.</p>';
        return;
    }

    const infos = selectedIds.map(id => getMaterialInfo(id)).filter(Boolean);
    const maxUsed = Math.max(1, ...infos.map(i => i.usage.usedInRecipes.length));
    const maxProduced = Math.max(1, ...infos.map(i => i.usage.producedByRecipes.length));
    const maxCompost = Math.max(1, ...infos.map(i => i.usage.compostFrom.length));

    grid.innerHTML = infos.map(info => {
        const usedPct = (info.usage.usedInRecipes.length / maxUsed * 100).toFixed(0);
        const producedPct = (info.usage.producedByRecipes.length / maxProduced * 100).toFixed(0);
        const compostPct = (info.usage.compostFrom.length / maxCompost * 100).toFixed(0);

        const recipeDetails = info.usage.usedInRecipes.map(r =>
            `<li style="font-size:0.8rem">${r.outputType === 'potion' ? '🧪' : r.outputType === 'petFood' ? '🍖' : '⚒️'} ${getRecipeName(r.recipeId)} (×${r.quantity})</li>`
        ).join('');
        const producedDetails = info.usage.producedByRecipes.map(r =>
            `<li style="font-size:0.8rem">📖 ${getRecipeName(r.recipeId)} (×${r.quantity})</li>`
        ).join('');
        const compostDetails = info.usage.compostFrom.map(c =>
            `<li style="font-size:0.8rem">🪴 ${c.plantName}</li>`
        ).join('');

        return `
            <div class="compare-card">
                <div class="compare-card-title">
                    ${info.typeEmoji} ${info.name}
                    <span class="badge ${info.rarityCss}" style="margin-left:8px">${info.rarityName}</span>
                </div>

                <div class="compare-stat">
                    <span class="compare-stat-label">📋 Utilisé dans recettes</span>
                    <span>${info.usage.usedInRecipes.length}</span>
                </div>
                <div class="compare-stat-bar"><div class="compare-stat-fill" style="width:${usedPct}%;background:var(--info)"></div></div>
                ${recipeDetails ? `<ul class="usage-list" style="margin:4px 0 8px 8px">${recipeDetails}</ul>` : ''}

                <div class="compare-stat">
                    <span class="compare-stat-label">🍳 Produit par recette</span>
                    <span>${info.usage.producedByRecipes.length}</span>
                </div>
                <div class="compare-stat-bar"><div class="compare-stat-fill" style="width:${producedPct}%;background:var(--success)"></div></div>
                ${producedDetails ? `<ul class="usage-list" style="margin:4px 0 8px 8px">${producedDetails}</ul>` : ''}

                <div class="compare-stat">
                    <span class="compare-stat-label">🌿 Obtenu par compostage</span>
                    <span>${info.usage.compostFrom.length}</span>
                </div>
                <div class="compare-stat-bar"><div class="compare-stat-fill" style="width:${compostPct}%;background:var(--warning)"></div></div>
                ${compostDetails ? `<ul class="usage-list" style="margin:4px 0 8px 8px">${compostDetails}</ul>` : ''}
            </div>
        `;
    }).join('');
}
