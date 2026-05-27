# Crownicles — Map Builder

Outil web autonome (HTML/CSS/JS) pour éditer visuellement la carte du jeu Crownicles et
pousser les changements via auto-PR sur les dépôts `Crownicles/Crownicles` (coordonnées et
définitions) et `Crownicles/Website` (rendus d'images).

## Lancement

L'outil nécessite un petit serveur HTTP local (les appels GitHub API et le chargement
d'images depuis `raw.githubusercontent.com` ne fonctionnent pas en `file://` à cause des
restrictions CORS).

```bash
cd /Users/bastlast/WebstormProjects/Tools/generators/map-builder
python3 -m http.server 8765
# puis ouvrir http://localhost:8765
```

Aucune dépendance Node, aucun build. Seul JSZip est chargé depuis un CDN (jsDelivr).

## Configuration

1. **PAT GitHub** : générer un PAT *fine-grained* avec les droits `contents: write` et
   `pull_requests: write` sur les deux dépôts. Le coller dans le champ correspondant et
   cliquer « Sauver token ». Il est stocké en `localStorage` sous la clé `mapBuilderPat`
   (n'est jamais loggué ni envoyé ailleurs que sur api.github.com).
2. **Branches** : par défaut `develop` côté Crownicles, `master` côté Website.
3. Cliquer **Charger** pour récupérer tous les fichiers `mapCoords`, `mapLocations`,
   `mapLinks` ainsi que `models.json` (noms de lieux).

## Modes

- **Viewer** (lecture seule) : navigation, zoom, pan, inspection.
- **Editor** : drag des marqueurs, édition des coordonnées, ajout / suppression, undo /
  redo, drag-and-drop de fond d'écran.

## Onglets

Un onglet par fichier `generators/map-builder/mapCoords/*.json` (stocké dans ce repo Tools).
Le bouton `+ Nouvelle page` crée
une nouvelle `mapPage` avec des valeurs par défaut raisonnables (marker `cross.png`).

## Statuts des marqueurs

- **Synchronisé** : mapLocation présent ET coords définies.
- **Coords manquantes** : mapLocation matche les `includeAttributes` / `idRange` de la page
  mais n'a pas de coords → placé au centre, contour rouge.
- **Coords orphelines** : entrée dans `mapCoords` sans mapLocation correspondante → en
  rouge, suppression proposée.

Les arêtes inter-pages (ex. `1101_1102`) apparaissent sur **les deux pages** ; les coords
sont stockées indépendamment sur chaque page.

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
