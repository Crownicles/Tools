# Image de l'aide des combats

Génère l'image affichée par `/aide combat` dans **toutes les langues du jeu**, dans le style du site [crownicles.com](https://crownicles.com) : sa bannière, son titre, ses cartes et ses chiffres, en thème Nuit par défaut. Une carte par action de combat des classes, avec sa puissance, sa précision, ses coups critiques, son coût en souffle et sa description.

Rien n'est recopié à la main : l'image se régénère après chaque équilibrage ou changement de texte.

| Ce qui est affiché | D'où ça vient |
|---|---|
| Les actions | `fightActionsIds` de toutes les classes (`Core/resources/classes`) |
| Puissance, précision, critique | **mesurées avec le Core compilé** (voir plus bas) |
| Souffle | `Core/resources/fightActions` |
| Noms et descriptions | `Lang/<langue>/models.json` (`fight_actions`), avec les mêmes langues de repli que le bot (anglais, puis français) |
| Émojis | `CrowniclesIcons.fightActions`, dessinés avec Twemoji comme sur Discord |
| Titre et noms des chiffres | `src/labels.mjs`, avec les termes que le jeu emploie déjà dans chaque langue |
| Police, bannière, logo | le checkout du site (`public/fonts`, `public/ressources`) |

## Utilisation

Prérequis :

- un checkout Crownicles avec `pnpm i` fait, `Core/config/config.toml` présent (la base de données n'est pas utilisée) et le Core compilé (`cd Core && pnpm tsc`) ;
- un checkout de [Crownicles/Website](https://github.com/Crownicles/Website) ;
- Node.js 24, puis `pnpm i` dans ce dossier ;
- Chrome installé, ou le Chromium de Playwright (`pnpm exec playwright install chromium`).

```bash
pnpm generate --crownicles ~/Crownicles --website ~/Website --version 6.2.0
# une seule langue, en thème Jour
pnpm generate --crownicles ~/Crownicles --website ~/Website --version 6.2.0 --languages fr --theme light
```

Options : `--version` (par défaut, la version de `Core/package.json`), `--languages` (par défaut, tous les dossiers de `Lang/`), `--theme` (`dark` ou `light`), `--scale` (1,5 par défaut, l'image fait alors 3 300 pixels de large).

Les images sont écrites dans `Website/public/ressources/fighthelp/<langue>/<version>.png`, et les chiffres mesurés sont affichés dans le terminal pour les vérifier. Pour les publier :

1. pousser les images sur le site ;
2. dans Crownicles, passer `HelpConstants.FIGHT_HELP_IMAGE_URL` à la nouvelle version. Discord garde les images en cache par adresse : une nouvelle image doit avoir une nouvelle adresse.

## Mesure des chiffres

Chaque action est jouée avec son vrai code, entre deux combattants du Core, dans toutes les combinaisons de ces situations : tours 1 à `FightConstants.MAX_TURNS`, niveaux du lanceur de 1 à 150, vitesses de 10 à 600 pour chaque combattant, énergie du lanceur pleine ou basse, 0 à 5 utilisations précédentes de l'action, dernière action de l'adversaire (aucune, repos ou attaque simple).

L'outil relève ce que l'action demande au `FightActionController` :

- **Puissance** : les dégâts moyens (`averageDamage`) de l'attaque ;
- **Précision** : 100 − la probabilité d'échec ;
- **Critique** : la probabilité de coup critique.

Quand un chiffre change selon la situation (la précision de l'attaque rapide selon la vitesse de l'adversaire, celle de l'attaque divine selon le tour...), l'image donne la plus petite et la plus grande valeur. Une action qui prépare une attaque (`chargeUltimateAttack`...) affiche les chiffres de cette attaque. La riposte, qui rejoue l'action de l'adversaire, n'a pas de chiffres à elle.

## Ajouter une langue

Ajouter ses mots dans `src/labels.mjs`. Sans eux, l'outil s'arrête en indiquant la langue qui manque.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/cli.mjs` | lit les options, mesure les actions et écrit une image par langue |
| `src/actions.mjs` | charge le Core compilé et mesure les actions des classes |
| `src/texts.mjs` | lit les noms et descriptions traduits |
| `src/labels.mjs` | titre et noms des chiffres dans chaque langue |
| `src/page.mjs` | page HTML, avec les couleurs et les composants du site |
| `src/assets.mjs` | police, bannière et logo lus dans le checkout du site |
| `src/emoji.mjs` | émojis Twemoji |
| `src/format.mjs` | nombres et pourcentages écrits comme dans chaque langue |
| `src/render.mjs` | capture de la page avec Chromium |

Tests : `pnpm test`.
