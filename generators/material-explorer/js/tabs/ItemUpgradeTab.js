// ==========================================================================
// Item Upgrade Cost tab — search a weapon or armor and view the material
// cost of each upgrade level (1 → 5).
// ==========================================================================

let itemUpgradeSearchText = '';
let itemUpgradeCategoryFilter = 'all'; // 'all' | 'weapon' | 'armor'
let itemUpgradeSelected = null;        // { category, id }

function renderItemUpgradeTab() {
    const root = document.getElementById('itemUpgradeContent');
    if (!root) return;

    root.innerHTML = `
        <div class="filters" style="margin-bottom:12px">
            <input type="text" id="itemUpgradeSearch" placeholder="🔍 Rechercher une arme ou armure..." value="${itemUpgradeSearchText.replace(/"/g, '&quot;')}">
            <div id="itemUpgradeCategoryFilters" style="display:flex;gap:8px;flex-wrap:wrap"></div>
        </div>
        <div style="display:grid;grid-template-columns:minmax(220px, 320px) 1fr;gap:16px;align-items:flex-start">
            <div id="itemUpgradeList" style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);max-height:70vh;overflow-y:auto"></div>
            <div id="itemUpgradeDetail" style="background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);padding:18px;min-height:200px"></div>
        </div>
    `;

    // Category filter chips
    const catContainer = document.getElementById('itemUpgradeCategoryFilters');
    const cats = [
        { key: 'all', label: 'Tous' },
        { key: 'weapon', label: '🗡️ Armes' },
        { key: 'armor', label: '🛡️ Armures' }
    ];
    for (const c of cats) {
        const chip = document.createElement('span');
        chip.className = 'filter-chip' + (itemUpgradeCategoryFilter === c.key ? ' active' : '');
        chip.textContent = c.label;
        chip.onclick = () => {
            itemUpgradeCategoryFilter = c.key;
            renderItemUpgradeList();
            catContainer.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
            chip.classList.add('active');
        };
        catContainer.appendChild(chip);
    }

    const searchInput = document.getElementById('itemUpgradeSearch');
    searchInput.addEventListener('input', e => {
        itemUpgradeSearchText = e.target.value;
        renderItemUpgradeList();
    });

    renderItemUpgradeList();
    renderItemUpgradeDetail();
}

