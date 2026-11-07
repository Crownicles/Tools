"""Optimal gear of each class: weapon x weapon enchantment, armor x armor enchantment, object and potion, chosen by
simulation among every item that is not dominated once the game's stat caps are applied (gearSpace.js).

Each class is played with its best pets and meets a field made of every class wearing its current optimal gear with
its best pets (equal weight per class). Block coordinate descent: the weapon block, the armor block and the object +
potion block are optimized in turn for every class at once, until a round changes nothing. Every block is a successive
halving: all candidates on a few fights, then the best ones on many more, all on paired seeds (each candidate meets
each field combination on the same fights).

usage: python3 loadoutSweep.py <compiledCore> <out.json> --pets '{"18": [petId, ...], ...}'
       [--start start.json] [--level 157] [--max-rarity 7] [--potions best|none] [--rounds 4] [--n1 16] [--n2 96]
       [--keep 5] [--extra "comboRun options"]
"""
import argparse
import json
import os
import shlex
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CLASSES = [18, 19, 20, 21, 22, 23, 24]
# Attack-type enchantments of the weapon useful in PvP (allAttack3 is dominated by pvpAttack3, pveAttack useless in PvP)
WEAPON_ENCHANTMENTS = ["pvpAttack3", "baseBreath2", "burnedDamage1", "frozenDamage1", "poisonedDamage1"]
ARMOR_ENCHANTMENTS = ["defense3", "speed3", "maxEnergy3", "maxBreath1"]

ap = argparse.ArgumentParser()
ap.add_argument("core")
ap.add_argument("out")
ap.add_argument("--pets", required=True, help="best pets of each class, JSON {class: [pet ids]}")
ap.add_argument("--start", help="JSON of starting loadouts (a previous output of this script)")
ap.add_argument("--level", type=int, default=157)
ap.add_argument("--max-rarity", type=int, default=7)
ap.add_argument("--potions", default="best", choices=["best", "none"])
ap.add_argument("--rounds", type=int, default=4)
ap.add_argument("--n1", type=int, default=16)
ap.add_argument("--n2", type=int, default=96)
ap.add_argument("--keep", type=int, default=5)
ap.add_argument("--min-gain", type=float, default=0.005, help="a candidate replaces the current gear only if it scores this much more")
ap.add_argument("--min-total", type=float, default=0.7, help="drop items whose summed stats are below this share of the slot's best")
ap.add_argument("--extra", default="", help="extra comboRun.js options (variants: --set, --class-stat, --damage-mult, --patch)")
ap.add_argument("--work", default=None)
args = ap.parse_args()

core = os.path.abspath(args.core)
work = args.work or os.path.join(os.path.dirname(os.path.abspath(args.out)), "loadout_work")
os.makedirs(work, exist_ok=True)
pets = {int(c): v for c, v in json.loads(args.pets).items()}

space_file = os.path.join(work, f"gearSpace_{args.level}_r{args.max_rarity}.json")
subprocess.run(["node", os.path.join(HERE, "gearSpace.js"), str(args.level), str(args.max_rarity)], cwd=core, check=True,
               env={**os.environ, "STUDY_WORK_DIR": work}, stdout=subprocess.DEVNULL)
space = json.load(open(space_file))["classes"]


def options(cls, slot):
    front = space[str(cls)]["slots"][slot]["front"]
    best = max(o["total"] for o in front)
    return [o["id"] for o in front if o["total"] >= args.min_total * best]


def gear(lo):
    return f"0:{lo['w']}:5:{lo['we']}|1:{lo['a']}:5:{lo['ae']}|2:{lo['p']}:0:|3:{lo['o']}:0:"


def describe(lo):
    return f"W{lo['w']} {lo['we']} | A{lo['a']} {lo['ae']} | O{lo['o']} | P{lo['p']}"


BLOCKS = {
    "support": lambda c: [{"o": o, "p": p} for o in options(c, "object")
                          for p in ([0] if args.potions == "none" else options(c, "potion"))],
    "weapon": lambda c: [{"w": w, "we": e} for w in options(c, "weapon") for e in WEAPON_ENCHANTMENTS],
    "armor": lambda c: [{"a": a, "ae": e} for a in options(c, "armor") for e in ARMOR_ENCHANTMENTS],
}

