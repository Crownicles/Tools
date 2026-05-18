// ==========================================================================
// Static catalog data — material/item rarity tables and hardcoded loot maps
// for systems (expeditions, compost) that have no GitHub-importable source.
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

// UPGRADE_MATERIALS_PER_ITEM_RARITY_AND_LEVEL[itemRarity][level][materialRarity] = count
// materialRarity: 1=Common, 2=Uncommon, 3=Rare
const UPGRADE_TABLE = {
    0: { 1: {1:0,2:0,3:0}, 2: {1:0,2:0,3:0}, 3: {1:0,2:0,3:0}, 4: {1:0,2:0,3:0}, 5: {1:0,2:0,3:0} },
    1: { 1: {1:2,2:0,3:0}, 2: {1:3,2:0,3:0}, 3: {1:4,2:0,3:0}, 4: {1:5,2:0,3:0}, 5: {1:6,2:0,3:0} },
    2: { 1: {1:2,2:0,3:0}, 2: {1:4,2:0,3:0}, 3: {1:5,2:1,3:0}, 4: {1:6,2:2,3:0}, 5: {1:6,2:4,3:0} },
    3: { 1: {1:3,2:0,3:0}, 2: {1:4,2:1,3:0}, 3: {1:5,2:3,3:0}, 4: {1:6,2:5,3:0}, 5: {1:8,2:5,3:1} },
    4: { 1: {1:5,2:0,3:0}, 2: {1:6,2:2,3:0}, 3: {1:7,2:3,3:1}, 4: {1:8,2:4,3:2}, 5: {1:9,2:5,3:3} },
    5: { 1: {1:8,2:2,3:0}, 2: {1:9,2:4,3:1}, 3: {1:10,2:5,3:2}, 4: {1:11,2:6,3:3}, 5: {1:12,2:7,3:5} },
    6: { 1: {1:8,2:2,3:3}, 2: {1:9,2:4,3:5}, 3: {1:10,2:5,3:7}, 4: {1:11,2:6,3:9}, 5: {1:12,2:7,3:12} },
    7: { 1: {1:10,2:5,3:5}, 2: {1:15,2:10,3:8}, 3: {1:20,2:15,3:12}, 4: {1:25,2:20,3:15}, 5: {1:30,2:25,3:20} },
    8: { 1: {1:15,2:10,3:10}, 2: {1:20,2:15,3:15}, 3: {1:25,2:20,3:20}, 4: {1:30,2:25,3:25}, 5: {1:40,2:30,3:30} }
};

// Expedition loot tables (hardcoded from ExpeditionConstants.ts — not yet imported from GitHub)
const EXPEDITION_LOOT_TABLES = {
    forest: { name: 'Forêt', emoji: '🌲', materials: [14, 20, 29, 45, 6, 40] },
    mountain: { name: 'Montagne', emoji: '⛰️', materials: [32, 34, 44, 47, 11, 31] },
    desert: { name: 'Désert', emoji: '🏜️', materials: [54, 55, 49, 50, 61, 65] },
    swamp: { name: 'Marais', emoji: '🐊', materials: [63, 64, 53, 60, 67, 72] },
    ruins: { name: 'Ruines', emoji: '🏚️', materials: [77, 79, 66, 71, 75, 76] },
    cave: { name: 'Grotte', emoji: '🦇', materials: [82, 89, 74, 78, 83, 84] },
    plains: { name: 'Plaines', emoji: '🌾', materials: [35, 42, 80, 81, 85, 86] },
    coast: { name: 'Côte', emoji: '🏖️', materials: [52, 58, 70, 2, 88, 90] }
};

// Plant compost data (hardcoded from PlantConstants.ts — not yet imported from GitHub)
const PLANT_COMPOST = {
    1: { name: 'Herbe commune', materials: [52, 54, 37] },
    2: { name: 'Trèfle doré', materials: [43, 59, 25] },
    3: { name: 'Mousse lunaire', materials: [53, 30, 89] },
    4: { name: 'Racine de fer', materials: [70, 41, 81] },
    5: { name: 'Champignon nocturne', materials: [55, 66, 36] },
    6: { name: 'Feuille venimeuse', materials: [10, 17, 38] },
    7: { name: 'Bulbe de feu', materials: [35, 82, 44] },
    8: { name: 'Plante carnée', materials: [42, 48, 26] },
    9: { name: 'Fleur de cristal', materials: [34, 67, 69] },
    10: { name: 'Arbre ancien', materials: [84, 31, 18] }
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
