// Table rendering component
class TableRenderer {
    constructor(elements, iconService) {
        this.elements = elements;
        this.iconService = iconService || new IconService(elements);
        this.filterManager = new FilterManager(elements);
        this.statAnalysis = null; // Will be injected by AppController
        this.cellEditor = new CellEditor(elements); // Add cell editor
    }

    setStatAnalysis(statAnalysis) {
        this.statAnalysis = statAnalysis;
    }

    displayItems(allItems, currentType, filters, sort, useColorCoding = false, useStatAnalysis = false) {
        let itemsToDisplay = [];
        let newlyCreatedItems = [];
        
        // Collect items based on type filter
        if (currentType === 'all') {
            itemsToDisplay = [
                ...allItems.weapons,
                ...allItems.armors,
                ...allItems.objects,
                ...allItems.potions
            ];
        } else {
            itemsToDisplay = allItems[currentType] || [];
        }
        
        // Séparer les items nouvellement créés des autres
        if (this.cellEditor && this.cellEditor.newlyCreatedItems) {
            newlyCreatedItems = itemsToDisplay.filter(item => 
                this.cellEditor.isNewlyCreated(item)
            );
            
            // Retirer les items nouvellement créés de la liste principale pour éviter les doublons
            itemsToDisplay = itemsToDisplay.filter(item => 
                !this.cellEditor.isNewlyCreated(item)
            );
        }
        
        // Apply filters only to non-newly-created items
        itemsToDisplay = this.filterManager.filterItems(itemsToDisplay, filters);
        
        // Combiner les items nouvellement créés (en haut) avec les items filtrés
        const finalItemsToDisplay = [...newlyCreatedItems, ...itemsToDisplay];
        
        // Calculate performance scores based on visible items
        let performanceData = null;
        if (useStatAnalysis && this.statAnalysis) {
            performanceData = this.statAnalysis.calculatePerformanceScores(finalItemsToDisplay, currentType);
            // Pass performance data to filter manager for sorting
            this.filterManager.setPerformanceData(performanceData);
        } else {
            // Clear performance data when not using stat analysis
            this.filterManager.setPerformanceData(null);
        }
        
        // Apply sorting only to the filtered items (not to newly created ones)
        if (sort && itemsToDisplay.length > 0) {
            const sortedFilteredItems = this.filterManager.sortItems(itemsToDisplay, sort);
            // Recombine: newly created items first, then sorted filtered items
            finalItemsToDisplay.splice(0, finalItemsToDisplay.length, ...newlyCreatedItems, ...sortedFilteredItems);
        }
        
        // Clear existing table content
        this.elements.tableBody.innerHTML = '';
        
        // Calculate color coding ranges if enabled
        let colorRanges = null;
        if (useColorCoding) {
            colorRanges = this.calculateColorRanges(finalItemsToDisplay);
        }
        
        // Clear previous analysis highlighting
        if (this.statAnalysis) {
            this.statAnalysis.clearAnalysisHighlighting();
        }
        
        // Populate table
        finalItemsToDisplay.forEach(item => {
            const row = this.createTableRow(item, currentType, colorRanges, performanceData);
            this.elements.tableBody.appendChild(row);
            
            // Make cells editable after adding to DOM
            this.cellEditor.makeCellsEditable(row, item);
        });

        // Update column visibility after rendering
        this.filterManager.updateColumnVisibility(currentType);
        
        // Toujours activer le bouton d'ajout - même avant chargement des données
        this.cellEditor.enableAddButton();
        
        // Gérer l'affichage des boutons selon le type de page
        this.cellEditor.updateAddButtonsVisibility(currentType);
        
        // Restaurer les highlights de modifications après reconstruction du tableau
        this.cellEditor.updateModificationHighlights();
        
        // NOUVEAU: Mettre à jour les statistiques avec les items actuellement visibles
        if (window.app && window.app.statsManager) {
            window.app.statsManager.updateVisibleStats(finalItemsToDisplay, currentType);
        }
    }

    createTableRow(item, currentType, colorRanges, performanceData) {
        const row = document.createElement('tr');
        
        const emoji = this.iconService.getItemEmoji(item);
        const rarityEmoji = this.iconService.getRarityEmoji(item.rarity);
        const natureEmoji = this.iconService.getNatureEmoji(item.nature || 0);
        const rarityName = CONSTANTS.RARITY_NAMES[item.rarity] || 'Unknown';
        const natureName = CONSTANTS.NATURE_NAMES[item.nature || 0] || 'None';
        
        // Create cells
        const cells = [
            item.id,
            emoji,
            item.name || `${item.type} ${item.id}`,
            `${rarityEmoji} ${rarityName} (${item.rarity})`,
            item.type,
            item.rawAttack || 0,
            item.rawDefense || 0,
            item.attack || item.finalAttack || 0,
            item.defense || item.finalDefense || 0,
            item.speed || item.finalSpeed || 0,
            `${natureEmoji} ${natureName} (${item.nature || 0})`,
            item.power || 0,
            item.usages !== null ? item.usages : '-',
            null, // Performance cell will be handled separately
            item.tags ? item.tags.join(', ') : ''
        ];
        
        cells.forEach((cellContent, index) => {
            let cell;
            
            // Handle performance column specially
            if (index === 13) {
                cell = this.statAnalysis ? this.statAnalysis.createPerformanceCell(item, performanceData) : document.createElement('td');
                if (!this.statAnalysis) cell.textContent = '-';
            } else {
                cell = document.createElement('td');
                cell.textContent = cellContent;
                
                // Add tooltip for Total Value in Usages column
                if (index === 12 && item.usages > 1) {
                    cell.title = `Valeur totale: ${item.power * item.usages} (${item.power} × ${item.usages})`;
                }
            }
            
            // Apply rarity color to rarity column
            if (index === 3) {
                cell.className = `rarity-${item.rarity}`;
            }

            // Add class for multi-usage potions
            if (index === 12 && item.usages > 1) {
                cell.classList.add('multi-usage');
            }
            
            // Apply color coding if enabled (original system) - but not to performance column
            if (colorRanges && index !== 13 && this.shouldApplyColorCoding(index, currentType)) {
                const value = typeof cellContent === 'number' ? cellContent : parseFloat(cellContent) || 0;
                const colorClass = this.getColorClass(value, colorRanges[index]);
                if (colorClass) {
                    cell.classList.add(colorClass);
                }
            }
            
            row.appendChild(cell);
        });
        
        return row;
    }

