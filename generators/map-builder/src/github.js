/**
 * GitHub API layer.
 *  - Low-level: fetch with auth + rate-limit tracking
 *  - Helpers: fetch a directory listing or a JSON file
 *  - Batched processing for large folders (mapLocations, mapLinks)
 *  - GitHubClient: high-level write operations (branch, putFile, openPr)
 *    used by the auto-PR flow.
 */
import {state} from "./state.js";
import {$, delay} from "./utils.js";
import {logDryRun, setStatus} from "./feedback.js";
import {GITHUB_BATCH_DELAY_MS, GITHUB_BATCH_SIZE} from "./constants.js";

function updateRateLimitFromHeaders(response) {
	const remaining = response.headers.get("X-RateLimit-Remaining");
	const limit = response.headers.get("X-RateLimit-Limit");
	if (remaining === null || limit === null) {
		return;
	}
	const reset = response.headers.get("X-RateLimit-Reset");
	let suffix = `API ${remaining}/${limit}`;
	if (reset) {
		const diff = Math.max(0, Math.ceil((parseInt(reset, 10) * 1000 - Date.now()) / 60000));
		if (diff > 0) {
			suffix += ` (reset ${diff}m)`;
		}
	}
	state.rateLimitSuffix = suffix;
	const el = $("rateLimit");
	if (el) {
		el.textContent = suffix;
	}
}

function authHeaders() {
	if (!state.pat) {
		return {};
	}
	return {Authorization: `Bearer ${state.pat}`};
}

export async function makeApiRequest(url, opts = {}) {
	const response = await fetch(url, {
		...opts,
		headers: {Accept: "application/vnd.github+json", ...authHeaders(), ...(opts.headers || {})}
	});
	updateRateLimitFromHeaders(response);
	return response;
}

export async function fetchGithubDirectory(repo, path, branch) {
	const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
	const r = await makeApiRequest(url);
	if (!r.ok) {
		throw new Error(`${path} fetch failed: ${r.status}`);
	}
	const json = await r.json();
	if (!Array.isArray(json)) {
		throw new Error(`${path} unexpected payload`);
	}
	return json.filter((e) => e.type === "file" && e.download_url);
}

export async function fetchGithubJson(url, label) {
	const r = await makeApiRequest(url);
	if (!r.ok) {
		throw new Error(`${label} -> ${r.status}`);
	}
	return r.json();
}

/**
 * Fetch every file in `files` (parallel batches of GITHUB_BATCH_SIZE),
 * calling onPayload(parsedJson, file) for each success. Failures are warned
 * and skipped so a single bad file doesn't break the load.
 */
export async function processGithubFiles(files, label, onPayload) {
	if (!files.length) {
		return;
	}
	let done = 0;
	for (let i = 0; i < files.length; i += GITHUB_BATCH_SIZE) {
		const batch = files.slice(i, i + GITHUB_BATCH_SIZE);
		const results = await Promise.all(batch.map(async (file) => {
			try {
				const p = await fetchGithubJson(file.download_url, `${label} ${file.name}`);
				onPayload(p, file);
				return true;
			}
			catch (e) {
				console.warn(`${label} ${file.name} ignore: ${e.message}`);
				return false;
			}
		}));
		done += results.filter(Boolean).length;
		setStatus(`${label}: ${done}/${files.length}`);
		if (i + GITHUB_BATCH_SIZE < files.length) {
			await delay(GITHUB_BATCH_DELAY_MS);
		}
	}
}

/**
 * Stateful client to write to a single (repo, baseBranch).
 * Used by the auto-PR flows. In dry-run mode, calls are logged to the side
 * panel instead of hitting GitHub.
 */
export class GitHubClient {
	constructor(repo, baseBranch) {
		this.repo = repo;
		this.baseBranch = baseBranch;
		this.calls = [];
	}

	async req(method, path, body) {
		const url = `https://api.github.com/repos/${this.repo}${path}`;
		this.calls.push({method, url, body: body ? Object.keys(body) : null});
		if (state.dryRun) {
			logDryRun(method, url, body);
			return {
				ok: true,
				json: async () => ({
					object: {sha: "dry-sha"},
					html_url: `https://github.com/${this.repo}/pull/0`
				})
			};
		}
		const r = await makeApiRequest(url, {
			method,
			headers: {"Content-Type": "application/json"},
			body: body ? JSON.stringify(body) : undefined
		});
		if (!r.ok) {
			const text = await r.text();
			throw new Error(`${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`);
		}
		return r;
	}

	async verifyAuth() {
		if (state.dryRun) {
			return true;
		}
		const r = await makeApiRequest("https://api.github.com/user");
		if (!r.ok) {
			throw new Error("PAT invalide ou expiré (GET /user a échoué)");
		}
		return true;
	}

	async getBaseSha() {
		const r = await this.req("GET", `/git/refs/heads/${this.baseBranch}`);
		const j = await r.json();
		return j.object.sha;
	}

	async createBranch(name, sha) {
		return this.req("POST", "/git/refs", {ref: `refs/heads/${name}`, sha});
	}

	async putFile(path, contentB64, branch, message, existingSha) {
		const body = {message, content: contentB64, branch};
		if (existingSha) {
			body.sha = existingSha;
		}
		return this.req("PUT", `/contents/${path}`, body);
	}

	async getExistingFileSha(path, ref) {
		if (state.dryRun) {
			return null;
		}
		const r = await makeApiRequest(`https://api.github.com/repos/${this.repo}/contents/${path}?ref=${ref}`);
		if (!r.ok) {
			return null;
		}
		const j = await r.json();
		return j.sha || null;
	}

	async openPr(head, base, title, body) {
		const r = await this.req("POST", "/pulls", {title, head, base, body});
		const j = await r.json();
		return j.html_url;
	}
}
