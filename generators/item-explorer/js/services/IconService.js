// Icon service for loading and managing Crownicles icons
class IconService {
    constructor(elements) {
        this.elements = elements;
        // Direct emoji mapping - no loading needed
        this.crowniclesIcons = {
            weapons: {
                0: "👊", 1: "⚡", 2: "🛠️", 3: "🏏", 4: "🏹", 5: "🔨", 6: "🔪", 7: "🗡️", 8: "📌", 9: "🔧",
                10: "⚔️", 11: "🔫", 12: "💉", 13: "💣", 14: "🎸", 15: "⚔️", 16: "⛏️", 17: "🔧", 18: "🪵", 19: "🔪",
                20: "🌿", 21: "⛏️", 22: "🏹", 23: "🍳", 24: "✂️", 25: "🗡️", 26: "🏑", 27: "🗡️", 28: "🔨", 29: "🔪",
                30: "🥊", 31: "🤜", 32: "🎣", 33: "🔪", 34: "🎣", 35: "🎣", 36: "⚔️", 37: "⚔️", 38: "⚔️", 39: "⚔️",
                40: "⚔️", 41: "⚔️", 42: "🔫", 43: "🥒", 44: "💐", 45: "🍌", 46: "🔖", 47: "❄️", 48: "🏹", 49: "🏹",
                50: "🏹", 51: "🏹", 52: "🪒", 53: "🪑", 54: "🧱", 55: "🍴", 56: "🗡️", 57: "🧯", 58: "🔖", 59: "💉",
                60: "💉", 61: "💉", 62: "🦠", 63: "💣", 64: "🕯️", 65: "🥢", 66: "⚔️", 67: "⚔️", 68: "🤛", 69: "⚔️",
                70: "🔫", 71: "⚔️", 72: "⚽", 73: "🪓", 74: "☄️", 75: "🪃", 76: "⚡", 77: "🤿", 78: "🫂", 79: "🌂",
                80: "🎆", 81: "🗡️", 82: "🦶", 83: "🤬", 84: "🪛", 85: "❤️", 86: "🎭", 87: "⚠️", 88: "🪶", 89: "🐉",
                90: "🦄", 91: "🍭", 92: "🎮", 93: "🍴", 94: "💀", 95: "🗯️", 96: "⚛️", 97: "🐦‍🔥", 98: "❄️"
            },
            armors: {
                0: "⬛", 1: "👁️", 2: "⛑️", 3: "🛡️", 4: "🛡️", 5: "🛡️", 6: "🤺", 7: "👘", 8: "🛡️", 9: "🛡️",
                10: "🛡️", 11: "🛡️", 12: "🛡️", 13: "🛡️", 14: "🛡️", 15: "🛡️", 16: "🛡️", 17: "🔆", 18: "🥋", 19: "🦺",
                20: "👨‍👩‍👧‍👦", 21: "🦾", 22: "🤖", 23: "🌂", 24: "🛡️", 25: "🛡️", 26: "🏉", 27: "✨", 28: "🛡️", 29: "🛡️",
                30: "🛡️", 31: "🛡️", 32: "🛡️", 33: "🛡️", 34: "🛡️", 35: "🛡️", 36: "🛡️", 37: "🛡️", 38: "🛡️", 39: "🪖",
                40: "🐢", 41: "🪙", 42: "🪖", 43: "🪣", 44: "🧱", 45: "♟️", 46: "🪟", 47: "🏯", 48: "🧥", 49: "🧥",
                50: "🥼", 51: "⛺", 52: "🛡️", 53: "🛡️", 54: "🗿", 55: "🤡", 56: "🥱", 57: "🪶", 58: "🧞", 59: "🧙",
                60: "🧔🏻", 61: "✨", 62: "🛡️", 63: "🍃", 64: "🛡️"
            },
            objects: {
                0: "⬛", 1: "🏳️", 2: "🎲", 3: "💎", 4: "🏵️", 5: "🌝", 6: "🔮", 7: "⛓️", 8: "🍀", 9: "🗝️",
                10: "👞", 11: "👼🏽", 12: "🌑", 13: "🍂", 14: "🍎", 15: "🍏", 16: "💗", 17: "📕", 18: "📘", 19: "📙",
                20: "📗", 21: "📿", 22: "🏴", 23: "⚜️", 24: "🛢️", 25: "🕯️", 26: "🏺", 27: "🎷", 28: "🎸", 29: "💳",
                30: "🦿", 31: "😹", 32: "🥄", 33: "🎃", 34: "🧸", 35: "🧲", 36: "🩹", 37: "⛷️", 38: "🌀", 39: "💠",
                40: "👼", 41: "🏺", 42: "🕝", 43: "🍌", 44: "🍎", 45: "🟧", 46: "🌟", 47: "📖", 48: "🎥", 49: "🧴",
                50: "🥾", 51: "🧹", 52: "🧼", 53: "🎖️", 54: "📯", 55: "💰", 56: "🎰", 57: "👠", 58: "🪐", 59: "🍫",
                60: "🏢", 61: "🕵️", 62: "👁️", 63: "⛏️", 64: "🧱", 65: "🎶", 66: "🌐", 67: "🚗", 68: "🟦", 69: "🎧",
                70: "🛏️", 71: "🤖", 72: "☀️", 73: "🎢", 74: "🌶️", 75: "🔌", 76: "🍖", 77: "🧑‍⚕️", 78: "❤️‍🩹", 79: "🧬",
                80: "🔋", 81: "🔋", 82: "🪳", 83: "🚀", 84: "🍀", 85: "🧻", 86: "🌟", 87: "🎸", 88: "💾", 89: "🐟",
                90: "🐸", 91: "🛰️", 92: "🪈"
            },
            potions: {
                0: "⬛", 1: "🍷", 2: "🍷", 3: "🍷", 4: "🍷", 5: "🍷", 6: "🧪", 7: "🧪", 8: "🧪", 9: "🧪",
                10: "🍇", 11: "🍇", 12: "⚗️", 13: "⚗️", 14: "⚗️", 15: "⚗️", 16: "🧃", 17: "🧃", 18: "🍸", 19: "🍸",
                20: "🍸", 21: "🍸", 22: "❤️", 23: "❤️", 24: "❤️", 25: "🍹", 26: "🥛", 27: "🍼", 28: "🍵", 29: "☕",
                30: "🥃", 31: "🥘", 32: "💧", 33: "🍷", 34: "🐣", 35: "⛽", 36: "🍵", 37: "🥤", 38: "🍶", 39: "🧉",
                40: "🍾", 41: "🧪", 42: "❤️", 43: "🥤", 44: "🐺", 45: "🌱", 46: "🌶", 47: "☠", 48: "🔋", 49: "🥜",
                50: "🍺", 51: "🥫", 52: "🥫", 53: "🥫", 54: "🪅", 55: "🫕", 56: "💩", 57: "🩸", 58: "🧱", 59: "🫧",
                60: "💦", 61: "🚱", 62: "🌊", 63: "🫙", 64: "♻", 65: "🫗", 66: "🧋", 67: "🧃", 68: "🧃", 69: "🍯",
                70: "🧅", 71: "🗻", 72: "⛈", 73: "☕", 74: "🫗", 75: "🌵", 76: "🚿", 77: "🛵", 78: "🧼", 79: "🪷",
                80: "🥶", 81: "✒", 82: "🛏", 83: "🌂", 84: "🪶", 85: "💉", 86: "🍸", 87: "🏴‍☠️", 88: "🐌", 89: "♨",
                90: "🥔", 91: "🌊", 92: "🧌", 93: "🌋", 94: "🍫"
            },
            rarity: ["🔸", "🔶", "🔥", "🔱", "☄️", "💫", "⭐", "🌟", "💎"],
            itemNatures: ["❌", "❤️", "🚀", "⚔️", "🛡️", "🕥", "💰", "⚡"],
            itemCategories: ["⚔️", "🛡️", "⚗️", "🧸"]
        };
    }

