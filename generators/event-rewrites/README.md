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

## Writing the events

The rules, the briefs given to the writers and the scripts that prepare, validate and apply a rewrite live in the Crownicles repository, in the `write-event-texts` skill (`.github/skills/write-event-texts/`). Review the result here once the branch is pushed.
