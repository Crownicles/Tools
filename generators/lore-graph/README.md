# Graphe du lore

Interactive graph of every named character in Crownicles, plus the places and relations between them. It is meant as a reference when rewriting the story and designing quests.

Open `index.html` directly (no server needed). The data lives in `lore-data.js`.

## Features

- Nodes are coloured by category: royalty, NPCs, merchants, deities, spirits, legends, named bosses, factions, pop-culture references, staff (meta, hidden by default) and places.
- Unnamed but unique roles ("le Roi", "la Sorcière"…) have a dashed border.
- Clicking a node opens its sheet: role, description, quotes, places, clickable links and sources (`file:key` in `Lang/fr`, linked to GitHub at the extracted commit; `branch/file:key` links to that branch instead). It also highlights the node and its direct links and dims everything else; clicking the background clears it.
- Only the ~40 most connected names are labelled at first; the others appear when zooming in. Labels keep the same size on screen at any zoom level.
- The layout is frozen once computed ("Animer" restarts the simulation). Links to places and to the player are weak, so they do not pull the clusters together.
- The player is a node of its own (white star). It is shown by default in the proposal, where it is the hub of the quest lines, and hidden in the current lore, where its 92 links would swamp the layout.
- Double-clicking a node focuses on its neighbourhood, with configurable depth.
- The side panel shows filters by category and relation type, and a search over name, alias, role and description.
- **"Fils narratifs à exploiter"** lists named characters with no link to any other character. They are good candidates for new quests.
- The graph can be exported as PNG or JSON.

## Data

`extract/*.json` holds characters, relations and places in this shape:

```json
{"characters": [{"id", "name", "aliases", "named", "category", "role", "description", "locations", "sources", "quotes"}],
 "relations": [{"from", "to", "type", "label", "source"}],
 "places": [{"id", "name", "description", "sources"}]}
```

| File | Content |
|---|---|
| `A.json`, `B.json` | `Lang/fr/events.json` (big events 1-45 and 46-89) |
| `C1.json`, `C2.json` | `Lang/fr/smallEvents.json` |
| `D1.json` | `commands.json` → `report.city` (inns, blacksmiths, enchanter, notary, guild domain…) |
| `D2.json` | `models.json` (map locations, missions, PvE stories, monsters, items), `advices.json`, other `commands.json` keys |
| `E_cities.json` | Links between inns and shops and their city (`Core/resources/cities/*.json`) |
| `F_manual.json` | Links added by hand (castle rooms, mysterious islands, travelling-merchant names) |
| `G_karma_branch.json` | Names introduced by the rewritten events of the `outcomerequirements` branch (PR #3329), not yet on `develop` |

The first six files were extracted by reading the French text of the `develop` branch (commit `d23ffe883`). Descriptions are summaries, so check the source keys before relying on a detail.

To fix or enrich the data:

1. Edit or add a file in `extract/`, then merge duplicates in `aliases.json` (`"normalized-id": "canonical-id"`).
2. Regenerate the data:

```bash
python3 build.py --commit <sha-crownicles>
```

`build.py` merges entries that share an id, name or alias, and turns each character's `locations` into "se trouve à" links.

## Proposition de refonte

The header selector switches to `?dataset=proposition`. This dataset visualizes the lore rewrite proposal (no structured religion), described in [`documents/crownicles-lore-proposition.md`](../../documents/crownicles-lore-proposition.md). Its data lives in `proposal/proposition.json`.

```bash
python3 build.py proposal --commit proposition --out lore-proposal-data.js --var LORE_PROPOSAL
```

## Canon des lieux

`canon.py` writes appendix A of the lore proposal: for each place, what the game already says about it (description, neighbours and trip durations, city inn and shops, pet expedition zones, big events triggered there) plus the characters attached to it in `lore-data.js`. It reads the files with `git show` from a Crownicles checkout, so no checkout of the ref is needed, and replaces the block between `<!-- canon:start -->` and `<!-- canon:end -->`.

```bash
git -C ../../../Crownicles fetch origin develop
python3 canon.py --repo ../../../Crownicles --ref origin/develop
```
