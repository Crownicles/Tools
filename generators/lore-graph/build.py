#!/usr/bin/env python3
"""Merge lore extraction files (characters / relations / places) into lore-data.js.

Usage: python3 build.py [extract_dir] [--commit <sha>] [--out <file.js>] [--var <NAME>]
  extract_dir defaults to ./extract, --out to lore-data.js, --var to LORE_DATA.
  Proposal dataset: python3 build.py proposal --commit proposition --out lore-proposal-data.js --var LORE_PROPOSAL

Each extract file has the shape {"characters": [...], "relations": [...], "places": [...]}.
Entries sharing the same id, normalized name or alias are merged. aliases.json (optional)
maps a normalized id/name to the canonical id, to fix duplicates by hand.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).parent


def norm(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def uniq(values):
    seen, out = set(), []
    for value in values:
        if not value:
            continue
        key = value.strip().lower() if isinstance(value, str) else json.dumps(value, sort_keys=True)
        if key not in seen:
            seen.add(key)
            out.append(value)
    return out


def merge_entity(target, entry):
    for key in ("aliases", "locations", "sources", "quotes"):
        target[key] = uniq(target.get(key, []) + entry.get(key, []))
    target["description"] = " ".join(uniq([target.get("description"), entry.get("description")]))
    if entry.get("role") and entry["role"].lower() not in (target.get("role") or "").lower():
        target["role"] = " / ".join(uniq([target.get("role"), entry["role"]]))
    target["named"] = target.get("named", True) or entry.get("named", True)
    target.pop("stub", None)


def main():
    args = sys.argv[1:]
    options = {"--commit": "develop", "--out": "lore-data.js", "--var": "LORE_DATA"}
    for flag in options:
        if flag in args:
            options[flag] = args.pop(args.index(flag) + 1)
            args.remove(flag)
    commit = options["--commit"]
    extract_dir = Path(args[0]) if args else HERE / "extract"
    aliases_file = HERE / "aliases.json"
    manual = {norm(k): v for k, v in json.loads(aliases_file.read_text()).items()} if aliases_file.exists() else {}
    raw = [json.loads(f.read_text()) for f in sorted(extract_dir.glob("*.json"))]

    places, characters, relations, index = {}, {}, [], {}

    def canonical(raw_id, name=None):
        for key in (norm(raw_id), norm(name)):
            if key in manual:
                return manual[key]
        for key in (norm(raw_id), norm(name)):
            if key and key in index:
                return index[key]
        return norm(raw_id or name)

    for data in raw:
        for place in data.get("places", []):
            pid = canonical(place.get("id"), place.get("name"))
            entry = {"aliases": [], "locations": [], "quotes": [], "sources": [], **place, "id": pid, "category": "place"}
            if pid in places:
                merge_entity(places[pid], entry)
            else:
                places[pid] = entry
            index.setdefault(norm(place.get("name")), pid)
            index.setdefault(pid, pid)

    for data in raw:
        for char in data.get("characters", []):
            cid = canonical(char.get("id"), char.get("name"))
            if cid in places:
                cid = f"{cid}-char"
            entry = {"aliases": [], "locations": [], "quotes": [], "sources": [], **char, "id": cid}
            if cid in characters:
                merge_entity(characters[cid], entry)
            else:
                characters[cid] = entry
            for key in [char.get("id"), char.get("name")] + entry.get("aliases", []):
                if norm(key):
                    index.setdefault(norm(key), cid)

    seen = set()
    for data in raw:
        for rel in data.get("relations", []):
            src, dst = canonical(rel.get("from")), canonical(rel.get("to"))
            if not src or not dst or src == dst:
                continue
            key = (src, dst, rel.get("type"), norm(rel.get("label")))
            if key not in seen:
                seen.add(key)
                relations.append({**rel, "from": src, "to": dst})

    linked = {frozenset((r["from"], r["to"])) for r in relations}
    for entity in list(characters.values()) + list(places.values()):
        for location in entity.get("locations", []):
            pid = canonical(location)
            if pid in places and pid != entity["id"] and frozenset((entity["id"], pid)) not in linked:
                linked.add(frozenset((entity["id"], pid)))
                relations.append({"from": entity["id"], "to": pid, "type": "located", "label": "se trouve à",
                                  "source": (entity.get("sources") or [""])[0]})

    known = set(characters) | set(places) | {"player"}
    for rel in relations:
        for end in (rel["from"], rel["to"]):
            if end not in known:
                known.add(end)
                characters[end] = {
                    "id": end, "name": end.replace("-", " ").title(), "aliases": [], "named": True,
                    "category": "npc", "role": "Mentionné dans une relation", "description": "",
                    "locations": [], "sources": [rel.get("source", "")], "quotes": [], "stub": True,
                }

    out = {
        "commit": commit,
        "characters": sorted(characters.values(), key=lambda c: c["name"].lower()),
        "places": sorted(places.values(), key=lambda p: p["name"].lower()),
        "relations": relations,
    }
    (HERE / options["--out"]).write_text(
        "// Generated by build.py. Do not edit by hand.\n"
        f"window.{options['--var']} = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
    )
    print(f"{len(characters)} characters, {len(places)} places, {len(relations)} relations")


if __name__ == "__main__":
    main()
