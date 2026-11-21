# Réécriture des big events

Before / after viewer for the rewritten big events of Crownicles. For each event it shows the original and the rewrite side by side: introduction, choice labels and outcomes. Each outcome shows its text, its conditions and its consequences (health, money, time, karma, status effect, item, destination…).

Open `index.html` directly (no server needed). The data lives in `data.js`. Link to an event with its id: `index.html#56`.

## Features

- By default only the texts are shown: introduction, then for each choice its label and its outcomes, each with a short condition tag and one line of consequences. Outcomes keep their ids in the rewrites, so before/after outcomes with the same id sit on the same row. Added outcomes and choices get a small "nouvelle" badge.
- Everything else is folded, with a one-line summary: the place context (game description, neighbours and travel times, city menu, triggers, AI model, full canon block), the agent notes and the `validate.py` output.
- The sidebar lists the events with their status (rewritten / in progress / validator errors), outcome counts before → after and the share of conditional outcomes.
- **Profil de joueur** (sidebar, folded): set level, karma, stats, class and pet to grey out the rewritten outcomes this player cannot get. Possible outcomes show their odds (the game picks uniformly among them). The profile is saved in `localStorage`.
- Below 1000 px the before/after columns are interleaved in a single column.

## Data

```bash
python3 build.py [--src <rewrite dir>] [--lang <Crownicles/Lang/fr>] [--out data.js]
```

`--src` is the rewrite working folder (defaults to `src/`). It also holds the brief given to the writers (`brief.md`, `reference.md`). It holds:

| Path | Content |
|---|---|
| `input/<id>.json` | Context and original version of an event: place, neighbours, city menu, canon block, triggers, original texts and mechanics |
| `out/<id>.json` | The rewrite: texts, `data` (mechanics and `requirements`), `icons`, `notes`. Events without one are shown as "en cours". |
| `pets.json`, `classes.json` | Names used to display pet and class conditions |
| `validate.py` | Run for each rewrite; its errors and warnings are embedded |

`--lang` (defaults to `../../../Crownicles/Lang/fr`) is only used to show French names for inns, meals, rooms, shops and services. Without it, ids are shown.

Re-run `build.py` whenever a rewrite changes.