function renderItemUpgradeList() {
    const list = document.getElementById('itemUpgradeList');
    if (!list) return;

    const lowerSearch = itemUpgradeSearchText.toLowerCase().trim();
    const candidates = [];

    if (itemUpgradeCategoryFilter === 'all' || itemUpgradeCategoryFilter === 'weapon') {
        for (const w of weapons) {
            candidates.push({ category: 'weapon', id: w.id, rarity: w.rarity, type: w.type, name: getItemName(w.id, 'weapon') });
        }
    }
    if (itemUpgradeCategoryFilter === 'all' || itemUpgradeCategoryFilter === 'armor') {
        for (const a of armors) {
            candidates.push({ category: 'armor', id: a.id, rarity: a.rarity, type: a.type, name: getItemName(a.id, 'armor') });
        }
    }

    const filtered = lowerSearch
        ? candidates.filter(c => c.name.toLowerCase().includes(lowerSearch) || String(c.id).includes(lowerSearch))
        : candidates;

    filtered.sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));

    if (filtered.length === 0) {
        list.innerHTML = '<div style="padding:16px;color:var(--text-secondary);text-align:center">Aucun item</div>';
        return;
    }

    list.innerHTML = filtered.map(c => {
        const isSelected = itemUpgradeSelected
            && itemUpgradeSelected.category === c.category
            && itemUpgradeSelected.id === c.id;
        const bg = isSelected ? 'background:var(--accent-primary);color:#fff;' : '';
        const subColor = isSelected ? '#fff' : 'var(--text-secondary)';
        const icon = c.category === 'weapon' ? '🗡️' : '🛡️';
        return `<div class="item-upgrade-row" data-cat="${c.category}" data-id="${c.id}"
            style="padding:8px 12px;border-bottom:1px solid var(--border-color);cursor:pointer;${bg}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <span><strong>${icon} ${c.name}</strong></span>
                <span style="font-size:0.75rem;color:${subColor}">#${c.id}</span>
            </div>
            <div style="font-size:0.78rem;color:${subColor}">${ITEM_RARITY_NAMES[c.rarity] || '?'} · type ${c.type}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.item-upgrade-row').forEach(row => {
        row.onclick = () => {
            itemUpgradeSelected = {
                category: row.dataset.cat,
                id: parseInt(row.dataset.id, 10)
            };
            renderItemUpgradeList();
            renderItemUpgradeDetail();
        };
    });
}

function renderItemUpgradeDetail() {
    const detail = document.getElementById('itemUpgradeDetail');
    if (!detail) return;

    if (!itemUpgradeSelected) {
        detail.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:24px">Sélectionnez un item à gauche pour voir le coût de ses upgrades.</div>';
        return;
    }

    const { category, id } = itemUpgradeSelected;
    const itemList = category === 'weapon' ? weapons : armors;
    const item = itemList.find(i => i.id === id);
    if (!item) {
        detail.innerHTML = '<div style="color:var(--accent-primary)">Item introuvable.</div>';
        return;
    }

    const name = getItemName(id, category);
    const icon = category === 'weapon' ? '🗡️' : '🛡️';
    const byLevel = itemUpgradeIndex?.[category]?.[id] || {};

    // Aggregate totals across all levels.
    const totals = {};
    for (const lvl of [1, 2, 3, 4, 5]) {
        const mats = byLevel[lvl] || [];
        for (const m of mats) {
            totals[m.materialId] = (totals[m.materialId] || 0) + m.quantity;
        }
    }

    const renderMatRow = (m) => {
        const meta = materials[m.materialId];
        if (!meta) {
            return `<li>#${m.materialId} × ${m.quantity}</li>`;
        }
        const matName = getMaterialName(m.materialId);
        const rarityName = MATERIAL_RARITY_NAMES[meta.rarity] || '?';
        const rarityCss = MATERIAL_RARITY_CSS[meta.rarity] || '';
        const typeEmoji = MATERIAL_TYPE_EMOJI[meta.type] || '❓';
        const typeLabel = MATERIAL_TYPE_LABEL[meta.type] || meta.type;
        return `<li style="margin:2px 0">
            <strong>×${m.quantity}</strong> ${typeEmoji} ${matName}
            <span class="badge ${rarityCss}" style="font-size:0.7rem;margin-left:4px">${rarityName}</span>
            <span style="color:var(--text-secondary);font-size:0.78rem"> · ${typeLabel}</span>
        </li>`;
    };

    const levelsHtml = [1, 2, 3, 4, 5].map(lvl => {
        const mats = byLevel[lvl] || [];
        if (mats.length === 0) {
            return `<div style="padding:8px 0;border-bottom:1px dashed var(--border-color)">
                <strong>Niveau ${lvl}</strong>
                <div style="color:var(--text-secondary);font-size:0.85rem">Pas de matériaux requis</div>
            </div>`;
        }
        return `<div style="padding:8px 0;border-bottom:1px dashed var(--border-color)">
            <strong>Niveau ${lvl}</strong>
            <ul style="margin:4px 0 0 16px;padding:0;list-style:disc">${mats.map(renderMatRow).join('')}</ul>
        </div>`;
    }).join('');

    const totalEntries = Object.entries(totals)
        .map(([mid, qty]) => ({ materialId: parseInt(mid, 10), quantity: qty }))
        .sort((a, b) => {
            const ra = materials[a.materialId]?.rarity ?? 0;
            const rb = materials[b.materialId]?.rarity ?? 0;
            return ra - rb || a.materialId - b.materialId;
        });

    const totalsHtml = totalEntries.length === 0
        ? '<div style="color:var(--text-secondary);font-size:0.85rem">Aucun matériau pour les upgrades.</div>'
        : `<ul style="margin:4px 0 0 16px;padding:0;list-style:disc">${totalEntries.map(renderMatRow).join('')}</ul>`;

    detail.innerHTML = `
        <h3 style="margin-bottom:4px">${icon} ${name}
            <span style="font-weight:400;color:var(--text-secondary);font-size:0.85rem">#${id}</span>
        </h3>
        <div style="color:var(--text-secondary);margin-bottom:12px">
            <strong>${ITEM_RARITY_NAMES[item.rarity] || '?'}</strong>
            · type ${item.type}
        </div>
        <h4 style="margin:8px 0 4px 0;color:var(--accent-secondary)">Coût par niveau</h4>
        ${levelsHtml}
        <h4 style="margin:16px 0 4px 0;color:var(--accent-secondary)">Total pour niveau 1 → 5</h4>
        ${totalsHtml}
    `;
}
