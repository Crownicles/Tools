"""Build the workshop input of an event from the Crownicles branch.

Usage: python3 prepare.py <crownicles dir> <event id> [--draft-ref <git ref>] [--model <name>]
original = develop's version, draft = the version at --draft-ref (a contributor's draft to rework), if given.
"""
import argparse
import glob
import json
import os
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).parent
BIBLE = HERE.parent.parent.parent / "documents" / "crownicles-lore-proposition.md"


def git_json(repo, ref, path):
    return json.loads(subprocess.run(["git", "-C", repo, "show", f"{ref}:{path}"], capture_output=True, text=True, check=True).stdout)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("event")
    ap.add_argument("--draft-ref")
    ap.add_argument("--model", default="")
    a = ap.parse_args()
    repo, e = a.repo, a.event

    dev_data = git_json(repo, "origin/develop", f"Core/resources/events/{e}.json")
    dev_lang = git_json(repo, "origin/develop", "Lang/fr/events.json")[e]
    models = json.load(open(os.path.join(repo, "Lang/fr/models.json")))
    locations = models["map_locations"]
    map_id = next(t["mapId"] for t in dev_data["triggers"] if "mapId" in t)
    place = json.load(open(os.path.join(repo, f"Core/resources/mapLocations/{map_id}.json")))
    neighbours = []
    for f in glob.glob(os.path.join(repo, "Core/resources/mapLinks/*.json")):
        link = json.load(open(f))
        if link["startMap"] == map_id:
            end = link["endMap"]
            neighbours.append({"mapId": end, "name": locations[str(end)]["name"], "minutes": link["tripDuration"],
                               "type": json.load(open(os.path.join(repo, f"Core/resources/mapLocations/{end}.json")))["type"]})
    neighbours.sort(key=lambda n: n["minutes"])
    city = next((json.load(open(f)) for f in glob.glob(os.path.join(repo, "Core/resources/cities/*.json"))
                 if map_id in json.load(open(f)).get("maps", [])), None)
    bible = BIBLE.read_text()
    m = re.search(r"#### " + re.escape(locations[str(map_id)]["name"]) + r" · `" + str(map_id) + r"`.*?(?=\n#### |\n## |<!-- canon:end)", bible, re.S)

    out = {
        "eventId": e,
        "model": a.model,
        "mapId": map_id,
        "place": locations[str(map_id)]["name"],
        "placeType": place["type"],
        "placeDescription": locations[str(map_id)]["description"],
        "neighbours": neighbours,
        "isCity": city is not None,
        "city": city,
        "canonBlock": m.group(0) if m else "",
        "triggers": dev_data["triggers"],
        "original": dev_lang,
        "outcomeData": {p: v["outcomes"] for p, v in dev_data["possibilities"].items()},
    }
    if a.draft_ref:
        out["draft"] = {
            "author": subprocess.run(["git", "-C", repo, "log", "-1", "--format=%an", a.draft_ref], capture_output=True, text=True).stdout.strip(),
            "lang": git_json(repo, a.draft_ref, "Lang/fr/events.json")[e],
            "data": git_json(repo, a.draft_ref, f"Core/resources/events/{e}.json"),
        }
    (HERE / "input" / f"{e}.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"input/{e}.json: {out['place']} ({out['placeType']}), {len(neighbours)} neighbours, city={out['isCity']}, draft={bool(a.draft_ref)}")


if __name__ == "__main__":
    main()