    shouldApplyStatAnalysis(columnIndex, currentType, item) {
        // Only apply to weapons and armors, and only to relevant stat columns
        if (item.type !== 'weapon' && item.type !== 'armor') {
            return false;
        }

        if (item.type === 'weapon') {
            return [5, 7, 8, 9].includes(columnIndex); // rawAttack, attack, defense, speed
        } else if (item.type === 'armor') {
            return [6, 7, 8, 9].includes(columnIndex); // rawDefense, attack, defense, speed
        }

        return false;
    }

    updateTableHeader() {
        const headerRow = this.elements.itemsTable.querySelector('thead tr');
        if (!headerRow) return;
        
        // Remove any existing checkbox headers to avoid duplicates
        const existingCheckboxHeaders = headerRow.querySelectorAll('.checkbox-header');
        existingCheckboxHeaders.forEach(header => header.remove());
        
        // Get the first non-checkbox header
        const firstHeader = headerRow.querySelector('th:not(.checkbox-header)');
        if (!firstHeader) return;
        
        // Create and add checkbox header
        const checkboxHeader = document.createElement('th');
        checkboxHeader.className = 'checkbox-header';
        checkboxHeader.textContent = '☑️';
        
        // Insert before the first header
        headerRow.insertBefore(checkboxHeader, firstHeader);
    }

    calculateColorRanges(items) {
        const ranges = {};
        const statColumns = [5, 6, 7, 8, 9, 11]; // rawAttack, rawDefense, attack, defense, speed, power
        
        statColumns.forEach(columnIndex => {
            const values = items.map(item => {
                switch (columnIndex) {
                    case 5: return item.rawAttack || 0;
                    case 6: return item.rawDefense || 0;
                    case 7: return item.attack || item.finalAttack || 0;
                    case 8: return item.defense || item.finalDefense || 0;
                    case 9: return item.speed || item.finalSpeed || 0;
                    case 11: return item.power || 0;
                    default: return 0;
                }
            }).filter(v => v !== undefined && v !== null); // Only filter out undefined/null, keep 0
            
            if (values.length > 0) {
                // Calculate simple statistics
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                
                // If all values are the same, no color coding
                if (range === 0) {
                    ranges[columnIndex] = {
                        excellent: max + 1, // Impossible threshold
                        good: max + 1,
                        poor: min - 1
                    };
                } else {
                    // Calculate thresholds based on value distribution
                    const excellentThreshold = min + (range * 0.8); // Top 20% of the range
                    const goodThreshold = min + (range * 0.6);      // Top 40% of the range  
                    const poorThreshold = min + (range * 0.2);      // Bottom 20% of the range
                    
                    ranges[columnIndex] = {
                        excellent: excellentThreshold,
                        good: goodThreshold,
                        poor: poorThreshold
                    };
                }
            }
        });
        
        return ranges;
    }

    shouldApplyColorCoding(columnIndex, currentType) {
        // Only apply color coding to relevant stat columns based on item type
        if (currentType === 'weapons') {
            return [5, 7, 8, 9].includes(columnIndex); // rawAttack, attack, defense, speed
        } else if (currentType === 'armors') {
            return [6, 7, 8, 9].includes(columnIndex); // rawDefense, attack, defense, speed
        } else if (currentType === 'objects' || currentType === 'potions') {
            return [11].includes(columnIndex); // power
        } else if (currentType === 'all') {
            return [5, 6, 7, 8, 9, 11].includes(columnIndex); // All stat columns
        }
        return false;
    }

    getColorClass(value, range) {
        if (!range) return null;
        
        if (value >= range.excellent) {
            return 'stat-excellent';
        } else if (value >= range.good) {
            return 'stat-good';
        } else if (value <= range.poor) {
            return 'stat-poor';
        }
        return null;
    }

    removeColorClasses() {
        const allCells = this.elements.itemsTable.querySelectorAll('td');
        allCells.forEach(cell => {
            cell.classList.remove('stat-excellent', 'stat-good', 'stat-poor');
        });
    }
}