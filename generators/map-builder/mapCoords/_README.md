# Map Coordinates

Per-mapPage marker coordinates used to generate the player-facing map images shown in Discord. Each file describes a single visual page (a single background image, both languages).

These files replace the legacy hardcoded coordinates that lived in `Tools/generators/GenerateCursorMapsDraftBot.py`. The `.py` is kept in the Tools repo for historical reference only.

## Files

| File | Map page | mapLocation `attribute`s shown | ID range |
|---|---|---|---|
| `main_continent.json` | Main continent | continent1, king_castle, main_continent, haunted | 1–99 |
| `volcano_island.json` | Volcanic island (PvE) | pve_island_entry, pve_island | 1000–1099 |
| `ice_exterior.json` | Ice island — exterior (PvE) | pve_island_entry, pve_island | 1100–1199 (subset) |
| `ice_interior.json` | Ice island — interior (PvE) | pve_island | 1100–1199 (subset) |

## Schema

```jsonc
{
  "mapPage": "main_continent",            // unique identifier (= filename stem)
  "displayName": "…",                      // FR label for the editor UI
  "includeAttributes": ["continent1"],     // which mapLocation.attribute values appear here
  "idRange": { "min": 1000, "max": 1099 }, // optional, useful when a single attribute spans several maps
  "backgrounds": {
    "fr": { "filename": "map_fr.jpg", "width": 8192, "height": 5488 },
    "en": { "filename": "map_en.jpg", "width": 4096, "height": 2744 }
  },
  "marker": {
    "image": "Marqueur.png",               // PNG inside Tools/.../Ressources/
    "anchor": "top-left" | "center",       // how `size` relates to (x, y)
    "size":   { "width": 264, "height": 499 },
    "anchorOffset": { "x": 75, "y": 75 }   // only when anchor === "center"
  },
  "coordSpace": "fr",                      // coordinates below are expressed in this language's image
  "scaling":   { "fr": 1, "en": 0.5 },     // multiply coords by `scaling[lang] / scaling[coordSpace]` to render
  "nodes": {
    "<mapLocationId>": { "x": 0, "y": 0 }
  },
  "edges": {
    "<startMap>_<endMap>": { "startMap": 0, "endMap": 0, "x": 0, "y": 0 }
  }
}
```

## Coordinate system

- All `(x, y)` values are stored in **`coordSpace`** pixels (currently always `"fr"`).
- Origin is **top-left**.
- Negative values are allowed (a marker can intentionally bleed above/left of the image).

## Adding a new map page

1. Add a new JSON file here.
2. Set `includeAttributes` and (if needed) `idRange` so the editor knows which mapLocations belong on this page.
3. Drop the new background image(s) in `Tools/generators/Ressources/`.
4. Open the map-builder tool (`Tools/generators/map-builder/`) — the new page appears automatically as a tab.

## Editing coordinates

Always go through the **map-builder web tool**, which:

- loads the current branch's `mapLocations` and `mapLinks`,
- shows missing / orphan / synchronized markers,
- writes back to these JSON files when you commit.

Hand-editing is allowed but the tool's auto-sort (nodes by numeric id, edges by `startMap, endMap`) should be preserved to keep diffs small.

## Known migration anomalies

- **Node 1 has `y = -51`**: copied verbatim from the legacy `.py`. Verify against the real background before adjusting.
- **Nodes 28, 29, 32** all share `(739, 2962)` and edges `28_29`, `28_32`, `29_32` all share `(744, 2904)` — the king castle cluster is intentionally collapsed visually.
- **Edges `1101_1102` and `1102_1103`** are listed on `ice_exterior` even though node `1102` only has a position on `ice_interior` (it's a portal between the two pages).
- **`ice_interior`** uses `scaling.en = 2` because the English background is twice as large as the French one (opposite of the main continent). This quirk is preserved as-is.

## Gaps to fill via the map-builder tool

The legacy `.py` did not cover every mapLocation. The following nodes exist in `Core/resources/mapLocations/` but have **no coordinates yet** and must be placed:

- Main continent: `20`, `33`, `34`, `35`, `36`, `37`, `38`, `39`, `40`, `41`, `42`
- `pve_island` debug location `22222` is intentionally excluded.
