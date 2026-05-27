/**
 * Entry point. Loaded as `<script type="module">` from index.html.
 *
 * Architecture overview (see CONTRIBUTING.md for full details):
 *
 *   constants ─┐
 *   state ────┐│
 *   utils ────┤│      ┌── feedback (toast/status)
 *             ││      │
 *             ▼▼      ▼
 *        github ◄── images
 *           │           │
 *           ▼           ▼
 *        data ◄── tabs ◄── canvas ──┐
 *           │     │   │             │
 *           │     │   ▼             │
 *           │     │  panels ◄── categorize
 *           │     │   │             │
 *           │     ▼   ▼             ▼
 *           │  sync ──┴── history ◄─┘
 *           │     │
 *           ▼     ▼
 *          pr ◄── render-pipeline
 *           │     │
 *           └──┬──┘
 *              ▼
 *             wire
 *              │
 *              ▼
 *             main (boot)
 */
import {resizeCanvas} from "./canvas.js";
import {setStatus} from "./feedback.js";
import {wireBackgroundDrop, wireCanvasInteractions, wireKeyboard} from "./interactions.js";
import {wireUI} from "./wire.js";

function boot() {
	wireUI();
	wireCanvasInteractions();
	wireKeyboard();
	wireBackgroundDrop();
	window.addEventListener("resize", resizeCanvas);
	resizeCanvas();
	setStatus("Prêt — clique sur « Charger » pour récupérer les données.");
}

boot();