    async loadCrowniclesIcons(branch) {
        // Simulate loading for UI consistency
        this.elements.loadingStatus.textContent = 'Loading Crownicles icons...';
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Loaded Crownicles icons (embedded):', {
            weapons: Object.keys(this.crowniclesIcons.weapons).length,
            armors: Object.keys(this.crowniclesIcons.armors).length,
            objects: Object.keys(this.crowniclesIcons.objects).length,
            potions: Object.keys(this.crowniclesIcons.potions).length
        });
    }

    getItemEmoji(item) {
        const typeMap = {
            'weapon': 'weapons',
            'armor': 'armors', 
            'object': 'objects',
            'potion': 'potions'
        };
        
        const iconType = typeMap[item.type];
        
        // Try to get specific icon first
        if (iconType && this.crowniclesIcons[iconType] && this.crowniclesIcons[iconType][item.id]) {
            return this.crowniclesIcons[iconType][item.id];
        }
        
        // If no specific icon found, use category emoji
        return this.getCategoryEmoji(item.type);
    }

    getCategoryEmoji(type) {
        const categoryMap = {
            'weapon': 0,
            'armor': 1,    
            'potion': 2,
            'object': 3
        };
        
        const categoryIndex = categoryMap[type];
        
        if (this.crowniclesIcons.itemCategories && this.crowniclesIcons.itemCategories.length > categoryIndex) {
            return this.crowniclesIcons.itemCategories[categoryIndex];
        }
        
        return '';
    }

    getRarityEmoji(rarity) {
        return this.crowniclesIcons.rarity[rarity] || '';
    }

    getNatureEmoji(nature) {
        return this.crowniclesIcons.itemNatures[nature] || '';
    }
}