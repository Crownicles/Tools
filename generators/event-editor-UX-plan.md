# Plan d'amélioration UX — Crownicles Event Editor

> Source : analyse Chrome DevTools sur l'app réelle + double revue indépendante (Claude Opus / GPT‑5.5).
> Contrainte absolue : **aucune perte de feature** (les 10 fonctionnalités existantes restent toutes opérationnelles).
> Fichiers concernés : `generators/event-editor.html`, `generators/css/event-editor.css`, `generators/js/event-editor.js`.

## Principes de travail
- Implémentation **incrémentale**, un lot = un commit (`<80` car., poussé après validation eslint/syntaxe).
- Après chaque lot : `node --check js/event-editor.js` + smoke test Chrome MCP (chargement, sélection event, export) pour garantir non‑régression.
- Vérifier à chaque étape les **garde-fous anti-régression** (section finale).
- Pas de framework : on reste en vanilla JS, tokens CSS existants.

---

## PHASE 0 — Garde-fous & socle (préparation)
**But : pouvoir vérifier la non‑régression à chaque commit.**

- [x] 0.1 — Inventaire de référence : capturer l'état actuel (nb events chargés, nb choix/sorties event #13, génération d'un `.patch` témoin) pour comparaison après chaque lot.
- [x] 0.2 — Helper interne `genId()` (id uniques pour liaisons label/champ) + helper `el(tag, attrs, children)` léger si utile (sans sur-ingénierie).
- [x] 0.3 — Mettre en place un petit harnais de smoke test manuel documenté (séquence Chrome MCP : load master → select 13 → toggle review → export).

---

## PHASE 1 — P0 : Accessibilité & sécurité du travail (priorité absolue)

### 1.1 Accessibilité des champs (WCAG 1.3.1 / 4.1.2)
- [x] 1.1.1 — `renderOutcome` : chaque `input[number]`, `select`, `checkbox`, `textarea` reçoit un `id` unique + `<label for>` (ou `aria-label` dérivé du libellé `.mini-field`). Cibler les **126** inputs / **33** textarea.
- [x] 1.1.2 — Champs ambigus (`MapLink`, `Effet`, `Event suivant`) : ajouter une description courte (`aria-describedby` ou title) sur le format attendu.
- [x] 1.1.3 — Inputs fichiers (texts/icons/effects) : `<label for>` explicite + texte du format (.json/.ts).
- [x] 1.1.4 — Textarea de texte de choix/sortie : label/`aria-label` (« Texte de la sortie N », « Texte du bouton du choix X »).
- [x] 1.1.5 — Vérif : `[...document.querySelectorAll('input,textarea,select')].every(e => e.labels?.length || e.getAttribute('aria-label'))` retourne `true` sur event #13.

### 1.2 Focus visible & clavier de base (WCAG 2.4.7 / 2.1.1)
- [x] 1.2.1 — CSS : remplacer tout `outline:none` par un `:focus-visible` cohérent (halo 2px `--accent-secondary`) sur `button`, `.btn`, `.btn-mini`, `input`, `select`, `textarea`, accordéons, `summary`.
- [x] 1.2.2 — Accordéons choix/sortie : rendre les entêtes activables au clavier (`role="button"` + `tabindex=0` + `Enter`/`Space`) **ou** convertir en vrai `<button>` ; ajouter `aria-expanded`/`aria-controls`.
- [x] 1.2.3 — Vérif : navigation `Tab` complète, focus toujours visible, accordéon ouvrable au clavier.

### 1.3 Prévention de perte de données (Nielsen #5)
- [x] 1.3.1 — Drapeau global `dirty` (déjà partiellement via `state.modified`) consolidé en un getter `isDirty()`.
- [x] 1.3.2 — `beforeunload` : avertir si `isDirty()` et modifications non exportées.
- [x] 1.3.3 — **Autosave** : sérialiser l'état d'édition (data + ordres + sets modified/created/deleted) en `localStorage`, clé par `owner/repo/branche`, debounce ~800 ms.
- [x] 1.3.4 — Restauration : au chargement, si un brouillon existe pour le repo/branche → bannière « Brouillon non exporté détecté · Restaurer / Ignorer ».
- [x] 1.3.5 — Purge du brouillon après export réussi (ou bouton « repartir de zéro »).
- [x] 1.3.6 — Vérif : éditer → recharger l'onglet → bannière proposée → restauration fidèle (mêmes badges modifiés, même `.patch`).

