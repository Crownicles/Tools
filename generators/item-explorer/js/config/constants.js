// Application constants and configuration
const CONSTANTS = {
    RARITY_MULTIPLIERS: [1.0, 1.5, 2.1, 2.8, 3.6, 4.5, 5.5, 6.6, 6.7],
    RARITY_NAMES: ["Basic", "Common", "Uncommon", "Exotic", "Rare", "Special", "Epic", "Legendary", "Mythical"],
    NATURE_NAMES: ["None", "Health", "Speed", "Attack", "Defense", "Time Speedup", "Money", "Energy"],
    
    ITEM_TYPES: [
        { type: 'weapons', count: 100 },
        { type: 'armors', count: 65 },
        { type: 'objects', count: 93 },
        { type: 'potions', count: 50 }
    ],
    
    BATCH_SIZE: 10,
    DEFAULT_BRANCH: 'master',
    GITHUB_API_LIMIT: 5000
};