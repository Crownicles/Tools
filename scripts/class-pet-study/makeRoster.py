"""Synthetic level 100+ roster for the fight solver (Fight-Simulator-30000/solver, SOLVER_DATA_DIR): every class with its
optimal gear (loadoutSweep.py output) and each of its best pets, so that the solver's human-level attacker engine can fight
the build's scripted defense AIs with optimized players instead of the real ones.

usage: python3 makeRoster.py <loadouts.json> <outDir> [--pets k] [--level 157] [--real-cells realCells.json] [--no-potion]
"""
import argparse
import json
import os
import shutil

ap = argparse.ArgumentParser()
ap.add_argument("loadouts")
ap.add_argument("out")
ap.add_argument("--pets", type=int, default=3)
ap.add_argument("--level", type=int, default=157)
ap.add_argument("--real-cells", default=None)
ap.add_argument("--no-potion", action="store_true")
args = ap.parse_args()

lo = json.load(open(args.loadouts))
os.makedirs(args.out, exist_ok=True)
lines = ["| id | level | class | petId | ag | dg | items |", "| --- | --- | --- | --- | --- | --- | --- |"]
pets100 = {}
for c, gear in sorted(lo["gearByClass"].items()):
    if args.no_potion:
        gear = "|".join("2:0:0:" if it.startswith("2:") else it for it in gear.split("|"))
    for k, pet in enumerate(lo["pets"][c][:args.pets]):
        pid = int(c) * 1000 + k
        lines.append(f"| {pid} | {args.level} | {c} | {pid} | 0 | 0 | {gear} |")
        if pet:
            pets100[str(pid)] = pet
open(os.path.join(args.out, "players100.md"), "w").write("\n".join(lines) + "\n")
json.dump(pets100, open(os.path.join(args.out, "pets100.json"), "w"))
if args.real_cells:
    shutil.copy(args.real_cells, os.path.join(args.out, "realCells.json"))
print(f"{len(lines) - 2} players written to {args.out}")
