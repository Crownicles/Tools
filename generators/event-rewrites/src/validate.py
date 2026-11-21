#!/usr/bin/env python3
"""Validate a rewritten event. Usage: python3 validate.py <eventId>"""
import itertools, json, re, sys
from pathlib import Path

W = Path(__file__).parent
k = sys.argv[1]
inp = json.loads((W / "input" / f"{k}.json").read_text())
out = json.loads((W / "out" / f"{k}.json").read_text())
pets = {int(i): p for i, p in json.loads((W / "pets.json").read_text()).items()}
orig = inp["original"]
errors, warnings = [], []

OUTCOME_KEYS = {"condition", "requirements", "lostTime", "health", "karma", "effect", "money", "energy", "gems", "tokens", "bonusExperience",
                "bonusPoints", "randomItem", "randomPet", "givePet", "oneshot", "nextEvent", "mapTypesDestination", "mapTypesExcludeDestination",
                "mapLink", "forceStayInCity", "forceLeaveCity", "tags"}
REQ_RANGES = ["level", "karma", "health", "attack", "defense", "speed", "petRarity"]
REQ_KEYS = set(REQ_RANGES) | {"validClassIds", "validPetTypeIds", "campaignCurrentMissionId"}
EFFECTS = {"occupied", "sleeping", "drunk", "freezing", "feetHurt", "hurt", "sick", "jailed", "injured", "starving", "confounded", "scared",
           "lost", "fished", "working", "burning"}


def check_text(path, text, ref="", kind="outcome"):
    if not isinstance(text, str) or not text.strip():
        errors.append(f"{path}: empty text"); return
    for ph in set(re.findall(r"\{\{[^}]+\}\}|\{emote:[^}]+\}|\$t\([^)]+\)", ref or "")):
        if ph not in text: errors.append(f"{path}: placeholder {ph} missing")
    if re.search(r'[«»"“”]', text): errors.append(f"{path}: quotes (no direct speech)")
    if re.search(r"\b(dit-il|dit-elle|s'exclame-t-il|s'exclame-t-elle|s'écrie-t-il|répond-il|répond-elle|lance-t-il|lance-t-elle|ajoute-t-il|ajoute-t-elle)\b", text):
        errors.append(f"{path}: direct speech verb")
    if "’" in text: errors.append(f"{path}: curly apostrophe")
    if "—" in text: errors.append(f"{path}: em dash")
    if re.search(r"\S[!?;:]", re.sub(r"\{[^}]*\}|\$t\([^)]*\)", "", text)): warnings.append(f"{path}: missing space before ! ? ; :")
    if text.count("!") > 1: warnings.append(f"{path}: more than one !")
    if re.search(r"\b(Votre|Vos) (agilité|réputation|aura|force|vitesse|niveau|karma|expérience)\b", text): warnings.append(f"{path}: names the condition instead of showing it")
    if kind == "intro" and text.rstrip().endswith(("...", "…")): errors.append(f"{path}: intro ends with ellipsis")
    lo, hi = {"intro": (180, 420), "choice": (8, 90), "outcome": (90, 300)}[kind]
    if not lo <= len(text) <= hi: warnings.append(f"{path}: {len(text)} chars (target {lo}-{hi})")


# --- texts ---
check_text("text", out.get("text"), orig["text"], "intro")
tp = out.get("possibilities", {})
missing = set(orig["possibilities"]) - set(tp)
if missing: errors.append(f"original possibilities removed: {sorted(missing)}")
if len(set(tp) - set(orig["possibilities"])) > 2: warnings.append("more than 2 new possibilities")
for p, v in tp.items():
    if p == "end":
        if v.get("text"): errors.append("end.text: the end possibility has no choice label")
    else:
        check_text(f"{p}.text", v.get("text"), orig["possibilities"].get(p, {}).get("text", ""), "choice")
    for o, t in v.get("outcomes", {}).items():
        check_text(f"{p}.outcomes.{o}", t, orig["possibilities"].get(p, {}).get("outcomes", {}).get(o, ""))

