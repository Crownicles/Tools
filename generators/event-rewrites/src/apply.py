#!/usr/bin/env python3
"""Apply rewritten events to a Crownicles checkout.

Usage: python3 apply.py <crownicles dir> [eventId ...]   (default: every out/<id>.json)

Writes, for each event:
- its texts in Lang/fr/events.json,
- its mechanics in Core/resources/events/<id>.json,
- the emoji of its new possibilities and new "end" outcomes in Lib/src/CrowniclesIcons.ts.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent


def write_json(path, data):
    raw = path.read_text()
    indent = re.search(r"\n([ \t]+)\S", raw).group(1)
    path.write_text(json.dumps(data, ensure_ascii=False, indent="\t" if "\t" in indent else len(indent)) + ("\n" if raw.endswith("\n") else ""))


def lang_entry(out):
    entry = {"text": out["text"], "possibilities": {}}
    for name, possibility in out["possibilities"].items():
        value = {}
        if possibility.get("text"):
            value["text"] = possibility["text"]
        value["outcomes"] = possibility["outcomes"]
        entry["possibilities"][name] = value
    return entry


def icons_block(event_id, icons, indent="\t\t"):
    """Render the icons of an event the way CrowniclesIcons.ts writes them: keys sorted, "end" as an object."""
    lines = [f"{indent}{event_id}: {{"]
    items = sorted(icons.items())
    for i, (name, value) in enumerate(items):
        comma = "," if i < len(items) - 1 else ""
        if isinstance(value, dict):
            lines.append(f"{indent}\t{name}: {{")
            ends = sorted(value.items(), key=lambda kv: int(kv[0]))
            for j, (outcome, emoji) in enumerate(ends):
                lines.append(f"{indent}\t\t{outcome}: \"{emoji}\"" + ("," if j < len(ends) - 1 else ""))
            lines.append(f"{indent}\t}}{comma}")
        else:
            lines.append(f"{indent}\t{name}: \"{value}\"{comma}")
    lines.append(f"{indent}}}")
    return lines


def parse_icons(block):
    """Parse an event block of CrowniclesIcons.ts (possibility -> emoji, end -> {outcome -> emoji})."""
    icons = {}
    body = "\n".join(block[1:-1])
    for match in re.finditer(r"(\w+): \{([^}]*)\}", body):
        icons[match.group(1)] = dict(re.findall(r"(\d+): \"([^\"]+)\"", match.group(2)))
    body = re.sub(r"\w+: \{[^}]*\}", "", body)
    for name, emoji in re.findall(r"(\w+): \"([^\"]+)\"", body):
        icons[name] = emoji
    return icons


def update_icons(path, event_id, new_icons):
    lines = path.read_text().split("\n")
    # The second "events: {" block holds the big events (the first one is the type declaration)
    start = [i for i, line in enumerate(lines) if line == "\tevents: {"][1]
    head = next(i for i in range(start, len(lines)) if lines[i] == f"\t\t{event_id}: {{")
    tail = next(i for i in range(head, len(lines)) if re.fullmatch(r"\t\t\},?", lines[i]))
    icons = parse_icons(lines[head:tail + 1])
    for name, value in new_icons.items():
        if isinstance(value, dict):
            icons.setdefault(name, {}).update({str(k): v for k, v in value.items()})
        else:
            icons[name] = value
    block = icons_block(event_id, icons)
    block[-1] += "," if lines[tail].endswith(",") else ""
    lines[head:tail + 1] = block
    path.write_text("\n".join(lines))


def main():
    crownicles = Path(sys.argv[1])
    ids = sys.argv[2:] or sorted(p.stem for p in (HERE / "out").glob("*.json"))
    lang_path = crownicles / "Lang/fr/events.json"
    lang = json.loads(lang_path.read_text())
    for event_id in ids:
        out = json.loads((HERE / "out" / f"{event_id}.json").read_text())
        lang[event_id] = lang_entry(out)
        event_path = crownicles / f"Core/resources/events/{event_id}.json"
        write_json(event_path, {"possibilities": out["data"]["possibilities"], "triggers": out["data"]["triggers"]})
        if out.get("icons"):
            update_icons(crownicles / "Lib/src/CrowniclesIcons.ts", event_id, out["icons"])
        print(f"{event_id}: applied")
    write_json(lang_path, lang)


if __name__ == "__main__":
    main()