if args.start:
    current = {int(c): lo for c, lo in json.load(open(args.start))["loadouts"].items()}
    if args.potions == "none":
        current = {c: {**lo, "p": 0} for c, lo in current.items()}
else:
    # Start: what most strong players wear (balanced weapon, defense armor, speed object and potion)
    current = {c: {"w": 89, "we": "pvpAttack3", "a": 13 if 13 in options(c, "armor") else options(c, "armor")[0], "ae": "defense3",
                   "o": 4, "p": 0 if args.potions == "none" else 4} for c in CLASSES}


def evaluate(candidates, n, tag):
    """candidates: {cls: [loadout, ...]} -> {cls: [(score, attack, defense) per candidate]} against the current field"""
    sets, combos, owners = {}, [], []
    for c, los in candidates.items():
        for k, lo in enumerate(los):
            key = f"v{c}_{k}"
            sets[key] = gear(lo)
            for p in pets[c]:
                combos.append([c, p, key])
                owners.append((c, k))
    field_start = len(combos)
    for c in CLASSES:
        sets[f"field{c}"] = gear(current[c])
        combos += [[c, p, f"field{c}"] for p in pets[c]]
    out = os.path.join(work, f"{tag}.json")
    cmd = ["node", "comboRun.js", "--core", core, "--gear-sets", json.dumps(sets), "--combos", json.dumps(combos),
           "--field-start", str(field_start), "--n", str(n), "--pairs-per-task", "64", "--level", str(args.level),
           "--paired-seeds", "--out", out] + shlex.split(args.extra)
    subprocess.run(cmd, cwd=HERE, check=True, stdout=subprocess.DEVNULL)
    run = json.load(open(out))
    C = len(combos)
    counts = np.array(run["counts"], dtype=np.float64).reshape(C, C, 3)
    played = counts.sum(2)
    att = np.divide(counts[:, :, 1] + 0.5 * counts[:, :, 0], played, out=np.full_like(played, np.nan), where=played > 0)
    cols = list(range(field_start, C))
    result = {c: [[] for _ in los] for c, los in candidates.items()}
    for i, (c, k) in enumerate(owners):
        a = np.nanmean(att[i, cols])
        d = 1 - np.nanmean(att[cols, i])
        result[c][k].append((a, d))
    return {c: [(float(np.mean([0.5 * (a + d) for a, d in v])), float(np.mean([a for a, _ in v])), float(np.mean([d for _, d in v])))
                for v in per] for c, per in result.items()}


history = []
for round_id in range(1, args.rounds + 1):
    changed = False
    for block, make in BLOCKS.items():
        cands = {c: [{**current[c], **b} for b in make(c)] for c in CLASSES}
        for c in CLASSES:
            if current[c] not in cands[c]:
                cands[c].append(dict(current[c]))
        first = evaluate(cands, args.n1, f"r{round_id}_{block}_1")
        finalists = {}
        for c in CLASSES:
            order = sorted(range(len(cands[c])), key=lambda k: -first[c][k][0])[:args.keep]
            if cands[c].index(current[c]) not in order:
                order.append(cands[c].index(current[c]))
            finalists[c] = [cands[c][k] for k in order]
        second = evaluate(finalists, args.n2, f"r{round_id}_{block}_2")
        for c in CLASSES:
            ranked = sorted(range(len(finalists[c])), key=lambda k: -second[c][k][0])
            best = finalists[c][ranked[0]]
            cur_k = finalists[c].index(current[c])
            gain = second[c][ranked[0]][0] - second[c][cur_k][0]
            if gain < args.min_gain:
                best = current[c]
            history.append({"round": round_id, "block": block, "cls": c, "best": best, "score": second[c][ranked[0]],
                            "current": second[c][cur_k], "top": [(finalists[c][k], second[c][k]) for k in ranked]})
            if best != current[c]:
                changed = True
                print(f"r{round_id} {block:8s} {c}: {describe(current[c])} -> {describe(best)} (+{100 * gain:.1f})", flush=True)
                current[c] = best
        json.dump({"loadouts": current, "gearByClass": {str(c): gear(current[c]) for c in CLASSES}, "pets": pets,
                   "history": history, "args": vars(args)}, open(args.out, "w"), indent=1)
    print(f"round {round_id} done, {'changed' if changed else 'stable'}", flush=True)
    if not changed:
        break

print(json.dumps({c: describe(lo) for c, lo in current.items()}, indent=1))
