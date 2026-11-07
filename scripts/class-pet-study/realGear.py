"""How far the real players' gear is from the optimal gear of their class.

Every level 100+ player of a roster (players100 markdown table: | id | level | class | ag | dg | pet | items |) fights the
optimal field (every class with its optimal gear and best pets, loadoutSweep.py output) twice, at the same level and with
his own pet: once with his real gear, once with the optimal gear of his class. Both on the same paired fights.

usage: python3 realGear.py <compiledCore> <roster.md> <loadouts.json> <out.json> [--level 157] [--n 60] [--real-level]
"""
import argparse
import json
import os
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("core")
ap.add_argument("roster")
ap.add_argument("loadouts")
ap.add_argument("out")
ap.add_argument("--level", type=int, default=157)
ap.add_argument("--n", type=int, default=60)
ap.add_argument("--no-potion", action="store_true", help="compare without the potion (the real potion is dropped too)")
args = ap.parse_args()

lo = json.load(open(args.loadouts))
gear_by_class = {int(c): g for c, g in lo["gearByClass"].items()}
pets = {int(c): v for c, v in lo["pets"].items()}
players = []
for line in open(args.roster):
    if not (line.startswith("| ") and line[2].isdigit()):
        continue
    parts = [x.strip() for x in line.split("|")[1:-1]]
    pid, level, cls = int(parts[0]), int(parts[1]), int(parts[2])
    if cls < 18:
        continue
    pet = int(parts[5]) if parts[5] not in ("", "NULL", "None") else 0
    items = "|".join(parts[6:])
    if args.no_potion:
        items = "|".join("2:0:0:" if it.startswith("2:") else it for it in items.split("|"))
    players.append({"id": pid, "level": level, "cls": cls, "pet": pet, "gear": items})

sets, combos, owners = {}, [], []
for p in players:
    sets[f"real{p['id']}"] = p["gear"]
    combos.append([p["cls"], p["pet"], f"real{p['id']}"])
    owners.append((p["id"], "real"))
    combos.append([p["cls"], p["pet"], f"opt{p['cls']}"])
    owners.append((p["id"], "opt"))
for c, g in gear_by_class.items():
    sets[f"opt{c}"] = g if not args.no_potion else "|".join("2:0:0:" if it.startswith("2:") else it for it in g.split("|"))
field_start = len(combos)
for c in sorted(gear_by_class):
    sets[f"field{c}"] = gear_by_class[c]
    combos += [[c, p, f"field{c}"] for p in pets[c]]
out_run = args.out.replace(".json", "_run.json")
subprocess.run(["node", "comboRun.js", "--core", os.path.abspath(args.core), "--gear-sets", json.dumps(sets), "--combos", json.dumps(combos),
                "--field-start", str(field_start), "--n", str(args.n), "--pairs-per-task", "64", "--level", str(args.level), "--paired-seeds",
                "--out", out_run], cwd=HERE, check=True, stdout=subprocess.DEVNULL)
run = json.load(open(out_run))
C = len(combos)
counts = np.array(run["counts"], dtype=np.float64).reshape(C, C, 3)
played = counts.sum(2)
att = np.divide(counts[:, :, 1] + 0.5 * counts[:, :, 0], played, out=np.full_like(played, np.nan), where=played > 0)
cols = list(range(field_start, C))
score = {}
for i, (pid, kind) in enumerate(owners):
    score[(pid, kind)] = 0.5 * (np.nanmean(att[i, cols]) + 1 - np.nanmean(att[cols, i]))
rows = []
for p in players:
    rows.append({**p, "real": score[(p["id"], "real")], "opt": score[(p["id"], "opt")]})
by_class = {}
for c in sorted({p["cls"] for p in players}):
    r = [x for x in rows if x["cls"] == c]
    by_class[c] = {"players": len(r), "real": float(np.mean([x["real"] for x in r])), "opt": float(np.mean([x["opt"] for x in r])),
                   "gap": float(np.mean([x["opt"] - x["real"] for x in r]))}
    print(f"{c}: {len(r):3d} players, real gear {100 * by_class[c]['real']:.1f}, optimal gear {100 * by_class[c]['opt']:.1f}, "
          f"gap {100 * by_class[c]['gap']:+.1f}")
json.dump({"byClass": by_class, "players": rows, "level": args.level}, open(args.out, "w"), indent=1)