### 1.4 Suppressions réversibles (Nielsen #3)
- [x] 1.4.1 — Système de **toast** réutilisable (conteneur fixe, file d'attente, auto-dismiss 6–8 s, bouton « Annuler »).
- [x] 1.4.2 — `deleteEvent` / `deleteChoice` / `deleteOutcome` : capturer un **snapshot** de la donnée supprimée (textes + effets + emojis + ordres) avant suppression, et proposer « Annuler » qui restaure exactement.
- [x] 1.4.3 — Garantir que l'élément supprimé est **réellement** retiré du `.patch` tant que non annulé (pas de soft-delete fantôme dans le diff).
- [x] 1.4.4 — Remplacer les `confirm()` destructifs par : suppression immédiate + toast undo (modèle « delete-then-undo », plus fluide qu'un confirm).
- [x] 1.4.5 — Vérif : supprimer une sortie → Annuler → état identique ; supprimer sans annuler → absente du `.patch`.

### 1.5 Barre d'action sticky (Nielsen #1, #7)
- [x] 1.5.1 — Barre fine **sticky** (haut) toujours visible : nom repo@branche, compteur « N fichier(s) modifié(s) », bouton **Exporter**, bouton « Aperçu du diff ».
- [x] 1.5.2 — État visuel propre/modifié (pastille). Le panneau de chargement complet reste accessible mais peut se replier.
- [x] 1.5.3 — Vérif : sur event #13 (long), Exporter reste atteignable sans remonter en haut.

---

## PHASE 2 — P1 : Ergonomie & prévention d'erreurs

### 2.1 Aperçu du diff avant export (Nielsen #1, #2)
- [x] 2.1.1 — Modale « Aperçu du patch » : liste des fichiers (créé / modifié / supprimé) + diff unifié repliable par fichier.
- [x] 2.1.2 — Réutiliser la logique `exportPatch` existante pour générer le contenu (le preview = exactement le patch téléchargé).
- [x] 2.1.3 — Bloquer l'export si une validation échoue (JSON avancé invalide, champ requis manquant) ; afficher les erreurs.
- [x] 2.1.4 — Vérif : preview == fichier `.patch` (mêmes fichiers, mêmes hunks, créations/suppressions correctes).

### 2.2 Layout des sorties scalable (Nielsen #8)
- [x] 2.2.1 — Remplacer le scroll horizontal `flex:0 0 340px` par une **grille verticale responsive** (`grid` auto-fit `minmax(320px,1fr)`).
- [x] 2.2.2 — Mode « comparaison » optionnel (toggle) qui rétablit l'affichage côte à côte si souhaité.
- [x] 2.2.3 — Sorties repliables avec **résumé** (emoji + début de texte + effets clés) ; clic → édition complète.
- [x] 2.2.4 — Préserver et afficher l'**ordre** des sorties (l'index est signifiant côté jeu).
- [x] 2.2.5 — Vérif : 14 sorties de l'event #13 lisibles sans scroll horizontal ; ordre conservé à l'export.

### 2.3 Modales custom + validation (remplacer prompt/confirm)
- [x] 2.3.1 — Composant modale réutilisable (focus trap, `Esc`, overlay, bouton Annuler) avec tokens existants.
- [x] 2.3.2 — Création event / choix / sortie & renommages via formulaire intégré (valeurs par défaut, aide format).
- [x] 2.3.3 — Validation inline : ID event numérique unique, mapId triggers numériques, nom de choix non vide/valide, emoji non vide, nombres bornés.
- [x] 2.3.4 — Validation du **JSON avancé** au blur (format + signaler divergence avec champs structurés).
- [x] 2.3.5 — Vérif : plus aucun `prompt()/confirm()` natif ; erreurs affichées en clair, non bloquantes.

### 2.4 Recherche d'event scalable (Nielsen #6)
- [x] 2.4.1 — **Combobox filtrante** (input + liste déroulante filtrée, navigation flèches/Enter) au-dessus / à la place du `<select>`.
- [x] 2.4.2 — Conserver un `<select>` natif accessible en repli (ne pas dégrader l'a11y).
- [x] 2.4.3 — Recherche multi-critères : ID, titre, texte, trigger (mapId), statut « modifié ».
- [x] 2.4.4 — Indicateur « modifié » et (optionnel) regroupement par zone dans la liste.
- [x] 2.4.5 — Vérif : retrouver l'event #45 par titre et par mapId ; sélection au clavier.

### 2.5 Palette emoji + défauts de chargement
- [x] 2.5.1 — **Picker emoji** branché sur les icônes chargées depuis `CrowniclesIcons.ts` (recherche par nom, aperçu, insertion).
- [x] 2.5.2 — Alerte si l'emoji saisi n'existe pas dans les icônes exportables.
- [x] 2.5.3 — Branche par défaut = `master` (ou autodétection de la branche par défaut via l'API GitHub).
- [x] 2.5.4 — Vérif : insertion d'un emoji via picker ; chargement direct sans corriger la branche.

### 2.6 Raccourcis clavier (Nielsen #7)
- [x] 2.6.1 — `Cmd/Ctrl+S` = Exporter (ou ouvrir l'aperçu) ; `Cmd/Ctrl+F` = focus recherche event ; `Esc` = ferme modale/toast.
- [x] 2.6.2 — (Optionnel) Command palette `Cmd/Ctrl+K` : nouvel event, +choix, +sortie, exporter, aller à event, mode relecteur.
- [x] 2.6.3 — Vérif : raccourcis fonctionnels, n'interfèrent pas avec la saisie dans les champs.

---

## PHASE 3 — P2 : Finition & confort

- [x] 3.1 — Regrouper les 12 champs d'effets en `fieldset/legend` (Ressources / Navigation / Flags) ; replier les effets à zéro par défaut.
- [x] 3.2 — Badges « modifié » **cliquables** (scroll vers la section) + filtre « modifiés uniquement ».
- [ ] 3.3 — Rehausser le contraste `--text-secondary` (≈ `#475569`) pour hints/sous-titres/labels secondaires (WCAG 1.4.3).
- [ ] 3.4 — Responsive mobile : largeurs fluides (`min()`/`%`), supprimer les largeurs fixes 340/360px, toolbar repliée.
- [ ] 3.5 — Ajouter un favicon (supprime le 404, finition perçue).
- [ ] 3.6 — (Optionnel) Tokens **dark mode** prêts via les variables CSS existantes.
- [ ] 3.7 — Renforcer le **mode relecteur** : navigation rapide entre textes, indicateurs de sorties.

---

## Garde-fous anti-régression (à valider en continu)
1. Garder un `<select>` accessible derrière la combobox (pas de perte clavier/lecteur d'écran).
2. **Conserver l'éditeur JSON brut** comme source de vérité pour les effets non couverts par les 12 champs (pas de perte au round-trip).
3. Préserver l'**ordre des outcomes** (index signifiant) au passage scroll horizontal → grille.
4. L'élément en attente d'undo ne doit **pas** déjà disparaître du `.patch`.
5. Ne pas remplacer le chargement local par un flux GitHub-only.
6. L'aperçu du diff doit refléter **exactement** le `.patch` généré.
7. Mode relecteur doit rester capable d'accéder rapidement aux textes de toutes les sorties.

## Definition of Done (global)
- Toutes les fonctionnalités 1→10 toujours opérationnelles (test Chrome MCP).
- `node --check js/event-editor.js` OK ; aucune erreur console au chargement (hors favicon si non traité).
- Sur event #13 : tous les champs ont un nom accessible ; export = aperçu ; pas de scroll horizontal forcé ; suppression annulable ; autosave/restore OK.
- Commits incrémentaux poussés (un par lot cohérent).
