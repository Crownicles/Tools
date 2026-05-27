# Contributing to the Map Builder

A vanilla-JS, no-build tool that lives at
[`generators/map-builder/`](.). Hosted on GitHub Pages at
<https://crownicles.github.io/Tools/generators/map-builder/>.

If you're a player wanting to use the tool, read [`guide.html`](guide.html)
instead. This file is for contributors who want to fix bugs or add features.

## Run it locally

There is no build step. Any static file server works:

```sh
cd generators/map-builder
python3 -m http.server 8765
# then open http://localhost:8765/generators/map-builder/
```

CDN dependencies: `jszip` (loaded from jsdelivr). Everything else is ES modules
under [`src/`](src).

## Architecture

The tool is a single-page app split into small ES modules. Each module has a
single responsibility and is documented at the top of its file.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            index.html                                 │
│                  <script type="module" src="src/main.js">             │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                            src/main.js  ─ boot() entry point
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
         wire.js            interactions.js       canvas.js
        (wireUI)        (mouse/keyboard/dnd)   (render/hitTest)
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  ▼
                              state.js
                       (mutable runtime state,
                        exposed as window.state)
                                  ▲
              ┌──────────────────┬┴───────────────────┐
              │                  │                    │
        constants.js        utils.js            feedback.js
        (static config)  (pure helpers)    (toast/status/dryRun)
```

### Module map

| File | Role |
|---|---|
| [`src/constants.js`](src/constants.js) | Static config: default repos, paths, localStorage keys, magic numbers. |
| [`src/state.js`](src/state.js) | Mutable runtime state, exposed on `window.state` for DevTools. |
| [`src/utils.js`](src/utils.js) | Pure helpers: `$` (getElementById), base64, JSON stable-sort serialization, season helpers. |
| [`src/feedback.js`](src/feedback.js) | User-facing UX: toast, status bar, PAT focus highlight, dry-run log. |
| [`src/github.js`](src/github.js) | GitHub API layer: `makeApiRequest`, batched directory processing, `GitHubClient` for writes. |
| [`src/data.js`](src/data.js) | Loads & merges Crownicles data: mapLocations, mapLinks, place names, mapPages. Heart of `loadAll()`. |
| [`src/categorize.js`](src/categorize.js) | Splits a map page into `{synced, missing, orphan}` based on game data + idRange + includeAttributes. |
| [`src/sync.js`](src/sync.js) | Auto-sync flow: diff Crownicles vs. local, create stub pages, extend idRanges. |
| [`src/images.js`](src/images.js) | Background + marker image loading (Tools first, then Website fallback, with season suffix). |
| [`src/canvas.js`](src/canvas.js) | Canvas rendering: coord<->canvas transforms, `render()`, `drawMarker()`, `hitTest()`. |
| [`src/tabs.js`](src/tabs.js) | Top tab strip per mapPage. |
| [`src/panels.js`](src/panels.js) | Right side panels: sync lists + inspector form. |
| [`src/history.js`](src/history.js) | Per-tab undo/redo stacks (JSON snapshots, capped at 50). |
| [`src/interactions.js`](src/interactions.js) | All canvas/keyboard event handlers (pan/drag/zoom/drop/contextmenu). |
| [`src/render-pipeline.js`](src/render-pipeline.js) | Offscreen WebP image generation for the "Rendu images…" feature. |
| [`src/pr.js`](src/pr.js) | Auto-PR flows: coords → Tools, images → Website, coords ZIP export. |
| [`src/wire.js`](src/wire.js) | `wireUI()`: all `addEventListener` for buttons, modals, mode/lang toggles. |
| [`src/main.js`](src/main.js) | Boot sequence: calls `wireUI()` + `wireCanvasInteractions()` + `wireKeyboard()` + `wireBackgroundDrop()`. |

### Module dependency rules

- **constants.js** depends on nothing.
- **state.js** depends only on constants.js.
- **utils.js** depends only on state.js (for `matchesSeason`).
- **feedback.js** depends on utils.js.
- Everything else may depend on the layers above, plus its named siblings.
- Avoid circular imports. If you need one, use a function-scope `await import()`.

### Where state lives

A single `state` object in [`src/state.js`](src/state.js) holds everything
mutable. It's exposed as `window.state` so you can inspect it in DevTools:

```js
window.state.mapPages         // current parsed mapCoords/*.json
window.state.locations        // Crownicles mapLocations indexed by id
window.state.links            // Crownicles mapLinks (deduped via getPageRegistry)
window.state.currentTab       // active mapPage key
window.state.selected         // { type, key } of the highlighted marker
```

LocalStorage is the single persistence layer (no IndexedDB, no backend).
Keys live in `LS_KEYS` in [`src/constants.js`](src/constants.js).

## How to add a feature

### Adding a new button

1. Add the markup in [`index.html`](index.html) with a unique `id`.
2. Wire it in [`src/wire.js`](src/wire.js) inside `wireUI()`:
   ```js
   $("myBtn").addEventListener("click", myHandler);
   ```
3. Implement `myHandler` in the module that owns the relevant domain
   (e.g. a new PR flow goes in [`src/pr.js`](src/pr.js)).

### Adding a new mapPage type

Map pages are pure JSON in [`mapCoords/`](mapCoords). To add one manually:
1. Create `<name>.json` following the shape of an existing file
   (`backgrounds`, `marker`, `coordSpace`, `scaling`, `nodes`, `edges`,
   `includeAttributes`, optional `idRange`).
2. Upload the matching `<name>_fr.jpg` and `<name>_en.jpg` to
   [`generators/Ressources/`](../Ressources).
3. Reload the tool, click **Charger**.

The **Sync ← Crownicles** button automates this for new attributes/islands.

### Adding a new rendering layer

Touch [`src/canvas.js`](src/canvas.js). Add a `drawSomething(ctx, ...)`
helper called from `render()`. Keep coord transforms via `coordToCanvas()` so
zoom/pan still work.

## Coding conventions

- ES modules. `import {...} from "./foo.js"` (include the `.js`).
- Tabs for indentation (matches the rest of the Tools repo).
- Double quotes for strings.
- No semicolons skipped: always end statements with `;`.
- Prefer pure functions; keep side effects in `wire.js` and `interactions.js`.
- Don't add new dependencies casually — this is a vanilla project.
- Read the top-of-file docblock before editing a module.

## Known gotchas

- **CORS on `raw.githubusercontent.com` when a PAT is set**: GitHub may reject
  the CORS preflight for raw fetches if the `Authorization` header is present.
  Workaround: clear the PAT to read public data, set it back only when
  pushing PRs.
- **Large image pushes via the Contents API**: GitHub may reject very large
  base64 payloads. Use `git config http.postBuffer 524288000` if you commit
  big binaries via git directly.
- **No bundler**: every module must be valid in browsers without
  transpilation. No JSX, no TypeScript, no `import.meta.env`.
