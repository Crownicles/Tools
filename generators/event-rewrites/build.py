#!/usr/bin/env python3
"""Bundle the big-event rewrites into data.js for the before/after viewer.

Usage: python3 build.py [--src <rewrite dir>] [--lang <Crownicles Lang/fr dir>] [--out data.js]

The rewrite dir holds input/<id>.json (context + original), out/<id>.json (rewrite, may be
missing while agents work), pets.json, classes.json and validate.py, which is run for each
rewritten event. --lang (optional) is only used to show French names in city menus.
"""
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_SRC = HERE / "src"
DEFAULT_LANG = HERE.parent.parent.parent / "Crownicles" / "Lang" / "fr"
MAP_TYPES = {"be": "Plage", "ci": "Ville", "de": "Désert", "fo": "Forêt", "la": "Lac", "mo": "Montagne", "pl": "Plaine",
             "ri": "Rivière", "ro": "Route", "vi": "Village", "ruins": "Ruines", "tundra": "Toundra", "volcano": "Volcan",
             "mine": "Mine", "iceBeach": "Plage glacée", "crystalCavern": "Caverne de cristal", "icePeak": "Pic"}


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def lang_names(lang_dir):
    names = {"inns": {}, "meals": {}, "rooms": {}, "shops": {}, "services": {}, "mapTypes": dict(MAP_TYPES)}
    try:
        city = load_json(lang_dir / "commands.json")["report"]["city"]
        names["inns"] = city["inns"]["names"]
        names["meals"] = city["inns"]["meals"]
        names["rooms"] = city["inns"]["rooms"]
        names["shops"] = {k: v.get("label", k) for k, v in city["shops"].items()}
        for key, value in city.items():
            if isinstance(value, dict) and (value.get("menuLabel") or value.get("serviceTitle")):
                names["services"][key] = value.get("menuLabel") or value.get("serviceTitle")
        models = load_json(lang_dir / "models.json")
        names["mapTypes"].update({k: v["name"] for k, v in models["map_types"].items() if v.get("name")})
        names["materials"] = models.get("materials", {})
    except (OSError, KeyError, ValueError) as e:
        print(f"note: French city names unavailable ({e}), ids will be shown", file=sys.stderr)
    return names


def run_validator(src, event_id):
    try:
        proc = subprocess.run([sys.executable, "validate.py", event_id], cwd=src, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"exitCode": None, "summary": "", "errors": [f"validate.py n'a pas pu tourner : {e}"], "warnings": [], "raw": ""}
    errors, warnings, summary, section = [], [], "", None
    for line in proc.stdout.splitlines():
        if re.match(r"^\d+ outcomes", line):
            summary = line.strip()
        elif line.startswith("ERRORS:"):
            section = errors
        elif line.startswith("WARNINGS:"):
            section = warnings
        elif line.startswith(("OK, no error", "no warning")):
            section = None
        elif line.startswith("  ") and section is not None:
            section.append(line.strip())
    if proc.returncode not in (0, 1) or (proc.returncode == 1 and not errors):
        errors.append("validate.py a planté : " + (proc.stderr.strip().splitlines() or ["(pas de message)"])[-1])
    return {"exitCode": proc.returncode, "summary": summary, "errors": errors, "warnings": warnings,
            "raw": (proc.stdout + proc.stderr).strip()}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--lang", type=Path, default=DEFAULT_LANG)
    parser.add_argument("--out", type=Path, default=HERE / "data.js")
    args = parser.parse_args()
    src = args.src.expanduser().resolve()
    if not (src / "input").is_dir():
        sys.exit(f"{src}/input not found")

    events = []
    for path in sorted((src / "input").glob("*.json"), key=lambda p: (not p.stem.isdigit(), int(p.stem) if p.stem.isdigit() else 0, p.stem)):
        inp = load_json(path)
        event_id = str(inp.get("eventId") or path.stem)
        event = {key: inp.get(key) for key in ("model", "mapId", "place", "placeType", "placeDescription", "neighbours", "isCity",
                                                "city", "canonBlock", "triggers", "original", "outcomeData")}
        event.update(id=event_id, rewrite=None, rewriteError=None, validation=None)
        out_path = src / "out" / f"{path.stem}.json"
        if out_path.exists():
            try:
                event["rewrite"] = load_json(out_path)
                event["validation"] = run_validator(src, path.stem)
            except ValueError as e:
                event["rewriteError"] = f"JSON invalide : {e}"
        events.append(event)
        status = ("pending" if not out_path.exists() else "invalid JSON" if event["rewriteError"]
                  else "errors" if event["validation"]["errors"] else "ok")
        print(f"{event_id:>4} {status}")

    data = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "src": str(src),
        "pets": load_json(src / "pets.json"),
        "classes": load_json(src / "classes.json"),
        "names": lang_names(args.lang.expanduser()),
        "events": events,
    }
    args.out.write_text("window.EVENT_REWRITES = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    done = sum(e["rewrite"] is not None for e in events)
    print(f"{args.out.name}: {len(events)} events, {done} rewritten")


if __name__ == "__main__":
    main()
