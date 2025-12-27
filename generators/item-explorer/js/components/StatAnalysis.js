// Intelligent stat analysis component
class StatAnalysis {
    constructor(elements, iconService) {
        this.elements = elements;
        this.iconService = iconService;
        this.analysisEnabled = true; // Always enabled now - no checkbox
        // this.initializeEventListeners(); // No longer needed - no checkbox to listen to
    }

    // initializeEventListeners() removed - no checkbox to manage

    updateAnalysisLegendVisibility() {
        this.elements.analysisLegend.style.display = this.analysisEnabled ? 'block' : 'none';
    }

    // Calculate performance score for each item based on visible items
    calculatePerformanceScores(visibleItems, currentType) {
        if (!this.analysisEnabled || visibleItems.length === 0) return {};

        const scores = {};
        
        // Group items by type for better comparison
        const itemsByType = this.groupItemsByType(visibleItems);
        
        // Calculate scores for each type separately
        Object.keys(itemsByType).forEach(type => {
            const items = itemsByType[type];
            if (items.length === 0) return;
            
            const typeScores = this.calculateScoresForType(items, type);
            Object.assign(scores, typeScores);
        });

        return scores;
    }

    groupItemsByType(items) {
        return items.reduce((groups, item) => {
            const type = item.type;
            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
            return groups;
        }, {});
    }

    calculateScoresForType(items, type) {
        const scores = {};
        
        // Calculate power scores for each item
        items.forEach(item => {
            const itemKey = `${item.type}-${item.id}`;
            const powerScore = this.calculatePowerScore(item, type);
            scores[itemKey] = powerScore;
        });

        // Convert to letter grades based on distribution
        this.assignLetterGrades(scores, items);

        return scores;
    }

    calculatePowerScore(item, type) {
        // Get rarity bonus (lower rarity = higher bonus)
        const rarityBonus = this.getRarityBonus(item.rarity);
        
        // Get stats (ignore raw stats as requested)
        const attack = item.attack || item.finalAttack || 0;
        const defense = item.defense || item.finalDefense || 0;
        const speed = item.speed || item.finalSpeed || 0;
        
        let powerScore = 0;
        
        if (type === 'weapon') {
            // For weapons: attack as base score multiplied by rarity bonus
            const baseScore = attack * rarityBonus;
            
            // Add or subtract (if negative) defense and speed values to the power of 1.2
            const defenseModifier = defense >= 0 ? Math.pow(defense, 1.2) : -Math.pow(Math.abs(defense), 1.2);
            const speedModifier = speed >= 0 ? Math.pow(speed, 1.2) : -Math.pow(Math.abs(speed), 1.2);
            
            powerScore = baseScore + defenseModifier + speedModifier;
        } else if (type === 'armor') {
            // For armors: defense as base score multiplied by rarity bonus
            const baseScore = defense * rarityBonus;
            
            // Add or subtract (if negative) attack and speed values to the power of 1.2
            const attackModifier = attack >= 0 ? Math.pow(attack, 1.2) : -Math.pow(Math.abs(attack), 1.2);
            const speedModifier = speed >= 0 ? Math.pow(speed, 1.2) : -Math.pow(Math.abs(speed), 1.2);
            
            powerScore = baseScore + attackModifier + speedModifier;
        } else {
            // For objects and potions, use power stat with rarity bonus
            const power = item.power || 0;
            powerScore = power * rarityBonus;

            // Multiply by usages for combat potions
            if (type === 'potion' && [2, 3, 4].includes(item.nature)) {
                const usages = item.usages || 1;
                powerScore *= usages;
            }
        }
        
        return Math.max(0, powerScore); // Ensure non-negative score
    }

    getRarityBonus(rarity) {
        // Lower rarity gets higher bonus - progression décroissante
        switch (rarity) {
            case 0: return 0.0; // Basic - le plus élevé
            case 1: return 9.0;  // Common
            case 2: return 7.5;  // Uncommon
            case 3: return 6.0;  // Exotic
            case 4: return 5.0;  // Rare
            case 5: return 3.5;  // Special
            case 6: return 2.8;  // Epic
            case 7: return 2.1;  // Legendary
            case 8: return 2.0;  // Mythical - le plus faible
            default: return 1.0;
        }
    }

    getRelevantStats(type) {
        // No longer used with the new power score calculation
        switch (type) {
            case 'weapon':
                return ['attack', 'defense', 'speed'];
            case 'armor':
                return ['defense', 'attack', 'speed'];
            case 'object':
                return ['power'];
            case 'potion':
                return ['power', 'usages'];
            default:
                return [];
        }
    }

    getStatValue(item, stat) {
        switch (stat) {
            case 'rawAttack':
                return item.rawAttack || 0;
            case 'rawDefense':
                return item.rawDefense || 0;
            case 'attack':
                return item.attack || item.finalAttack || 0;
            case 'defense':
                return item.defense || item.finalDefense || 0;
            case 'speed':
                return item.speed || item.finalSpeed || 0;
            case 'power':
                return item.power || 0;
            case 'usages':
                return item.usages || 1;
            default:
                return 0;
        }
    }

    assignLetterGrades(scores, items) {
        const scoreValues = Object.values(scores);
        if (scoreValues.length === 0) return;

        // Sort scores to find percentiles
        const sortedScores = [...scoreValues].sort((a, b) => b - a);
        const len = sortedScores.length;

        // Calculate thresholds
        const sThreshold = sortedScores[Math.floor(len * 0.1)] || 1; // Top 10%
        const aThreshold = sortedScores[Math.floor(len * 0.25)] || 0.8; // Top 25%
        const bThreshold = sortedScores[Math.floor(len * 0.5)] || 0.6; // Top 50%
        const cThreshold = sortedScores[Math.floor(len * 0.75)] || 0.4; // Top 75%

        // Assign grades
        Object.keys(scores).forEach(itemKey => {
            const score = scores[itemKey];
            let grade;
            
            if (score >= sThreshold) grade = 'S';
            else if (score >= aThreshold) grade = 'A';
            else if (score >= bThreshold) grade = 'B';
            else if (score >= cThreshold) grade = 'C';
            else grade = 'D';

            scores[itemKey] = {
                score: score,
                grade: grade,
                percentile: this.calculatePercentile(score, sortedScores)
            };
        });
    }

    calculatePercentile(score, sortedScores) {
        const index = sortedScores.findIndex(s => score >= s);
        return Math.round((index / sortedScores.length) * 100);
    }

    // Create performance cell for table
    createPerformanceCell(item, performanceData) {
        const cell = document.createElement('td');
        
        if (!this.analysisEnabled || !performanceData) {
            cell.textContent = '-';
            return cell;
        }

        const itemKey = `${item.type}-${item.id}`;
        const data = performanceData[itemKey];

        if (!data) {
            cell.textContent = '-';
            return cell;
        }

        cell.textContent = data.grade;
        cell.className = `performance-score performance-score-${data.grade.toLowerCase()}`;
        cell.title = `Performance: ${data.grade} (${data.percentile}th percentile, score: ${(data.score * 100).toFixed(1)}%)`;

        return cell;
    }

    // Remove all analysis highlighting
    clearAnalysisHighlighting() {
        const cells = this.elements.itemsTable.querySelectorAll('.performance-score');
        cells.forEach(cell => {
            cell.className = '';
            cell.textContent = '-';
            cell.removeAttribute('title');
        });
    }
}