# --- data ---
data = out.get("data") or {}
if data.get("triggers") != inp["triggers"]: errors.append("data.triggers must equal input.triggers")
dp = data.get("possibilities", {})
if set(dp) != set(tp): errors.append(f"text/data possibilities differ: {sorted(set(dp) ^ set(tp))}")
neighbour_types = {n["type"] for n in inp["neighbours"]}
total = conditional = 0
for p, v in dp.items():
    outs = v.get("outcomes", {})
    if set(outs) != set(tp.get(p, {}).get("outcomes", {})): errors.append(f"{p}: text/data outcome ids differ")
    if sorted(outs, key=int) != [str(i) for i in range(len(outs))]: warnings.append(f"{p}: outcome ids are not 0..n-1")
    if not 3 <= len(outs) <= 8 and p != "end": warnings.append(f"{p}: {len(outs)} outcomes (target 3-6)")
    for o, x in outs.items():
        total += 1
        path = f"data.{p}.{o}"
        for key in set(x) - OUTCOME_KEYS: errors.append(f"{path}: unknown key {key}")
        if "effect" in x and x["effect"] not in EFFECTS: errors.append(f"{path}: unknown effect {x['effect']}")
        if x.get("effect") == "occupied" and not x.get("lostTime"): warnings.append(f"{path}: occupied without lostTime")
        if (x.get("forceStayInCity") or x.get("forceLeaveCity")) and not inp["isCity"]: errors.append(f"{path}: forceStayInCity/forceLeaveCity outside a city")
        for field in ("mapTypesDestination",):
            if x.get(field) and not set(x[field]) & neighbour_types: errors.append(f"{path}: no neighbour of type {x[field]}")
        req = x.get("requirements")
        if req:
            conditional += 1
            for key in set(req) - REQ_KEYS: errors.append(f"{path}: unknown requirement {key}")
            for key in REQ_RANGES:
                r = req.get(key)
                if r is not None and (not isinstance(r, dict) or (r.get("min") is not None and r.get("max") is not None and r["min"] > r["max"])):
                    errors.append(f"{path}: bad range for {key}")
            for key in ("validClassIds", "validPetTypeIds"):
                if key in req and not (isinstance(req[key], list) and req[key]): errors.append(f"{path}: {key} must be a non-empty list")
            for pid in req.get("validPetTypeIds", []):
                if pid not in pets: errors.append(f"{path}: unknown pet {pid}")

    # coverage: every player profile must have at least one valid outcome
    def values(key, defaults):
        vals = set(defaults)
        for x in outs.values():
            r = (x.get("requirements") or {}).get(key) or {}
            for b in ("min", "max"):
                if r.get(b) is not None:
                    vals |= {r[b], r[b] - 1, r[b] + 1}
        return sorted(vals)
    reqs = [x.get("requirements") or {} for x in outs.values()]
    classes = sorted({c for r in reqs for c in r.get("validClassIds", [])} | {0})
    listed_pets = sorted({i for r in reqs for i in r.get("validPetTypeIds", [])})
    pet_profiles = [None] + [(i, pets[i]["rarity"]) for i in listed_pets if i in pets] + [(-1, r) for r in values("petRarity", [1, 8]) if 1 <= r <= 8]
    dims = [values("level", [1, 200]), values("karma", [-500, 0, 500]), values("health", [1, 1000]), values("attack", [0, 2000]),
            values("defense", [0, 2000]), values("speed", [0, 2000]), classes, pet_profiles]

    def ok(r, prof):
        lvl, karma, hp, atk, dfn, spd, cls, pet = prof
        for key, val in (("level", lvl), ("karma", karma), ("health", hp), ("attack", atk), ("defense", dfn), ("speed", spd)):
            rg = r.get(key)
            if rg and ((rg.get("min") is not None and val < rg["min"]) or (rg.get("max") is not None and val > rg["max"])): return False
        if "validClassIds" in r and cls not in r["validClassIds"]: return False
        if "validPetTypeIds" in r and (pet is None or pet[0] not in r["validPetTypeIds"]): return False
        if "petRarity" in r:
            rg = r["petRarity"]
            if pet is None or (rg.get("min") is not None and pet[1] < rg["min"]) or (rg.get("max") is not None and pet[1] > rg["max"]): return False
        if "campaignCurrentMissionId" in r: return False
        return True
    if outs:
        for prof in itertools.product(*dims):
            if not any(ok(r, prof) for r in reqs):
                errors.append(f"{p}: no valid outcome for level={prof[0]} karma={prof[1]} health={prof[2]} attack={prof[3]} defense={prof[4]} speed={prof[5]} class={prof[6]} pet={prof[7]}")
                break

if total and conditional / total < 0.4: warnings.append(f"only {conditional}/{total} outcomes are conditional (rewritten events: about 3/4)")
if total <= sum(len(v["outcomes"]) for v in orig["possibilities"].values()): warnings.append(f"{total} outcomes, not more than the original")

# --- icons ---
icons = out.get("icons") or {}
for p in set(tp) - set(orig["possibilities"]) - {"end"}:
    if not icons.get(p): errors.append(f"icons: missing emoji for new possibility {p}")
new_end = set(tp.get("end", {}).get("outcomes", {})) - set(orig["possibilities"].get("end", {}).get("outcomes", {}))
for o in new_end:
    if not (icons.get("end") or {}).get(o): errors.append(f"icons: missing emoji for new end outcome {o}")
if not out.get("notes"): warnings.append("notes: missing")

print(f"{total} outcomes, {conditional} conditional")
print("ERRORS:" if errors else "OK, no error", *errors, sep="\n  ")
print("WARNINGS:" if warnings else "no warning", *warnings, sep="\n  ")
sys.exit(1 if errors else 0)
