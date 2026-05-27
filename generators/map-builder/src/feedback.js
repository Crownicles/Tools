/**
 * User-facing feedback: status bar, toasts, focus highlight, dry-run log.
 * Each function targets a specific DOM id from index.html.
 */
import {$} from "./utils.js";

export function setStatus(message) {
	const el = $("status");
	if (el) {
		el.textContent = message;
	}
}

export function toast(message, kind = "info", durationMs = 3500) {
	const container = $("toasts");
	if (!container) {
		return;
	}
	const el = document.createElement("div");
	el.className = `toast ${kind}`;
	el.textContent = message;
	container.appendChild(el);
	setTimeout(() => el.remove(), durationMs);
}

export function focusPatInput() {
	const el = $("pat");
	if (!el) {
		return;
	}
	el.scrollIntoView({behavior: "smooth", block: "center"});
	el.focus();
	el.classList.add("flash-error");
	setTimeout(() => el.classList.remove("flash-error"), 1500);
}

/**
 * Append an entry to the dry-run side panel. Base64 payloads are abbreviated
 * to keep the log readable.
 */
export function logDryRun(method, url, body) {
	$("dryRunPanel").classList.remove("hidden");
	const log = $("dryRunLog");
	log.textContent += `\n[${new Date().toISOString()}] ${method} ${url}\n`;
	if (body) {
		const sanitized = {...body};
		if (sanitized.content && sanitized.content.length > 80) {
			sanitized.content = `<base64 ${sanitized.content.length} chars>`;
		}
		log.textContent += `${JSON.stringify(sanitized, null, 2)}\n`;
	}
	log.scrollTop = log.scrollHeight;
}
