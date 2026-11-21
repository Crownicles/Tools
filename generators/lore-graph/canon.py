#!/usr/bin/env python3
"""Generate the "canon des lieux" appendix of the lore proposal from the game data.

Usage: python3 canon.py [--repo <Crownicles checkout>] [--ref <git ref>] [--doc <markdown file>]
  --repo defaults to ../../../Crownicles, --ref to origin/develop,
  --doc to ../../documents/crownicles-lore-proposition.md.

Reads the files with `git show` (no checkout needed) and rewrites the block between
<!-- canon:start --> and <!-- canon:end --> in the document. Places, neighbours, cities,
inns, shops, expedition zones and big events come from the game; the characters
attached to a place come from lore-data.js (the current-lore graph).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from build import norm

HERE = Path(__file__).parent
START, END = "<!-- canon:start -->", "<!-- canon:end -->"
ATTRIBUTE_GROUPS = [
    ("continent1", "Le continent"),
    ("king_castle", "Le château du roi"),
    ("haunted", "Les lieux hantés (événement d'Halloween)"),
    ("main_continent", "Le départ vers les îles"),
    ("pve_island_entry", "Les îles"),
]
ISLANDS = [(1000, 1099, "L'île volcanique"), (1100, 1199, "L'île glacée"), (1200, 1299, "L'île maritime"), (1999, 1999, "Le retour")]


class Repo:
    def __init__(self, path, ref):
        self.path, self.ref = path, ref

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.path), *args], text=True)

    def json(self, file):
        return json.loads(self.git("show", f"{self.ref}:{file}"))

    def json_dir(self, directory):
        files = self.git("ls-tree", "--name-only", f"{self.ref}:{directory}").split()
        return {Path(f).stem: self.json(f"{directory}/{f}") for f in files if f.endswith(".json")}


def clean(text):
    text = re.sub(r"\{emote:[^}]*\}\s*", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def first_sentence(text, limit=170):
    text = clean(text)
    match = re.match(r"(.+?[.!?…])(\s|$)", text)
    sentence = match.group(1) if match else text
    return sentence if len(sentence) <= limit else sentence[:limit].rsplit(" ", 1)[0] + "…"


def duration(minutes):
    hours, rest = divmod(minutes, 60)
    if not hours:
        return f"{rest} min"
    return f"{hours} h" + (f" {rest:02d}" if rest else "")


def graph_mentions():
    data_file = HERE / "lore-data.js"
    if not data_file.exists():
        return {}, {}
    text = data_file.read_text()
    data = json.loads(text[text.index("{"):text.rindex("}") + 1])
    names = {e["id"]: e["name"] for e in data["characters"] + data["places"]}
    places = {p["id"] for p in data["places"]}
    mentions = {}
    for relation in data["relations"]:
        if relation["type"] == "located" and relation["to"] in places:
            mentions.setdefault(relation["to"], []).append(relation["from"])
    return mentions, names


def service_text(city_texts, service):
    """Label and description shown in the city menu for a service (same keys as the Discord MainMenu)."""
    if service == "enchanter":
        return city_texts["reactions"]["enchanter"]["label"], city_texts["reactions"]["enchanter"]["description"]
    if service == "bossArchivist":
        return city_texts["bossArchivist"]["serviceTitle"], city_texts["bossArchivist"]["serviceDescription"]
    return city_texts[service]["menuLabel"], city_texts[service]["menuDescription"]


def cities_section(cities, city_texts, name):
    inns, shops, homes = city_texts["inns"], city_texts["shops"], city_texts["homes"]
    ordered = sorted(cities.values(), key=lambda c: c["maps"][0])
    out = ["### A.1 Les villes et leur menu", "",
           "Quand le joueur arrive dans une ville, le big event éventuel se joue **avant** le menu de la ville, qui s'ouvre juste après avec ce texte commun :",
           f"« {clean(city_texts['description'].split(chr(10) * 2, 1)[-1])} »", "",
           "Tout ce que ce menu affiche est canon pour la ville : un event qui s'y déclenche ne doit ni le nier, ni le rendre absurde à l'écran suivant.", "",
           "| Ville | Carte | Auberge | Services | Boutiques | Prix d'un logis |", "|---|---|---|---|---|---|"]
    for city in ordered:
        out.append("| " + " | ".join([
            name(city["maps"][0]),
            ", ".join(f"`{m}`" for m in city["maps"]),
            ", ".join(inns["names"][i["id"]] for i in city.get("inns", [])) or "aucune",
            ", ".join(service_text(city_texts, s)[0] for s in city.get("services", [])) or "aucun",
            ", ".join(shops[s]["label"] for s in city.get("shops", [])) or "aucune",
            f"{city['apartmentPrice']:,}".replace(",", " "),
        ]) + " |")
    out += ["", "Le prix d'un logis classe les villes de la plus modeste à la plus convoitée : un event peut s'en servir pour le ton (Boug-Coton est la moins chère, Village Coco la plus chère).", "",
            "**Dans toutes les villes :**",
            f"- **{homes['manageHome']}** : « {clean(homes['notaryIntroduction'])} » Il vend les maisons et les logis de rente : « {re.sub(r'\s*pour \*\*[^*]*\*\*', ' […]', clean(homes['apartmentNotary']['forSaleDescription']))} »",
            f"- **L'auberge** : « {clean(city_texts['reactions']['inn']['description'])} »",
            f"- **{city_texts['reactions']['exit']['label']}** ou **{city_texts['reactions']['stay']['label']}**.", "",
            "**Selon le joueur :**",
            f"- Sa maison (« {clean(homes['goToOwnedHomeDescription'])} ») ou son logis (« {clean(homes['goToOwnedApartmentDescription'])} »), si la ville en a un à lui.",
            f"- **{city_texts['guildDomain']['label']}**, dans la seule ville choisie par sa guilde : « {clean(city_texts['guildDomain']['description']).replace('{{guildName}}', 'la guilde')} »",
            f"- **{city_texts['guildFoodShop']['label']}** : « {clean(city_texts['guildFoodShop']['menuDescription'].split(chr(10) * 2)[0])} »", "",
            "**Selon le jour :**",
            f"- **{service_text(city_texts, 'enchanter')[0]}** : « {clean(service_text(city_texts, 'enchanter')[1])} » C'est **Mernil**, un enchanteur itinérant et hautain. Une tâche quotidienne le place chaque jour dans une ville tirée au hasard : aucun texte ne doit le fixer dans une ville.", "",
            "**Services et boutiques, tels que le menu les décrit :**", ""]
    used_services = sorted({s for c in ordered for s in c.get("services", [])})
    used_shops = [s for s in shops if any(s in c.get("shops", []) for c in ordered)]
    for service in used_services:
        label, description = service_text(city_texts, service)
        where = ", ".join(name(c["maps"][0]) for c in ordered if service in c.get("services", []))
        out.append(f"- **{label}** ({where}) : « {clean(description)} »")
    for shop in used_shops:
        where = ", ".join(name(c["maps"][0]) for c in ordered if shop in c.get("shops", []))
        out.append(f"- **{shops[shop]['label']}** ({where}) : « {clean(shops[shop]['description'])} »")
    return out + [""]


def main():
    args = sys.argv[1:]
    options = {"--repo": str(HERE / "../../../Crownicles"), "--ref": "origin/develop",
               "--doc": str(HERE / "../../documents/crownicles-lore-proposition.md")}
    for flag in options:
        if flag in args:
            options[flag] = args[args.index(flag) + 1]
    repo = Repo(Path(options["--repo"]).resolve(), options["--ref"])
    sha = repo.git("rev-parse", "--short", options["--ref"]).strip()

    models = repo.json("Lang/fr/models.json")
    commands = repo.json("Lang/fr/commands.json")
    events_text = repo.json("Lang/fr/events.json")
    names = models["map_locations"]
    map_types = models["map_types"]
    locations = {int(k): v for k, v in repo.json_dir("Core/resources/mapLocations").items()}
    links = {}
    for link in repo.json_dir("Core/resources/mapLinks").values():
        links.setdefault(link["startMap"], {})[link["endMap"]] = link["tripDuration"]
    cities = repo.json_dir("Core/resources/cities")
    city_by_map = {m: (cid, c) for cid, c in cities.items() for m in c["maps"]}
    city_texts = commands["report"]["city"]
    expeditions = commands["petExpedition"]["mapLocationExpeditions"]
    events_by_map, events_by_attribute = {}, {}
    for event_id, event in repo.json_dir("Core/resources/events").items():
        for trigger in event.get("triggers", []):
            if "mapId" in trigger:
                events_by_map.setdefault(trigger["mapId"], set()).add(int(event_id))
            for attribute in trigger.get("mapAttributes", []):
                events_by_attribute.setdefault(attribute, set()).add(int(event_id))
    mentions, graph_names = graph_mentions()

    def name(map_id):
        return names[str(map_id)]["name"]

    def type_label(location):
        label = map_types.get(location["type"], {}).get("name")
        return f"{label.lower()} (`{location['type']}`)" if label else f"`{location['type']}`"

    def place_block(map_id):
        location = locations[map_id]
        lines = [f"#### {name(map_id)} · `{map_id}`", ""]
        facts = [f"- **Type :** {type_label(location)} ; biomes : {', '.join(location.get('biomes', []))}"]
        description = clean(names[str(map_id)].get("description"))
        if description:
            facts.append(f"- **Description du jeu :** « {description} »")
        neighbours = links.get(map_id, {})
        if neighbours:
            facts.append("- **Voisins :** " + ", ".join(f"{name(n)} ({duration(t)})" for n, t in sorted(neighbours.items(), key=lambda x: x[1])))
        zones = [v for k, v in expeditions.items() if k.split("_")[0] == str(map_id)]
        if zones:
            facts.append("- **Zones d'expédition des familiers :** " + ", ".join(zones))
        if map_id in city_by_map:
            _, city = city_by_map[map_id]
            inns = city_texts["inns"]
            for inn in city.get("inns", []):
                facts.append(f"- **Auberge :** {inns['names'][inn['id']]} : « {clean(inns['stories'][inn['id']])} »")
                facts.append(f"  - au menu : {', '.join(inns['meals'][m['id']] for m in inn.get('meals', []))} ; chambres : {', '.join(inns['rooms'][r['id']] for r in inn.get('rooms', []))}")
            services = [service_text(city_texts, s)[0] for s in city.get("services", [])]
            shops = [city_texts["shops"][s]["label"] for s in city.get("shops", [])]
            facts.append(f"- **En ville :** services : {', '.join(services) or 'aucun'} ; boutiques : {', '.join(shops) or 'aucune'}")
        monsters = models["pveMapsStory"].get(str(map_id), {})
        if monsters:
            facts.append("- **Monstres :** " + ", ".join(models["monsters"][m]["name"] for m in monsters))
        events = sorted(events_by_map.get(map_id, []))
        if events:
            facts.append("- **Big events qui s'y déclenchent :**")
            facts += [f"  - {e} : « {first_sentence(events_text[str(e)]['text'])} »" for e in events]
        attached = [graph_names[i] for i in mentions.get(norm(name(map_id)), []) if i in graph_names]
        if attached:
            facts.append(f"- **Rattachés dans le graphe :** {', '.join(sorted(set(attached), key=str.lower))}")
        return lines + facts + [""]

    out = [START, "", f"## Annexe A. Canon des lieux (généré depuis `develop` @ `{sha}`)", "",
           "> Généré par `generators/lore-graph/canon.py` : ne pas modifier à la main, relancer le script.",
           "> Les descriptions, les voisins, les villes et leurs auberges sont **canon** : un texte peut ajouter des détails, jamais les contredire.",
           "> Les voisins sont les seuls lieux qu'un event peut supposer proches, avec le temps de trajet du jeu. La ligne « rattachés dans le graphe » vient de l'extraction du lore et sert de rappel, pas de canon.", ""]

    out += cities_section(cities, city_texts, name)

    section = 2
    for attribute, title in ATTRIBUTE_GROUPS:
        ids = sorted(i for i, l in locations.items() if l.get("attribute") == attribute or (attribute == "pve_island_entry" and l.get("attribute", "").startswith("pve_")))
        if not ids:
            continue
        out += [f"### A.{section} {title}", ""]
        section += 1
        extra = sorted(events_by_attribute.get(attribute, []))
        if extra:
            out += [f"Big events possibles sur tous ces lieux (déclencheur `mapAttributes: {attribute}`) : " + ", ".join(map(str, extra)) + ".", ""]
        if attribute == "pve_island_entry":
            for low, high, island in ISLANDS:
                out += [f"**{island}**", ""]
                for map_id in (i for i in ids if low <= i <= high):
                    out += place_block(map_id)
        else:
            for map_id in ids:
                out += place_block(map_id)
    out += [END]

    doc = Path(options["--doc"])
    text = doc.read_text()
    block = "\n".join(out)
    if START in text:
        text = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    else:
        text = text.rstrip() + "\n\n---\n\n" + block + "\n"
    doc.write_text(text)
    print(f"{len(locations)} lieux, {len(cities)} villes, {sum(len(v) for v in events_by_map.values())} events par lieu @ {sha}")


if __name__ == "__main__":
    main()
