// ==========================================================================
// Mutable application state. All globals are declared with `let` so they
// can be reassigned during data loading and shared across modules.
// ==========================================================================

let materials = {};
let translations = {};
let recipes = [];
let weapons = [];
let armors = [];
let plantData = {};
let BOSS_LOOT_TABLES = {};
let itemTypeStats = { weapons: {}, armors: {} };

let usageIndex = {};
let upgradeIndex = {};
let itemUpgradeIndex = { weapon: {}, armor: {} };

let activeTypeFilter = null;
let activeRarityFilter = null;
let showUnusedOnly = false;
