/**
 * Per-tab undo/redo. Each tab has its own stack of JSON snapshots of the
 * mapPage. Stack capped at 50 entries to avoid runaway memory on long sessions.
 */
import {state} from "./state.js";
import {render} from "./canvas.js";
import {refreshInspector, refreshSyncPanel} from "./panels.js";

function getStack() {
	state.undoStacks[state.currentTab] ||= {undo: [], redo: []};
	return state.undoStacks[state.currentTab];
}

export function pushUndo() {
	const s = getStack();
	s.undo.push(JSON.stringify(state.mapPages[state.currentTab]));
	if (s.undo.length > 50) {
		s.undo.shift();
	}
	s.redo = [];
}

export function undo() {
	const s = getStack();
	if (!s.undo.length) {
		return;
	}
	s.redo.push(JSON.stringify(state.mapPages[state.currentTab]));
	state.mapPages[state.currentTab] = JSON.parse(s.undo.pop());
	render();
	refreshSyncPanel();
	refreshInspector();
}

export function redo() {
	const s = getStack();
	if (!s.redo.length) {
		return;
	}
	s.undo.push(JSON.stringify(state.mapPages[state.currentTab]));
	state.mapPages[state.currentTab] = JSON.parse(s.redo.pop());
	render();
	refreshSyncPanel();
	refreshInspector();
}
