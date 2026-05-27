# Crownicles — Map Builder

Outil web autonome (HTML/CSS/JS) pour éditer visuellement la carte du jeu Crownicles et
pousser les changements via auto-PR sur les dépôts `Crownicles/Crownicles` (coordonnées et
définitions) et `Crownicles/Website` (rendus d'images).

## Lancement

L'outil nécessite un petit serveur HTTP local (les appels GitHub API et le chargement
d'images depuis `raw.githubusercontent.com` ne fonctionnent pas en `file://` à cause des
restrictions CORS).

```bash
python3 -m http.server --directory /Users/bastlast/WebstormProjects/Tools/generators/map-builder 8765
# puis ouvrir http://localhost:8765
```

Aucune dépendance Node, aucun build. Seul JSZip est chargé depuis un CDN (jsDelivr).

## Configuration

1. **PAT GitHub** : générer un PAT *fine-grained* avec les droits `contents: write` et
   `pull_requests: write` sur les deux dépôts. Le coller dans le champ correspondant et
   cliquer « Sauver token ». Il est stocké en `localStorage` sous la clé `mapBuilderPat`
   (n'est jamais loggué ni envoyé ailleurs que sur api.github.com).
2. **Branches** : par défaut `master` côté Crownicles (reflète la production), `master`
   côté Website. Pour prévisualiser `develop` ou une branche WIP, changer le champ
   « Branche Crownicles ».
   Le panneau « Dépôts avancés » permet aussi de changer le **repo + branche `mapCoords`**
   (par défaut `Crownicles/Tools@master`) et de sélectionner une **saison**
   (`normal` / `halloween` / `christmas`) qui influe sur le nom de fond chargé
   (variant `…_halloween.jpg` essayé en premier avant fallback sur le fond de base).
3. Cliquer **Charger** pour récupérer tous les fichiers `mapCoords`, `mapLocations`,
   `mapLinks` ainsi que `models.json` (noms de lieux).

## Modes

- **Viewer** (lecture seule) : navigation, zoom, pan, inspection.
- **Editor** : drag des marqueurs, édition des coordonnées, ajout / suppression, undo /
  redo, drag-and-drop de fond d'écran.

## Onglets

Un onglet = une zone géographique = une image de fond. Un fichier
`generators/map-builder/mapCoords/*.json` par onglet (stocké dans ce repo Tools). Chaque
page filtre les `mapLocations` selon ses `includeAttributes` (et optionnellement
`idRange`).

Pages actuelles :

- `main_continent` — Continent principal (attributs `continent1`, `king_castle`,
  `main_continent`).
- `volcano_island` — Île volcanique PvE (`pve_island_entry`, `pve_island`, id ≥ 1000).
- `ice_exterior` / `ice_interior` — Île gelée extérieur / intérieur.
- `haunted_house` — Maison hantée d'Halloween (attribut `haunted`). Le fond
  `haunted_<lang>.jpg` doit être présent dans le dépôt Website (`public/ressources/`).

Le bouton `+ Nouvelle page` crée
une nouvelle `mapPage` avec des valeurs par défaut raisonnables (marker `cross.png`).

### Types de lieux non rendus

Les `mapLocations` avec `type: "continent"` sont des pseudo-lieux logiques (le continent
en tant qu'entité, pas un endroit visitable). Ils sont volontairement exclus de la liste
« Coords manquantes » et du rendu sur la carte.

## Placer un marqueur manquant (drag-and-drop)

Les `mapLocations` / liens sans coordonnées apparaissent dans le panneau de droite sous
« Coords manquantes » avec le hint orange `↪ glisse sur la carte`. Pour les placer :

1. Passer en mode **Editor**.
2. Saisir l'élément dans la liste de droite (curseur `grab`).
3. Glisser-déposer sur la carte à l'emplacement voulu (contour orange en survol).
4. Le marqueur passe en « Synchronisés » et peut être ajusté à la souris ou via
   l'inspecteur.

Tant qu'un élément n'est pas placé, il n'est **pas exporté** : le ZIP de coords et le
push GitHub n'embarquent que les entrées effectivement positionnées.

## Statuts des marqueurs

- **Synchronisé** : mapLocation présent ET coords définies.
- **Coords manquantes** : mapLocation matche les `includeAttributes` / `idRange` de la page
  mais n'a pas de coords → listé à droite uniquement, **pas dessiné sur le canvas**,
  draggable vers la carte pour être placé.
- **Coords orphelines** : entrée dans `mapCoords` sans mapLocation correspondante → en
  rouge, suppression proposée.

Les arêtes inter-pages (ex. `1101_1102`) apparaissent sur **les deux pages** ; les coords
sont stockées indépendamment sur chaque page.

## Saisons (Halloween, Noël, …)

Trois leviers indépendants permettent de gérer un event saisonnier :

1. **Fond saisonnier (zéro modif de schéma)** : si le panneau « Saison » est sur
   `halloween`, le tool charge `<basename>_halloween.<ext>` en priorité, puis retombe sur
   le fond classique. Il suffit donc de pousser un PNG suffixé `_halloween` dans
   `Crownicles/Tools/generators/Ressources/` (ou côté Website) pour que l'outil l'affiche.
2. **Topologie saisonnière par branche** : pour une carte avec des nœuds différents,
   le plus simple est de créer une branche `halloween-2026` sur le repo `Tools`, d'y
   modifier les JSON `mapCoords/*.json` puis de pointer le tool dessus via le champ
   « Branche mapCoords ». La branche `master` reste intacte.
3. **Tag `seasons` par nœud / arête** : l'inspecteur expose un champ « Saisons » (liste
   séparée par virgules). Un marqueur tagué `halloween` n'est rendu (et exporté pour
   image) qu'en saison `halloween`. Un champ vide = toujours visible (comportement par
   défaut, rétro-compatible).

## Rendu d'images

Reproduit le naming de l'ancien script `.py` :

- `<lang>_<id>_map.webp` pour les nœuds
- `<lang>_<id1>_<id2>_map.webp` pour les arêtes

Options : page courante / toutes les pages / toutes les pages × toutes les langues.
Sortie WebP avec slider qualité (défaut 0.9) et taille maximale de la plus grande
dimension (défaut 1920 px). Téléchargement en ZIP ou push direct vers le dépôt Website.

## Auto-PR

Pour chaque dépôt modifié :

1. Vérification du PAT (`GET /user`).
2. Création d'une branche `map-update-<timestamp>` à partir de la branche de base.
3. Upload de tous les fichiers modifiés via `PUT /repos/.../contents/{path}` (base64).
4. Ouverture de la PR avec un changelog généré listant les fichiers touchés.

Mode **dry-run** : affiche les appels API qui seraient effectués sans rien envoyer (utile
pour vérifier).

## Limites connues

- Desktop only (pas optimisé mobile).
- Le push d'images binaires lourdes peut être lent (l'API Contents passe le contenu en
  base64 dans le JSON).
- L'ajout de nouveaux `mapLocations` / `mapLinks` n'est pas implémenté dans le formulaire
  (une todo est affichée — créer ces fichiers à la main dans l'IDE pour l'instant).
