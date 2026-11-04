"""Meta analysis: the best combinations of each class against each other.

usage: python3 metaReport.py <meta.json> <data.json> <out.json>
- score vs the meta: average against every meta combination, both roles
- counters: the meta combinations that beat it
- equilibrium: optimal mixture of the symmetric zero-sum game (what a perfect field would play), by multiplicative weights
"""
import json
import sys

import numpy as np

run = json.load(open(sys.argv[1]))
base = json.load(open(sys.argv[2]))
combos = run["combos"]
C = len(combos)
counts = np.array(run["counts"], dtype=np.float64).reshape(C, C, 3)
att = (counts[:, :, 1] + 0.5 * counts[:, :, 0]) / counts.sum(2)
vs = 0.5 * (att + (1 - att.T))
n_pair = counts.sum(2) + counts.sum(2).T
se_pair = np.sqrt(vs * (1 - vs) / n_pair)

score = vs.mean(1)
se = np.sqrt(score * (1 - score) / n_pair.sum(1))

# Equilibrium of the zero-sum game with payoff vs - 0.5: averaged multiplicative weights
payoff = vs - 0.5
w = np.ones(C) / C
avg = np.zeros(C)
eta = 0.5
for it in range(1, 40001):
    gain = payoff @ w
    w = w * np.exp(eta * gain / np.sqrt(it / 100 + 1))
    w /= w.sum()
    avg += w
eq = avg / avg.sum()
exploit = float((payoff @ eq).max())  # best answer to the mixture: 0 at the exact equilibrium

classes = [c["id"] for c in base["classes"]]
cls_of = np.array([c for c, _ in combos])
class_vs = np.array([[vs[np.ix_(cls_of == a, cls_of == b)].mean() for b in classes] for a in classes])
class_eq = {int(c): float(eq[cls_of == c].sum()) for c in classes}

out = {
    "fightsPerPair": int(n_pair[0, 1]), "fights": int(counts.sum()),
    "combos": [{
        "cls": int(c), "pet": int(p), "score": round(float(score[i]), 4), "se": round(float(se[i]), 4), "eq": round(float(eq[i]), 4),
        "beatenBy": [{"j": int(j), "v": round(float(vs[j, i]), 3)} for j in np.argsort(-vs[:, i])[:6] if vs[j, i] > 0.5],
        "beats": [{"j": int(j), "v": round(float(vs[i, j]), 3)} for j in np.argsort(-vs[i])[:6]],
        "worst": round(float(vs[i].min()), 4),
        "vsClass": [round(float(vs[i, cls_of == c].mean()), 4) for c in classes],
    } for i, (c, p) in enumerate(combos)],
    "vs": [[round(float(x), 3) for x in row] for row in vs],
    "classVs": [[round(float(x), 4) for x in row] for row in class_vs],
    "classEq": class_eq,
    "exploit": round(exploit, 4),
    "pairSe": round(float(se_pair.mean()), 4),
}
json.dump(out, open(sys.argv[3], "w"), separators=(",", ":"))

pets = {p["id"]: p["name"] for p in base["pets"]}
names = {c["id"]: c["name"].split()[0] for c in base["classes"]}
print(f"{C} meta combos, pair precision ±{1.96 * se_pair.mean() * 100:.1f}, equilibrium exploitability {exploit * 100:.2f}")
print("class share at equilibrium:", {names[k]: round(100 * v, 1) for k, v in class_eq.items()})
for i in np.argsort(-eq)[:12]:
    if eq[i] < 0.005:
        break
    print(f"  eq {100 * eq[i]:5.1f}%  {names[combos[i][0]]:10s} + {pets[combos[i][1]]:20s} score vs meta {100 * score[i]:.1f}, worst {100 * vs[i].min():.1f}")
undominated = [i for i in range(C) if vs[i].min() >= 0.5]
print("no counter among the meta:", [f"{names[combos[i][0]]} + {pets[combos[i][1]]}" for i in undominated])
for i in np.argsort(-score)[:8]:
    j = int(np.argmin(vs[i]))
    print(f"  {names[combos[i][0]]:10s} + {pets[combos[i][1]]:20s} {100 * score[i]:.1f} — best counter {names[combos[j][0]]} + {pets[combos[j][1]]} ({100 * vs[j, i]:.1f})")
