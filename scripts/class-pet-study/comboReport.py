"""Builds the data of the class + pet combination page from comboRun.js results.

usage: python3 comboReport.py <combo.json> <repoRoot> <out.json>
<repoRoot> is a Crownicles checkout, for the French names of the classes, pets and moves.
"""
import json
import math
import sys

import numpy as np

run = json.load(open(sys.argv[1]))
repo = sys.argv[2]
models = json.load(open(f"{repo}/Lang/fr/models.json"))
commands = json.load(open(f"{repo}/Lang/fr/commands.json"))
comments = commands["shop"]["shopItems"]["lovePointsValue"]["commentOnFightEffect"]

classes, pet_ids, combos, N = run["classes"], run["petIds"], run["combos"], run["N"]
C = len(combos)
counts = np.array(run["counts"], dtype=np.float64).reshape(C, C, 3)  # [attacker, defender, draw/att win/def win]
n_pair = counts.sum(2)
# Attacker's score in each ordered pair (draw = half)
att = (counts[:, :, 1] + 0.5 * counts[:, :, 0]) / n_pair
# Score of combo i against combo j, both roles: half as attacker, half as defender
vs = 0.5 * (att + (1 - att.T))

cls_of = np.array([c for c, _ in combos])
pet_of = np.array([p for _, p in combos])
class_idx = {c: i for i, c in enumerate(classes)}
pet_idx = {p: i for i, p in enumerate(pet_ids)}
K, P = len(classes), len(pet_ids)

score = vs.mean(1)
attack = att.mean(1)
defense = (1 - att).mean(0)
draws = (counts[:, :, 0].sum(1) + counts[:, :, 0].sum(0)) / (n_pair.sum(1) + n_pair.sum(0))
fights_per_combo = n_pair.sum(1) + n_pair.sum(0)
se = np.sqrt(score * (1 - score) / fights_per_combo)

# Class x class: average over every pet on both sides
class_vs = np.zeros((K, K))
for a in range(K):
    for b in range(K):
        class_vs[a, b] = vs[np.ix_(cls_of == classes[a], cls_of == classes[b])].mean()
class_score = np.array([score[cls_of == c].mean() for c in classes])

# Combo against each opponent class
combo_vs_class = np.stack([vs[:, cls_of == c].mean(1) for c in classes], 1)

# Pet: average over classes; synergy = combo score - class mean - pet effect (pet mean - grand mean)
grand = score.mean()
pet_score = np.array([score[pet_of == p].mean() for p in pet_ids])
synergy = np.array([score[i] - class_score[class_idx[cls_of[i]]] - (pet_score[pet_idx[pet_of[i]]] - grand) for i in range(C)])

# Pet x pet (both sides averaged over classes)
pet_vs = np.zeros((P, P))
for a in range(P):
    ma = pet_of == pet_ids[a]
    for b in range(P):
        pet_vs[a, b] = vs[np.ix_(ma, pet_of == pet_ids[b])].mean()


powers = run["petPowers"]


def first(text):
    return text[0] if isinstance(text, list) else text


pets = []
for p in pet_ids:
    ids = powers.get(str(p), [])
    pets.append({
        "id": p,
        "name": models["pets"].get(f"{p}_male", str(p)),
        "powers": [{"id": i, "desc": first(comments.get(i, ""))} for i in ids],
    })

r = lambda x: round(float(x), 4)
data = {
    "setup": {"level": run["level"], "gear": run["gear"], "fightsPerPair": N, "combos": C, "fights": int(n_pair.sum()),
              "seconds": round(run["seconds"])},
    "classes": [{"id": c, "name": models["classes"][str(c)], "score": r(class_score[i])} for i, c in enumerate(classes)],
    "classVs": [[r(x) for x in row] for row in class_vs],
    "pets": [{**pets[i], "score": r(pet_score[i]), "spread": r(np.ptp([score[(cls_of == c) & (pet_of == pet_ids[i])][0] for c in classes]))}
             for i in range(P)],
    "petVs": [[r(x) for x in row] for row in pet_vs],
    "combos": [{
        "cls": int(cls_of[i]), "pet": int(pet_of[i]), "score": r(score[i]), "attack": r(attack[i]), "defense": r(defense[i]),
        "draws": r(draws[i]), "se": r(se[i]), "synergy": r(synergy[i]), "vsClass": [r(x) for x in combo_vs_class[i]],
    } for i in range(C)],
    # Best and worst opponents of each combo (indexes into combos)
    "counters": [{"beats": [int(j) for j in np.argsort(-vs[i])[:8]], "losesTo": [int(j) for j in np.argsort(vs[i])[:8]],
                  "beatsScore": [r(vs[i, j]) for j in np.argsort(-vs[i])[:8]], "losesToScore": [r(vs[i, j]) for j in np.argsort(vs[i])[:8]]}
                 for i in range(C)],
}
# Moves played per class: share among the decisions (the forced second half of a charged move and lost turns apart)
FOLLOW_UPS = {"chargingAttack", "ultimateAttack"}
LOST = {"none", "outOfBreath", "getDirty"}
move_names = models["fight_actions"]
data["moves"] = {"fights": int(n_pair.sum()), "names": {}, "classes": {}}
for cls, moves in run["classActions"].items():
    t = run["actions"].get(cls)
    uses = t["uses"]
    decisions = sum(n for a, n in uses.items() if a not in FOLLOW_UPS and a not in LOST)
    lost = sum(uses.get(a, 0) for a in LOST)
    data["moves"]["classes"][cls] = {
        "lostShare": r(lost / max(1, decisions + lost)),
        "moves": [{"id": m["id"], "breath": m["breath"], "share": r(uses.get(m["id"], 0) / max(1, decisions)),
                   "fightsUsed": r(t["fightsUsed"].get(m["id"], 0) / t["fights"])} for m in moves],
    }
    for m in moves:
        data["moves"]["names"][m["id"]] = move_names.get(m["id"], {}).get("name_one", m["id"])

# Pets sharing a name get their id appended
from collections import Counter
dup = Counter(p["name"] for p in data["pets"])
for p in data["pets"]:
    if dup[p["name"]] > 1:
        p["name"] = f"{p['name']} #{p['id']}"
json.dump(data, open(sys.argv[3], "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{C} combos, grand mean {grand:.3f}, class scores", {c: round(float(s), 3) for c, s in zip(classes, class_score)})
top = np.argsort(-score)[:10]
for i in top:
    print(f"  {models['classes'][str(cls_of[i])]:22s} + {models['pets'].get(f'{pet_of[i]}_male', pet_of[i]):18s} {100 * score[i]:.1f} ± {100 * se[i]:.1f} (synergy {100 * synergy[i]:+.1f})")
