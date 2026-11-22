# Réécriture des big events

Before / after viewer for the big events of Crownicles. It compares two branches of `Crownicles/Crownicles`, loaded from GitHub in the browser (`github.js`), and shows each changed event side by side: introduction, choice labels and outcomes. Each outcome shows its text, its conditions and its consequences (health, money, time, karma, status effect, item, materials, destination…).

Open `index.html` directly (no server needed). The comparison is shareable: `index.html?base=develop&head=outcomerequirements#30` (the hash is the event id).

- "Avant" is the base branch, read at the point where the compared branch left it (like a pull request, so commits added to the base since then don't show up as reverted); "Après" is the compared branch.
- Only the events whose texts (`Lang/fr/events.json`) or mechanics (`Core/resources/events/<id>.json`) differ are listed, unless "Inclure les events identiques" is checked. Changed outcomes and intros get a "modifiée" badge, added ones a "nouvelle" badge.
- Place names, city menus, pet and class names and event icons are read from the "Après" branch. Neighbours and pet rarities load in the background.
- Each comparison uses 5 GitHub API calls (the merge base and folder listings), plus 2 for the branch list (cached 10 min). Unauthenticated, GitHub allows 60 calls per hour. Files come from `raw.githubusercontent.com`, which is not counted.

## Features

- By default only the texts are shown: introduction, then for each choice its label and its outcomes, each with a short condition tag and one line of consequences. Outcomes with the same id sit on the same row.
- The place context is folded, with a one-line summary: game description, neighbours and travel times, city menu, triggers.
- The sidebar lists the events with their status (modified / new / removed), outcome counts before → after and the share of conditional outcomes.
- **Profil de joueur** (sidebar, folded): set level, karma, stats, class, pet, cooking level, a full or empty material bag, the upgrade level and enchantment of the weapon and armor to grey out the outcomes this player cannot get. Possible outcomes show their odds (the game picks uniformly among them). The profile is saved in `localStorage`.
- Below 1000 px the before/after columns are interleaved in a single column.

## Rewrite workshop (`src/`)

The tools used to write the events. The events themselves live in the Crownicles branches: `src/input/` and `src/out/` are local working copies, ignored by git.

| Path | Content |
|---|---|
| `prepare.py <Crownicles dir> <id> [--draft-ref <commit>]` | Writes `input/<id>.json`: place, neighbours, city menu, canon block, triggers, develop's texts and mechanics, and optionally a draft (a contributor's, or the current branch version with `--draft-ref HEAD`) |
| `brief.md`, `reference.md` | The writer brief and the data reference (fields, thresholds, materials, karma) |
| `draft-rework.md` | Brief for reworking a contributor's draft |
| `repasse.md` | Brief for reworking an event already rewritten before the current rules |
| `out/<id>.json` | The rewrite: texts, `data` (mechanics and `requirements`), `icons`, `notes` |
| `validate.py <id>` | Checks style, lengths, data, destinations and that every player profile has an outcome |
| `apply.py <Crownicles dir> [ids]` | Writes the rewrites to the Crownicles branch (French texts, event files, icons) |
| `pets.json`, `classes.json`, `materials.json` | Reference lists for the writers and the validator |

Review the result with the viewer once the branch is pushed.
