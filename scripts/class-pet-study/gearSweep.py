"""Picks the most suitable gear of each class among comparable items (same rarity, upgrade and enchantment level):
every class tries every weapon x armor x object x potion candidate against a field of every class, and keeps the
best; a second round replays it against the field wearing the gear chosen in the first round.

usage: python3 gearSweep.py <crowniclesCheckout> <out.json> [fights per pair]
"""
import itertools
import json
import os
import subprocess
import sys

import numpy as np

repo, out_file = sys.argv[1], sys.argv[2]
core = os.path.join(repo, "Core")
N = int(sys.argv[3]) if len(sys.argv) > 3 else 40
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("STUDY_WORK_DIR", os.path.join(HERE, ".work"))
CLASSES = [18, 19, 20, 21, 22, 23, 24]
# Candidates worn by the level 120+ players of prod, all rarity 7, weapon and armor +5, best PvP enchantments
WEAPONS = {"balanced": "0:89:5:pvpAttack3", "attack": "0:27:5:pvpAttack3", "speed": "0:96:5:pvpAttack3"}
ARMORS = {"defense": "1:13:5:defense3", "balanced": "1:61:5:defense3", "speed": "1:62:5:defense3"}
OBJECTS = {"speed": "3:4:0:", "attack": "3:3:0:", "defense": "3:38:0:"}
POTIONS = {"speed": "2:4:0:", "attack": "2:46:0:", "defense": "2:52:0:"}
# STUDY_POTIONS=none: nobody drinks a fight potion (potions are consumables many players fight without)
if os.environ.get("STUDY_POTIONS") == "none":
    POTIONS = {"none": "2:0:0:"}
# Starting guess: what the best players of each class wear
START = {18: ("balanced", "defense", "speed", "speed"), 19: ("attack", "defense", "defense", "defense"),
         20: ("speed", "speed", "defense", "speed"), 21: ("balanced", "defense", "speed", "speed"),
         22: ("balanced", "defense", "speed", "defense"), 23: ("balanced", "balanced", "speed", "speed"),
         24: ("speed", "defense", "speed", "attack")}
if "speed" not in POTIONS:
    START = {c: (*gear[:3], next(iter(POTIONS))) for c, gear in START.items()}

pet_names = json.load(open(os.path.join(repo, "Lang/fr/models.json")))["pets"]
pet_by_name = {name: int(key.split("_")[0]) for key, name in pet_names.items() if key.endswith("_male")}
FIELD_PETS = [pet_by_name[n] for n in ("Lion", "Chauve-souris", "Gorille")]
VARIANT_PET = pet_by_name["Lion"]


def gear(w, a, o, p):
    return "|".join([WEAPONS[w], ARMORS[a], POTIONS[p], OBJECTS[o]])


def sweep(current, round_id):
    sets, combos = {}, []
    variants = list(itertools.product(WEAPONS, ARMORS, OBJECTS, POTIONS))
    for c in CLASSES:
        for v in variants:
            key = f"c{c}_" + "_".join(v)
            sets[key] = gear(*v)
            combos.append([c, VARIANT_PET, key])
    field_start = len(combos)
    for c in CLASSES:
        sets[f"field{c}"] = gear(*current[c])
        combos += [[c, p, f"field{c}"] for p in FIELD_PETS]
    out = os.path.join(WORK, f"gear_sweep_{round_id}.json")
    subprocess.run(["node", "comboRun.js", "--core", core, "--gear-sets", json.dumps(sets), "--combos", json.dumps(combos),
                    "--field-start", str(field_start), "--n", str(N), "--pairs-per-task", "64", "--out", out], cwd=HERE, check=True)
    run = json.load(open(out))
    C = len(combos)
    counts = np.array(run["counts"], dtype=np.float64).reshape(C, C, 3)
    n = counts.sum(2)
    att = np.divide(counts[:, :, 1] + 0.5 * counts[:, :, 0], n, out=np.zeros_like(n), where=n > 0)
    score = np.zeros(field_start)
    for i in range(field_start):
        cols = range(field_start, C)
        score[i] = np.mean([0.5 * (att[i, j] + 1 - att[j, i]) for j in cols])
    best, table = {}, {}
    for k, c in enumerate(CLASSES):
        rows = range(k * len(variants), (k + 1) * len(variants))
        ranked = sorted(rows, key=lambda i: -score[i])
        best[c] = variants[ranked[0] - k * len(variants)]
        table[c] = [{"gear": variants[i - k * len(variants)], "score": round(float(score[i]), 4)} for i in ranked[:5]]
        print(f"  {c}: {best[c]} {100 * score[ranked[0]]:.1f} (2nd {100 * score[ranked[1]]:.1f}, start {100 * score[k * len(variants) + variants.index(current[c])]:.1f})")
    return best, table


os.makedirs(WORK, exist_ok=True)
current = dict(START)
history = []
for round_id in (1, 2):
    print(f"round {round_id}")
    best, table = sweep(current, round_id)
    history.append(table)
    current = best
result = {"gearByClass": {str(c): gear(*current[c]) for c in CLASSES}, "choice": {str(c): current[c] for c in CLASSES}, "top5": history[-1],
          "fieldPets": FIELD_PETS, "variantPet": VARIANT_PET}
json.dump(result, open(out_file, "w"), indent=1)
print(json.dumps(result["choice"]))
