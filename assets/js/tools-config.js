const toolsConfig = [
    {
        id: 'ckwalide',
        title: 'Ckwalidé',
        description: "Outil principal pour trouver les identifiants (IDs) des objets, familiers et lieux. Indispensable pour les testeurs et les joueurs.",
        path: 'generators/ckwalide.html',
        category: 'Principal',
        tags: ['Populaire', 'Recherche', 'IDs'],
        icon: '🔍',
        status: 'active'
    },
    {
        id: 'pet-food',
        title: 'Simulateur de nourriture (familiers)',
        description: 'Simule la courbe de probabilité de recherche de nourriture selon le délai de nourrissage et la force.',
        path: 'generators/pet-food-simulator.html',
        category: 'Simulation',
        tags: ['Familiers', 'Probabilité', 'Mathématiques'],
        icon: '🍖',
        status: 'active'
    },
        {
        id: 'pet-exploration',
        title: 'Simulateur pour les expéditions (familiers)',
        description: 'Simule les expéditions.',
        path: 'generators/expedition-simulator.html',
        category: 'Simulation',
        tags: ['Familiers', 'Probabilité', 'Mathématiques'],
        icon: '📊',
        status: 'active'
    },
    {
        id: 'item-explorer',
        title: 'Explorateur d\'Objets',
        description: 'Comparaison avancée d\'objets, filtrage et analyse statistique. Idéal pour l\'équilibrage des items.',
        path: 'generators/item-explorer/index.html',
        category: 'Développement',
        tags: ['Équilibrage', 'Objets', 'Statistiques'],
        icon: '⚔️',
        status: 'active'
    },
    {
        id: 'map-visualizer',
        title: 'Visualiseur de carte',
        description: 'Visualise les emplacements et liens de carte. Utile pour les développeurs et agréable pour explorer.',
        path: 'generators/map-visualizer/index.html',
        category: 'Visualisation',
        tags: ['Carte', 'Graphe', 'Visuel'],
        icon: '🗺️',
        status: 'active'
    },
    {
        id: 'tournament-explorer',
        title: 'Résultats de tournois',
        description: 'Analyse des résultats CSV des tournois. Taux de victoire, matchups et top performers.',
        path: 'generators/tournament-results-explorer.html',
        category: 'Développement',
        tags: ['Données', 'Tournois', 'Analyse'],
        icon: '🏆',
        status: 'active'
    },
    {
        id: 'class-balancing',
        title: 'Équilibrage des classes',
        description: 'Visualiser et ajuster les changements de statistiques des classes pour l\'équilibrage.',
        path: 'generators/classBalancing.html',
        category: 'Développement',
        tags: ['Classes', 'Stats', 'Équilibrage'],
        icon: '⚖️',
        status: 'active'
    },
    {
        id: 'items-csv',
        title: 'Items JSON → CSV',
        description: 'Convertit les fichiers JSON d\'objets en CSV pour une utilisation dans Excel.',
        path: 'generators/itemCSVGenerator.html',
        category: 'Développement',
        tags: ['Convertisseur', 'JSON', 'CSV'],
        icon: '📄',
        status: 'active'
    },
    {
        id: 'missions',
        title: 'Générateur de missions',
        description: 'Génère les fichiers JSON pour les missions. Outil ancien mais toujours utile.',
        path: 'generators/missions.html',
        category: 'Générateurs',
        tags: ['Générateur', 'JSON'],
        icon: '📜',
        status: 'legacy'
    },
    {
        id: 'monsters',
        title: 'Générateur de monstres',
        description: 'Génère les fichiers JSON pour les monstres. Outil ancien mais toujours utile.',
        path: 'generators/monsters.html',
        category: 'Générateurs',
        tags: ['Générateur', 'JSON', 'Monstres'],
        icon: '👾',
        status: 'legacy'
    },
    {
        id: 'events',
        title: 'Générateur d\'événements',
        description: 'Génère les fichiers JSON pour les événements. Actuellement pas à jour (à mettre à jour).',
        path: 'generators/events.html',
        category: 'Générateurs',
        tags: ['Générateur', 'JSON', 'Événements'],
        icon: '📅',
        status: 'obsolete'
    },
    {
        id: 'map-graph',
        title: 'Graphe de la carte',
        description: 'Vue en graphe des nœuds de la carte.',
        path: 'generators/mapGraph.html',
        category: 'Visualisation',
        tags: ['Carte', 'Nœuds'],
        icon: '🕸️',
        status: 'obsolete'
    },
    {
        id: 'mission-p2p',
        title: 'Mission Lieu-à-Lieu',
        description: 'Aide à la génération de missions type lieu-à-lieu.',
        path: 'generators/mission-place-to-place.html',
        category: 'Développement',
        tags: ['Missions', 'Carte'],
        icon: '📍',
        status: 'active'
    }
];
