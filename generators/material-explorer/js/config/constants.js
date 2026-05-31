// ==========================================================================
// Static catalog data — material/item rarity labels, emojis and display-only
// metadata. Loot tables (upgrade totals, expedition and compost materials) are
// loaded at runtime from the Crownicles source so they stay in sync (see
// DataLoader.js); only their non-source metadata (names, emojis) lives here.
// ==========================================================================

const MATERIAL_TYPE_EMOJI = {
    metal: '⚙️', alloy: '🔩', nature: '🌿', spiritual: '✨',
    magic: '🔮', leather: '🧶', rope: '🪢', poison: '☠️',
    explosive: '💥', wood: '🪵'
};

const MATERIAL_TYPE_LABEL = {
    metal: 'Métal', alloy: 'Alliage', nature: 'Nature', spiritual: 'Spirituel',
    magic: 'Magie', leather: 'Cuir', rope: 'Corde', poison: 'Poison',
    explosive: 'Explosif', wood: 'Bois'
};

const MATERIAL_RARITY_NAMES = { 1: 'Commun', 2: 'Peu commun', 3: 'Rare' };
const MATERIAL_RARITY_CSS = { 1: 'badge-rarity-1', 2: 'badge-rarity-2', 3: 'badge-rarity-3' };
const MATERIAL_RARITY_COLORS = { 1: '#6b7280', 2: '#84cc16', 3: '#f97316' };

// Mirrors ItemRarity enum
const ITEM_RARITY = {
    BASIC: 0, COMMON: 1, UNCOMMON: 2, EXOTIC: 3,
    RARE: 4, SPECIAL: 5, EPIC: 6, LEGENDARY: 7, MYTHICAL: 8
};

const ITEM_RARITY_NAMES = {
    0: 'Basique', 1: 'Commun', 2: 'Peu commun', 3: 'Exotique',
    4: 'Rare', 5: 'Spécial', 6: 'Épique', 7: 'Légendaire', 8: 'Mythique'
};

// UPGRADE_MATERIALS_PER_ITEM_RARITY_AND_LEVEL[itemRarity][level][materialRarity] = total count
// Loaded at runtime from Lib/src/constants/ItemConstants.ts into the `UPGRADE_TABLE`
// global (see parseUpgradeTotals in DataLoader.js).

// DISTINCT_MATERIALS_PER_ITEM_RARITY_AND_LEVEL[itemRarity][level][materialRarity] = distinct count
// Loaded at runtime from Core/resources/itemUpgradeMaterialCounts/<itemRarity>.json
// into the `distinctCounts` global (see DataLoader.js).

// Expedition loot tables. `name` / `emoji` are display-only metadata (not in the
// Crownicles source); the `materials` arrays are loaded at runtime from
// Lib/src/constants/ExpeditionConstants.ts (see parseExpeditionLoot in DataLoader.js).
const EXPEDITION_LOOT_TABLES = {
    forest: { name: 'Forêt', emoji: '🌲', materials: [] },
    mountain: { name: 'Montagne', emoji: '⛰️', materials: [] },
    desert: { name: 'Désert', emoji: '🏜️', materials: [] },
    swamp: { name: 'Marais', emoji: '🐊', materials: [] },
    ruins: { name: 'Ruines', emoji: '🏚️', materials: [] },
    cave: { name: 'Grotte', emoji: '🦇', materials: [] },
    plains: { name: 'Plaines', emoji: '🌾', materials: [] },
    coast: { name: 'Côte', emoji: '🏖️', materials: [] }
};

// Plant compost data. `name` is filled from translations at load time; the
// `materials` arrays are loaded at runtime from Lib/src/constants/PlantConstants.ts
// (see parsePlantCompost in DataLoader.js).
const PLANT_COMPOST = {
    1: { name: 'Herbe commune', materials: [] },
    2: { name: 'Trèfle doré', materials: [] },
    3: { name: 'Mousse lunaire', materials: [] },
    4: { name: 'Racine de fer', materials: [] },
    5: { name: 'Champignon nocturne', materials: [] },
    6: { name: 'Feuille venimeuse', materials: [] },
    7: { name: 'Bulbe de feu', materials: [] },
    8: { name: 'Plante carnée', materials: [] },
    9: { name: 'Fleur de cristal', materials: [] },
    10: { name: 'Arbre ancien', materials: [] }
};

// Map ID → island display metadata. Island is derived from mapId as
// `Math.floor((mapId - 1000) / 100) + 1`.
const ISLAND_META = {
    1: { emoji: '🌴', name: 'Île 1 (Tropicale)' },
    2: { emoji: '❄️', name: 'Île 2 (Glacée)' },
    3: { emoji: '🌊', name: 'Île 3 (Océanique)' }
};

const RARITY_WEIGHTS = { 1: 60, 2: 30, 3: 10 };

// Drops produced by an expedition reward index 1..10.
const DROPS_BY_REWARD_INDEX = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
