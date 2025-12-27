// Item comparison management component
class ComparisonManager {
    constructor(elements, iconService) {
        this.elements = elements;
        this.iconService = iconService;
        this.selectedItems = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Compare button
        this.elements.compareBtn.addEventListener('click', () => {
            this.showComparison();
        });

        // Clear selection button
        this.elements.clearSelectionBtn.addEventListener('click', () => {
            this.clearSelection();
        });

        // Close modal
        this.elements.closeComparisonModal.addEventListener('click', () => {
            this.hideComparison();
        });

        // Close modal when clicking outside
        this.elements.comparisonModal.addEventListener('click', (e) => {
            if (e.target === this.elements.comparisonModal) {
                this.hideComparison();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.comparisonModal.classList.contains('show')) {
                this.hideComparison();
            }
        });
    }

    addItemCheckbox(row, item) {
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'item-checkbox';
        checkbox.dataset.itemId = `${item.type}-${item.id}`;
        
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedItems.add(item);
            } else {
                this.selectedItems.delete(item);
            }
            this.updateSelectionUI();
        });

        checkboxCell.appendChild(checkbox);
        row.insertBefore(checkboxCell, row.firstChild);
        return checkboxCell;
    }

    updateSelectionUI() {
        const count = this.selectedItems.size;
        this.elements.selectionCount.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
        
        // Show/hide comparison controls
        if (count > 0) {
            this.elements.comparisonControls.style.display = 'flex';
        } else {
            this.elements.comparisonControls.style.display = 'none';
        }

        // Enable/disable compare button
        this.elements.compareBtn.disabled = count < 2;
    }

    clearSelection() {
        this.selectedItems.clear();
        
        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        this.updateSelectionUI();
    }

    showComparison() {
        if (this.selectedItems.size < 2) {
            alert('Please select at least 2 items to compare.');
            return;
        }

        this.generateComparisonTable();
        this.elements.comparisonModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hideComparison() {
        this.elements.comparisonModal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }

    generateComparisonTable() {
        const items = Array.from(this.selectedItems);
        const table = this.elements.comparisonTable;
        table.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('tr');
        const propertyHeader = document.createElement('th');
        propertyHeader.textContent = 'Property';
        headerRow.appendChild(propertyHeader);

        items.forEach(item => {
            const itemHeader = document.createElement('th');
            itemHeader.className = 'item-column';
            
            const emoji = this.iconService.getItemEmoji(item);
            const rarityEmoji = this.iconService.getRarityEmoji(item.rarity);
            
            itemHeader.innerHTML = `
                <div class="item-emoji">${emoji}</div>
                <div class="item-name">${item.name || `${item.type} ${item.id}`}</div>
                <div class="item-id">ID: ${item.id} | ${rarityEmoji} R${item.rarity}</div>
            `;
            headerRow.appendChild(itemHeader);
        });

        table.appendChild(headerRow);

        // Define properties to compare
        const properties = [
            { key: 'type', label: 'Type', isNumeric: false },
            { key: 'rarity', label: 'Rarity', isNumeric: true },
            { key: 'rawAttack', label: 'Raw Attack', isNumeric: true },
            { key: 'rawDefense', label: 'Raw Defense', isNumeric: true },
            { key: 'attack', label: 'Attack', isNumeric: true, fallback: 'finalAttack' },
            { key: 'defense', label: 'Defense', isNumeric: true, fallback: 'finalDefense' },
            { key: 'speed', label: 'Speed', isNumeric: true, fallback: 'finalSpeed' },
            { key: 'nature', label: 'Nature', isNumeric: true },
            { key: 'power', label: 'Power', isNumeric: true },
            { key: 'usages', label: 'Usages', isNumeric: true },
            { key: 'tags', label: 'Tags', isNumeric: false }
        ];

        // Create rows for each property
        properties.forEach(property => {
            const row = document.createElement('tr');
            
            // Property name cell
            const propertyCell = document.createElement('td');
            propertyCell.textContent = property.label;
            row.appendChild(propertyCell);

            // Get values for this property
            const values = items.map(item => {
                let value = item[property.key];
                if (value === undefined && property.fallback) {
                    value = item[property.fallback];
                }
                
                if (property.key === 'nature') {
                    const natureEmoji = this.iconService.getNatureEmoji(value || 0);
                    const natureName = CONSTANTS.NATURE_NAMES[value || 0] || 'None';
                    return { display: `${natureEmoji} ${natureName} (${value || 0})`, numeric: value || 0 };
                } else if (property.key === 'tags') {
                    return { display: Array.isArray(value) ? value.join(', ') : (value || 'None'), numeric: 0 };
                } else if (property.key === 'type') {
                    return { display: value || 'Unknown', numeric: 0 };
                }
                
                return { display: value || 0, numeric: value || 0 };
            });

            // Find best and worst values for numeric properties
            let bestIndices = [];
            let worstIndices = [];
            
            if (property.isNumeric && values.some(v => v.numeric > 0)) {
                const numericValues = values.map(v => v.numeric);
                const maxValue = Math.max(...numericValues);
                const minValue = Math.min(...numericValues);
                
                if (maxValue !== minValue) {
                    bestIndices = numericValues.map((v, i) => v === maxValue ? i : -1).filter(i => i !== -1);
                    worstIndices = numericValues.map((v, i) => v === minValue ? i : -1).filter(i => i !== -1);
                }
            }

            // Create cells for each item
            values.forEach((value, index) => {
                const cell = document.createElement('td');
                cell.textContent = value.display;
                
                // Apply highlighting for best/worst values
                if (bestIndices.includes(index)) {
                    cell.classList.add('comparison-best');
                } else if (worstIndices.includes(index)) {
                    cell.classList.add('comparison-worst');
                }
                
                row.appendChild(cell);
            });

            table.appendChild(row);
        });
    }
}