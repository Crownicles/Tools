# Étude classes × familiers

Simule des millions de combats PvP entre **toutes les combinaisons classe + familier** du dernier palier (niveau 100+), avec le vrai code de combat d'un Core compilé, puis génère une page HTML autonome :

- **Méta** : les meilleurs familiers de chaque classe les uns contre les autres, combinaisons sans contre, équilibre (ce que jouerait un champ de joueurs parfaits) ;
- **Classe contre classe** (tous familiers confondus) ;
- **Toutes les combinaisons** : score, attaque, défense, synergie, résultat contre chaque classe, meilleurs et pires adversaires ;
- **Classe × familier** : score, synergie, gain par rapport à « sans familier » ;
- **Familiers** : classement et grille familier contre familier ;
- **Attaques jouées** : part de chaque attaque par classe, attaques peu ou pas jouées.

Avec `auto`, **chaque classe porte l'équipement qui lui réussit le mieux** parmi des objets comparables portés par les joueurs de prod (tous de rareté 7, arme et armure +5, enchantements PvP de niveau 3), choisi par simulation (`gearSweep.py`). Sinon, tout le monde porte l'équipement donné. Même niveau pour tous. Les deux combattants jouent avec le **réseau des gardes du roi** (`Core/resources/kingGuardAi/model.json`), sans recherche. Aucune donnée n'est versionnée : tout est généré à chaque exécution, dans `.work/`.

## Utilisation

Prérequis : un checkout Crownicles avec `pnpm i` fait, `Core/config/config.toml` présent (la base de données n'est pas utilisée) et le Core compilé (`cd Core && pnpm tsc`), Node.js et Python 3 avec numpy.

```bash
./study.sh <checkoutCrownicles> auto|"<équipement>" [niveau] [sortie.html]
# équipement le plus adapté à chaque classe (environ 5 min au total)
./study.sh ~/Crownicles auto 157 study.html
# idem sans potion de combat pour personne
STUDY_POTIONS=none ./study.sh ~/Crownicles auto 157 study-sans-potion.html
# un même équipement pour tous, par exemple celui du n°1 de prod au 04/11/2026
./study.sh ~/Crownicles "0:89:5:pveAttack3|1:13:5:defense3|2:4:0:|3:4:0:" 157 study.html
```

L'équipement s'écrit `catégorie:id:niveau:enchantement` pour l'arme (0), l'armure (1), la potion (2) et l'objet (3), séparés par `|`. Pour le relever en prod :

```sql
SELECT itemCategory, itemId, itemLevel, itemEnchantmentId FROM inventory_slots WHERE playerId = <id> AND slot = 0;
```

Variables d'environnement : `STUDY_POTIONS` (`none` : pas de potion en mode `auto`), `FIGHTS_PER_PAIR` (6), `META_PER_CLASS` (12), `META_FIGHTS_PER_PAIR` (300), `WORKERS` (cœurs − 1), `STUDY_WORK_DIR`.

Avec les valeurs par défaut sur 15 cœurs : environ 4 min pour les 3,2 millions de combats entre toutes les combinaisons, puis environ 1 min pour les 2,1 millions de combats du méta.

## Après un changement d'équilibrage

1. Recompiler le Core du checkout.
2. Vérifier que le moteur de recherche reproduit toujours le jeu : `cd <checkout>/Core && node <ce dossier>/syncPetsTest.js 6` doit afficher `0 mismatches` (il compare chaque demi-tour, familiers compris, au vrai contrôleur de combat).
3. Si une attaque, une altération ou un pouvoir de familier a été ajouté, le réseau doit être réentraîné (sinon `comboRun.js` refuse le modèle).
4. Relancer `study.sh`.

## Limites

- Avec un équipement commun, une classe dont les objets diffèrent beaucoup en jeu (le Canonnier, par exemple) est sous-estimée : préférez `auto`.
- Les potions de combat pèsent lourd (jusqu'à +243 sur une statistique) alors que ce sont des consommables : comparez avec `STUDY_POTIONS=none`.
- Chaque familier compte autant, quelle que soit sa rareté.
- Le réseau joue bien mais pas parfaitement ; il peut sous-exploiter un familier qui demande un plan particulier.
- L'équilibre du méta est sensible au bruit des duels : gardez `META_FIGHTS_PER_PAIR` à 300 ou plus avant d'en tirer des conclusions.

## Fichiers

| Fichier | Rôle |
|---|---|
| `study.sh` | enchaîne tout |
| `gearSweep.py` | choisit l'équipement le plus adapté de chaque classe parmi des objets comparables |
| `comboRun.js` | répartit les combats sur les cœurs (`zworker.js`) et compte résultats et attaques |
| `world.js`, `engine.js`, `syncPets.js` | chargent le Core compilé, construisent les combattants, modèle de combat synchrone |
| `zfeatures.js`, `znet.js`, `zsearch.js` | entrées et inférence du réseau, choix des coups |
| `comboReport.py`, `metaReport.py` | statistiques, synergies, équilibre du méta |
| `comboPage.html` | gabarit de la page |
| `syncPetsTest.js` | test de fidélité du modèle de combat |
