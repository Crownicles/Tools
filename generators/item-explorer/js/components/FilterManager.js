// Filter management component
class FilterManager {
    constructor(elements) {
        this.elements = elements;
        this.performanceData = null; // Store performance data for sorting
    }

    // Set performance data for sorting
    setPerformanceData(performanceData) {
        this.performanceData = performanceData;
    }

    updateColumnVisibility(currentType) {
        const table = this.elements.itemsTable;
        const headers = table.querySelectorAll('th[data-column]');
        const rows = table.querySelectorAll('tbody tr');
        
        // Reset all columns to visible first
        headers.forEach(header => {
            header.classList.remove('column-hidden');
        });
        
        // Hide/show columns based on type
        if (currentType === 'weapons') {
            table.querySelector('th[data-column="rawDefense"]').classList.add('column-hidden');
            table.querySelector('th[data-column="power"]').classList.add('column-hidden');
            table.querySelector('th[data-column="nature"]').classList.add('column-hidden');
            table.querySelector('th[data-column="usages"]').classList.add('column-hidden');
        } else if (currentType === 'armors') {
            table.querySelector('th[data-column="rawAttack"]').classList.add('column-hidden');
            table.querySelector('th[data-column="power"]').classList.add('column-hidden');
            table.querySelector('th[data-column="nature"]').classList.add('column-hidden');
            table.querySelector('th[data-column="usages"]').classList.add('column-hidden');
        } else if (currentType === 'objects') {
            table.querySelector('th[data-column="rawAttack"]').classList.add('column-hidden');
            table.querySelector('th[data-column="rawDefense"]').classList.add('column-hidden');
            table.querySelector('th[data-column="attack"]').classList.add('column-hidden');
            table.querySelector('th[data-column="defense"]').classList.add('column-hidden');
            table.querySelector('th[data-column="speed"]').classList.add('column-hidden');
            table.querySelector('th[data-column="usages"]').classList.add('column-hidden');
        } else if (currentType === 'potions') {
            table.querySelector('th[data-column="rawAttack"]').classList.add('column-hidden');
            table.querySelector('th[data-column="rawDefense"]').classList.add('column-hidden');
            table.querySelector('th[data-column="attack"]').classList.add('column-hidden');
            table.querySelector('th[data-column="defense"]').classList.add('column-hidden');
            table.querySelector('th[data-column="speed"]').classList.add('column-hidden');
        }
        
        // Update cell visibility for existing rows
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => cell.classList.remove('column-hidden'));
            
            if (currentType === 'weapons') {
                if (cells[6]) cells[6].classList.add('column-hidden'); // rawDefense
                if (cells[10]) cells[10].classList.add('column-hidden'); // nature
                if (cells[11]) cells[11].classList.add('column-hidden'); // power
                if (cells[12]) cells[12].classList.add('column-hidden'); // usages
            } else if (currentType === 'armors') {
                if (cells[5]) cells[5].classList.add('column-hidden'); // rawAttack
                if (cells[10]) cells[10].classList.add('column-hidden'); // nature
                if (cells[11]) cells[11].classList.add('column-hidden'); // power
                if (cells[12]) cells[12].classList.add('column-hidden'); // usages
            } else if (currentType === 'objects') {
                if (cells[5]) cells[5].classList.add('column-hidden'); // rawAttack
                if (cells[6]) cells[6].classList.add('column-hidden'); // rawDefense
                if (cells[7]) cells[7].classList.add('column-hidden'); // attack
                if (cells[8]) cells[8].classList.add('column-hidden'); // defense
                if (cells[9]) cells[9].classList.add('column-hidden'); // speed
                if (cells[12]) cells[12].classList.add('column-hidden'); // usages
            } else if (currentType === 'potions') {
                if (cells[5]) cells[5].classList.add('column-hidden'); // rawAttack
                if (cells[6]) cells[6].classList.add('column-hidden'); // rawDefense
                if (cells[7]) cells[7].classList.add('column-hidden'); // attack
                if (cells[8]) cells[8].classList.add('column-hidden'); // defense
                if (cells[9]) cells[9].classList.add('column-hidden'); // speed
            }
        });
    }

    updateNatureFilterVisibility(currentType) {
        if (currentType === 'objects' || currentType === 'potions') {
            this.elements.natureFilterContainer.style.display = 'block';
        } else {
            this.elements.natureFilterContainer.style.display = 'none';
            this.elements.natureFilter.value = 'all';
        }
    }

    filterItems(items, filters) {
        return items.filter(item => {
            // Search filter
            const nameMatch = item.name && item.name.toLowerCase().includes(filters.search);
            const idMatch = item.id.toString().includes(filters.search);
            
            // Rarity filter - now supports multiple rarities
            const rarityMatch = filters.rarities.length === 0 || filters.rarities.includes(item.rarity.toString());
            
            // Nature filter (only for objects and potions)
            const natureMatch = filters.nature === 'all' || item.nature.toString() === filters.nature;
            
            return (nameMatch || idMatch) && rarityMatch && natureMatch;
        });
    }

    sortItems(items, sort) {
        return items.sort((a, b) => this.compareItems(a, b, sort.column, sort.direction));
    }

    compareItems(a, b, column, direction) {
        let valueA, valueB;
        
        if (column === 'name') {
            valueA = (a.name || '').toLowerCase();
            valueB = (b.name || '').toLowerCase();
        } else if (column === 'tags') {
            valueA = (a.tags ? a.tags.join(',') : '').toLowerCase();
            valueB = (b.tags ? b.tags.join(',') : '').toLowerCase();
        } else if (column === 'nature') {
            valueA = a.nature || 0;
            valueB = b.nature || 0;
        } else if (column === 'performance') {
            // Handle performance column specially
            if (this.performanceData) {
                const keyA = `${a.type}-${a.id}`;
                const keyB = `${b.type}-${b.id}`;
                const dataA = this.performanceData[keyA];
                const dataB = this.performanceData[keyB];
                
                // Use score for numeric comparison, fallback to grade letter comparison
                valueA = dataA ? dataA.score : -1;
                valueB = dataB ? dataB.score : -1;
            } else {
                valueA = 0;
                valueB = 0;
            }
        } else {
            valueA = a[column] || 0;
            valueB = b[column] || 0;
        }
        
        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    }
}